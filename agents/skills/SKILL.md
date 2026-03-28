---
name: backend-monorepo
description: Global patterns for NestJS monorepo. Use for cross-package tasks, dependency management (pnpm), build orchestration (turbo), and enforcing CommonJS standards.
---

# 🏗️ Backend Monorepo Standards

## 🎯 Architecture Strategy
- **Format**: Strictly **CommonJS (CJS)** for all packages to ensure NestJS runtime stability.
- **Linking**: Use `pnpm workspace:*` for internal dependencies.
- **Bundling**: Private packages like `@adatechnology/shared` must be bundled into public ones using `tsup --no-external`.

## 🛠️ Development Workflow
- **Full Build**: `pnpm run build` from root.
- **Local Testing**: Always use the `/example` project.
- **New Package**: Follow the structure of `packages/package-nestjs`.

## 🚨 Troubleshooting
### Module Not Found (ESM/CJS)
If you see `ERR_MODULE_NOT_FOUND` or "Cannot find module", ensure:
1. `tsconfig.json` has `"module": "CommonJS"` and `"moduleResolution": "Node"`.
2. All internal packages are built (`pnpm run build`).
3. No `paths` in `example/tsconfig.json` are overriding `node_modules`.

## 📝 Git & Commits
- **Pattern**: `<type>(<scope>): <description>`
- **Example**: `feat(http): add support for patch requests`
- **Scopes**: `http`, `keycloak`, `logger`, `shared`, `core`.
