# backend-package-nestjs

Pacote compartilhado com utilitários e um módulo NestJS de exemplo.

Principais pontos

- O código fonte do pacote está em `src/` e o bundle publicado/compilado vai para `dist/`.
- Um projeto de exemplo está em `example/` para demonstrar integração e uso do módulo.

Scripts úteis (na raiz)

- `npm run build` — compila o pacote (`tsc -p tsconfig.build.json`).
- `npm run clean` — remove `dist`.
- `npm run example:start` — entra na pasta `example` e executa `npm run start` para subir o exemplo.

Rodando o example localmente

```bash
# da raiz do repositório
npm install
npm run example:start

# alternativa (desenvolvimento rápido direto na pasta example)
cd example
npm install
npx ts-node -r tsconfig-paths/register src/main.ts
```

Notas

- Durante desenvolvimento o exemplo pode executar diretamente com `ts-node` para evitar build prévio do `example/dist`.
- As interfaces exportadas pelo pacote principal são importadas usando `import type` quando apropriado para manter compatibilidade com `emitDecoratorMetadata` e `isolatedModules`.

Fluxo de desenvolvimento recomendado

- Build watch das libs e restart automático do `example` quando um pacote recompilar (comportamento próximo ao de produção):

  # na raiz (roda o watch em todas as packages em paralelo)

  pnpm run watch:packages

  # em outra aba, rode o example em modo dev (observando dist do example e das libs)

  cd example
  pnpm run start:dev

- Para desenvolvimento rápido você pode usar `ts-node`/`tsconfig-paths`, mas o fluxo acima garante que o `example` esteja executando o JS compilado (igual à produção).

# @backend-package-nestjs

Shared NestJS module for backend services.

Usage

1. Install (local development):

   npm i ../packages/@backend-package-nestjs

2. In your Nest module:

```ts
import { Module } from "@nestjs/common";
import { ExampleModule } from "@backend/package-nestjs";

@Module({
  imports: [ExampleModule.forRoot({ prefix: "backend", enabled: true })],
})
export class AppModule {}
```

3. Inject the SharedService where needed:

```ts
import { Injectable } from "@nestjs/common";
import { ExampleService } from "@backend/package-nestjs";

@Injectable()
export class MyService {
  constructor(private readonly shared: ExampleService) {}
}
```

Build

````
cd packages/@backend-package-nestjs
npm run build

Additional usage examples

1) forRootAsync (load options from ConfigService)

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExampleModule } from '@backend/package-nestjs';

@Module({
  imports: [
    ExampleModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        prefix: config.get('PREFIX'),
        enabled: config.get('ENABLED') === 'true',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
````

2. register per-feature instances (named tokens)

Library exposes helper tokens: `createExampleOptionsToken(name)` and `createExampleServiceToken(name)`.

````ts
import { Module, Inject } from '@nestjs/common';
import { ExampleModule, createExampleServiceToken } from '@backend/package-nestjs';

@Module({
  imports: [
    ExampleModule.register('health', { prefix: 'health', enabled: true }),
  ],
})
export class HealthModule {}

// consumer - controller example using typed import
```ts
import type { ExampleServiceInterface } from '@backend/package-nestjs';
import { Inject, Controller, Get } from '@nestjs/common';
import { createExampleServiceToken } from '@backend/package-nestjs';

@Controller('health')
export class HealthController {
  constructor(@Inject(createExampleServiceToken('health')) private readonly shared: ExampleServiceInterface) {}

  @Get()
  check() {
    return { prefix: this.shared.getPrefix() };
  }
}
````

```

3) Notes
-- Use `ExampleModule.forRoot()` in the root `AppModule` for a single global instance.
-- Use `ExampleModule.register(name, opts)` when you need multiple independent instances (per feature).
- The library declares `@nestjs/*` as `peerDependencies` — ensure your app installs Nest and there is a single copy at runtime.

```
