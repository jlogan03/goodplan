---
type: slice-goal
version: 1
slice: core-extractors
---

# Slice Goal

```yaml extract
description: "Implement the 5 core extractors for the trust layer"
acceptanceCriteria:
  - "Each extractor handles valid input correctly"
  - "Each extractor returns appropriate error codes for malformed input"
  - "All extractors registered in createCoreExtractorRegistry()"
affectedSubsystems:
  - trust
  - schemas
dependencies:
  - "Phase 1: extractor infrastructure"
scopeExclusions:
  - "Remaining 5 extractors (Phase 3)"
  - "Convergence evaluator"
```
