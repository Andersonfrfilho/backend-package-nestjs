import { Module, DynamicModule } from "@nestjs/common";
import { HTTP_PROVIDER, HttpModule } from "@adatechnology/http-client";
import type { HttpProviderInterface } from "@adatechnology/http-client";
import type { AxiosRequestConfig, AxiosInstance } from "axios";

import { KeycloakClient } from "./keycloak.client";
import { KeycloakHttpInterceptor } from "./keycloak.http.interceptor";
import { KEYCLOAK_CLIENT, KEYCLOAK_HTTP_INTERCEPTOR } from "./keycloak.token";
import { KeycloakConfig } from "./keycloak.interface";
import { KEYCLOAK_CONFIG } from "./keycloak.token";

@Module({})
export class KeycloakModule {
  static forRoot(
    config: KeycloakConfig,
    httpConfig?: AxiosRequestConfig | AxiosInstance,
  ): DynamicModule {
    return {
      module: KeycloakModule,
      global: true,
      imports: [HttpModule.forRoot(httpConfig)],
      providers: [
        { provide: KEYCLOAK_CONFIG, useValue: config },
        {
          provide: KEYCLOAK_CLIENT,
          useFactory: (
            cfg: KeycloakConfig,
            httpProvider: HttpProviderInterface,
          ) => new KeycloakClient(cfg, httpProvider),
          inject: [KEYCLOAK_CONFIG, HTTP_PROVIDER],
        },
        {
          provide: KEYCLOAK_HTTP_INTERCEPTOR,
          useFactory: () => new KeycloakHttpInterceptor(),
        },
      ],
      exports: [KEYCLOAK_CLIENT, KEYCLOAK_HTTP_INTERCEPTOR],
    };
  }
}
