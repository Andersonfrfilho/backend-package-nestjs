# Keycloak (example)

This folder contains a minimal Docker Compose that runs a Keycloak server and imports a basic realm for testing the local `@adatechnology/auth-keycloak` package.

Files:

- `docker-compose.yml` — runs Keycloak and imports JSON files placed in `keycloak-config/`.
- `keycloak-config/example-realm.json` — minimal realm named `example` with one public client `example-client` and a user `test` (password `test`).

Run:

```bash
# from the `example/` folder
# Copy `.env.example` to `.env` to override defaults (recommended)
# The example repository provides `example/.env.example` with KEYCLOAK_PORT=9090.
# Use that port to avoid conflicts with other local Keycloak instances.
docker compose up -d

# Keycloak admin console after start (example default):
# URL: http://localhost:9090/  (or the value of KEYCLOAK_PORT in .env)
# Username: admin
# Password: admin
```

Imported realm: `example`.

Override host port:

The compose file reads `KEYCLOAK_PORT` from the environment (default 8080). You can change it by editing the provided `.env` file or by exporting the variable before starting:

```bash
# use a different host port (e.g. 9080)
KEYCLOAK_PORT=9080 docker compose up -d
```

Notes:

- The Docker image used is `quay.io/keycloak/keycloak:21.1.1` and is started in `start-dev` mode with `--import-realm` so any json files under `keycloak-config/` are picked up. The compose mounts `./keycloak-config` into the container at `/opt/keycloak/data/import`.
- If the Keycloak image version in your environment differs, adjust the `image` field in `docker-compose.yml`.

Import troubleshooting and manual import

- Se o realm não for encontrado ("Realm does not exist"), verifique primeiro se não há outra instância do Keycloak rodando em outra porta (ex.: 8080). Use o `KEYCLOAK_PORT` no `.env` para apontar para a porta do exemplo.
- Verifique que o arquivo JSON está presente no host e montado no container:

```bash
cd example
ls -la keycloak-config
docker compose exec keycloak ls -la /opt/keycloak/data/import
```

- Se o arquivo não for montado, o `docker compose` pode ter sido executado de outro diretório ou o bind está incorreto. Para forçar nova importação (ATENÇÃO: `-v` remove volumes):

```bash
docker compose down -v
docker compose up -d
docker compose logs keycloak --tail=200
```

- Alternativamente, importe manualmente via Admin Console: acesse http://localhost:9090 (ou porta definida), entre com admin/admin → Realms → Add realm → Import e carregue `example/keycloak-config/example-realm.json`.

## Testes manuais (curl)

Abaixo há exemplos de comandos curl úteis para testar o realm `example` e o client público `example-client` após subir o Keycloak (assumindo que está em http://localhost:8080):

- Obter token (Resource Owner Password Credentials — usa o usuário `test`/`test`):

```bash
curl -X POST "http://localhost:8080/realms/example/protocol/openid-connect/token" \
	-H "Content-Type: application/x-www-form-urlencoded" \
	-d "client_id=example-client" \
	-d "username=test" \
	-d "password=test" \
	-d "grant_type=password"
```

O comando acima retorna um JSON com `access_token`, `refresh_token`, etc. Copie o `access_token` para os próximos testes.

- Obter informações do usuário (endpoint userinfo):

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
	"http://localhost:8080/realms/example/protocol/openid-connect/userinfo"
```

- Informações de descoberta (OpenID Connect):

```bash
curl "http://localhost:8080/realms/example/.well-known/openid-configuration"
```

- JWKS (chaves públicas para validar tokens):

```bash
curl "http://localhost:8080/realms/example/protocol/openid-connect/certs"
```

- Trocar refresh token por um novo access token:

```bash
curl -X POST "http://localhost:8080/realms/example/protocol/openid-connect/token" \
	-H "Content-Type: application/x-www-form-urlencoded" \
	-d "client_id=example-client" \
	-d "grant_type=refresh_token" \
	-d "refresh_token=<REFRESH_TOKEN>"
```

Observações:

- Alguns endpoints (introspect/revoke) podem exigir um client secreto ou configuração específica no client (aqui usamos o client público `example-client`).
- Substitua `localhost:8080` pelo valor de `KEYCLOAK_PORT` caso você tenha alterado a porta de exposição.

## Testes via API do example (curl)

Os testes manuais podem ser feitos também através da API `example` (exposta por padrão em http://localhost:3000). Os endpoints úteis já implementados:

- GET `/keycloak/token` — solicita ao serviço que recupere um access token do Keycloak e retorne `{ access_token }`.
- GET `/keycloak/userinfo?token=<TOKEN>` — solicita ao serviço que recupere o userinfo a partir de um token.

Exemplos:

1. Inicie a aplicação `example` (na pasta `example/`). Use pnpm/npm conforme preferir:

```bash
# na pasta example/
pnpm install # ou npm install
pnpm run start:dev # ou npm run start:dev
```

2. Obter token via API `example` e extrair com `jq`:

```bash
TOKEN=$(curl -s "http://localhost:3000/keycloak/token" | jq -r .access_token)
echo "$TOKEN"
```

3. Usar o token para obter userinfo via API `example`:

```bash
curl "http://localhost:3000/keycloak/userinfo?token=$TOKEN"
```

## Endpoints de exemplo para autorização (roles)

O exemplo inclui rotas de demonstração em `/secure` que mostram o uso do `@Roles()` e do `RolesGuard`:

- GET `/secure/public` — rota pública
- GET `/secure/admin` — requer role `admin`
- GET `/secure/team` — requer BOTH `manager` e `lead` (mode: `all`)
- GET `/secure/whoami` — rota auxiliar (pública)

Exemplo de uso com token:

```bash
TOKEN=$(curl -s "http://localhost:3000/keycloak/token" | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/secure/admin
```

Se o token não tiver a role necessária você receberá `403 Forbidden`.

O `KeycloakHttpInterceptor` também é registrado globalmente neste exemplo (via `APP_INTERCEPTOR`) para demonstrar integração; na sua aplicação de produção você pode optar por registrar o interceptor apenas em módulos específicos.

- Fazer login (username/password) via API `example` — POST `/keycloak/login`:

```bash
curl -s -X POST "http://localhost:3000/keycloak/login" \
	-H "Content-Type: application/json" \
	-d '{"username":"test","password":"test"}' | jq
```

Esse endpoint responde com o JSON retornado pelo Keycloak (access_token, refresh_token, expires_in, etc.).

Se não tiver `jq` instalado, pode copiar o access_token manualmente do retorno JSON.

Observação: se você alterar a porta da API (variável `PORT` ao iniciar a app) substitua `localhost:3000` pelos valores apropriados.

## Nota sobre a biblioteca `@adatechnology/auth-keycloak`

Nesta monorepo o pacote `@adatechnology/auth-keycloak` foi ajustado para expor o cliente Keycloak via provider token `KEYCLOAK_CLIENT`.

- Se você for consumir o cliente dentro de um módulo NestJS, injete-o com:

```ts
import { Inject } from '@nestjs/common';
import { KEYCLOAK_CLIENT } from '@adatechnology/auth-keycloak';
import type { KeycloakClientInterface } from '@adatechnology/auth-keycloak';

constructor(@Inject(KEYCLOAK_CLIENT) private readonly keycloakClient: KeycloakClientInterface) {}
```

- Os endpoints desta pasta (`/keycloak/*`) já estão implementados para usar o cliente via esse token — não é necessário importar a classe concreta `KeycloakClient`.

Atualizei a documentação do pacote para recomendar a injeção por token e para manter compatibilidade com o padrão do `HttpModule` do monorepo.
