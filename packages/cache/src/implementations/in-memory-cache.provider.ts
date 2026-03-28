import { Inject, Injectable, Optional } from '@nestjs/common';
import { CacheProviderInterface } from '../cache.interface';
import { LOGGER_PROVIDER, LoggerProviderInterface } from '@adatechnology/logger';

@Injectable()
export class InMemoryCacheProvider implements CacheProviderInterface {
  private readonly cache = new Map<string, { value: any; expiry: number | null }>();

  constructor(
    @Optional() @Inject(LOGGER_PROVIDER) private readonly logger?: LoggerProviderInterface,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    this.logger?.debug?.(`get - Key: ${key}`);
    const entry = this.cache.get(key);
    if (!entry) {
      this.logger?.debug?.(`[InMemoryCacheProvider] get - Miss: ${key}`);
      return null;
    }

    if (entry.expiry && Date.now() > entry.expiry) {
      this.logger?.debug?.(`[InMemoryCacheProvider] get - Expired: ${key}`);
      this.cache.delete(key);
      return null;
    }

    this.logger?.debug?.(`[InMemoryCacheProvider] get - Hit: ${key}`);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void> {
    this.logger?.debug?.(`[InMemoryCacheProvider] set - Key: ${key}, TTL: ${ttlInSeconds ?? 'No TTL'}`);
    const expiry = ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null;
    this.cache.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.logger?.debug?.(`[InMemoryCacheProvider] del - Key: ${key}`);
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.logger?.info?.('[InMemoryCacheProvider] clear - Flushing all cache');
    this.cache.clear();
  }
}
