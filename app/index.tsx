import { CameraView, useCameraPermissions } from 'expo-camera';


import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Linking, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import * as ImageManipulator from 'expo-image-manipulator';

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
  const insets = useSafeAreaInsets();
  const timeoutRef = useRef<number | null>(null);
  // Compute viewfinder area for filtering
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const VIEWFINDER_SIZE = 240;
  const viewfinderX = (screenWidth - VIEWFINDER_SIZE) / 2;
  const viewfinderY = (screenHeight - VIEWFINDER_SIZE) / 2;

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
  const qrBoxRotateX = useSharedValue(0);
  const qrBoxRotateY = useSharedValue(0);
  const qrBoxShadowOpacity = useSharedValue(0);

  const qrBoxAnimatedStyle = useAnimatedStyle(() => ({
    opacity: qrBoxOpacity.value,
    transform: [
      { scale: qrBoxScale.value },
      { translateX: qrBoxX.value },
      { translateY: qrBoxY.value },
      { perspective: 1000 },
      { rotateX: `${qrBoxRotateX.value}deg` },
      { rotateY: `${qrBoxRotateY.value}deg` },
    ],
    shadowOpacity: qrBoxShadowOpacity.value,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowColor: '#000',
    elevation: 8,
  }));
  
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [
      { scale: qrBoxScale.value },
      { translateX: qrBoxX.value },
      { translateY: qrBoxY.value },
      { perspective: 1000 },
      { rotateX: `${qrBoxRotateX.value}deg` },
      { rotateY: `${qrBoxRotateY.value}deg` },
    ],
    shadowOpacity: qrBoxShadowOpacity.value,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowColor: '#000',
    elevation: 8,
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
    fabScale.value = withSpring(1, { damping: 15, stiffness: 120 });
    guidancePillOpacity.value = withTiming(1, { duration: 500 });
    bracketScale.value = withSpring(1);
    
    // Breathing effect for viewfinder
    const startBreathing = () => {
      bracketBreathingScale.value = withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      );
      // Repeat breathing effect
      setTimeout(startBreathing, 4000);
    };
    startBreathing();
  }, [fabScale, guidancePillOpacity, bracketScale, bracketBreathingScale]);

  const handleBarcodeScanned = useCallback(
    async (scanningResult: { data: string; bounds?: any; cornerPoints?: any }) => {
      if (scanned) return;

      // Only accept scans whose entire bounds fall within the viewfinder rectangle
      let qrBounds: any = null;
      let cornerPoints: any = null;

      if (scanningResult.bounds || scanningResult.cornerPoints) {
        const bounds = scanningResult.bounds;
        cornerPoints = scanningResult.cornerPoints;
        
        let isFullyInside = false;
        if (bounds && bounds.origin && bounds.size) {
          const { x, y } = bounds.origin;
          const { width, height } = bounds.size;
          if (
            x >= viewfinderX &&
            y >= viewfinderY &&
            x + width <= viewfinderX + VIEWFINDER_SIZE &&
            y + height <= viewfinderY + VIEWFINDER_SIZE
          ) {
            isFullyInside = true;
            qrBounds = { x, y, width, height };
          }
        } else if (cornerPoints && Array.isArray(cornerPoints)) {
          const points = cornerPoints;
          isFullyInside = points.every((p: any) =>
            p.x >= viewfinderX &&
            p.x <= viewfinderX + VIEWFINDER_SIZE &&
            p.y >= viewfinderY &&
            p.y <= viewfinderY + VIEWFINDER_SIZE
          );
          if (isFullyInside) {
            const xs = points.map((p: any) => p.x);
            const ys = points.map((p: any) => p.y);
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

      if (scanned) return;
      setScanned(true); // Prevent multiple scans
      
      // Take a picture to freeze the frame
      try {
        const photo = await cameraRef.current?.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: true
        });
        if (photo) {
          setFrozenFrame(photo.uri);
          frozenFrameOpacity.value = withTiming(1, { duration: 100 });
        }
      } catch (error) {
        console.error('Failed to capture frame:', error);
      }

      // Wait 0.2s, then start animations
      setTimeout(() => {
        setScannedData(scanningResult.data);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Position initial QR at detected location using generated QR code
        if (qrBounds) {
          const centerX = screenWidth / 2;
          const centerY = screenHeight / 2;
          const qrCenterX = qrBounds.x + qrBounds.width / 2;
          const qrCenterY = qrBounds.y + qrBounds.height / 2;
          
          // 1. Highlight the detected QR code
          const offsetX = qrCenterX - centerX;
          const offsetY = qrCenterY - centerY;
          const qrSize = Math.max(qrBounds.width, qrBounds.height);
          const targetScale = (qrSize / VIEWFINDER_SIZE) * 1.1; // Slightly larger
          
          bracketColor.value = withTiming('#4CAF50', { duration: 300 });
          bracketX.value = withTiming(offsetX, { duration: 300 });
          bracketY.value = withTiming(offsetY, { duration: 300 });
          bracketScale.value = withTiming(targetScale, { duration: 300 });
          
          // 2. After highlight, proceed with QR animation
          timeoutRef.current = setTimeout(() => {
            // Position QR box to start at the highlighted location
            qrBoxX.value = offsetX;
            qrBoxY.value = offsetY;
            qrBoxScale.value = targetScale;
            qrBoxRotateX.value = -15;
            qrBoxRotateY.value = 10;
            qrBoxShadowOpacity.value = 0;
            
            // Make QR box visible
            qrBoxOpacity.value = withTiming(1, { duration: 100 });
            
            // Move viewfinder back to center as QR animates
            bracketX.value = withTiming(0, { duration: 400 });
            bracketY.value = withTiming(0, { duration: 400 });
            bracketScale.value = withTiming(1, { duration: 400 });
            
            // Animate QR box to center with 3D effect
            qrBoxX.value = withTiming(0, { duration: 400 });
            qrBoxY.value = withTiming(0, { duration: 400 });
            qrBoxScale.value = withTiming(1, { duration: 400 });
            qrBoxRotateX.value = withTiming(0, { duration: 400 });
            qrBoxRotateY.value = withTiming(0, { duration: 400 });
            qrBoxShadowOpacity.value = withTiming(0.3, { duration: 400 });
            
            // 3. After QR animation, transition to favicon
            setTimeout(() => {
              const { data } = scanningResult;
              const isUrl = data.startsWith('http://') || data.startsWith('https://');
              if (isUrl) {
                // Prepare and show favicon
                let faviconUrl: string;
                try {
                  const origin = new URL(data).origin;
                  faviconUrl = `https://www.google.com/s2/favicons?sz=180&domain_url=${origin}`;
                } catch {
                  faviconUrl = `https://www.google.com/s2/favicons?sz=180&domain_url=${data}`;
                }
                setPreviewImageUri(faviconUrl);
                
                // Simple fade transition
                imageOpacity.value = withTiming(1, { duration: 800 });
                qrBoxOpacity.value = withTiming(0, { duration: 800 });
                
                // 4. Open link and reset
                setTimeout(async () => {
                  await Linking.openURL(data).catch((err) => console.error("Couldn't load page", err));
                  // Only reset AFTER URL opens
                  setTimeout(() => {
                    setScanned(false);
                    setScannedData('');
                    setPreviewImageUri(null);
                    setFrozenFrame(null);
                    frozenFrameOpacity.value = 0;
                    bracketColor.value = withTiming('white', { duration: 200 });
                    qrBoxOpacity.value = 0;
                    imageOpacity.value = 0;
                    qrBoxScale.value = 1;
                    qrBoxX.value = 0;
                    qrBoxY.value = 0;
                    qrBoxRotateX.value = 0;
                    qrBoxRotateY.value = 0;
                    qrBoxShadowOpacity.value = 0;
                    bracketX.value = 0;
                    bracketY.value = 0;
                    bracketScale.value = 1;
                  }, 1000); // Wait 1s after URL opens before resuming
                }, 2000);
              } else {
                // Non-URL: show alert and reset
                alert(`Scanned data: ${data}`);
                setTimeout(() => {
                  setScanned(false);
                  setScannedData('');
                  setFrozenFrame(null);
                  frozenFrameOpacity.value = 0;
                  bracketColor.value = withTiming('white', { duration: 200 });
                  qrBoxOpacity.value = 0;
                  bracketX.value = 0;
                  bracketY.value = 0;
                  bracketScale.value = 1;
                }, 1000); // Wait 1s before resuming for non-URL
              }
            }, 2000); // Wait 2s after QR is centered
          }, 1500); // Wait 1.5s for highlight
        }

        // Flash effect
        snapAnimation.value = withSequence(
          withTiming(0.8, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );
      }, 200);
    },
    [scanned, snapAnimation, bracketColor, qrBoxOpacity, screenWidth, screenHeight, viewfinderX, viewfinderY]
  );

  // Manual reset removed; scanning will reset automatically after each scan

  function toggleTorch() {
    setTorchOn((prev) => !prev);
  }

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
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        enableTorch={torchOn}
        videoQuality="2160p"
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
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.guidanceText}>Find a code to scan</Text>
      </Animated.View>

      <Animated.View style={[styles.bracketContainer, bracketContainerAnimatedStyle]}>
        <Animated.View style={[styles.corner, styles.topLeft, bracketAnimatedStyle]} />
        <Animated.View style={[styles.corner, styles.topRight, bracketAnimatedStyle]} />
        <Animated.View style={[styles.corner, styles.bottomLeft, bracketAnimatedStyle]} />
        <Animated.View style={[styles.corner, styles.bottomRight, bracketAnimatedStyle]} />
        {scanned && scannedData ? (
          <Animated.View style={[styles.qrPreviewBox, qrBoxAnimatedStyle]}>
            <View style={[styles.qrCodeBackground, { overflow: 'hidden' }]}>
              <QRCode value={scannedData} size={220} backgroundColor="transparent" />
            </View>
          </Animated.View>
        ) : null}
        {scanned && previewImageUri ? (
          <Animated.View style={[styles.qrPreviewBox, imageAnimatedStyle]}>
            <View style={styles.qrCodeBackground}>
              <AnimatedImage
                source={{ uri: previewImageUri }}
                style={{ width: 220, height: 220, borderRadius: 12 }}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>

      <AnimatedTouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 140 }, fabAnimatedStyle]}
        onPress={toggleTorch}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 8,
  },
});
