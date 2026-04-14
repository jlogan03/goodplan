---
type: pressure-test
version: 1
epic: workflow-bug-fixes
---

# Pressure Test

```yaml extract
failureModes:
  - id: fm-01
    description: "Extractor receives empty markdown string"
    likelihood: medium
    impact: low
  - id: fm-02
    description: "YAML block contains non-UTF8 characters"
    likelihood: low
    impact: high
scalingCliffs:
  - "Registry with 100+ extractors may slow lookup"
optionalityLedger:
  - "Could switch to remark-based parsing later"
errorClasses:
  - "Parse errors from malformed YAML"
  - "Schema validation errors from unexpected fields"
lockedInAssumptions:
  - "Extractors are pure functions with no I/O"
  - "All artifacts use fenced yaml extract blocks"
findings:
  - description: "No caching of parsed results"
    severity: MINOR
  - description: "Missing input size validation"
    severity: IMPORTANT
```
