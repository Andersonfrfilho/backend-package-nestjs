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

Contribuições

Relate issues/PRs no repositório principal. Mantenha compatibilidade com o padrão usado pelo `HttpModule`.

Licença

MIT
