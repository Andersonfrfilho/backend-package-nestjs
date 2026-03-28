---
name: shared
description: Foundational utilities and base errors for @adatechnology. Use for shared types, BaseAppError extensions, and pure utility functions.
---

# 🧩 Shared Package Standards

## 🚀 Error Example
```typescript
export class UserNotFoundError extends BaseAppError {
  constructor(userId: string) {
    super({
      message: `User with ID ${userId} not found`,
      code: 'USER_NOT_FOUND',
      statusCode: 404,
    });
  }
}
```

## 🏗️ Core Patterns
- **Base Error**: All domain errors MUST extend `BaseAppError`.
- **Pure Functions**: Utilities in `src/utils.ts` must be side-effect free and highly testable.
- **Zero External Deps**: Avoid adding dependencies here to keep the bundle lean.

## 📦 Bundling (CRITICAL)
This package is **PRIVATE** and should NOT be published.
- **Tsup Config**: Other packages must use `noExternal: ['@adatechnology/shared']` in their `tsup.config.ts` to embed this code during build.

## 🧪 Testing
Every utility must have a corresponding `.spec.ts` file with 100% coverage.
