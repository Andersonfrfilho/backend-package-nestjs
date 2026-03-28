# backend-package-nestjs

Monorepo de pacotes NestJS/Node para backend (ex.: `@adatechnology/http-client`, `@adatechnology/auth-keycloak`) + um app de exemplo em `example/`.

## Como este repositório está organizado

- `packages/` — onde ficam os pacotes (cada pasta é um pacote)
- `example/` — aplicação NestJS para testar integração local
- `scripts/` — scripts auxiliares (quando necessário)

Cada pacote publica apenas a pasta `dist/` (campo `files` no `package.json`).

## O que é o tsup (e por que usamos aqui)

`tsup` é uma ferramenta de build para TypeScript baseada em **esbuild** (um bundler muito rápido).

Na prática, ele ajuda a:

- compilar TypeScript para JavaScript
- gerar arquivos de tipos (`.d.ts`)
- **embutir (bundle)** código importado de outros arquivos/pastas quando você quer publicar um pacote “autocontido”

Esse último ponto é importante no nosso caso porque temos código interno compartilhado (tipo o `shared`) que **não é publicado no npm**.

## Código compartilhado interno (alias `#shared`)

Este repositório define um alias de import para o código do `shared`:

- `#shared/*` → `packages/shared/src/*`

Ele está configurado no `tsconfig.base.json`.

### Por que não usar `@adatechnology/shared`?

Porque o `shared` **não é publicado**. Se um pacote publicado importasse `@adatechnology/shared`, quem instalar do npm não teria esse pacote no `node_modules` e daria erro.

Com `#shared/*` você importa por caminho/alias interno e o build (via `tsup`) consegue **embutir** esse código dentro do `dist` do pacote publicado.

## Scripts úteis (na raiz)

- `pnpm run build` — build do monorepo (via Turbo)
- `pnpm run clean` — remove artefatos de build
- `pnpm run watch:packages` — build watch das packages
- `pnpm run example:start` — inicia o app `example`

## Rodando o example localmente

```bash
pnpm install
pnpm run example:start
```

Para desenvolvimento “mais próximo de produção”, use:

```bash
# terminal 1 (watch das libs)
pnpm run watch:packages

# terminal 2
cd example
pnpm run start:dev
```

## Como criar um novo pacote em `packages/`

Checklist simples (o “padrão do repo”):

1. Crie a pasta do pacote:

- `packages/meu-pacote/`
  - `src/index.ts`
  - `package.json`
  - `tsconfig.json`

2. Garanta que o `package.json` publique só `dist/`:

- `main`: `dist/index.js`
- `types`: `dist/index.d.ts`
- `files`: `["dist"]`

3. Adicione scripts básicos:

- `build`: `tsup` (recomendado)
- `build:watch`: `tsup --watch`
- `check`: `tsc -p tsconfig.json --noEmit`

4. Se o pacote for publicado, cuide de:

- `publishConfig.access: "public"` (se for o caso)
- `peerDependencies` para Nest (`@nestjs/common`, `@nestjs/core`)
- `changesets` (ver `PUBLISHING.md`)

### Template recomendado (tsup + alias)

Para pacotes que podem importar `#shared/*` (ou outros módulos internos), usamos:

- `tsup.config.ts` com `TsconfigPathsPlugin`
- `tsconfig.tsup.json` (um tsconfig “só do build”) para evitar problemas de `.d.ts`

Exemplo do que você deve procurar nos pacotes que já estão prontos (`packages/http` e `packages/keycloak`).

## Como adicionar um novo “módulo interno” no shared

1. Crie o arquivo dentro de `packages/shared/src/`.

Ex.: `packages/shared/src/date/parse-date.ts`

2. Exporte no `packages/shared/src/index.ts`.

3. Use no pacote consumidor assim:

```ts
import { parseDate } from "#shared/date/parse-date";
```

Se o pacote consumidor usa `tsup` com `tsconfig-paths`, o código será incluído no `dist` do pacote publicado.

## Como criar outro módulo interno “igual ao shared” (sem publicar no npm)

Se você quiser outro módulo interno (ex.: `packages/internal-logger`) e ele **não será publicado**:

1. Crie `packages/internal-logger/src/...` e deixe o `package.json` como `private: true`.

2. Adicione um alias no `tsconfig.base.json`, por exemplo:

- `#logger/*` → `packages/internal-logger/src/*`

3. Nos pacotes publicados que vão consumir isso:

- mantenha o build via `tsup`
- inclua o alias no `tsconfig.tsup.json` do pacote (igual fizemos no `auth-keycloak` com `#shared/*`), para evitar “vazar” paths do monorepo em `.d.ts`.

## Documentação: dá para usar Storybook + MDX?

Dá, sim — o Storybook tem suporte a documentação em **MDX** (via `@storybook/addon-docs`).

Mas um aviso honesto: Storybook brilha mais quando você tem **componentes visuais (UI)**.
Para bibliotecas de backend, normalmente fica mais leve e simples usar:

- Markdown no próprio repo (como este README + docs por pacote)
- VitePress ou Docusaurus (geram site de docs bem rápido)
- TypeDoc (gera docs da API a partir dos tipos)

Se vocês já curtem Storybook e querem uma “central de docs” com MDX mesmo para backend, funciona — só tende a ser mais pesado do que precisa.

## Arquitetura e Roadmap de Melhorias

### Abstração de Cache (Redis vs. In-Memory)

Atualmente, os pacotes `http-client` e `keycloak` gerenciam cache interno de forma isolada (usando `Map` ou variáveis simples). Para suportar ambientes distribuídos (como múltiplos pods em Kubernetes), planejamos a seguinte evolução:

1.  **Interface Comum:** Criar uma interface `ICacheProvider` no pacote `#shared` para padronizar operações de `get`, `set` e `delete`.
2.  **Inversão de Dependência:** Permitir que os pacotes `http-client` e `keycloak` recebam um provedor de cache opcional em sua configuração.
3.  **Fallback Seguro:** Se nenhum provedor for injetado, o pacote continuará usando sua implementação local (In-Memory) por padrão.
4.  **Provedor Redis:** Permitir que o desenvolvedor implemente ou injete um provedor baseado em Redis (ex: via `ioredis`) sem que o pacote base precise depender diretamente da biblioteca do Redis.

**Objetivo:** Manter os pacotes leves e desacoplados, mas prontos para escala horizontal.

## 🚀 Exemplos Reais e Integrações

Este monorepo suporta cenários complexos de produção:

- **Logs Centralizados**: Configuração via `LoggerModule.forRootAsync`, ofuscação automática e suporte a logs estruturados (JSON).
- **HTTP com Cache**: Suporte a Redis (`ioredis`) para ambientes distribuídos e cache em memória para local.
- **Infraestrutura**: Configuração de Keycloak e Redis via `example/docker-compose.yml`.

Para rodar o exemplo:
```bash
cd example
docker-compose up -d
pnpm run start:dev
```

## 📦 Publicação

Veja `PUBLISHING.md` para o fluxo de publish (local dry-run e CI).
