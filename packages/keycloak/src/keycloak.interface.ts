/**
 * Keycloak token response
 */
export interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  "not-before-policy": number;
  session_state: string;
  scope: string;
}

/**
 * Keycloak client credentials
 */
export interface KeycloakCredentials {
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
  grantType: "client_credentials" | "password";
}

/**
 * Keycloak configuration
 */
export interface KeycloakConfig {
  baseUrl: string;
  realm: string;
  credentials: KeycloakCredentials;
  /**
   * Optional scopes to request when fetching tokens. Can be a space-separated string or array of scopes.
   * Defaults to ['openid', 'profile', 'email'] when omitted.
   */
  scopes?: string | string[];
  /**
   * Optional token cache TTL in milliseconds. If provided, KeycloakClient will use this value to
   * determine how long to cache the access token instead of deriving TTL from the token's expires_in.
   */
  tokenCacheTtl?: number;
}

/**
 * Keycloak client interface
 */
export interface KeycloakClientInterface {
  /**
   * Get access token
   */
  getAccessToken(): Promise<string>;

  /**
   * Obtain a token using resource-owner credentials (username/password).
   * Returns the full Keycloak token response so callers can access refresh tokens and other fields.
   */
  getTokenWithCredentials(params: {
    username: string;
    password: string;
  }): Promise<KeycloakTokenResponse>;

  /**
   * Refresh access token
   */
  refreshToken(refreshToken: string): Promise<KeycloakTokenResponse>;

  /**
   * Validate token
   */
  validateToken(token: string): Promise<boolean>;

  /**
   * Get user info
   */
  getUserInfo(token: string): Promise<Record<string, unknown>>;

  /**
   * Clear the internal access token cache maintained by the client.
   */
  clearTokenCache(): void;
}

/**
 * Provider-facing interface type to be used when injecting the keycloak provider token.
 * Exported separately to make the intended injection type explicit.
 */
export type KeycloakProviderInterface = KeycloakClientInterface;

/**
 * Minimal shape for decoded JWT payloads used by the RolesGuard.
 */
export interface KeycloakJwtPayload {
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
  [key: string]: unknown;
}
