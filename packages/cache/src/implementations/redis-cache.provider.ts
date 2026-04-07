import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { getContext, LoggerProviderInterface } from '@adatechnology/logger';
import Redis, { RedisOptions } from 'ioredis';

import { CacheProviderInterface } from '../cache.interface';
import { LIB_NAME, LIB_VERSION, LOG_CONTEXT } from '../cache.constants';
import { decrypt, encrypt } from '../crypto.utils';

const CONTEXT = LOG_CONTEXT.REDIS_CACHE_PROVIDER;

@Injectable()
export class RedisCacheProvider implements CacheProviderInterface, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    options: RedisOptions,
    private readonly logger?: LoggerProviderInterface,
    private readonly encryptionSecret?: string,
  ) {
    this.redis = new Redis(options);
  }

  private callerLogContext(): Record<string, unknown> | undefined {
    const ctx = getContext() as Record<string, unknown> | undefined;
    return ctx?.logContext as Record<string, unknown> | undefined;
  }

  async get<T>(key: string): Promise<T | null> {
    const libMethod = `${CONTEXT}.get`;
    const value = await this.redis.get(key);

    if (!value) {
      this.logger?.debug?.({
        message: `Cache miss: ${key}`,
        context: CONTEXT,
        meta: { key, hit: false, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
      });
      return null;
    }

    this.logger?.debug?.({
      message: `Cache hit: ${key}`,
      context: CONTEXT,
      meta: { key, hit: true, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
    });
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void> {
    const libMethod = `${CONTEXT}.set`;
    const stringifiedValue = JSON.stringify(value);

    if (ttlInSeconds) {
      await this.redis.set(key, stringifiedValue, 'EX', ttlInSeconds);
    } else {
      await this.redis.set(key, stringifiedValue);
    }

    this.logger?.debug?.({
      message: `Cache set: ${key}`,
      context: CONTEXT,
      meta: { key, ttlInSeconds: ttlInSeconds ?? null, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
    });
  }

  async del(key: string): Promise<void> {
    const libMethod = `${CONTEXT}.del`;
    await this.redis.del(key);
    this.logger?.debug?.({
      message: `Cache del: ${key}`,
      context: CONTEXT,
      meta: { key, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
    });
  }

  async clear(): Promise<void> {
    const libMethod = `${CONTEXT}.clear`;
    await this.redis.flushall();
    this.logger?.info?.({
      message: 'Cache cleared (flushall)',
      context: CONTEXT,
      meta: { lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
    });
  }

  async setEncrypted<T>(key: string, value: T, ttlInSeconds?: number, secret?: string): Promise<void> {
    const libMethod = `${CONTEXT}.setEncrypted`;
    const resolvedSecret = secret ?? this.encryptionSecret;

    if (!resolvedSecret) {
      throw new Error(`[${LIB_NAME}] setEncrypted: no encryption secret provided. Pass a secret or set encryptionSecret in the constructor.`);
    }

    const ciphertext = encrypt(JSON.stringify(value), resolvedSecret);

    if (ttlInSeconds) {
      await this.redis.set(key, ciphertext, 'EX', ttlInSeconds);
    } else {
      await this.redis.set(key, ciphertext);
    }

    this.logger?.debug?.({
      message: `Cache setEncrypted: ${key}`,
      context: CONTEXT,
      meta: { key, ttlInSeconds: ttlInSeconds ?? null, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
    });
  }

  async getEncrypted<T>(key: string, secret?: string): Promise<T | null> {
    const libMethod = `${CONTEXT}.getEncrypted`;
    const resolvedSecret = secret ?? this.encryptionSecret;

    if (!resolvedSecret) {
      throw new Error(`[${LIB_NAME}] getEncrypted: no encryption secret provided. Pass a secret or set encryptionSecret in the constructor.`);
    }

    const ciphertext = await this.redis.get(key);

    if (!ciphertext) {
      this.logger?.debug?.({
        message: `Cache miss (encrypted): ${key}`,
        context: CONTEXT,
        meta: { key, hit: false, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
      });
      return null;
    }

    try {
      const plaintext = decrypt(ciphertext, resolvedSecret);
      this.logger?.debug?.({
        message: `Cache hit (encrypted): ${key}`,
        context: CONTEXT,
        meta: { key, hit: true, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
      });
      return JSON.parse(plaintext) as T;
    } catch {
      this.logger?.warn?.({
        message: `Cache decryption failed: ${key}`,
        context: CONTEXT,
        meta: { key, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
      });
      return null;
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
