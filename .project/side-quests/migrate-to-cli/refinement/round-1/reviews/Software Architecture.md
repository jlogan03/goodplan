# Software Architecture Review

Reviewed: Entire plan (Phases 01-06)
Goal: Build `goodplan migrate` — multi-round Q&A protocol converting pre-CLI `.project/` to CLI-managed state.

## Issues

**[CRITICAL]** MIGRATE_PROJECT event bypasses normal lifecycle, creating entities at arbitrary statuses without going through transition tables

The plan proposes a `MIGRATE_PROJECT` event that constructs entities at any status (including terminal states like `completed`/`abandoned`) in one transition. This is architecturally sound in concept — migration IS a special case — but the plan lacks specificity on how this interacts with the existing state machine invariants:

1. The `handlerRecord` in `reduce.ts` uses `satisfies { [K in StateEvent['type']]: Handler<K> }` for compile-time exhaustiveness. Adding `MIGRATE_PROJECT` to the `StateEvent` union means every file that pattern-matches on `StateEvent['type']` must handle it. The plan says "add to transition tables" but doesn't acknowledge the exhaustiveness constraint or its ripple effects.

2. Entities created at intermediate/terminal statuses will lack fields that are normally populated by prior transitions. For example: `epic.json` has `activated: timestampSchema.nullable()` — an epic created at `activated` status needs a non-null `activated` timestamp. An epic at `completed` status needs `verifications` with meaningful content. The plan's `MigratePayload` schema (Phase 1) only captures `name, goal, status, sourcePath` — insufficient to construct a valid `epic.json` at most statuses.

3. The `overview.json` items include `created` and `completed` timestamps. The plan doesn't address how these are sourced during migration (filesystem mtime? LLM-inferred? all set to migration timestamp?).

Resolution: DIRECTLY_ACTIONABLE
- Phase 1: Expand the migration detail schemas to include all fields needed for valid entity JSON at each possible status (`activated` timestamp for epics, `refinement` for refined slices, etc.). Either ask the LLM to provide them or use sensible defaults (e.g., `activated: created`, `refinement: null`, `verifications: []`).
- Phase 4: Document the exhaustiveness ripple in `reduce.ts` and any `StateEvent` switch/match sites. List the specific fields that must be populated per status.

---

**[IMPORTANT]** Migrate command bypasses the RPC layer, violating the architectural layering (Commands -> RPC -> State Machine)

The plan has the `migrate` command directly managing `.migration-in-progress.json`, validating answers, and eventually triggering `MIGRATE_PROJECT`. Looking at the existing architecture, all mutation commands go through the RPC layer (`begin()` / `complete()` / `submit()`). The init command itself goes through `rpcInit()` which calls `begin()`. The plan creates a parallel path: `migrate.ts` command doing orchestration logic (multi-round state management, validation, filesystem rename) that belongs in the RPC layer.

This matters because:
- INV-001 says "Every state mutation goes through the state machine." The `.migration-in-progress.json` file is migration state that lives outside the state machine entirely.
- The RPC layer handles `loadState()` -> `reduce()` -> `commitState()` sequencing, version stamping, activity logging. If migrate bypasses this, those concerns must be duplicated.

Resolution: DIRECTLY_ACTIONABLE
- Add an `rpcMigrate()` function in `src/core/rpc/` that owns the multi-round protocol, intermediate state management, and final `MIGRATE_PROJECT` dispatch. The command layer stays thin (parse args, read stdin, call rpcMigrate, format output).
- Alternatively, explicitly document that migration is a one-time operation that intentionally operates outside the normal RPC flow, and explain why that's acceptable. The `.migration-in-progress.json` file is transient (deleted after migration) so it may not need state machine protection.

---

**[IMPORTANT]** `.migration-in-progress.json` written to `.project/` directory that will be renamed to `.project-old/`

Phase 2 writes `.migration-in-progress.json` to `.project/`. Phase 4 renames `.project/` to `.project-old/`. This means:
- After rename, `.migration-in-progress.json` is in `.project-old/`, not the new `.project/`.
- If the user restarts migration after the rename (crash during state construction), the CLI won't find the intermediate state because it looks in `.project/` (which is now fresh).
- The resume logic (Phase 2: "Resume: `.migration-in-progress.json` exists, no stdin") breaks after rename.

Resolution: DIRECTLY_ACTIONABLE
- Store `.migration-in-progress.json` in the cwd (next to `.project/`), not inside `.project/`. This survives the rename and provides crash recovery. Clean it up after successful migration.
- Or: do the rename and state construction atomically (rename -> construct -> delete progress file) and document that a crash during construction requires manual recovery (delete `.project/`, rename `.project-old/` back, restart).

---

**[IMPORTANT]** Phase 4 artifact copy logic is too detailed for the state machine layer and too imperative for reliable implementation

The plan specifies per-entity-type copy rules (epic -> copy architecture/, research/, brainstorm/; slice -> copy goal.md, plan.md, etc.; quest -> copy from side-quests/). This logic is:
1. In the wrong layer: artifact copy is filesystem I/O, belonging in the Data Layer or a dedicated migration module, not in the state machine transition handler.
2. Fragile: hardcoded filename lists will miss files that exist in some entities but not others. A recursive copy with exclusion patterns (skip `*.json`, `*.jsonl`) would be more robust.

The plan does say "skip JSON/JSONL files" but then also lists specific filenames to copy. These two approaches can conflict.

Resolution: DIRECTLY_ACTIONABLE
- The `MIGRATE_PROJECT` state machine handler should ONLY produce the new `ProjectState` tree (JSON/JSONL entries). No filesystem I/O.
- Artifact copy should be a separate step in the RPC/command layer after `commitState()`, using a simple recursive directory copy with an exclusion list (`*.json`, `*.jsonl`, `.state-cache.json`) from `.project-old/<sourcePath>/` to `.project/<newPath>/`.

---

**[MINOR]** New error codes don't follow existing namespace conventions

The plan proposes `STATE_ALREADY_MIGRATED`, `DATA_NO_PROJECT_DIR`, `MIGRATION_VALIDATION_ERROR`, `MIGRATION_BACKUP_EXISTS`, `MIGRATION_CORRECTION_LIMIT`. Looking at the existing error code namespaces in `errors.ts`:
- `STATE_*` for state machine errors
- `DATA_*` for filesystem I/O errors
- `VALIDATION_*` for input validation

`MIGRATION_*` is a new namespace. `STATE_ALREADY_MIGRATED` makes sense in the STATE namespace. `DATA_NO_PROJECT_DIR` is close to existing `DATA_NO_PROJECT`. But `MIGRATION_VALIDATION_ERROR` and `MIGRATION_CORRECTION_LIMIT` should be `VALIDATION_MIGRATION_*` or use the existing `VALIDATION_*` namespace to maintain consistency.

Resolution: DIRECTLY_ACTIONABLE
- Use existing namespaces: `STATE_ALREADY_MIGRATED`, `DATA_NO_PROJECT_DIR` (or reuse `DATA_NO_PROJECT`), `VALIDATION_MIGRATION_INVALID`, `VALIDATION_MIGRATION_CORRECTION_LIMIT`, `DATA_MIGRATION_BACKUP_EXISTS`.

---

**[MINOR]** Schema location `src/schemas/migration/` introduces a new top-level schema category but migration is a one-time operation

All existing schemas are organized by concern: `entities/`, `records/`, `commands/`. Adding `migration/` as a peer creates permanent surface area for a transient feature. If migration schemas import from `entities/` (which the plan correctly specifies), they're a consumer of entity schemas, not a peer concern.

Resolution: DIRECTLY_ACTIONABLE
- Consider `src/schemas/commands/migration.ts` (co-located with other command-specific schemas) or `src/commands/global/migrate/schemas.ts` (co-located with the command). Either keeps the schema tree focused on permanent concerns.

---

**[MINOR]** Phase 5 (Migrate Skill) status inference heuristics are incomplete for some entity statuses

The skill's status inference maps to a subset of `EpicStatus` and `SliceStatus`. For example, the heuristics can detect `created`, `activated`, `completed`, `abandoned`, `architecture-defined`, `plan-created`, `plan-refined` but cannot detect `exploring`, `explored`, `defining-architecture`, `refining-architecture`, `defining-slices`, `slices-defined`, `refining-slices`, `slices-refined`, `implementing`, `implementation-complete`. These are all intermediate workflow states.

This is probably acceptable for migration (intermediate states don't persist in old-format projects since work-in-progress was tracked differently), but the plan should explicitly state that only stable/resting statuses are inferred and document what happens if the LLM encounters artifacts that suggest an intermediate state.

Resolution: DIRECTLY_ACTIONABLE
- Add a note in Phase 5 that intermediate statuses are mapped to their nearest stable predecessor (e.g., if an epic has architecture docs but seems to be mid-refinement, map to `architecture-defined`). Document this explicitly so the LLM has clear guidance.

## Score: 6/10

The plan has a clear goal and reasonable phasing, but has significant architectural issues: the MIGRATE_PROJECT event payload is underspecified for constructing valid entities at arbitrary statuses (Critical), the command bypasses the established RPC layer pattern without justification (Important), and the intermediate state file location will break after the `.project/` rename (Important). These are all solvable with the suggested changes. Bringing it to 9+ requires: (1) fully specifying the MIGRATE_PROJECT payload with all fields needed per entity status, (2) deciding whether migration orchestration belongs in the RPC layer or explicitly documenting why it doesn't, (3) fixing the intermediate state file location, and (4) separating artifact copy from state machine logic.

## Summary
- Critical: 1
- Important: 3
- Minor: 3
