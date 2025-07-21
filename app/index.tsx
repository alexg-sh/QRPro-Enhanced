import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const insets = useSafeAreaInsets();
  const timeoutRef = useRef<number | null>(null);

  const fabScale = useSharedValue(0);
  const guidancePillOpacity = useSharedValue(0);
  const bracketScale = useSharedValue(0.8);
  const bracketColor = useSharedValue('white');
  const qrBoxOpacity = useSharedValue(0);
  const snapAnimation = useSharedValue(0);

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

  const qrBoxAnimatedStyle = useAnimatedStyle(() => ({
    opacity: qrBoxOpacity.value,
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
    (scanningResult: { data: string }) => {
      if (scanned) return;
      setScanned(true);
      setScannedData(scanningResult.data);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      snapAnimation.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );

      bracketColor.value = withTiming('#4CAF50', { duration: 200 });
      qrBoxOpacity.value = withTiming(1, { duration: 300 });

      timeoutRef.current = setTimeout(() => {
        const { data } = scanningResult;
        if (data.startsWith('http://') || data.startsWith('https://')) {
          Linking.openURL(data).catch((err) => console.error("Couldn't load page", err));
        } else {
          alert(`Scanned data: ${data}`);
        }
      }, 2000);
    },
    [scanned, snapAnimation, bracketColor, qrBoxOpacity]
  );

  const resetScanning = useCallback(() => {
    setScanned(false);
    setScannedData('');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    bracketColor.value = withTiming('white', { duration: 200 });
    qrBoxOpacity.value = withTiming(0, { duration: 300 });
  }, [bracketColor, qrBoxOpacity]);

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
      </Animated.View>

      <AnimatedTouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 140 }, fabAnimatedStyle]}
        onPress={toggleTorch}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <IconSymbol name="flashlight.on.fill" size={28} color="white" />
      </AnimatedTouchableOpacity>

      {scanned && (
        <TouchableOpacity style={styles.resetButton} onPress={resetScanning}>
          <Text style={styles.resetButtonText}>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}
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
  resetButton: {
    position: 'absolute',
    bottom: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 2,
  },
  resetButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
