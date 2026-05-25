# CLAUDE.md

Guidance for Claude Code when working in this monorepo.

## What This Repo Is

Monorepo of shared NestJS libraries (`packages/`) and an example app (`example/`).
Published to npm under the `@adatechnology` scope via changesets.

## Common Commands

```bash
pnpm run build:libs-ordered   # Build all libs in dependency order
pnpm run build:example        # Build the example app
pnpm changeset                # Create a changeset before publishing
pnpm changeset version        # Bump versions from changesets
pnpm changeset publish        # Publish to npm
```

## Package Structure

| Package | Purpose |
|---|---|
| `packages/logger` | Structured logger (Winston), AsyncLocalStorage context, TraceStack |
| `packages/shared` | Cross-cutting decorators and utilities (e.g., `@TraceMethod()`) |
| `packages/cache` | Redis/InMemory cache provider |
| `packages/http` | HTTP client with logging |
| `packages/keycloak` | Keycloak auth guard |
| `packages/keycloak-admin` | Keycloak admin client |

## Architecture Rules

### Injection Tokens
All injection tokens MUST be exported as `const` from a dedicated `*.token.ts` file and re-exported from the package `index.ts`. Never use inline strings.

### Log Format
```
[requestId][timestamp][projectName:version][Class1.method][Class2.method][...][LEVEL] - message
```
- `projectName:version` — set by `PackageContextMiddleware` reading `package.json`
- `[Class.method]` — each `@TraceMethod()` in the call chain adds one bracket
- Libraries add their own context via `lib` / `libVersion` / `libMethod` log props

## @TraceMethod() Decorator

**Location in consumer services:** `src/shared/decorators/trace-method.decorator.ts`
**Implementation pattern** (always use `async/await`, never `.then()/.catch()`):

```typescript
import { pushToTraceStack, popFromTraceStack } from '@adatechnology/logger';

export function TraceMethod() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyKey}`;
    descriptor.value = async function (...args: any[]) {
      pushToTraceStack(methodName);
      try {
        return await originalMethod.apply(this, args);
      } finally {
        popFromTraceStack();
      }
    };
    return descriptor;
  };
}
```

### CRITICAL — `import type` rule (TS1272)

Consumer services have `emitDecoratorMetadata: true` in tsconfig. When `@TraceMethod()` is applied to a method, TypeScript emits runtime metadata for ALL parameter types. Any type used as a parameter in a decorated method **must** use `import type`.

```typescript
// ✅ Correto
import { type MyParams, type MyResponse } from './my.interface';

@TraceMethod()
async execute(params: MyParams): Promise<MyResponse> { ... }

// ❌ Errado — TS1272: "A type referenced in a decorated signature must be
//    imported with 'import type' when 'isolatedModules' and
//    'emitDecoratorMetadata' are enabled"
import { MyParams } from './my.interface';  // faltou `type`
```

**Error code:** `TS1272`
**Root cause:** `emitDecoratorMetadata` makes TypeScript emit `Reflect.metadata("design:paramtypes", [...])` for decorated methods. If a type is not a real runtime value (i.e., it's erased at compile time), it must be `import type` so TypeScript knows it's type-only.

### Scope — where to apply `@TraceMethod()`

✅ Apply to:
- `async execute()` in use-cases
- Service methods orchestrating multiple use-cases
- Controller route handlers (place AFTER HTTP verb decorator)

```typescript
@Get('order/:id')   // HTTP decorator first
@TraceMethod()      // TraceMethod second
async getOrder() { ... }
```

❌ Never apply to:
- Interface method signatures
- Abstract methods
- Class field declarations (`private readonly x = ...`)
- Constructors

## Adding a New Library Package

1. Copy an existing package as template
2. Add `"@adatechnology/<new>" : "workspace:*"` to packages that depend on it
3. Export everything from `src/index.ts`
4. Run `pnpm run build:libs-ordered` to verify
5. Create a changeset: `pnpm changeset`

## Publishing Flow

```
pnpm changeset          # describe changes
pnpm changeset version  # bump versions
git commit + push       # CI runs tests
pnpm changeset publish  # publish to npm (CI does this automatically)
```
