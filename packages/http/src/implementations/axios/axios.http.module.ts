import { DynamicModule, Module, Provider } from "@nestjs/common";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

import { HTTP_AXIOS_CONNECTION, HTTP_AXIOS_PROVIDER } from "../../http.token";
import { AxiosHttpProvider } from "./axios.http.provider";

@Module({})
export class HttpImplementationAxiosModule {
  static forRoot(config?: AxiosRequestConfig | AxiosInstance): DynamicModule {
    const axiosInstance: AxiosInstance =
      config && (config as AxiosInstance).request
        ? (config as AxiosInstance)
        : axios.create(config as AxiosRequestConfig);

    const providers: Provider[] = [
      {
        provide: HTTP_AXIOS_CONNECTION,
        useValue: axiosInstance,
      },
      {
        provide: HTTP_AXIOS_PROVIDER,
        useFactory: (conn: AxiosInstance) => new AxiosHttpProvider(conn),
        inject: [HTTP_AXIOS_CONNECTION],
      },
    ];

    return {
      module: HttpImplementationAxiosModule,
      providers,
      exports: [HTTP_AXIOS_CONNECTION, HTTP_AXIOS_PROVIDER],
    };
  }
}
