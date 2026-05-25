---
"@adatechnology/logger": patch
---

fix: remove optional OTel peerDependencies that caused ERESOLVE in npm Docker builds — OTel SDK packages are loaded dynamically via require() and do not need to be declared as peers
