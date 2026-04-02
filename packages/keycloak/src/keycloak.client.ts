import { Inject, Injectable, Optional } from "@nestjs/common";
import { HTTP_PROVIDER, getHttpRequestContext } from "@adatechnology/http-client";
import type { HttpProviderInterface } from "@adatechnology/http-client";
import { getContext, LOGGER_PROVIDER, LoggerProviderInterface } from "@adatechnology/logger";
import { InMemoryCacheProvider } from "@adatechnology/cache";
import type { CacheProviderInterface } from "@adatechnology/cache";
import { CACHE_PROVIDER } from "@adatechnology/cache";

import type {
  KeycloakClientInterface,
  KeycloakConfig,
  KeycloakTokenResponse,
} from "./keycloak.interface";
import { KeycloakError } from "./errors/keycloak-error";

const LIB_NAME = "@adatechnology/auth-keycloak";
const LIB_VERSION = "0.0.7";
const TOKEN_CACHE_KEY = "keycloak:access_token";

function extractErrorInfo(err: any) {
  const statusCode = err?.status ?? err?.response?.status;
  const details = err?.response?.data ?? err?.context?.data ?? err?.context ?? err?.details;
  const errorCode = err?.code ?? err?.response?.data?.error;

  let keycloakError: string | undefined = undefined;

  if (details && typeof details === "object" && details !== null) {
    const raw = (details as Record<string, unknown>).error;
    if (typeof raw === "string") {
      keycloakError = raw;
    } else if (raw) {
      try {
        keycloakError = JSON.stringify(raw);
      } catch {
        keycloakError = String(raw);
      }
    }
  }

  return {
    statusCode,
    details: details ?? err?.message,
    keycloakError:
      keycloakError ??
      (errorCode ? `NETWORK_ERROR_${String(errorCode)}` : undefined),
  };
}

/**
 * Minimal Keycloak client implementation without external shared infra dependencies.
 */
@Injectable()
export class KeycloakClient implements KeycloakClientInterface {
  private readonly cacheProvider: CacheProviderInterface;
  private tokenPromise?: Promise<string> | null = null;

  constructor(
    private readonly config: KeycloakConfig,
    @Inject(HTTP_PROVIDER) private readonly httpProvider: HttpProviderInterface,
    @Optional() @Inject(LOGGER_PROVIDER) private readonly logger?: LoggerProviderInterface,
    @Optional() @Inject(CACHE_PROVIDER) cacheProvider?: CacheProviderInterface,
  ) {
    this.cacheProvider = cacheProvider ?? new InMemoryCacheProvider(logger);
  }

  private log(level: "debug" | "info" | "warn" | "error", message: string, libMethod: string, meta?: Record<string, unknown>) {
    if (!this.logger) return;

    const loggerCtx = getContext() as Record<string, unknown> | undefined;
    const httpCtx = getHttpRequestContext();

    const logContext = loggerCtx?.logContext as { className?: string; methodName?: string } | undefined;
    const requestId = (loggerCtx?.requestId as string | undefined) ?? httpCtx?.requestId;

    const source = logContext?.className && logContext?.methodName
      ? `${logContext.className}.${logContext.methodName}`
      : (httpCtx?.className && httpCtx?.methodName ? `${httpCtx.className}.${httpCtx.methodName}` : undefined);

    const payload = {
      message,
      context: "KeycloakClient",
      lib: LIB_NAME,
      libVersion: LIB_VERSION,
      libMethod,
      source,
      requestId,
      meta,
    };

    if (level === "debug") this.logger.debug(payload);
    else if (level === "info") this.logger.info(payload);
    else if (level === "warn") this.logger.warn(payload);
    else if (level === "error") this.logger.error(payload);
  }

  async getAccessToken(): Promise<string> {
    const method = "getAccessToken";
    this.log("debug", `${method} - Start`, method);

    // Check cache
    const cached = await this.cacheProvider.get<string>(TOKEN_CACHE_KEY);
    if (cached) {
      this.log("debug", `${method} - Returning cached token`, method);
      return cached;
    }

    if (this.tokenPromise) {
      this.log("debug", `${method} - Waiting for existing token request`, method);
      return this.tokenPromise;
    }

    this.tokenPromise = (async (): Promise<string> => {
      try {
        const tokenResponse = await this.requestToken();
        const ttlSeconds = this.config.tokenCacheTtl
          ? Math.floor(this.config.tokenCacheTtl / 1000)
          : tokenResponse.expires_in - 60;
        await this.cacheProvider.set(TOKEN_CACHE_KEY, tokenResponse.access_token, ttlSeconds);
        this.log("debug", `${method} - Token obtained and cached`, method);
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
    const method = "getTokenWithCredentials";
    const { username } = params;
    this.log("info", `${method} - Start for user: ${username}`, method);

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

    body.append("scope", KeycloakClient.scopesToString(this.config.scopes));

    try {
      const response = await this.httpProvider.post<KeycloakTokenResponse>({
        url: tokenUrl,
        data: body,
        config: {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          logContext: { className: "KeycloakClient", methodName: method },
        },
      });

      this.log("info", `${method} - Success for user: ${username}`, method);
      return response.data;
    } catch (err: unknown) {
      const { statusCode, details, keycloakError } = extractErrorInfo(err);
      this.log("error", `${method} - Failed for user: ${username}`, method, { statusCode, keycloakError });

      throw new KeycloakError("Failed to obtain token with credentials", {
        statusCode,
        details,
        keycloakError,
      });
    }
  }

  private async requestToken(): Promise<KeycloakTokenResponse> {
    const method = "requestToken";
    this.log("debug", `${method} - Start`, method);

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
        data.append("scope", KeycloakClient.scopesToString(this.config.scopes));
      }
    }

    try {
      const response = await this.httpProvider.post<KeycloakTokenResponse>({
        url: tokenUrl,
        data,
        config: {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          logContext: { className: "KeycloakClient", methodName: method },
        },
      });
      this.log("debug", `${method} - Success`, method);
      return response.data;
    } catch (err: unknown) {
      const { statusCode, details, keycloakError } = extractErrorInfo(err);
      this.log("error", `${method} - Failed`, method, { statusCode, keycloakError });

      throw new KeycloakError("Failed to request token", {
        statusCode,
        details,
        keycloakError,
      });
    }
  }

  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    const method = "refreshToken";
    this.log("debug", `${method} - Start`, method);

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
          logContext: { className: "KeycloakClient", methodName: method },
        },
      });

      const ttlSeconds = this.config.tokenCacheTtl
        ? Math.floor(this.config.tokenCacheTtl / 1000)
        : response.data.expires_in - 60;
      await this.cacheProvider.set(TOKEN_CACHE_KEY, response.data.access_token, ttlSeconds);

      this.log("debug", `${method} - Success`, method);
      return response.data;
    } catch (err: unknown) {
      const { statusCode, details, keycloakError } = extractErrorInfo(err);
      this.log("error", `${method} - Failed`, method, { statusCode, keycloakError });

      throw new KeycloakError("Failed to refresh token", {
        statusCode,
        details,
        keycloakError,
      });
    }
  }

  async validateToken(token: string): Promise<boolean> {
    const method = "validateToken";
    this.log("debug", `${method} - Start`, method);

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
          logContext: { className: "KeycloakClient", methodName: method },
        },
      });

      const active = response.data?.active === true;
      this.log("debug", `${method} - Success (Active: ${active})`, method);
      return active;
    } catch (error: unknown) {
      const { statusCode, details, keycloakError } = extractErrorInfo(error);
      this.log("error", `${method} - Failed`, method, { statusCode, keycloakError });

      throw new KeycloakError("Token introspection failed", {
        statusCode,
        details,
        keycloakError,
      });
    }
  }

  async getUserInfo(token: string): Promise<Record<string, unknown>> {
    const method = "getUserInfo";
    this.log("debug", `${method} - Start`, method);

    const userInfoUrl = `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/userinfo`;
    try {
      const response = await this.httpProvider.get<Record<string, unknown>>({
        url: userInfoUrl,
        config: {
          headers: { Authorization: `Bearer ${token}` },
          logContext: { className: "KeycloakClient", methodName: method },
        },
      });

      this.log("debug", `${method} - Success`, method);
      return response.data;
    } catch (err: unknown) {
      const { statusCode, details, keycloakError } = extractErrorInfo(err);
      this.log("error", `${method} - Failed`, method, { statusCode, keycloakError });

      throw new KeycloakError("Failed to retrieve userinfo", {
        statusCode,
        details,
        keycloakError,
      });
    }
  }

  async clearTokenCache(): Promise<void> {
    await this.cacheProvider.del(TOKEN_CACHE_KEY);
  }

  private static scopesToString(scopes?: string | string[]): string {
    if (!scopes) return "openid profile email";
    return Array.isArray(scopes) ? scopes.join(" ") : String(scopes);
  }
}
