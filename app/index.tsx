import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Button, Linking, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';

import { IconSymbol } from '@/components/ui/IconSymbol';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent<any>(TouchableOpacity);
const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function HomeScreen() {
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const insets = useSafeAreaInsets();
  const timeoutRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  
  // Memoize expensive calculations
  const screenDimensions = useMemo(() => Dimensions.get('window'), []);
  const { width: screenWidth, height: screenHeight } = screenDimensions;
  const VIEWFINDER_SIZE = 240;
  const viewfinderArea = useMemo(() => ({
    x: (screenWidth - VIEWFINDER_SIZE) / 2,
    y: (screenHeight - VIEWFINDER_SIZE) / 2,
    size: VIEWFINDER_SIZE
  }), [screenWidth, screenHeight]);
  const { x: viewfinderX, y: viewfinderY } = viewfinderArea;

  const fabScale = useSharedValue(0);
  const guidancePillOpacity = useSharedValue(0);
  const bracketScale = useSharedValue(0.8);
  const bracketBreathingScale = useSharedValue(1);
  const bracketColor = useSharedValue('white');
  const bracketX = useSharedValue(0);
  const bracketY = useSharedValue(0);
  const qrBoxOpacity = useSharedValue(0);
  const imageOpacity = useSharedValue(0);
  const snapAnimation = useSharedValue(0);
  const frozenFrameOpacity = useSharedValue(0);
  const qrBoxScale = useSharedValue(1);
  const qrBoxX = useSharedValue(0);
  const qrBoxY = useSharedValue(0);

  // Simplified animated styles - removed expensive 3D transforms
  const qrBoxAnimatedStyle = useAnimatedStyle(() => ({
    opacity: qrBoxOpacity.value,
    transform: [
      { scale: qrBoxScale.value },
      { translateX: qrBoxX.value },
      { translateY: qrBoxY.value },
    ],
  }));
  
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [
      { scale: qrBoxScale.value },
      { translateX: qrBoxX.value },
      { translateY: qrBoxY.value },
    ],
  }));

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const guidancePillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: guidancePillOpacity.value,
  }));

  const bracketContainerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: bracketScale.value * bracketBreathingScale.value },
      { translateX: bracketX.value },
      { translateY: bracketY.value }
    ],
  }));

  const bracketAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: bracketColor.value,
  }));

  const snapAnimatedStyle = useAnimatedStyle(() => ({
    opacity: snapAnimation.value,
  }));

  const frozenFrameAnimatedStyle = useAnimatedStyle(() => ({
    opacity: frozenFrameOpacity.value,
  }));

  useEffect(() => {
    // Simplified initialization - no complex animations
    fabScale.value = withTiming(1, { duration: 300 });
    guidancePillOpacity.value = withTiming(1, { duration: 300 });
    bracketScale.value = withTiming(1, { duration: 300 });
    
    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [fabScale, guidancePillOpacity, bracketScale]);

  // App state management for battery optimization
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setIsActive(false);
        setTorchOn(false); // Turn off torch when app goes to background
      } else if (nextAppState === 'active') {
        setIsActive(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const handleBarcodeScanned = useCallback(
    async (scanningResult: { data: string; bounds?: any; cornerPoints?: any }) => {
      if (scanned || !isActive) return;

      // More accurate bounds checking with detailed validation
      let qrBounds: any = null;
      let isFullyInside = false;

      if (scanningResult.bounds || scanningResult.cornerPoints) {
        const bounds = scanningResult.bounds;
        const cornerPoints = scanningResult.cornerPoints;
        
        if (bounds && bounds.origin && bounds.size) {
          const { x, y } = bounds.origin;
          const { width, height } = bounds.size;
          
          // Check if QR code is fully within viewfinder with some margin for accuracy
          const margin = 10; // Small margin for better accuracy
          if (
            x >= viewfinderX - margin &&
            y >= viewfinderY - margin &&
            x + width <= viewfinderX + VIEWFINDER_SIZE + margin &&
            y + height <= viewfinderY + VIEWFINDER_SIZE + margin
          ) {
            isFullyInside = true;
            qrBounds = { x, y, width, height };
          }
        } else if (cornerPoints && Array.isArray(cornerPoints) && cornerPoints.length >= 4) {
          // More accurate corner point validation
          const margin = 10;
          isFullyInside = cornerPoints.every((p: any) =>
            p.x >= viewfinderX - margin &&
            p.x <= viewfinderX + VIEWFINDER_SIZE + margin &&
            p.y >= viewfinderY - margin &&
            p.y <= viewfinderY + VIEWFINDER_SIZE + margin
          );
          
          if (isFullyInside) {
            const xs = cornerPoints.map((p: any) => p.x);
            const ys = cornerPoints.map((p: any) => p.y);
            qrBounds = {
              x: Math.min(...xs),
              y: Math.min(...ys),
              width: Math.max(...xs) - Math.min(...xs),
              height: Math.max(...ys) - Math.min(...ys)
            };
          }
        }

        if (!isFullyInside) {
          return; // ignore scans not fully within viewfinder
        }
      }

      setScanned(true); // Prevent multiple scans
      setScannedData(scanningResult.data);

      // More accurate highlight positioning
      setTimeout(() => {
        if (qrBounds) {
          const centerX = screenWidth / 2;
          const centerY = screenHeight / 2;
          const qrCenterX = qrBounds.x + qrBounds.width / 2;
          const qrCenterY = qrBounds.y + qrBounds.height / 2;
          
          // Calculate precise offset and scale for highlighting
          const offsetX = qrCenterX - centerX;
          const offsetY = qrCenterY - centerY;
          const qrSize = Math.max(qrBounds.width, qrBounds.height);
          const targetScale = Math.max(0.8, Math.min(1.5, (qrSize / VIEWFINDER_SIZE) * 1.1)); // More controlled scaling
          
          // Highlight with accurate positioning
          bracketColor.value = withTiming('#4CAF50', { duration: 200 });
          bracketX.value = withTiming(offsetX, { duration: 200 });
          bracketY.value = withTiming(offsetY, { duration: 200 });
          bracketScale.value = withTiming(targetScale, { duration: 200 });
          
          // Return to center after highlighting
          setTimeout(() => {
            bracketX.value = withTiming(0, { duration: 200 });
            bracketY.value = withTiming(0, { duration: 200 });
            bracketScale.value = withTiming(1, { duration: 200 });
          }, 600);
        } else {
          // Simple highlight if no bounds available
          bracketColor.value = withTiming('#4CAF50', { duration: 200 });
        }
        
        qrBoxOpacity.value = withTiming(1, { duration: 200 });
        
        // Flash effect
        snapAnimation.value = withTiming(0.3, { duration: 100 });
        setTimeout(() => {
          snapAnimation.value = withTiming(0, { duration: 100 });
        }, 150);

        // Process URL or show data
        setTimeout(() => {
          const { data } = scanningResult;
          const isUrl = data.startsWith('http://') || data.startsWith('https://');
          
          if (isUrl) {
            // Load and show favicon with consistent size
            let faviconUrl: string;
            try {
              const origin = new URL(data).origin;
              faviconUrl = `https://www.google.com/s2/favicons?sz=180&domain_url=${origin}`;
            } catch {
              faviconUrl = `https://www.google.com/s2/favicons?sz=180&domain_url=${data}`;
            }
            setPreviewImageUri(faviconUrl);
            
            imageOpacity.value = withTiming(1, { duration: 300 });
            qrBoxOpacity.value = withTiming(0, { duration: 300 });
            
            // Open URL and reset quickly
            setTimeout(async () => {
              await Linking.openURL(data).catch((err) => console.error("Couldn't load page", err));
              
              // Fast reset
              resetTimeoutRef.current = setTimeout(() => {
                setScanned(false);
                setScannedData('');
                setPreviewImageUri(null);
                setFrozenFrame(null);
                frozenFrameOpacity.value = 0;
                bracketColor.value = withTiming('white', { duration: 100 });
                qrBoxOpacity.value = 0;
                imageOpacity.value = 0;
                qrBoxScale.value = 1;
                qrBoxX.value = 0;
                qrBoxY.value = 0;
                bracketX.value = 0;
                bracketY.value = 0;
                bracketScale.value = 1;
              }, 200);
            }, 800);
          } else {
            // Non-URL: show alert and reset quickly
            alert(`Scanned data: ${data}`);
            resetTimeoutRef.current = setTimeout(() => {
              setScanned(false);
              setScannedData('');
              setFrozenFrame(null);
              frozenFrameOpacity.value = 0;
              bracketColor.value = withTiming('white', { duration: 100 });
              qrBoxOpacity.value = 0;
              bracketX.value = 0;
              bracketY.value = 0;
              bracketScale.value = 1;
            }, 200);
          }
        }, 800);
      }, 50);
    },
    [scanned, isActive, snapAnimation, bracketColor, qrBoxOpacity, screenWidth, screenHeight, viewfinderX, viewfinderY, VIEWFINDER_SIZE]
  );

  // Manual reset removed; scanning will reset automatically after each scan

  const toggleTorch = useCallback(() => {
    setTorchOn((prev) => !prev);
  }, []);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', color: 'white' }}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned || !isActive ? undefined : handleBarcodeScanned}
        enableTorch={torchOn}
        videoQuality="1080p"
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Frozen frame overlay to simulate paused camera */}
      {frozenFrame && (
        <Animated.Image
          source={{ uri: frozenFrame }}
          style={[StyleSheet.absoluteFillObject, frozenFrameAnimatedStyle]}
          resizeMode="cover"
        />
      )}

      <Animated.View style={[StyleSheet.absoluteFillObject, styles.flashOverlay, snapAnimatedStyle]} />

      <Animated.View
        style={[styles.guidancePill, { top: insets.top + 80 }, guidancePillAnimatedStyle]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        <Text style={styles.guidanceText}>Find a code to scan</Text>
      </Animated.View>

      <Animated.View style={[styles.bracketContainer, bracketContainerAnimatedStyle]}>
        <Animated.View style={[styles.corner, styles.topLeft, bracketAnimatedStyle]} />
        <Animated.View style={[styles.corner, styles.topRight, bracketAnimatedStyle]} />
        <Animated.View style={[styles.corner, styles.bottomLeft, bracketAnimatedStyle]} />
        <Animated.View style={[styles.corner, styles.bottomRight, bracketAnimatedStyle]} />
        {scanned && scannedData ? (
          <Animated.View style={[styles.qrPreviewBox, qrBoxAnimatedStyle]}>
            <View style={styles.qrCodeBackground}>
              <QRCode value={scannedData} size={180} backgroundColor="transparent" />
            </View>
          </Animated.View>
        ) : null}
        {scanned && previewImageUri ? (
          <Animated.View style={[styles.qrPreviewBox, imageAnimatedStyle]}>
            <View style={styles.qrCodeBackground}>
              <AnimatedImage
                source={{ uri: previewImageUri }}
                style={{ width: 180, height: 180, borderRadius: 12 }}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>

      <AnimatedTouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 140 }, fabAnimatedStyle]}
        onPress={toggleTorch}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 28 }]} />
        <IconSymbol name="flashlight.on.fill" size={28} color="white" />
      </AnimatedTouchableOpacity>

      {/* Manual reset button removed; scan resets automatically */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  guidancePill: {
    position: 'absolute',
    width: 220,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  guidanceText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  bracketContainer: {
    width: 240,
    height: 240,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderWidth: 6,
    borderColor: 'white',
    borderRadius: 24, // More rounded corners
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 24,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  flashOverlay: {
    backgroundColor: 'white',
    zIndex: 1,
    opacity: 0,
  },
  qrPreviewBox: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  qrCodeBackground: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 12,
    // Removed expensive shadow effects for performance
  },
});
