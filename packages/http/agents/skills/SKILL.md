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
    @Inject(HTTP_PROVIDER) private readonly http: HttpProviderInterface
  ) {}

  async getData() {
    return this.http.get('https://api.example.com/data');
  }
}
```

## 🏗️ Core Patterns
- **Provider Token**: Always use `HTTP_PROVIDER` (or equivalent constant) for injection.
- **Request Context**: Every request should propagate the `X-Request-ID` via `HttpRequestContextService`.
- **Interceptors**: Axios interceptors must be registered in the module init or dynamically via the provider.

## 🧪 Testing Strategy
Always mock Axios to avoid real network calls:
```typescript
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;
```

## 🛠️ Development Tasks
- **New Method**: Update `HttpProviderInterface` -> `AxiosHttpProvider` -> `index.ts`.
- **Error Mapping**: Transform Axios errors into `HttpClientError` from `@adatechnology/shared`.
