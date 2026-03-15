import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExampleModule } from '@adatechnology/package-nestjs';
import { HttpClientModule } from './http-client/http-client.module';
import { KeycloakModule } from '@adatechnology/auth-keycloak';
import { KeycloakDemoModule } from './keycloak-demo/keycloak-demo.module';

@Module({
  imports: [
    // register the example library with options
    ExampleModule.forRoot({ prefix: 'demo', enabled: true }),
    // example http-client demo module
    // demonstrates usage of the shared http-client package against jsonplaceholder
    HttpClientModule,
    // example Keycloak infra (configured with example values)
    KeycloakModule.forRoot({
      // allow overriding the Keycloak URL/port via environment for local testing
      baseUrl: process.env.KEYCLOAK_BASE_URL || `http://localhost:${process.env.KEYCLOAK_PORT || 9090}`,
      realm: process.env.KEYCLOAK_REALM || 'BACKEND',
      credentials: {
        clientId: process.env.KEYCLOAK_CLIENT_ID || 'backend-api',
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || 'backend-api-secret',
        grantType: process.env.KEYCLOAK_GRANT_TYPE || 'client_credentials',
      },
    }),
    // demo module that exposes endpoints to exercise KeycloakClient
    // (GET /keycloak/token, GET /keycloak/userinfo?token=...)
    KeycloakDemoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
