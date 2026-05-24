---
"@adatechnology/cache": patch
"@adatechnology/logger": patch
---

fix: include lib name, version, and method name in cache provider logs

Adds `lib: @adatechnology/cache`, `libVersion`, and `libMethod` fields to all InMemoryCacheProvider logger calls, enabling full trace stack display with library context: `[@adatechnology/cache:version][InMemoryCacheProvider.method]`

Also extends LogParams interface with optional `lib`, `libVersion`, `libMethod` fields to support library context in logs.
