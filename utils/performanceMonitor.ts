// Performance monitoring and optimization utilities for QR Scanner

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasurement(name: string) {
    this.startTimes.set(name, Date.now());
  }

  endMeasurement(name: string) {
    const startTime = this.startTimes.get(name);
    if (startTime) {
      const duration = Date.now() - startTime;
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      this.metrics.get(name)!.push(duration);
      this.startTimes.delete(name);
      return duration;
    }
    return 0;
  }

  getAverageTime(name: string): number {
    const times = this.metrics.get(name);
    if (!times || times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  logPerformanceReport() {
    console.log('=== Performance Report ===');
    for (const [name, times] of this.metrics.entries()) {
      const avg = this.getAverageTime(name);
      const max = Math.max(...times);
      const min = Math.min(...times);
      console.log(`${name}: avg=${avg.toFixed(2)}ms, min=${min}ms, max=${max}ms (${times.length} samples)`);
    }
    console.log('========================');
  }

  clearMetrics() {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// CPU usage monitoring
export function throttleFunction<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let lastExecution = 0;
  let timeoutId: number | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecution;

    if (timeSinceLastExecution >= delay) {
      lastExecution = now;
      return func(...args);
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastExecution = Date.now();
        func(...args);
      }, delay - timeSinceLastExecution) as unknown as number;
    }
  }) as T;
}

// Memory optimization
export const optimizedSettings = {
  camera: {
    videoQuality: '1080p' as const,
    pictureQuality: 0.3,
    skipProcessing: true,
    exif: false,
  },
  animations: {
    duration: 200,
    reducedMotion: false,
  },
  scanning: {
    throttleDelay: 100,
    boundsCheckAccurate: true,
    margin: 10,
  },
  ui: {
    qrCodeSize: 180,
    faviconSize: 180,
    elementSize: 180,
  },
};

// Battery optimization helpers
export const batteryOptimizations = {
  disableComplexAnimations: true,
  reduceRenderFrequency: true,
  pauseWhenInactive: true,
  lowerCameraQuality: true,
  throttleScanning: true,
};
