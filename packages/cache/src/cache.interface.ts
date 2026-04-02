export interface CacheProviderInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;

  /**
   * Serializa, cifra (AES-256-GCM) e armazena o valor no cache.
   * @param key   Chave do cache
   * @param value Valor a ser armazenado (qualquer tipo serializável)
   * @param ttlInSeconds TTL em segundos (opcional)
   * @param secret Chave de criptografia (32 bytes / 64 hex chars). Se omitido usa a configuração do módulo.
   */
  setEncrypted<T>(key: string, value: T, ttlInSeconds?: number, secret?: string): Promise<void>;

  /**
   * Recupera, decifra e desserializa um valor armazenado com `setEncrypted`.
   * Retorna `null` se a chave não existir, estiver expirada ou se a decifração falhar.
   * @param key    Chave do cache
   * @param secret Chave de criptografia usada no `setEncrypted` correspondente.
   */
  getEncrypted<T>(key: string, secret?: string): Promise<T | null>;
}
