---
name: http-client
description: Patterns for @adatechnology/http-client. Use when adding HTTP methods, configuring Axios, or implementing Request-ID propagation.
---

# 🌐 HTTP Client Standards

## 🚀 Usage Example

```typescript
@Injectable()
export class MyService {
  constructor(
    @Inject(HTTP_PROVIDER) private readonly http: HttpProviderInterface,
  ) {}

  async getData() {
    return this.http.get({
      url: "https://api.example.com/data",
    });
  }
}
```

## 🏗️ Core Patterns

- **Provider Token**: Always use `HTTP_PROVIDER` (or equivalent constant) for injection.
- **Request Context**: Every request should propagate the `X-Request-ID` via `HttpRequestContextService`.
- **Interceptors**: Axios interceptors must be registered in the module init or dynamically via the provider.
- **Lib metadata centralizado**: Use `LIB_NAME` e `LIB_VERSION` a partir de `src/http.constants.ts` (sem hardcode de versão/nome em providers).
- **Structured logs**: Sempre incluir `lib`, `libVersion`, `context`, `libMethod` e `meta` quando registrar logs.
- **Type naming**: tipos com sufixo `Params`/`Result` devem seguir **PascalCase** (ex.: `PerformGetParams`).

## 🧪 Testing Strategy

Always mock Axios to avoid real network calls:

```typescript
jest.mock("axios");
import axios from "axios";
const mockedAxios = axios as jest.Mocked<typeof axios>;
```

## 🛠️ Development Tasks

- **New Method**: Update `HttpProviderInterface` -> `AxiosHttpProvider` -> `index.ts`.
- **Error Mapping**: Transform Axios errors into `HttpClientError` from `@adatechnology/shared`.
