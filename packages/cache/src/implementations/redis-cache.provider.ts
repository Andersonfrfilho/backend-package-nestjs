import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis, { RedisOptions } from "ioredis";
import { CacheProviderInterface } from "../cache.interface";

@Injectable()
export class RedisCacheProvider
  implements CacheProviderInterface, OnModuleDestroy
{
  private readonly redis: Redis;

  constructor(options: RedisOptions) {
    this.redis = new Redis(options);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void> {
    const stringifiedValue = JSON.stringify(value);
    if (ttlInSeconds) {
      await this.redis.set(key, stringifiedValue, "EX", ttlInSeconds);
    } else {
      await this.redis.set(key, stringifiedValue);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async clear(): Promise<void> {
    await this.redis.flushall();
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
