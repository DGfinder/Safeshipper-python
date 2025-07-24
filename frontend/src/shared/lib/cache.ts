// Client-side caching utilities

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100; // Maximum number of cache entries

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (ttlSeconds * 1000)
    };

    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const [, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize
    };
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Singleton cache instance
export const memoryCache = new MemoryCache();

// Browser storage cache utilities
export const storageCache = {
  set(key: string, data: any, ttlSeconds: number = 300): void {
    if (typeof window === 'undefined') return;

    try {
      const entry = {
        data,
        expiry: Date.now() + (ttlSeconds * 1000)
      };
      
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Storage cache set failed:', error);
    }
  },

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;

      const entry = JSON.parse(item);
      
      if (Date.now() > entry.expiry) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return entry.data as T;
    } catch (error) {
      console.warn('Storage cache get failed:', error);
      return null;
    }
  },

  delete(key: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Storage cache delete failed:', error);
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Storage cache clear failed:', error);
    }
  },

  cleanup(): number {
    if (typeof window === 'undefined') return 0;

    let cleaned = 0;
    const now = Date.now();

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const entry = JSON.parse(item);
              if (now > entry.expiry) {
                localStorage.removeItem(key);
                cleaned++;
              }
            }
          } catch (error) {
            // Remove corrupted entries
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      });
    } catch (error) {
      console.warn('Storage cache cleanup failed:', error);
    }

    return cleaned;
  }
};

// Cache wrapper for API calls
export function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300,
  useStorage: boolean = false
): Promise<T> {
  const cache = useStorage ? storageCache : memoryCache;
  
  // Try to get from cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  // Fetch fresh data and cache it
  return fetchFn().then(data => {
    cache.set(key, data, ttlSeconds);
    return data;
  });
}

// Automatic cache cleanup
if (typeof window !== 'undefined') {
  // Clean up memory cache every 5 minutes
  setInterval(() => {
    const cleaned = memoryCache.cleanup();
    if (cleaned > 0) {
      console.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }, 5 * 60 * 1000);

  // Clean up storage cache every hour
  setInterval(() => {
    const cleaned = storageCache.cleanup();
    if (cleaned > 0) {
      console.debug(`Cleaned ${cleaned} expired storage cache entries`);
    }
  }, 60 * 60 * 1000);
}