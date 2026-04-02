import { Global, Module, DynamicModule } from '@nestjs/common';

import { cacheProviders } from './cache.provider';
import { CACHE_ENCRYPTION_SECRET, CACHE_PROVIDER } from './cache.token';

export interface CacheModuleOptions {
  isGlobal?: boolean;
  /**
   * Secret usado por `setEncrypted` / `getEncrypted`.
   * Deve ter pelo menos 16 caracteres. Se omitido, as chamadas de criptografia
   * lançarão um erro explícito pedindo o secret.
   */
  encryptionSecret?: string;
}

@Global()
@Module({})
export class CacheModule {
  static forRoot(options: CacheModuleOptions = {}): DynamicModule {
    const secretProvider = {
      provide: CACHE_ENCRYPTION_SECRET,
      useValue: options.encryptionSecret ?? null,
    };

    return {
      module: CacheModule,
      global: options.isGlobal ?? true,
      providers: [...cacheProviders, secretProvider],
      exports: [CACHE_PROVIDER, CACHE_ENCRYPTION_SECRET],
    };
  }
}
