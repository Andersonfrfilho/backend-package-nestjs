import { Inject, Injectable, Optional } from "@nestjs/common";
import { HTTP_PROVIDER } from "@adatechnology/http-client";
import type { HttpProviderInterface } from "@adatechnology/http-client";
import { LOGGER_PROVIDER, LoggerProviderInterface } from "@adatechnology/logger";

import type {
  KeycloakClientInterface,
  KeycloakConfig,
  KeycloakTokenResponse,
} from "./keycloak.interface";
import { KeycloakError } from "./errors/keycloak-error";

function extractErrorInfo(err: unknown) {
  const e = err as Record<string, unknown> | undefined;
  if (e && typeof e.response === "object" && e.response !== null) {
    const resp = e.response as Record<string, unknown>;
    const statusCode =
      typeof resp.status === "number" ? (resp.status as number) : undefined;
    const details = resp.data ?? undefined;
    let keycloakError: string | undefined = undefined;
    if (
      details &&
      typeof details === "object" &&
      "error" in (details as Record<string, unknown>)
    ) {
      const raw = (details as Record<string, unknown>).error;
      if (typeof raw === "string") keycloakError = raw;
      else {
        try {
          keycloakError = JSON.stringify(raw);
        } catch {
          keycloakError = String(raw);
        }
      }
    }

    return { statusCode, details, keycloakError };
  }
  return {
    details: e && typeof e.message === "string" ? e.message : undefined,
  };
}

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
    @Optional() @Inject(LOGGER_PROVIDER) private readonly logger?: LoggerProviderInterface,
  ) {
    this.logger?.setContext?.("KeycloakClient");
  }

  async getAccessToken(): Promise<string> {
    this.logger?.debug?.({ message: "getAccessToken - Start" });
    // Check cache
    const now = Date.now();
    if (this.tokenCache && now < this.tokenCache.expiresAt) {
      this.logger?.debug?.({ message: "getAccessToken - Returning cached token" });
      return this.tokenCache.token;
    }

    if (this.tokenPromise) {
      this.logger?.debug?.({ message: "getAccessToken - Waiting for existing token request" });
      return this.tokenPromise;
    }

    this.tokenPromise = (async (): Promise<string> => {
      try {
        const tokenResponse = await this.requestToken();
        const expiresAt = this.config.tokenCacheTtl
          ? Date.now() + this.config.tokenCacheTtl
          : Date.now() + (tokenResponse.expires_in - 60) * 1000;
        this.tokenCache = { token: tokenResponse.access_token, expiresAt };
        this.logger?.debug?.({ message: "getAccessToken - Token obtained and cached" });
        return tokenResponse.access_token;
      } finally {
        this.tokenPromise = null;
      }
    })();

    return this.tokenPromise;
  }

  async getTokenWithCredentials(params: {
    username: string;
    password: string;
  }) {
    const { username } = params;
    this.logger?.info?.({ message: `getTokenWithCredentials - Start for user: ${username}` });
    const { password } = params;
    const tokenUrl = `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/token`;

    const body = new URLSearchParams();
    body.append("client_id", this.config.credentials.clientId);
    body.append("grant_type", "password");
    body.append("username", username);
    body.append("password", password);
    if (this.config.credentials.clientSecret) {
      body.append("client_secret", this.config.credentials.clientSecret);
    }

    // include configured scopes (default to openid/profile/email)
    body.append("scope", KeycloakClient.scopesToString(this.config.scopes));

    try {
      const response = await this.httpProvider.post<KeycloakTokenResponse>({
        url: tokenUrl,
        data: body,
        config: {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      });

      this.logger?.info?.({ message: `getTokenWithCredentials - Success for user: ${username}` });
      return response.data;
    } catch (err: unknown) {
      const { statusCode, details, keycloakError } = extractErrorInfo(err);
      this.logger?.error?.({
        message: `getTokenWithCredentials - Failed for user: ${username}`,
        meta: { statusCode, keycloakError }
      });
      throw new KeycloakError("Failed to obtain token with credentials", {
        statusCode,
        details,
        keycloakError,
      });
    }
  }

  private async requestToken(): Promise<KeycloakTokenResponse> {
    this.logger?.debug?.({ message: "requestToken - Start" });
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
        // include configured scopes for resource-owner password grants
        data.append("scope", KeycloakClient.scopesToString(this.config.scopes));
      }
    }

    try {
      const response = await this.httpProvider.post<KeycloakTokenResponse>({
        url: tokenUrl,
        data,
        config: {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      });
      this.logger?.debug?.({ message: "requestToken - Success" });
      return response.data;
    } catch (err: unknown) {
      const { statusCode, details, keycloakError } = extractErrorInfo(err);
      this.logger?.error?.({
        message: "requestToken - Failed",
        meta: { statusCode, keycloakError }
      });
      throw new KeycloakError("Failed to request token", {
        statusCode,
        details,
        keycloakError,
      });
    }
  }

  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    this.logger?.debug?.({ message: "refreshToken - Start" });
    const tokenUrl = `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/token`;

    const data = new URLSearchParams();
    data.append("client_id", this.config.credentials.clientId);
    data.append("grant_type", "refresh_token");
    data.append("refresh_token", refreshToken);
    if (this.config.credentials.clientSecret) {
      data.append("client_secret", this.config.credentials.clientSecret);
    }

    try {
      const response = await this.httpProvider.post<KeycloakTokenResponse>({
        url: tokenUrl,
        data,
        config: {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      });

      const expiresAt = this.config.tokenCacheTtl
        ? Date.now() + this.config.tokenCacheTtl
        : Date.now() + (response.data.expires_in - 60) * 1000;
      this.tokenCache = { token: response.data.access_token, expiresAt };

      this.logger?.debug?.({ message: "refreshToken - Success" });
      return response.data;
    } catch (err: unknown) {
      const { statusCode, details, keycloakError } = extractErrorInfo(err);
      this.logger?.error?.({
        message: "refreshToken - Failed",
        meta: { statusCode, keycloakError }
      });
      throw new KeycloakError("Failed to refresh token", {
        statusCode,
        details,
        keycloakError,
      });
    }
  }

  async validateToken(token: string): Promise<boolean> {
    this.logger?.debug?.({ message: "validateToken - Start" });
    try {
      const introspectUrl = `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/token/introspect`;

      const data = new URLSearchParams();
      data.append("token", token);
      data.append("client_id", this.config.credentials.clientId);
      if (this.config.credentials.clientSecret) {
        data.append("client_secret", this.config.credentials.clientSecret);
      }

      const response = await this.httpProvider.post<{ active: boolean }>({
        url: introspectUrl,
        data,
        config: {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      });

      const active = response.data?.active === true;
      this.logger?.debug?.({ message: `validateToken - Success (Active: ${active})` });
      return active;
    } catch (error: unknown) {
      const { statusCode, details, keycloakError } = extractErrorInfo(error);
      this.logger?.error?.({
        message: "validateToken - Failed",
        meta: { statusCode, keycloakError }
      });
      // wrap introspection errors for callers
      throw new KeycloakError("Token introspection failed", {
        statusCode,
        details,
        keycloakError,
      });
    }
  }

  async getUserInfo(token: string): Promise<Record<string, unknown>> {
    this.logger?.debug?.({ message: "getUserInfo - Start" });
    const userInfoUrl = `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/userinfo`;
    try {
      const response = await this.httpProvider.get<Record<string, unknown>>({
        url: userInfoUrl,
        config: { headers: { Authorization: `Bearer ${token}` } },
      });

      this.logger?.debug?.({ message: "getUserInfo - Success" });
      return response.data;
    } catch (err: unknown) {
      const { statusCode, details, keycloakError } = extractErrorInfo(err);
      this.logger?.error?.({
        message: "getUserInfo - Failed",
        meta: { statusCode, keycloakError }
      });
      throw new KeycloakError("Failed to retrieve userinfo", {
        statusCode,
        details,
        keycloakError,
      });
    }
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

  private static scopesToString(scopes?: string | string[]): string {
    if (!scopes) return "openid profile email";
    return Array.isArray(scopes) ? scopes.join(" ") : String(scopes);
  }
}
