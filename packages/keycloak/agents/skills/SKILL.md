---
name: auth-keycloak
description: Patterns for @adatechnology/auth-keycloak. Guards (B2CGuard, B2BGuard, ApiAuthGuard, RolesGuard), decorators (@AuthUser, @CallerToken, @AccessToken), dynamic header/claim config, and Keycloak client usage.
---

# Auth Keycloak — Standards & Patterns

## Setup

```typescript
KeycloakModule.forRoot({
  baseUrl: 'http://localhost:8080',
  realm: 'my-realm',
  credentials: {
    clientId: 'my-client',
    clientSecret: 'secret',
    grantType: 'client_credentials',
  },
  // Optional: override header names and JWT claim names
  headers: {
    b2cToken: 'x-access-token',   // default
    b2bToken: 'authorization',    // default
  },
  claims: {
    userId: ['preferred_username', 'email', 'sub'],  // string or string[]
    callerId: ['client_id', 'azp'],
  },
})
```

Alternatively configure via env (comma-separated for arrays):
```env
KEYCLOAK_B2C_TOKEN_HEADER=x-access-token
KEYCLOAK_B2B_TOKEN_HEADER=authorization
KEYCLOAK_USER_ID_CLAIM=preferred_username,email,sub
KEYCLOAK_CALLER_ID_CLAIM=client_id,azp
```

---

## Header contract (set by Kong)

```
Authorization: Bearer <service_token>   → B2B caller identity
X-Access-Token: <user_jwt>              → B2C user context (original user JWT)
```

Kong validates the user JWT via JWKS (local, zero Keycloak calls per request).
All claim decoding by decorators is **local** — no I/O.

---

## Guards

| Guard | Validates | When to use |
|---|---|---|
| `B2CGuard` | `X-Access-Token` present | Route exclusively for users via Kong |
| `B2BGuard` | `Authorization` via Keycloak introspection | Route exclusively for internal services |
| `ApiAuthGuard` | Detects path and delegates | Route reachable by both paths |
| `RolesGuard` | Roles from the correct JWT | Always paired with a guard above |
| `BearerTokenGuard` | `Authorization` via introspection | Lower-level; prefer `B2BGuard` |

**Guard order matters** — authentication guards must run before `RolesGuard`.

---

## Decorators

### `@AuthUser(param?)`
Extracts a claim from `X-Access-Token` (B2C token). Default claim: configured `userId` (default: `sub`).

```ts
@AuthUser()                                           // sub (default)
@AuthUser('email')                                    // single claim
@AuthUser(['preferred_username', 'email', 'sub'])     // first non-empty wins
@AuthUser({ claim: 'email', header: 'x-user-jwt' }) // custom header per-route
```

### `@CallerToken(param?)`
Extracts a claim from `Authorization` (B2B token). Default claim: configured `callerId` (default: `azp`).

```ts
@CallerToken()                                              // azp (default)
@CallerToken('sub')                                         // single claim
@CallerToken(['client_id', 'azp'])                          // first non-empty wins
@CallerToken({ header: 'x-service-token', claim: 'azp' }) // custom header per-route
```

### `@AccessToken(header?)`
Returns the raw JWT string from the B2C header. Use for non-string claims or when forwarding the token.

```ts
@AccessToken()              // from default B2C header
@AccessToken('x-user-jwt')  // from custom header
```

### `@Roles(...)`
Declares required roles. Always used with `RolesGuard`.

```ts
@Roles('user-manager')
@Roles({ roles: ['admin', 'user-manager'], mode: 'any' })  // any (default)
@Roles({ roles: ['admin', 'user-manager'], mode: 'all' })  // all
```

---

## Examples

### B2C — user via Kong
```typescript
@Get('me')
@Roles('user-manager')
@UseGuards(B2CGuard, RolesGuard)
async getMe(
  @AuthUser() id: string,
  @AuthUser('email') email: string,
  @AuthUser(['preferred_username', 'email']) name: string,
  @AccessToken() rawToken: string,
) {
  return { id, email, name };
}
```

### B2B — internal service
```typescript
@Post('internal/notify')
@Roles('send-notifications')
@UseGuards(B2BGuard, RolesGuard)
async notify(
  @CallerToken() caller: string,  // 'domestic-backend-bff'
) {
  return { caller };
}
```

### Both paths (ApiAuthGuard)
```typescript
@Get(':id')
@Roles('user-manager')
@UseGuards(ApiAuthGuard, RolesGuard)
async findById(
  @Param('id') id: string,
  @AuthUser() userId: string,    // empty when B2B-only
  @CallerToken() caller: string,
) { ... }
```

### Custom header per-route
```typescript
@Get('special')
@UseGuards(B2CGuard)
async special(
  @AuthUser({ header: 'x-custom-token', claim: ['sub', 'email'] }) id: string,
) { ... }
```

---

## Core rules

- **Authentication guard always before RolesGuard** — `RolesGuard` alone does not verify token signatures.
- **Decorators are local** — no Keycloak calls. Kong already validated the JWT.
- **B2CGuard checks presence** of `X-Access-Token`, not validity — Kong is the validator.
- **No `X-User-Id` or `X-User-Roles` shortcuts** — all user data comes from the JWT in `X-Access-Token`.
- **When adding a new public feature**: register in `KeycloakModule`, export in `src/index.ts`, cover with tests, update README and changeset.
