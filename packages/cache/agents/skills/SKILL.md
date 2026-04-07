---
name: cache
description: Cache provider management for @adatechnology. Use for setting up in-memory or Redis cache, managing TTLs, and cache invalidation.
---

# 📦 Cache Package Standards

## 🚀 Usage Example
```typescript
@Injectable()
export class MyService {
  constructor(
    @Inject(CACHE_PROVIDER) private readonly cache: CacheProviderInterface
  ) {}

  async getCachedData() {
    const cached = await this.cache.get('my-key');
    if (cached) return cached;

    const data = await fetchData();
    await this.cache.set('my-key', data, 60); // 1 min TTL
    return data;
  }
}
```

## 🏗️ Core Patterns
- **Provider Injection**: Always use `CACHE_PROVIDER` token.
- **Async First**: All methods are async to allow seamless migration to Redis/distributed caches.
- **Private Data**: Cache keys should be scoped (e.g., `http:GET:/users/1`).
- **Lib metadata centralizado**: Use `LIB_NAME` e `LIB_VERSION` a partir de `src/cache.constants.ts` (evite hardcode).
- **Structured logs**: Em providers, manter `context`, `lib`, `libVersion`, `libMethod` e `meta` padronizados.

## 🛠️ Redis Implementation
To use Redis, implement a new provider in your app that fulfills `CacheProviderInterface` and inject it into the module.
