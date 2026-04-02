## @adatechnology/auth-keycloak

Módulo Keycloak para autenticação de clients e usuários, seguindo o padrão do `HttpModule` do monorepo.

Este pacote fornece um cliente leve para interagir com o Keycloak (obter/refresh de tokens, introspecção, userinfo)
e um interceptor opcional. O módulo foi projetado para ser usado junto ao `@adatechnology/http-client`.

### Principais exportações

- `KeycloakModule` — módulo principal. Suporta `KeycloakModule.forRoot(config?)`.
- `KEYCLOAK_CLIENT` — provider token para injetar o cliente Keycloak (`@Inject(KEYCLOAK_CLIENT)`).
- `KEYCLOAK_HTTP_INTERCEPTOR` — provider token para injetar o interceptor (opcional).
- `Roles` / `RolesGuard` — decorator e guard para autorização baseada em roles.
- `KeycloakError` — classe de erro tipada com `statusCode` e `details`.

### Instalação

```bash
# Este pacote já declara dependências de workspace para http-client, logger e cache.
# Em um monorepo PNPM/Turbo os pacotes são resolvidos automaticamente.
```

### Uso básico

```ts
import { Module } from "@nestjs/common";
import { KeycloakModule } from "@adatechnology/auth-keycloak";

@Module({
  imports: [
    KeycloakModule.forRoot({
      baseUrl: "https://keycloak.example.com",
      realm: "myrealm",
      credentials: {
        clientId: "my-client",
        clientSecret: "my-secret",
        grantType: "client_credentials",
      },
    }),
  ],
})
export class AppModule {}
```

### Injeção do cliente

```ts
import { Inject } from '@nestjs/common';
import { KEYCLOAK_CLIENT } from '@adatechnology/auth-keycloak';
import type { KeycloakClientInterface } from '@adatechnology/auth-keycloak';

constructor(
  @Inject(KEYCLOAK_CLIENT) private readonly keycloakClient: KeycloakClientInterface,
) {}
```

### API do cliente

| Método | Descrição |
|---|---|
| `getAccessToken()` | Obtém token com cache automático e deduplicação de requisições |
| `getTokenWithCredentials({ username, password })` | Login com credenciais (resource-owner password grant) |
| `refreshToken(refreshToken)` | Renova token e atualiza o cache interno |
| `validateToken(token)` | Introspecção via endpoint `/token/introspect` |
| `getUserInfo(token)` | Retorna claims via endpoint `/userinfo` |
| `clearTokenCache()` | Remove o token do cache (útil para forçar renovação) |

### Cache de token

O `KeycloakClient` usa `@adatechnology/cache` para armazenar o access token obtido via `client_credentials`.
Por padrão é criado um `InMemoryCacheProvider` local. Você pode substituir por Redis ou qualquer implementação
de `CacheProviderInterface` injetando o provider `CACHE_PROVIDER` no contexto do módulo:

```ts
import { Module } from "@nestjs/common";
import { CacheModule } from "@adatechnology/cache";
import { KeycloakModule } from "@adatechnology/auth-keycloak";

@Module({
  imports: [
    // Registra CACHE_PROVIDER como Redis — KeycloakClient o usará automaticamente
    CacheModule.forRoot({
      type: 'redis',
      redis: { host: 'localhost', port: 6379 },
    }),
    KeycloakModule.forRoot({ ... }),
  ],
})
export class AppModule {}
```

Se `CACHE_PROVIDER` não for registrado no módulo, o `KeycloakClient` cria um `InMemoryCacheProvider`
interno sem necessidade de configuração adicional.

O TTL do cache é derivado do campo `expires_in` do token (com 60 segundos de margem). Você pode
sobrescrever com a opção `tokenCacheTtl` (em **milissegundos**):

```ts
KeycloakModule.forRoot({
  ...
  tokenCacheTtl: 60_000, // força TTL de 60 s independente do token
})
```

### Propagação de contexto de log (cascade)

O cliente lê o `logContext` do `AsyncLocalStorage` da lib `@adatechnology/logger`. Para que os logs
de downstream (keycloak → cache) mostrem `className.methodName` da origem correta, use `runWithContext`
no controller:

```ts
import { getContext, runWithContext } from '@adatechnology/logger';

// No controller
private withCtx<T>(logContext: object, fn: () => Promise<T>): Promise<T> {
  return runWithContext({ ...(getContext() ?? {}), logContext }, fn);
}

async getToken() {
  const logContext = { className: 'MyController', methodName: 'getToken' };
  return this.withCtx(logContext, () => this.keycloakService.getAccessToken());
}
```

Resultado no log:
```
[MyController.getToken][KeycloakClient.getAccessToken] → cache miss → request token
[MyController.getToken][InMemoryCacheProvider.set] → token cached
```

### Autorização com @Roles

```ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { Roles, RolesGuard } from "@adatechnology/auth-keycloak";

@Controller("secure")
export class SecureController {
  @Get("public")
  @UseGuards(RolesGuard)
  public() {
    return { ok: true };
  }

  @Get("admin")
  @UseGuards(RolesGuard)
  @Roles("admin")
  adminOnly() {
    return { ok: true };
  }

  @Get("team")
  @UseGuards(RolesGuard)
  @Roles({ roles: ["manager", "lead"], mode: "all" }) // AND — requer ambas as roles
  teamOnly() {
    return { ok: true };
  }
}
```

O `RolesGuard` extrai roles de `realm_access.roles` e `resource_access[clientId].roles` do JWT.

### Tratamento de erros

```ts
import { KeycloakError } from "@adatechnology/auth-keycloak";

try {
  await keycloakClient.getUserInfo(token);
} catch (e) {
  if (e instanceof KeycloakError) {
    console.error(e.statusCode, e.details, e.keycloakError);
  }
  throw e;
}
```

### Variáveis de ambiente (referência)

| Variável | Padrão |
|---|---|
| `KEYCLOAK_BASE_URL` | `http://localhost:8081` |
| `KEYCLOAK_REALM` | `BACKEND` |
| `KEYCLOAK_CLIENT_ID` | `backend-api` |
| `KEYCLOAK_CLIENT_SECRET` | `backend-api-secret` |

### Notas

- Este módulo depende de `@adatechnology/http-client` para chamadas HTTP ao Keycloak.
- O interceptor `KeycloakHttpInterceptor` pode ser registrado como `APP_INTERCEPTOR` para integração global.
- `clearTokenCache()` é assíncrono desde a versão `0.0.7` (retorna `Promise<void>`).

### Contribuições

Relate issues/PRs no repositório principal. Mantenha compatibilidade com o padrão usado pelo `HttpModule`.

### Licença

MIT
