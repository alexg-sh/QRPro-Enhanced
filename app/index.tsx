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
  const bracketColor = useSharedValue('white');
  const qrBoxOpacity = useSharedValue(0);
  const imageOpacity = useSharedValue(0);
  const snapAnimation = useSharedValue(0);
  const qrBoxScale = useSharedValue(1);
  const qrBoxX = useSharedValue(0);
  const qrBoxY = useSharedValue(0);

  const qrBoxAnimatedStyle = useAnimatedStyle(() => ({
    opacity: qrBoxOpacity.value,
    transform: [
      { scale: qrBoxScale.value },
      { translateX: qrBoxX.value },
      { translateY: qrBoxY.value }
    ],
  }));
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [
      { scale: qrBoxScale.value },
      { translateX: qrBoxX.value },
      { translateY: qrBoxY.value }
    ],
  }));

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const guidancePillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: guidancePillOpacity.value,
  }));

  const bracketContainerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bracketScale.value }],
  }));

  const bracketAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: bracketColor.value,
  }));

  const snapAnimatedStyle = useAnimatedStyle(() => ({
    opacity: snapAnimation.value,
  }));

  useEffect(() => {
    fabScale.value = withSpring(1, { damping: 15, stiffness: 120 });
    guidancePillOpacity.value = withTiming(1, { duration: 500 });
    bracketScale.value = withSpring(1);
  }, [fabScale, guidancePillOpacity, bracketScale]);

  const handleBarcodeScanned = useCallback(
    (scanningResult: { data: string; bounds?: any }) => {
      // freeze camera preview
      cameraRef.current?.pausePreviewAsync?.();

      // Only accept scans whose entire bounds fall within the viewfinder rectangle
      let qrBounds: any = null;
      if (scanningResult.bounds) {
        const { bounds } = scanningResult;
        let isFullyInside = false;
        if (bounds.origin && bounds.size) {
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
        } else if (Array.isArray(bounds.origin)) {
          const points = bounds.origin;
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
      setScanned(true);
      setScannedData(scanningResult.data);

      // Freeze camera immediately
      cameraRef.current?.pausePreview?.();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      snapAnimation.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );

      bracketColor.value = withTiming('#4CAF50', { duration: 200 });

      // Position QR box at detected QR code location if bounds available
      if (qrBounds) {
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        const qrCenterX = qrBounds.x + qrBounds.width / 2;
        const qrCenterY = qrBounds.y + qrBounds.height / 2;
        
        // Calculate initial position offset from screen center
        qrBoxX.value = qrCenterX - centerX;
        qrBoxY.value = qrCenterY - centerY;
        qrBoxScale.value = Math.min(qrBounds.width, qrBounds.height) / 180; // Scale to match detected size
      }

      qrBoxOpacity.value = withTiming(1, { duration: 300 });

      // Animate to center and scale up over 1 second
      qrBoxX.value = withTiming(0, { duration: 1000 });
      qrBoxY.value = withTiming(0, { duration: 1000 });
      qrBoxScale.value = withTiming(1, { duration: 1000 });

      // First show QR for 2s, then favicon transition
      timeoutRef.current = setTimeout(() => {
        const { data } = scanningResult;
        const isUrl = data.startsWith('http://') || data.startsWith('https://');
        if (isUrl) {
          // Show favicon in viewfinder
          let faviconUrl: string;
          try {
            const origin = new URL(data).origin;
            faviconUrl = `https://www.google.com/s2/favicons?sz=180&domain_url=${origin}`;
          } catch {
            faviconUrl = `https://www.google.com/s2/favicons?sz=180&domain_url=${data}`;
          }
          setPreviewImageUri(faviconUrl);
          // fade in favicon, fade out QR
          imageOpacity.value = withTiming(1, { duration: 500 });
          qrBoxOpacity.value = withTiming(0, { duration: 500 });
          // after another 2s, open link and then resume
          setTimeout(async () => {
            await Linking.openURL(data).catch((err) => console.error("Couldn't load page", err));
            // Only reset after URL opens
            cameraRef.current?.resumePreview?.();
            setScanned(false);
            setScannedData('');
            setPreviewImageUri(null);
            bracketColor.value = withTiming('white', { duration: 200 });
            imageOpacity.value = 0;
            qrBoxScale.value = 1;
            qrBoxX.value = 0;
            qrBoxY.value = 0;
          }, 2000);
        } else {
          // non-URL: resume and reset immediately
          alert(`Scanned data: ${data}`);
          cameraRef.current?.resumePreview?.();
          setScanned(false);
          setScannedData('');
          bracketColor.value = withTiming('white', { duration: 200 });
          qrBoxOpacity.value = withTiming(0, { duration: 300 });
          imageOpacity.value = 0;
          qrBoxScale.value = 1;
          qrBoxX.value = 0;
          qrBoxY.value = 0;
        }
        timeoutRef.current = null;
      }, 2000);
    },
    [scanned, snapAnimation, bracketColor, qrBoxOpacity, screenWidth, screenHeight]
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
                style={{ width: 180, height: 180, borderRadius: 10 }}
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
    borderRadius: 10,
  },
});
