# Architectural Rules

## Injection Tokens
All injection tokens MUST be exported as `const` from a dedicated `*.token.ts` file and re-exported from the package's `index.ts`. 
Do NOT use inline strings for injection tokens in modules or providers.

## Logging Format
The development log format is `[App-name@version][lib-name:version][requestId][timestamp][source][libMethod][LEVEL] - message - {payload}`.
- `App-name@version`: Green tag identifying the application (e.g., `[App-example@0.0.3]`).
- `lib-name:version`: Yellow tag identifying the library and its version (e.g., `[@adatechnology/http-client:1.0.0]`).
- `requestId`: Correlation ID from the request context (Cyan).
- `timestamp`: ISO timestamp (Gray).
- `source`: The caller class and method (Magenta, e.g., `[HttpClientController.listPokemon]`).
- `libMethod`: The internal library class and method (Magenta, e.g., `[HttpRedisClient.get]`).
- `level`: Upper-case level (e.g., `INFO`, `DEBUG`) with no extra padding.

When a library logs:
1. It passes its name in the `lib` property.
2. It passes its version in the `libVersion` property.
3. It passes its internal method name in the `libMethod` property.
4. The formatter automatically combines the `context` with `libMethod` to show the full internal path.

Final pattern: `[App][Lib:Version][RequestId][Timestamp][Caller][Lib.Method][LEVEL]`

### Multi-layer Chaining
For complex flows involving multiple libraries or services, the `source` property should act as a breadcrumb of the business logic path, while `libMethod` remains the leaf execution point.
Example for `App -> Service -> Lib`:
- Source: `ServiceA.processData`
- LibMethod: `HttpClient.post`
Output: `[App][Lib][ReqId][Time][ServiceA.processData][HttpClient.post][INFO]`

## Function Parameters and Return Types
When a function accepts **more than one parameter**, it MUST use a single options/params object instead of positional arguments. Define dedicated TypeScript interfaces following the naming convention:
- `NomeFuncaoParams` for the input object
- `NomeFuncaoResult` for the return type (when the return shape is non-trivial)

Example:
```typescript
export interface UpdateUserParams {
  userId: string;
  userData: Record<string, unknown>;
  adminToken: string;
}

export interface UpdateUserResult {
  success: boolean;
}

async updateUser(params: UpdateUserParams): Promise<UpdateUserResult>
```

This improves readability, enables easier future extensions, and prevents breaking changes when adding new fields.

## Error Handling in Libraries
All libraries MUST use `BaseAppError` from `#shared/errors/base-app-error` for custom errors. Do NOT use raw `Error` or `new Error()` directly in library code. Wrap upstream failures in `BaseAppError` with appropriate `status`, `code`, and `context`.

Example:
```typescript
import { BaseAppError } from "#shared/errors/base-app-error";

throw new BaseAppError({
  message: "Keycloak admin token request failed",
  status: 502,
  code: "KEYCLOAK_ADMIN_TOKEN_ERROR",
  context: { url, method: "POST" },
});
```

## Internal Types and Utility Functions
Internal interfaces, types, and utility functions MUST be organized into dedicated directories:
- **Public interfaces** (consumed by users of the library) → `src/` root or `src/interfaces/`
- **Internal types** (used only inside the library) → `src/types/`
- **Utility functions** (helpers, parsers, extractors) → `src/utils/`

Do NOT declare internal types or utility functions in the same file as the main service/provider. Extract them to separate files and import them.

## Constants and Magic Strings
All string literals that represent business concepts, header names, HTTP methods, error codes, or library metadata MUST be declared in a dedicated `src/constants/` or `*.constants.ts` file. Do NOT use inline magic strings in services or providers.

Example:
```typescript
// src/keycloak-admin.constants.ts
export const KEYCLOAK_ADMIN_LIB_NAME = "@adatechnology/keycloak-admin";
export const KEYCLOAK_ADMIN_DEFAULT_TIMEOUT = 5000;
export const KEYCLOAK_ADMIN_TOKEN_ENDPOINT = "/protocol/openid-connect/token";
```

## Dynamic Version from package.json
The library version used in logs (`libVersion`) MUST be read dynamically from the package's `package.json` at build/runtime, never hardcoded. Use `import { version } from "../package.json"` (or equivalent) inside a constants file.

## Avoid Code Duplication — Prefer Shared Packages
Before creating a new type, utility, constant, or error class inside a library, check whether it already exists in:
- `#shared/*` (monorepo internal shared code)
- `@adatechnology/*` (published packages)

If the same or equivalent code exists in `shared` or another package, import and reuse it. Do NOT duplicate logic across packages. The `shared` package is intentionally bundled into published packages via `tsup` so consumers do not need to install it separately.

## Config Validation in Module `forRoot()` / `forRootAsync()`
Any library module that exposes `forRoot(config)` or `forRootAsync(config)` MUST validate the config object at **bootstrap time** — not later at runtime.

**Exception:** If the module has **no required fields** (all config properties are optional and the module works correctly with an empty or omitted config), validation is **not required**. Only validate when there are constraints that would cause runtime failures if misconfigured.

When validation is needed, follow these rules:
1. Check that `config` is present and is an object.
2. Validate every **required** field for presence, correct type, and format.
3. Validate **optional** fields when they are provided (e.g. URL protocol, string length).
4. Collect ALL validation errors and report them in a single descriptive exception — never stop at the first error.
5. Error messages MUST be explicit, including:
   - The field name that failed
   - What was received (show the actual value)
   - An example of a valid value
   - The expected type or format

Example of a good validation error:
```
KeycloakAdminConfig validation failed:
  - baseUrl: must start with 'http://' or 'https://'. Received: 'ftp://localhost'
  - realm: is required and must be a non-empty string (e.g. 'BACKEND')
  - adminPassword: is required and must be a non-empty string
```

Use a dedicated `validate*Config()` utility function (placed in `src/utils/` or `src/validators/`). Reuse `BaseAppError` or a package-specific error class. Export the validator so consumers can also call it manually if needed.

## Coding Standards
- Prefer `Vanilla CSS` for styling.
- Ensure all packages have consistent token export patterns.
- Keep metadata in logs compact (single line) using `breakLength: Infinity` for `util.inspect`.
