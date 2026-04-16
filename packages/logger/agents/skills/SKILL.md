---
name: logger
description: Patterns for @adatechnology/logger. Use when configuring Winston logging, managing Request-ID context (AsyncLocalStorage), or obfuscating sensitive data.
---

# 📝 Logger Standards

## 🚀 Setup Example

```typescript
@Module({
  imports: [
    LoggerModule.forRoot({
      level: "info",
      sensitiveKeys: ["password", "token", "clientSecret"],
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Required to enable Request-ID tracking across async calls
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
```

## 🏗️ Usage Pattern

```typescript
@Injectable()
export class MyService {
  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logger: LoggerProviderInterface,
  ) {}

  doWork() {
    this.logger.info({
      message: "Action performed",
      context: MyService.name,
      meta: { userId: "123" },
    });
  }
}
```

## 🔐 Obfuscation

The logger automatically hides values for keys defined in `sensitiveKeys`.

- **Default Keys**: `password`, `token`, `authorization`, `cookie`, `secret`.
- **Custom Keys**: Add via `LoggerModule.forRoot()`.

## 🛠️ Internal Mechanics

- **Async Context**: Uses `AsyncLocalStorage` to store the Request-ID.
- **Context Access**: Use `getContext()` to retrieve the current request state anywhere in the call stack.
- **Type naming**: aliases de tipagem com sufixo `Params`/`Result` devem usar **PascalCase** (ex.: `InfoParams`, `InfoResult`).
