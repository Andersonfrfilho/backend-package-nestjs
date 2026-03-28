import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import axios from 'axios';
import { AxiosHttpProvider } from './implementations/axios/axios.http.provider';
import { HTTP_PROVIDER } from './http.token';
import { CACHE_PROVIDER, InMemoryCacheProvider } from '@adatechnology/cache';
import { HttpLoggingConfig } from './http.interface';

export interface HttpModuleOptions {
  useCache?: boolean;
  logging?: HttpLoggingConfig;
  cache?: { defaultTtl?: number; keyPrefix?: string };
}

@Global()
@Module({})
export class HttpModule {
  /**
   * Universal forRoot for the HTTP module.
   */
  static forRoot(
    configOrOptions: any = {},
    options: HttpModuleOptions = {}
  ): DynamicModule {
    const providers: Provider[] = [
      {
        provide: HTTP_PROVIDER,
        useFactory: (cache?: any) => {
          const isAxiosConfig = configOrOptions.baseURL || configOrOptions.timeout || configOrOptions.headers;
          const axiosConfig = isAxiosConfig ? configOrOptions : undefined;
          const opts = isAxiosConfig ? options : configOrOptions;
          
          const axiosInstance = axiosConfig ? axios.create(axiosConfig) : undefined;
          return new AxiosHttpProvider(axiosInstance, opts, cache);
        },
        inject: [{ token: CACHE_PROVIDER, optional: true }],
      },
    ];

    const shouldUseCache = configOrOptions.useCache !== false && options.useCache !== false;
    if (shouldUseCache) {
      providers.push({
        provide: CACHE_PROVIDER,
        useClass: InMemoryCacheProvider,
      });
    }

    return {
      module: HttpModule,
      providers,
      exports: [HTTP_PROVIDER],
    };
  }
}
