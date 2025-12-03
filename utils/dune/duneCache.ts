/**
 * Dune 查询结果缓存
 * 用于避免频繁调用 API，提升性能
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class DuneCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 默认 5 分钟

  /**
   * 生成缓存键
   */
  private getCacheKey(queryId: number, parameters?: Record<string, any>): string {
    const paramsStr = parameters ? JSON.stringify(parameters) : "";
    return `dune:${queryId}:${paramsStr}`;
  }

  /**
   * 获取缓存数据
   * @param queryId 查询 ID
   * @param parameters 查询参数
   * @returns 缓存的数据，如果不存在或已过期则返回 null
   */
  get(queryId: number, parameters?: Record<string, any>): any | null {
    const key = this.getCacheKey(queryId, parameters);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 设置缓存数据
   * @param queryId 查询 ID
   * @param parameters 查询参数
   * @param data 要缓存的数据
   * @param ttl 缓存时间（毫秒），默认 5 分钟
   */
  set(
    queryId: number,
    data: any,
    parameters?: Record<string, any>,
    ttl?: number
  ): void {
    const key = this.getCacheKey(queryId, parameters);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * 删除缓存
   * @param queryId 查询 ID
   * @param parameters 查询参数
   */
  delete(queryId: number, parameters?: Record<string, any>): void {
    const key = this.getCacheKey(queryId, parameters);
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    total: number;
    valid: number;
    expired: number;
  } {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
    };
  }

  /**
   * 设置默认 TTL
   * @param ttl 时间（毫秒）
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
}

// 导出单例实例
export const duneCache = new DuneCache();

// 定期清理过期缓存（每 5 分钟）
if (typeof window !== "undefined") {
  setInterval(() => {
    duneCache.cleanExpired();
  }, 5 * 60 * 1000);
}

