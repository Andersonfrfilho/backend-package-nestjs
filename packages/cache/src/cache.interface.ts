export interface CacheProviderInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
}
