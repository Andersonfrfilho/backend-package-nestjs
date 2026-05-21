---
"@adatechnology/keycloak-admin": patch
---

Add createUser method for creating Keycloak users via Admin API

- New `createUser(params)` method that POSTs to `/admin/realms/{realm}/users`
- Returns the new user ID from the Location response header
- Includes `CreateUserParams` interface for typed parameters
- Added `CREATE_USER_ERROR` error code
- `ADMIN_USERS` endpoint now supports optional userId (omit for list/create)
