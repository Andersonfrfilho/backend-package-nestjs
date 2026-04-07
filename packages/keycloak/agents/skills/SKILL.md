---
name: auth-keycloak
description: Patterns for @adatechnology/auth-keycloak. Use for Keycloak config, guard stack B2B (BearerTokenGuard + RolesGuard), structured logging and standardized error handling.
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

## 🛡️ Guard Stack B2B (padrão obrigatório)
```typescript
@Controller('orders')
export class OrdersController {
  @Post()
  @Roles('manage-requests')
  @UseGuards(BearerTokenGuard, RolesGuard)
  create(@Headers('x-user-id') keycloakId: string) {
    return { ok: true, keycloakId };
  }
}
```

### Ordem e responsabilidade dos guards
- `BearerTokenGuard` (sempre primeiro): autenticação via introspecção (`/token/introspect`) → **401** em falha.
- `RolesGuard` (depois): autorização por roles no payload JWT → **403** em falha.

> `RolesGuard` sozinho não autentica token (apenas decodifica payload). Para rotas B2B, use sempre os dois guards em sequência.

## 🏗️ Core Patterns
- **HTTP Interceptor**: `KeycloakHttpInterceptor` automatically adds Bearer tokens to outgoing calls.
- **Token Extraction**: Guards must extract and validate the JWT from the `Authorization` header.
- **Constantes centralizadas**: manter metadados e códigos em `keycloak.constants.ts` (`LIB_NAME`, `LIB_VERSION`, `LOG_CONTEXT`, `HTTP_STATUS`, `*_ERROR_CODE`).
- **Semântica de erro**:
  - autenticação inválida/missing token/configuração ausente/introspecção falhou → 401 (`BEARER_ERROR_CODE`)
  - papéis insuficientes → 403 (`ROLES_ERROR_CODE`)
- **Logs estruturados**: sempre incluir `context`, `lib`, `libVersion`, `libMethod`, `requestId` e `meta` quando houver logger disponível.
- **Ao adicionar nova feature pública**:
  1. registrar provider no `KeycloakModule`
  2. exportar no `src/index.ts`
  3. cobrir com testes (happy path + cenários de falha)
  4. atualizar README e changeset
- **Metadados da lib por package.json**: se usar `import pkg from "../package.json"`, manter `resolveJsonModule: true` e `package.json` no `include` do `tsconfig`.

## 🧪 Local Dev
Use the `example-realm.json` in `example/keycloak-config` to bootstrap a local Keycloak instance via Docker.
