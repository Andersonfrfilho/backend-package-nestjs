---
name: auth-keycloak
description: Patterns for @adatechnology/auth-keycloak. Use for Keycloak config, @Roles() decorators, and RolesGuard authorization.
---

# 🔐 Auth Keycloak Standards

## 🚀 Setup Example
```typescript
KeycloakModule.forRoot({
  baseUrl: 'http://localhost:9090',
  realm: 'my-realm',
  credentials: {
    clientId: 'my-client',
    clientSecret: 'secret',
    grantType: 'client_credentials',
  },
})
```

## 🛡️ Authorization Example
```typescript
@Controller('secure')
@UseGuards(RolesGuard)
export class SecureController {
  @Get()
  @Roles('admin', 'editor')
  findAll() {
    return 'Secure data';
  }
}
```

## 🏗️ Core Patterns
- **HTTP Interceptor**: `KeycloakHttpInterceptor` automatically adds Bearer tokens to outgoing calls.
- **Token Extraction**: Guards must extract and validate the JWT from the `Authorization` header.

## 🧪 Local Dev
Use the `example-realm.json` in `example/keycloak-config` to bootstrap a local Keycloak instance via Docker.
