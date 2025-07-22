import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';

// Custom hook to manage app state and battery optimization
export function useAppStateOptimization() {
  const [isActive, setIsActive] = useState(true);
  
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setIsActive(false);
      } else if (nextAppState === 'active') {
        setIsActive(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  return isActive;
}

// Throttle function to limit scan frequency
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<number | null>(null);
  const lastExecutedRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecutedRef.current;

      if (timeSinceLastExecution >= delay) {
        lastExecutedRef.current = now;
        return func(...args);
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastExecutedRef.current = Date.now();
        func(...args);
      }, delay - timeSinceLastExecution) as unknown as number;
    }) as T,
    [func, delay]
  );
}

// Debounce function to prevent excessive function calls
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<number | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay) as unknown as number;
    }) as T,
    [func, delay]
  );
}

// Memory optimization helper
export function useMemoryOptimization() {
  const cleanupRefs = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupRefs.current.push(cleanup);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRefs.current.forEach(cleanup => cleanup());
      cleanupRefs.current = [];
    };
  }, []);

  return { addCleanup };
}
