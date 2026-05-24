---
"@adatechnology/logger": patch
---

fix: suppress libMethodDisplay only when current context matches last traceStack item, not blindly when traceStack is active
