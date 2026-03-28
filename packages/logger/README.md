# Logger provider

Pacote que expõe um provider de logs seguindo o padrão das outras libs do monorepo.

Exporta `LoggerModule` e o token `LOGGER_PROVIDER`.

## Exemplos de uso

1. Uso padrão (Winston como implementação padrão):

```ts
import { Module } from "@nestjs/common";
import { LoggerModule } from "@adatechnology/logger";

@Module({
  imports: [
    // Opção 1: Configuração estática (forRoot)
    LoggerModule.forRoot({
      level: 'debug',
      context: 'MyService',
      isProduction: process.env.NODE_ENV === 'production',
      colorize: true,
    }),

    // Opção 2: Configuração dinâmica (forRootAsync)
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        level: configService.get('LOG_LEVEL'),
        isProduction: configService.get('NODE_ENV') === 'production',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

2. Customizando o Winston e adicionando chaves sensíveis para ofuscar:

```ts
import { Module } from "@nestjs/common";
import { LoggerModule } from "@adatechnology/logger";
import { transports } from "winston";

const loggerOptions = {
  level: "debug",
  transports: [new transports.Console()],
};

@Module({
  imports: [
    LoggerModule.forRoot({
      loggerOptions,
      // obfuscatorKeys aceita strings ou objetos { key, obfuscator }
      obfuscatorKeys: [
        "password",
        {
          key: "creditCard",
          obfuscator: (v: any) =>
            typeof v === "string" ? v.replace(/\d(?=\d{4})/g, "*") : "****",
        },
      ],
    }),
  ],
})
export class AppModule {}
```

3. Injetando o provider e usando nos serviços:

```ts
import { Inject, Injectable } from "@nestjs/common";
import { LOGGER_PROVIDER } from "@adatechnology/logger";
import type { LoggerProviderInterface } from "@adatechnology/logger";

@Injectable()
export class FooService {
  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logger: LoggerProviderInterface,
  ) {
    this.logger.info({ message: "iniciando FooService" });
  }
}
```

Observação: o obfuscator padrão é aplicado recursivamente em objetos e aceita entradas do tipo string (nome do campo) ou objetos `{ key, obfuscator }` para permitir funções customizadas do usuário.

Se quiser, eu adiciono um exemplo de teste unitário para validar o comportamento do obfuscator.

## Middleware e contexto automático

O pacote oferece um middleware `RequestContextMiddleware` que injeta um `requestId` (a partir do header `x-request-id` ou gerando um UUID) e executa a request dentro de um contexto assíncrono (AsyncLocalStorage). Para usá-lo no NestJS:

```ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestContextMiddleware, LoggerModule } from '@adatechnology/logger';

@Module({ imports: [LoggerModule.forRoot()] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
```

Com o middleware ativo, o logger automaticamente incluirá `requestId` nos metadados quando não for passado explicitamente.

## Request-scoped provider

Se desejar um provider por request (cada request recebe uma instância com `setContext` isolado), passe `requestScoped: true` ao `forRoot`:

```ts
LoggerModule.forRoot({ requestScoped: true })
```

