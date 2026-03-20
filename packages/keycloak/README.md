## @adatechnology/auth-keycloak

Módulo Keycloak para autenticação de clients e usuários, seguindo o padrão do `HttpModule` do monorepo.

Este pacote fornece um cliente leve para interagir com o Keycloak (obter/refresh de tokens, introspecção, userinfo)
e um interceptor opcional. O módulo foi projetado para ser usado junto ao `@adatechnology/http-client`.

Principais exportações

- `KeycloakModule` — módulo principal. Suporta `KeycloakModule.forRoot(config?)` (padrão dinâmico).
- `KEYCLOAK_CLIENT` — provider token para injetar o cliente Keycloak (use `@Inject(KEYCLOAK_CLIENT)`).
- `KEYCLOAK_HTTP_INTERCEPTOR` — provider token para injetar o interceptor (se necessário).

Instalação

Este pacote já declara dependência interna de workspace para `@adatechnology/http-client`. Em um monorepo PNPM/Turbo o pacote é resolvido automaticamente.

Uso

- Configuração via código (recomendado quando quiser injetar configuração manualmente):

```ts
import { Module } from "@nestjs/common";
import { HttpModule } from "@adatechnology/http-client";
import { KeycloakModule } from "@adatechnology/auth-keycloak";

@Module({
  imports: [
    HttpModule.forRoot({ baseURL: "https://pokeapi.co/api/v2", timeout: 5000 }),
    KeycloakModule.forRoot({
      baseUrl: "https://keycloak.example.com",
      realm: "BACKEND",
      credentials: {
        clientId: "backend-api",
        clientSecret: "backend-api-secret",
        grantType: "client_credentials",
      },
    }),
  ],
})
export class AppModule {}
```

- Configuração via `ConfigService` / variáveis de ambiente (padrão quando não passar `forRoot`):

As variáveis usadas pelo módulo interno são:

- `KEYCLOAK_BASE_URL` (padrão: `http://localhost:8081`)
- `KEYCLOAK_REALM` (padrão: `BACKEND`)
- `KEYCLOAK_CLIENT_ID` (padrão: `backend-api`)
- `KEYCLOAK_CLIENT_SECRET` (padrão: `backend-api-secret`)

API rápida (via token)

- `KEYCLOAK_CLIENT.getAccessToken()` — obtém token com cache e deduplicação de requisições.
- `KEYCLOAK_CLIENT.refreshToken(refreshToken)` — renova token.
- `KEYCLOAK_CLIENT.validateToken(token)` — introspecção no Keycloak.
- `KEYCLOAK_CLIENT.getUserInfo(token)` — retorna userinfo.

Exemplo de injeção no NestJS:

```ts
import { Inject } from '@nestjs/common';
import { KEYCLOAK_CLIENT } from '@adatechnology/auth-keycloak';
import type { KeycloakClientInterface } from '@adatechnology/auth-keycloak';

constructor(@Inject(KEYCLOAK_CLIENT) private readonly keycloakClient: KeycloakClientInterface) {}
```

Notas

- Este módulo depende de `@adatechnology/http-client` (provider `HTTP_PROVIDER`) para realizar chamadas HTTP ao Keycloak. Configure o `HttpModule` conforme necessário na aplicação que consome este pacote.
- O interceptor `KeycloakHttpInterceptor` é fornecido caso queira integrar com outras camadas que aceitem interceptors.

## Autorização (decorator @Roles)

O pacote agora fornece um decorator `@Roles()` e um `RolesGuard` para uso nas rotas do NestJS. Exemplos:

```ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { Roles } from "@adatechnology/auth-keycloak";
import { RolesGuard } from "@adatechnology/auth-keycloak";

@Controller("secure")
@UseGuards(RolesGuard)
export class SecureController {
  @Get("admin")
  @Roles("admin") // aceita um ou mais roles (OR por padrão)
  adminOnly() {
    return { ok: true };
  }

  @Get("team")
  @Roles({ roles: ["manager", "lead"], mode: "all" }) // requer ambos (AND)
  teamOnly() {
    return { ok: true };
  }
}
```

O `RolesGuard` extrai roles do payload do JWT (claims `realm_access.roles` e `resource_access[clientId].roles`). Por padrão o decorator verifica ambos (realm e client). Você pode ajustar o comportamento usando as opções `{ type: 'realm'|'client'|'both' }`.

## Erros

O pacote exporta `KeycloakError` (classe) que é usada para representar falhas nas chamadas HTTP ao Keycloak. A classe contém `statusCode` e `details` para permitir um tratamento declarativo dos erros na aplicação que consome a biblioteca. Exemplo:

```ts
import { KeycloakError } from "@adatechnology/auth-keycloak";

try {
  await keycloakClient.getUserInfo(token);
} catch (e) {
  if (e instanceof KeycloakError) {
    // tratar problema específico de Keycloak
    console.error(e.statusCode, e.details);
  }
  throw e;
}
```

Contribuições

Relate issues/PRs no repositório principal. Mantenha compatibilidade com o padrão usado pelo `HttpModule`.

Licença

MIT
