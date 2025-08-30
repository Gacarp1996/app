// src/utils/rateLimiter.ts

interface RateLimitState {
  [key: string]: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private state: RateLimitState = {};
  private defaultDelay = 1000; // 1 segundo por defecto

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  canExecute(key: string, delay: number = this.defaultDelay): boolean {
    const now = Date.now();
    const lastExecution = this.state[key] || 0;
    
    if (now - lastExecution < delay) {
      return false;
    }
    
    this.state[key] = now;
    return true;
  }

  reset(key: string): void {
    delete this.state[key];
  }

  resetAll(): void {
    this.state = {};
  }
}

export const rateLimiter = RateLimiter.getInstance();

// Hook personalizado para React
export const useRateLimitedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  key: string,
  delay: number = 1000
): T => {
  return ((...args: Parameters<T>) => {
    if (!rateLimiter.canExecute(key, delay)) {
      return;
    }
    return callback(...args);
  }) as T;
};