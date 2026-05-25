---
"@adatechnology/logger": patch
---

fix: render context.libMethod when libMethod is set without lib

Previously, libMethod was only combined with context when lib was also
present. Classes that pass libMethod without lib (e.g. KeycloakAdminClient)
would show only [ClassName] instead of [ClassName.methodName] in logs.

Now buildMethodDisplays always combines context + '.' + libMethod when
libMethod is present, regardless of whether lib is set.
