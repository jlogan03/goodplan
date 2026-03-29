# Epic Goal: entity-restructuring

Restructure the goodplan data model so slices live under their parent epic directories (`.project/epics/<epic>/slices/<name>/`) instead of the current flat layout (`.project/slices/<name>/`). This eliminates cross-epic name collision risk and makes the directory structure match the conceptual hierarchy for easier human navigation.

Consolidate slice metadata into `epics/overview.json` — each epic's overview entry includes its slices array, replacing the separate `slices/overview.json` and `sequencing.md` files. One file shows all entity relationships and ordering.

Fix the learnings duplication: remove direct `.project/learnings.md` writes from the `/complete` skill. `learnings.jsonl` via CLI is the single source of truth for structured learnings.

Update `/migrate` to handle flat-to-nested restructuring, then run it on this repo to validate the migration path end-to-end.

## Scope

**In scope**:
- `Target` type: add `epic` field to slice variant
- `resolveEntityDir`/`resolveEntityJsonPath`: use nested paths
- All state machine transition handlers: replace `slices/${name}` with `epics/${epic}/slices/${name}`
- Schema registry: update regex patterns for nested paths
- `init.ts`: stop creating top-level `slices/` directory
- `epics/overview.json` schema: add `slices` array to epic overview items
- Remove `slices/overview.json` and `sequencing.md`
- All slice commands: resolve paths via epic
- All skills referencing `.project/slices/`: update to nested paths
- `/complete` skill: remove direct `learnings.md` writes
- `/migrate`: add flat-to-nested restructuring
- Architecture docs: update data-model.md, _overview.md, conventions
- Self-migration: run on this repo

**Out of scope**:
- Quest path changes (quests remain at `.project/quests/<name>/`)
- Task path changes (tasks remain at `.project/tasks/<name>/`)
- Any CLI UX redesign beyond what's needed for nested paths
