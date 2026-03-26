# Plan: Migrate Pre-CLI .project/ to CLI Format

## Overview

Build `goodplan migrate`, a global CLI command that drives a multi-round Q&A protocol to convert a pre-CLI `.project/` directory into valid CLI-managed state. The CLI emits schema-driven questions (with `responseSchema` auto-generated via `z.toJSONSchema()`), validates answers against Zod schemas, and constructs all state files when complete.

**Key design decisions:**
- **Stateful rounds:** CLI stores intermediate state in `.migration-in-progress.json` between rounds. Overwritten on restart (no explicit abandon command).
- **Batch-by-type:** Rounds are organized as inventory → per-epic details → per-slice details → confirmation. Each round emits one question per entity, answered in one response.
- **LLM infers status:** The `/migrate` skill maps old-format artifacts to CLI status enums. The CLI trusts validated answers.
- **LLM provides sourcePath:** Each entity answer includes a `sourcePath` field (old directory path). CLI validates paths immediately and rejects invalid ones.
- **MIGRATE_PROJECT event:** A new state machine event accepts the full validated migration payload, constructing entities at any status (including terminal states like `completed`/`abandoned`) in one transition.
- **Fresh .project/:** After confirmation, the old `.project/` is renamed to `.project-old/`. A fresh `.project/` is created via the state machine. CLI copies markdown artifacts from `.project-old/` using `sourcePath` mappings.
- **Confirmation with corrections:** A final confirmation round presents the full state summary. The LLM can approve or request re-answers for specific questions by ID. Circuit breaker at 3 correction rounds.
- **Schemas derived from entities:** Migration round schemas use `z.pick()`/composition from existing entity schemas, stored at `src/schemas/migration/`.

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | Migration Schemas & Protocol Types | Define Zod migration round schemas derived from entity schemas, plus Q&A envelope types |
| 02 | Migrate Command — Round 1 (Inventory) | Implement `goodplan migrate --json` emitting inventory questions, accepting answers, writing .migration-in-progress.json |
| 03 | Migrate Command — Follow-up Rounds & Confirmation | Per-epic and per-slice detail rounds, confirmation round with re-answer correction protocol |
| 04 | State Construction & Artifact Copy | MIGRATE_PROJECT event, .project/ rename, fresh state creation, markdown artifact copy |
| 05 | Migrate Skill | Goal-aware /migrate SKILL.md — reads old artifacts, answers CLI questions, handles errors |
| 06 | Integration Test | Test on copy of real repo, then create synthetic fixture for automated CI tests |
