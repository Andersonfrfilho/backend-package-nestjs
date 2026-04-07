import { Inject, Injectable, Optional } from '@nestjs/common';
import { getContext, LOGGER_PROVIDER, LoggerProviderInterface } from '@adatechnology/logger';

import { CacheProviderInterface } from '../cache.interface';
import { CACHE_ENCRYPTION_SECRET } from '../cache.token';
import { LIB_NAME, LIB_VERSION, LOG_CONTEXT } from '../cache.constants';
import { decrypt, encrypt } from '../crypto.utils';

const CONTEXT = LOG_CONTEXT.IN_MEMORY_CACHE_PROVIDER;

@Injectable()
export class InMemoryCacheProvider implements CacheProviderInterface {
  private readonly cache = new Map<string, { value: any; expiry: number | null }>();

  constructor(
    @Optional() @Inject(LOGGER_PROVIDER) private readonly logger?: LoggerProviderInterface,
    @Optional() @Inject(CACHE_ENCRYPTION_SECRET) private readonly encryptionSecret?: string | null,
  ) {}

  private callerLogContext(): Record<string, unknown> | undefined {
    const ctx = getContext() as Record<string, unknown> | undefined;
    return ctx?.logContext as Record<string, unknown> | undefined;
  }

  async get<T>(key: string): Promise<T | null> {
    const libMethod = `${CONTEXT}.get`;
    const entry = this.cache.get(key);

    if (!entry) {
      this.logger?.debug?.({
        message: `Cache miss: ${key}`,
        context: CONTEXT,
        meta: { key, hit: false, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
      });
      return null;
    }

    if (entry.expiry && Date.now() > entry.expiry) {
      this.logger?.debug?.({
        message: `Cache expired: ${key}`,
        context: CONTEXT,
        meta: { key, hit: false, expired: true, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
      });
      this.cache.delete(key);
      return null;
    }

    this.logger?.debug?.({
      message: `Cache hit: ${key}`,
      context: CONTEXT,
      meta: { key, hit: true, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
    });
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void> {
    const libMethod = `${CONTEXT}.set`;
    const expiry = ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null;
    this.cache.set(key, { value, expiry });
    this.logger?.debug?.({
      message: `Cache set: ${key}`,
      context: CONTEXT,
      meta: { key, ttlInSeconds: ttlInSeconds ?? null, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
    });
  }

  async del(key: string): Promise<void> {
    const libMethod = `${CONTEXT}.del`;
    this.cache.delete(key);
    this.logger?.debug?.({
      message: `Cache del: ${key}`,
      context: CONTEXT,
      meta: { key, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
    });
  }

  async clear(): Promise<void> {
    const libMethod = `${CONTEXT}.clear`;
    this.cache.clear();
    this.logger?.info?.({
      message: 'Cache cleared (all keys)',
      context: CONTEXT,
      meta: { lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
    });
  }

  async setEncrypted<T>(key: string, value: T, ttlInSeconds?: number, secret?: string): Promise<void> {
    const libMethod = `${CONTEXT}.setEncrypted`;
    const resolvedSecret = secret ?? this.encryptionSecret;

    if (!resolvedSecret) {
      throw new Error(`[${LIB_NAME}] setEncrypted: no encryption secret provided. Pass a secret or configure encryptionSecret in CacheModule.forRoot().`);
    }

    const ciphertext = encrypt(JSON.stringify(value), resolvedSecret);
    const expiry = ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null;
    this.cache.set(key, { value: ciphertext, expiry });

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
      throw new Error(`[${LIB_NAME}] getEncrypted: no encryption secret provided. Pass a secret or configure encryptionSecret in CacheModule.forRoot().`);
    }

    const entry = this.cache.get(key);

    if (!entry) {
      this.logger?.debug?.({
        message: `Cache miss (encrypted): ${key}`,
        context: CONTEXT,
        meta: { key, hit: false, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
      });
      return null;
    }

    if (entry.expiry && Date.now() > entry.expiry) {
      this.logger?.debug?.({
        message: `Cache expired (encrypted): ${key}`,
        context: CONTEXT,
        meta: { key, hit: false, expired: true, lib: LIB_NAME, libVersion: LIB_VERSION, libMethod, logContext: this.callerLogContext() },
      });
      this.cache.delete(key);
      return null;
    }

    try {
      const plaintext = decrypt(entry.value as string, resolvedSecret);
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
}
