import { Module } from '@nestjs/common';
import { SecureController } from './secure.controller';
import { KeycloakModule } from '@adatechnology/auth-keycloak';

@Module({
  imports: [
    KeycloakModule.forRoot({
      baseUrl:
        process.env.KEYCLOAK_BASE_URL ||
        `http://localhost:${process.env.KEYCLOAK_PORT || 9090}`,
      realm: process.env.KEYCLOAK_REALM || 'example',
      credentials: {
        clientId: process.env.KEYCLOAK_CLIENT_ID || 'example-client',
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
        grantType:
          process.env.KEYCLOAK_GRANT_TYPE === 'password'
            ? 'password'
            : 'client_credentials',
      },
    }),
  ],
  controllers: [SecureController],
})
export class SecureModule {}
