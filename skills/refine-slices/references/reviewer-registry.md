# Reviewer Registry

The orchestrator reads this file to understand the available reviewers and their domains. All four reviewers are always-on for this skill — no conditional selection needed.

## review_context Value

`"slice goal definitions and sequencing"`

## Always-On

All reviewers run every iteration.

| Reviewer | Focus | Prompt File | Section | Context |
|---|---|---|---|---|
| Software Architecture | Module boundaries, dependency direction, coupling/cohesion, layering, data flow, testability, module depth | `../../_shared/references/reviewers-cross-cutting.md` | `## Software Architecture Reviewer` | `{review_context}` = `"slice goal definitions and sequencing"` |
| Architecture Alignment | Slice-to-subsystem mapping, cross-boundary scoping, dependency consistency | `reviewers-slices.md` | `## Architecture Alignment Reviewer` | (empty — self-contained prompt) |
| Tracer Bullet Quality | End-to-end verifiability, verification section quality, unexercised code detection | `reviewers-slices.md` | `## Tracer Bullet Quality Reviewer` | (empty) |
| Risk/Dependency Analysis | Unknown front-loading, circular dependencies, ordering robustness, explicit dependencies | `reviewers-slices.md` | `## Risk/Dependency Analysis Reviewer` | (empty) |
