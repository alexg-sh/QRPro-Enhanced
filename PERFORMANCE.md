# QR Scanner Performance Optimizations

This document outlines the performance optimizations implemented to reduce iPhone heating and improve battery life.

## Key Optimizations Made

### 1. Camera Performance
- **High-quality video**: Set to 1080p for better QR code detection accuracy
- **Optimized photo quality**: Balanced capture quality for performance
- **Skip processing**: Enabled `skipProcessing` and disabled EXIF data
- **App state management**: Camera automatically pauses when app goes to background

### 2. Animation Optimizations
- **Removed complex animations**: Eliminated spring animations and breathing effects
- **Simplified transforms**: Removed 3D transforms and expensive operations
- **Reduced animation durations**: Shortened animation times from 500ms+ to 200ms
- **Fewer animated elements**: Removed unnecessary moving parts

### 3. Memory Management
- **Consistent asset sizes**: QR code and favicon both sized at 180px for uniform display
- **Optimized image loading**: Proper sizing to match display requirements
- **Proper cleanup**: Added comprehensive cleanup for timeouts and refs
- **Removed unused dependencies**: Eliminated heavy packages like webview

### 4. Processing Optimizations
- **Enhanced bounds checking**: Improved QR code detection accuracy with precise positioning
- **Accurate highlighting**: Better visual feedback showing exact QR code location
- **Intelligent margin detection**: Smart boundary validation for better scanning
- **Faster reset cycles**: Reduced timeout delays for quicker resets

### 5. Bundle Optimizations
- **Metro config**: Added bundle size optimizations
- **Babel plugins**: Remove console logs in production
- **Tree shaking**: Enabled to remove unused code
- **Dependency cleanup**: Removed unnecessary packages

## Performance Tips

### For Development
```bash
# Start with production-like optimizations
npm run start:production

# Analyze bundle size
npm run analyze

# Clean cache when testing performance
npm run clean
```

### Monitoring Performance
The app includes a performance monitor utility:

```typescript
import { PerformanceMonitor } from './utils/performanceMonitor';

const monitor = PerformanceMonitor.getInstance();
monitor.startMeasurement('scan-process');
// ... scanning logic ...
monitor.endMeasurement('scan-process');
monitor.logPerformanceReport();
```

### Additional Optimizations You Can Enable

1. **Adjust camera quality** based on device capability:
   ```typescript
   videoQuality="720p" // For older devices if needed
   ```

2. **Increase highlight accuracy** margin:
   ```typescript
   const margin = 20; // Larger margin for less strict detection
   ```

3. **Consistent sizing** across all elements:
   ```typescript
   const ELEMENT_SIZE = 180; // Standard size for QR codes and favicons
   ```

## Battery Life Improvements

- 📱 **Improved accuracy** with better QR code detection
- 🔋 **Consistent performance** from optimized sizing
- 🌡️ **Balanced thermal management** with 1080p quality
- ⚡ **Enhanced visual feedback** with precise highlighting

## Trade-offs Made

- **Camera quality**: Increased to 1080p for better accuracy
- **Consistent sizing**: All UI elements use standardized 180px size
- **Enhanced accuracy**: More precise bounds checking for better detection
- **Visual feedback**: Accurate highlighting shows exact QR code position

These optimizations provide better user experience with accurate QR scanning, consistent visual elements, and precise feedback while maintaining good performance on modern devices.
