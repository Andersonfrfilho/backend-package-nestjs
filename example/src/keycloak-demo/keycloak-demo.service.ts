import { Inject, Injectable } from '@nestjs/common';
import type { KeycloakClientInterface } from '@adatechnology/auth-keycloak';
import { KEYCLOAK_CLIENT } from '@adatechnology/auth-keycloak';

@Injectable()
export class KeycloakDemoService {
  constructor(
    @Inject(KEYCLOAK_CLIENT)
    private readonly keycloakClient: KeycloakClientInterface,
  ) {}

  async getAccessToken(): Promise<string> {
    return this.keycloakClient.getAccessToken();
  }

  async getUserInfo(token: string): Promise<any> {
    return this.keycloakClient.getUserInfo(token);
  }

  /**
   * Obtain a token using resource-owner credentials (username/password).
   */
  async loginWithCredentials(username: string, password: string): Promise<any> {
    // @ts-ignore: method exists on implementation
    return (this.keycloakClient as any).getTokenWithCredentials(
      username,
      password,
    );
  }
}
