import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExampleModule } from '@adatechnology/package-nestjs';
import { HttpClientModule } from './http-client/http-client.module';
import {
  KeycloakModule,
  KEYCLOAK_HTTP_INTERCEPTOR,
  RolesGuard,
} from '@adatechnology/auth-keycloak';
import { SecureModule } from './secure/secure.module';
import { KeycloakDemoModule } from './keycloak-demo/keycloak-demo.module';
import { LoggerModule, RequestContextMiddleware } from '@adatechnology/logger';

@Module({
  imports: [
    // register the example library with options
    LoggerModule.forRoot(),
    ExampleModule.forRoot({ prefix: 'demo', enabled: true }),
    // example http-client demo module
    // demonstrates usage of the shared http-client package against jsonplaceholder
    HttpClientModule,
    // example Keycloak infra (configured with example values)
    KeycloakModule.forRoot({
      // allow overriding the Keycloak URL/port via environment for local testing
      baseUrl:
        process.env.KEYCLOAK_BASE_URL ||
        `http://localhost:${process.env.KEYCLOAK_PORT || 9090}`,
      realm: process.env.KEYCLOAK_REALM || 'example',
      credentials: {
        clientId: process.env.KEYCLOAK_CLIENT_ID || 'example-client',
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
        // ensure grantType matches the expected literal union
        grantType:
          process.env.KEYCLOAK_GRANT_TYPE === 'password'
            ? 'password'
            : 'client_credentials',
      },
    }),
    // demo module that exposes endpoints to exercise KeycloakClient
    // (GET /keycloak/token, GET /keycloak/userinfo?token=...)
    KeycloakDemoModule,
    // secure demo that shows role-based decorators & guard
    SecureModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RolesGuard,
    // register the Keycloak HTTP interceptor as a global interceptor (useExisting to reuse provider from KeycloakModule)
    { provide: APP_INTERCEPTOR, useExisting: KEYCLOAK_HTTP_INTERCEPTOR },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
