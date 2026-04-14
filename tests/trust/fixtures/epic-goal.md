---
type: epic-goal
version: 1
epic: test-epic
---

# Epic Goal

```yaml extract
description: "Build the trust layer for goodplan v2"
scope:
  - "Extractor framework"
  - "Convergence evaluator"
  - "Circuit breaker"
nonGoals:
  - "UI components"
  - "Database migrations"
successCriteria:
  - "All 10 extractors parse their artifact types correctly"
  - "Convergence evaluator produces correct verdicts"
initialSubsystems:
  - trust
  - schemas
```
