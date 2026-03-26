# Plan: Migrate Pre-CLI .project/ to CLI Format

**Status:** COMPLETE
**Completed:** 2026-03-26

## Overview

Build `goodplan migrate`, a global CLI command that drives a multi-round Q&A protocol to convert a pre-CLI `.project/` directory into valid CLI-managed state. The CLI emits schema-driven questions (with `responseSchema` auto-generated via `z.toJSONSchema()`), validates answers against Zod schemas, and constructs all state files when complete.

**Key design decisions:**
- **Stateful rounds:** CLI stores intermediate state in `<cwd>/.migration-in-progress.json` (outside `.project/`) between rounds. Overwritten on restart (no explicit abandon command).
- **Batch-by-type:** Rounds are organized as inventory → per-epic details → per-slice details → confirmation. Each round emits one question per entity, answered in one response.
- **LLM infers status:** The `/migrate` skill maps old-format artifacts to CLI status enums. The CLI trusts validated answers.
- **LLM provides sourcePath:** Each entity answer includes a `sourcePath` field (old directory path). CLI validates paths immediately and rejects invalid ones.
- **Direct state construction (no state machine event):** Migration constructs `ProjectState` via `buildMigrationState()` (internal function in `src/core/rpc/migrate.ts`) and calls `commitState(projectDir, ZERO_STATE, newState)`, bypassing `reduce()`. No `MIGRATE_PROJECT` event is added to the state machine -- migration is a data import, not a state transition. This is a formal INV-001 exception (documented in `architecture/invariants.md`). An activity log entry is appended to record that migration occurred.
- **Fresh .project/:** After confirmation, the old `.project/` is renamed to `.project-old/`. A fresh `.project/` is created via `commitState()`. A post-commit step copies markdown artifacts from `.project-old/` using `sourcePath` mappings.
- **Confirmation with corrections:** A final confirmation round presents the full state summary. The LLM can approve or request re-answers for specific questions by ID. Circuit breaker at 3 correction rounds.
- **Schemas derived from entities:** Migration round schemas define migration-specific schemas referencing shared enum schemas (`epicStatusSchema`, etc.), co-located with the migrate command at `src/commands/global/migrate/schemas.ts`. `import type` for inferred types per `verbatimModuleSyntax`.
- **Single error path:** All errors (pre-checks and validation failures) are thrown as `GoodplanError`. `MigrationResult` has only two variants: `'questions'` and `'complete'` — no embedded error status.

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | Migration Schemas & Protocol Types | Define Zod migration round schemas derived from entity schemas, plus Q&A envelope types |
| 02 | Migrate Command — Round 1 (Inventory) | Implement `goodplan migrate --json` emitting inventory questions, accepting answers, writing .migration-in-progress.json |
| 03 | Migrate Command — Follow-up Rounds & Confirmation | Per-epic and per-slice detail rounds, confirmation round with re-answer correction protocol |
| 04 | State Construction & Artifact Copy | Direct `ProjectState` construction in `rpcMigrate()`, .project/ rename, `commitState()`, markdown artifact copy |
| 05 | Migrate Skill | Goal-aware /migrate SKILL.md — reads old artifacts, answers CLI questions, handles errors |
| 06 | Integration Test | Test on copy of real repo, then create synthetic fixture for automated CI tests |
