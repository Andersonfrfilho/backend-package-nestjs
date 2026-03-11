import { DynamicModule, Module } from "@nestjs/common";
import { AxiosInstance, AxiosRequestConfig } from "axios";

import { HttpProvider } from "./http.provider";
import { HTTP_PROVIDER } from "./http.token";
import { HttpImplementationAxiosModule } from "./implementations/axios/axios.http.module";

@Module({})
export class HttpModule {
  /**
   * Configure HttpModule with an Axios instance or AxiosRequestConfig.
   * This will import the implementation-specific module (currently Axios).
   */
  static forRoot(config?: AxiosRequestConfig | AxiosInstance): DynamicModule {
    return {
      module: HttpModule,
      imports: [HttpImplementationAxiosModule.forRoot(config)],
      providers: [
        {
          provide: HTTP_PROVIDER,
          useClass: HttpProvider,
        },
      ],
      exports: [HTTP_PROVIDER],
    };
  }
}
