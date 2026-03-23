# Architecture Logic

## File Applicability

| File | Write when |
|---|---|
| `.project/conventions.md` | Always |
| `.project/architecture/_overview.md` | Always |
| `.project/architecture/conventions.md` | Always |
| `.project/architecture/data-model.md` | System has persistent storage or notable data schema |
| `.project/architecture/flows.md` | Multi-step processes, user journeys, or notable async flows |
| `.project/architecture/information-architecture.md` | Content platform, docs site, complex dashboard (heavy IA) |
| `.project/architecture/ui-ux.md` | Project has a frontend |
| `.project/architecture/<subsystem>-api.md` | Named subsystem with non-trivial API contract (ask user) |

## File Templates

Note for SKILL.md: Load both this file and `references/architecture-logic-templates.md` to access the file templates.
