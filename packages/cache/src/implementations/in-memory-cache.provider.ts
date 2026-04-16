import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  getContext,
  LOGGER_PROVIDER,
  LoggerProviderInterface,
} from "@adatechnology/logger";

import {
  CacheProviderInterface,
  DelParams,
  GetEncryptedParams,
  GetParams,
  SetEncryptedParams,
  SetParams,
} from "../cache.interface";
import { CACHE_ENCRYPTION_SECRET } from "../cache.token";
import { LIB_NAME, LIB_VERSION } from "../cache.constants";
import { decrypt, encrypt } from "../crypto.utils";

@Injectable()
export class InMemoryCacheProvider implements CacheProviderInterface {
  private readonly className = this.constructor.name;
  private readonly cache = new Map<
    string,
    { value: any; expiry: number | null }
  >();

  constructor(
    @Optional()
    @Inject(LOGGER_PROVIDER)
    private readonly logger?: LoggerProviderInterface,
    @Optional()
    @Inject(CACHE_ENCRYPTION_SECRET)
    private readonly encryptionSecret?: string | null,
  ) {}

  private callerLogContext(): Record<string, unknown> | undefined {
    const ctx = getContext();
    return ctx?.logContext as Record<string, unknown> | undefined;
  }

  async get<T>({ key }: GetParams): Promise<T | null> {
    const libMethod = `${this.className}.get`;
    const entry = this.cache.get(key);

    if (!entry) {
      this.logger?.debug?.({
        message: `Cache miss: ${key}`,
        context: this.className,
        meta: {
          key,
          hit: false,
          lib: LIB_NAME,
          libVersion: LIB_VERSION,
          libMethod,
          logContext: this.callerLogContext(),
        },
      });
      return null;
    }

    if (entry.expiry && Date.now() > entry.expiry) {
      this.logger?.debug?.({
        message: `Cache expired: ${key}`,
        context: this.className,
        meta: {
          key,
          hit: false,
          expired: true,
          lib: LIB_NAME,
          libVersion: LIB_VERSION,
          libMethod,
          logContext: this.callerLogContext(),
        },
      });
      this.cache.delete(key);
      return null;
    }

    this.logger?.debug?.({
      message: `Cache hit: ${key}`,
      context: this.className,
      meta: {
        key,
        hit: true,
        lib: LIB_NAME,
        libVersion: LIB_VERSION,
        libMethod,
        logContext: this.callerLogContext(),
      },
    });
    return entry.value as T;
  }

  async set<T>({ key, value, ttlInSeconds }: SetParams<T>): Promise<void> {
    const libMethod = `${this.className}.set`;
    const expiry = ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null;
    this.cache.set(key, { value, expiry });
    this.logger?.debug?.({
      message: `Cache set: ${key}`,
      context: this.className,
      meta: {
        key,
        ttlInSeconds: ttlInSeconds ?? null,
        lib: LIB_NAME,
        libVersion: LIB_VERSION,
        libMethod,
        logContext: this.callerLogContext(),
      },
    });
  }

  async del({ key }: DelParams): Promise<void> {
    const libMethod = `${this.className}.del`;
    this.cache.delete(key);
    this.logger?.debug?.({
      message: `Cache del: ${key}`,
      context: this.className,
      meta: {
        key,
        lib: LIB_NAME,
        libVersion: LIB_VERSION,
        libMethod,
        logContext: this.callerLogContext(),
      },
    });
  }

  async clear(): Promise<void> {
    const libMethod = `${this.className}.clear`;
    this.cache.clear();
    this.logger?.info?.({
      message: "Cache cleared (all keys)",
      context: this.className,
      meta: {
        lib: LIB_NAME,
        libVersion: LIB_VERSION,
        libMethod,
        logContext: this.callerLogContext(),
      },
    });
  }

  async setEncrypted<T>({
    key,
    value,
    ttlInSeconds,
    secret,
  }: SetEncryptedParams<T>): Promise<void> {
    const libMethod = `${this.className}.setEncrypted`;
    const resolvedSecret = secret ?? this.encryptionSecret;

    if (!resolvedSecret) {
      throw new Error(
        `[${LIB_NAME}] setEncrypted: no encryption secret provided. Pass a secret or configure encryptionSecret in CacheModule.forRoot().`,
      );
    }

    const ciphertext = encrypt({
      plaintext: JSON.stringify(value),
      secret: resolvedSecret,
    });
    const expiry = ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null;
    this.cache.set(key, { value: ciphertext, expiry });

    this.logger?.debug?.({
      message: `Cache setEncrypted: ${key}`,
      context: this.className,
      meta: {
        key,
        ttlInSeconds: ttlInSeconds ?? null,
        lib: LIB_NAME,
        libVersion: LIB_VERSION,
        libMethod,
        logContext: this.callerLogContext(),
      },
    });
  }

  async getEncrypted<T>({
    key,
    secret,
  }: GetEncryptedParams): Promise<T | null> {
    const libMethod = `${this.className}.getEncrypted`;
    const resolvedSecret = secret ?? this.encryptionSecret;

    if (!resolvedSecret) {
      throw new Error(
        `[${LIB_NAME}] getEncrypted: no encryption secret provided. Pass a secret or configure encryptionSecret in CacheModule.forRoot().`,
      );
    }

    const entry = this.cache.get(key);

    if (!entry) {
      this.logger?.debug?.({
        message: `Cache miss (encrypted): ${key}`,
        context: this.className,
        meta: {
          key,
          hit: false,
          lib: LIB_NAME,
          libVersion: LIB_VERSION,
          libMethod,
          logContext: this.callerLogContext(),
        },
      });
      return null;
    }

    if (entry.expiry && Date.now() > entry.expiry) {
      this.logger?.debug?.({
        message: `Cache expired (encrypted): ${key}`,
        context: this.className,
        meta: {
          key,
          hit: false,
          expired: true,
          lib: LIB_NAME,
          libVersion: LIB_VERSION,
          libMethod,
          logContext: this.callerLogContext(),
        },
      });
      this.cache.delete(key);
      return null;
    }

    try {
      const plaintext = decrypt({
        encoded: entry.value as string,
        secret: resolvedSecret,
      });
      this.logger?.debug?.({
        message: `Cache hit (encrypted): ${key}`,
        context: this.className,
        meta: {
          key,
          hit: true,
          lib: LIB_NAME,
          libVersion: LIB_VERSION,
          libMethod,
          logContext: this.callerLogContext(),
        },
      });
      return JSON.parse(plaintext) as T;
    } catch {
      this.logger?.warn?.({
        message: `Cache decryption failed: ${key}`,
        context: this.className,
        meta: {
          key,
          lib: LIB_NAME,
          libVersion: LIB_VERSION,
          libMethod,
          logContext: this.callerLogContext(),
        },
      });
      return null;
    }
  }
}
