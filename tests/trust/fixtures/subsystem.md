---
type: subsystem
version: 1
---

# Subsystem Definition

```yaml extract
id: trust
name: "Trust Layer"
maturity: experimental
description: "Convergence evaluation, extractors, and circuit breaker logic"
owns:
  - "src/trust/"
  - "src/schemas/trust/"
dependsOn:
  - engine
  - schemas
dependentCount: 0
```
