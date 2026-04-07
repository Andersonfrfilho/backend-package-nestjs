import pkg from "../package.json";

export const LIB_NAME = pkg.name;
export const LIB_VERSION = pkg.version;

export const LOG_CONTEXT = {
  IN_MEMORY_CACHE_PROVIDER: "InMemoryCacheProvider",
  REDIS_CACHE_PROVIDER: "RedisCacheProvider",
} as const;