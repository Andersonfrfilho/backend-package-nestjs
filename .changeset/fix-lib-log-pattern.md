---
"@adatechnology/cache": patch
"@adatechnology/http-client": patch
"@adatechnology/keycloak": patch
"@adatechnology/keycloak-admin": patch
---

Remove library metadata from logs to follow standard pattern

All @adatechnology/* libraries now follow the same log pattern as application code:
`[requestId][timestamp][Class.method][LEVEL] - message`

Previously libraries included metadata like `[@adatechnology/lib:version]` which
broke the standard format. This removes the library name and version from log output
while maintaining full context via the source/class information.

Libraries still use @adatechnology/logger LOGGER_PROVIDER for all logging.
