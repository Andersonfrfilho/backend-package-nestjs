import { Global, Module, DynamicModule } from '@nestjs/common';
import { CACHE_PROVIDER } from './cache.token';
import { cacheProviders } from './cache.provider';

@Global()
@Module({})
export class CacheModule {
  static forRoot(options: { isGlobal?: boolean } = {}): DynamicModule {
    return {
      module: CacheModule,
      global: options.isGlobal ?? true,
      providers: [...cacheProviders],
      exports: [CACHE_PROVIDER],
    };
  }
}
