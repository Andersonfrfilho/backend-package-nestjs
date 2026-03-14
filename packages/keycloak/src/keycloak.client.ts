import { Inject, Injectable } from "@nestjs/common";
import { HTTP_PROVIDER } from "@adatechnology/http-client";
import type { HttpProviderInterface } from "@adatechnology/http-client";

import type {
  KeycloakClientInterface,
  KeycloakConfig,
  KeycloakTokenResponse,
} from "./keycloak.interface";

/**
 * Minimal Keycloak client implementation without external shared infra dependencies.
 */
@Injectable()
export class KeycloakClient implements KeycloakClientInterface {
  private tokenCache: { token: string; expiresAt: number } | null = null;
  private tokenPromise?: Promise<string> | null = null;

  constructor(
    private readonly config: KeycloakConfig,
    @Inject(HTTP_PROVIDER) private readonly httpProvider: HttpProviderInterface,
  ) {}

  async getAccessToken(): Promise<string> {
    // Check cache
    const now = Date.now();
    if (this.tokenCache && now < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    if (this.tokenPromise) return this.tokenPromise;

    this.tokenPromise = (async (): Promise<string> => {
      try {
        const tokenResponse = await this.requestToken();
        const expiresAt = Date.now() + (tokenResponse.expires_in - 60) * 1000;
        this.tokenCache = { token: tokenResponse.access_token, expiresAt };
        return tokenResponse.access_token;
      } finally {
        this.tokenPromise = null;
      }
    })();

    return this.tokenPromise;
  }

  async getTokenWithCredentials(username: string, password: string) {
    const tokenUrl = `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/token`;

    const data = new URLSearchParams();
    data.append("client_id", this.config.credentials.clientId);
    data.append("grant_type", "password");
    data.append("username", username);
    data.append("password", password);
    if (this.config.credentials.clientSecret) {
      data.append("client_secret", this.config.credentials.clientSecret);
    }

    const response = await this.httpProvider.post<any>(tokenUrl, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    } as any);

    return response.data;
  }

  private async requestToken(): Promise<KeycloakTokenResponse> {
    const tokenUrl = `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/token`;

    const data = new URLSearchParams();
    data.append("client_id", this.config.credentials.clientId);
    data.append("grant_type", this.config.credentials.grantType);
    if (this.config.credentials.clientSecret) {
      data.append("client_secret", this.config.credentials.clientSecret);
    }

    if (this.config.credentials.grantType === "password") {
      if (
        this.config.credentials.username &&
        this.config.credentials.password
      ) {
        data.append("username", this.config.credentials.username);
        data.append("password", this.config.credentials.password);
      }
    }

    const response = await this.httpProvider.post<KeycloakTokenResponse>(
      tokenUrl,
      data,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      } as any,
    );

    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    const tokenUrl = `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/token`;

    const data = new URLSearchParams();
    data.append("client_id", this.config.credentials.clientId);
    data.append("grant_type", "refresh_token");
    data.append("refresh_token", refreshToken);
    if (this.config.credentials.clientSecret) {
      data.append("client_secret", this.config.credentials.clientSecret);
    }

    const response = await this.httpProvider.post<KeycloakTokenResponse>(
      tokenUrl,
      data,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    const expiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
    this.tokenCache = { token: response.data.access_token, expiresAt };

    return response.data;
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const introspectUrl = `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/token/introspect`;

      const data = new URLSearchParams();
      data.append("token", token);
      data.append("client_id", this.config.credentials.clientId);
      if (this.config.credentials.clientSecret) {
        data.append("client_secret", this.config.credentials.clientSecret);
      }

      const response = await this.httpProvider.post(introspectUrl, data, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      } as any);

      return (response.data as any).active === true;
    } catch (error: any) {
      return false;
    }
  }

  async getUserInfo(token: string): Promise<any> {
    const userInfoUrl = `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/userinfo`;

    const response = await this.httpProvider.get(userInfoUrl, {
      headers: { Authorization: `Bearer ${token}` },
    } as any);

    return response.data;
  }

  clearTokenCache(): void {
    this.tokenCache = null;
  }

  private static maskToken(token: string, visibleChars = 8): string {
    if (!token || typeof token !== "string") return "";
    return token.length <= visibleChars
      ? token
      : `${token.slice(0, visibleChars)}...`;
  }
}
