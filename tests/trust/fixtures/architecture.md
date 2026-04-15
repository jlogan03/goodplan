---
type: architecture
version: 1
epic: test-epic
---

# Architecture Document

This is a sample architecture artifact.

## Subsystems

```yaml extract
subsystems:
  - id: engine
    maturity: foundational
    owns:
      - src/engine/
    dependsOn: []
  - id: trust
    maturity: experimental
    owns:
      - src/trust/
    dependsOn:
      - engine
communicationPatterns:
  - "Engine emits events, trust layer reads them"
  - "Trust projections flow through derived state"
proposedInvariants:
  - "Extractors must be pure functions"
  - "Registry rejects duplicate IDs"
```

## Details

Additional context about the architecture.
