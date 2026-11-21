/**
 * In-Memory TTL Cache Service for External SEO Provider Responses
 * Protects users from repeated external API charges and rate-limit penalties.
 */
class MemoryCache {
  constructor(defaultTtlSeconds = 3600) {
    this.cache = new Map();
    this.defaultTtl = defaultTtlSeconds * 1000;

    // Periodically sweep expired items every 10 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref(); // Prevent keeping Node process alive if idle
    }
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value, ttlSeconds) {
    const ttlMs = (ttlSeconds ? ttlSeconds * 1000 : this.defaultTtl);
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
      cachedAt: new Date().toISOString()
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      defaultTtlSeconds: this.defaultTtl / 1000
    };
  }
}

export const seoCache = new MemoryCache(3600); // 1 hour default TTL
