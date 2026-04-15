---
type: architecture
version: 1
---

# Malformed Architecture

```yaml extract
subsystems:
  - id: engine
    maturity: foundational
    owns:
      - src/engine/
    dependsOn: []
  - id: trust
    maturity: invalid-maturity
    owns:
      - src/trust/
    dependsOn:
      - engine
communicationPatterns:
  - "Engine emits events"
proposedInvariants:
  - "Some invariant"
```
