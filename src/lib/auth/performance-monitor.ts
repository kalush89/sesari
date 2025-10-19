/**
 * Performance monitoring utilities for authentication and workspace operations
 * Helps track and optimize slow operations
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  /**
   * Start timing an operation
   */
  startTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration);
      
      // Log slow operations in development
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(operation: string, duration: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation: string) {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    
    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map(m => m.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      count: operationMetrics.length,
      average: avg,
      min,
      max,
      recent: durations.slice(-10), // Last 10 measurements
    };
  }

  /**
   * Get all recorded metrics
   */
  getAllMetrics() {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Get slow operations (above threshold)
   */
  getSlowOperations(thresholdMs = 1000) {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator function to monitor async function performance
 */
export function monitorPerformance<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const endTimer = performanceMonitor.startTimer(operation);
    try {
      const result = await fn(...args);
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }) as T;
}

/**
 * Higher-order component to monitor component render performance
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function MonitoredComponent(props: P) {
    const endTimer = performanceMonitor.startTimer(`render:${componentName}`);
    
    React.useEffect(() => {
      endTimer();
    });

    return React.createElement(Component, props);
  };
}

/**
 * Hook to monitor custom operations
 */
export function usePerformanceMonitor() {
  return {
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    getStats: performanceMonitor.getStats.bind(performanceMonitor),
  };
}

/**
 * Development-only performance reporter
 */
export function reportPerformanceStats() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const operations = [
    'workspace:refresh',
    'workspace:switch',
    'session:validate',
    'auth:signin',
    'auth:signout',
  ];

  console.group('🔍 Performance Stats');
  
  operations.forEach(operation => {
    const stats = performanceMonitor.getStats(operation);
    if (stats) {
      console.log(`${operation}:`, {
        count: stats.count,
        avg: `${stats.average.toFixed(2)}ms`,
        min: `${stats.min.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    }
  });

  const slowOps = performanceMonitor.getSlowOperations();
  if (slowOps.length > 0) {
    console.warn('Slow operations detected:', slowOps.length);
  }

  console.groupEnd();
}