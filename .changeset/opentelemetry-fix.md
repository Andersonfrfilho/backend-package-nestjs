---
"@adatechnology/logger": patch
"@adatechnology/cache": patch
"@adatechnology/http-client": patch
"@adatechnology/auth-keycloak": patch
"@adatechnology/keycloak-admin": patch
---

fix: resolve OpenTelemetry context API type errors

- Fix ExecutionContext parameter naming conflict in OpenTelemetryRequestIdInterceptor
- Use createContextKey() for all context keys instead of strings
- Update TraceStackService to use proper context key symbols
- Update OpenTelemetryTracingProvider to use context keys
- Update ConfigurableTraceStackService to use context keys
- Fix pnpm-lock.yaml frozen-lockfile compatibility
