# Merged Review Feedback — Round 2

## IMPORTANT Issues

### I-1. `commitState()` old-state parameter unspecified for from-scratch construction
**Sources:** Software Architecture, TypeScript and JavaScript
Phase 4 constructs a complete `ProjectState` from scratch and calls `commitState(projectDir, oldState, newState)`, but the plan never specifies what `oldState` is. After `.project/` is renamed to `.project-old/`, there are no on-disk JSON files. The plan should explicitly state: pass `ZERO_STATE` (from `src/core/tree.ts`) as `oldState`. This mirrors the `init` flow where `.project/` doesn't exist yet, makes the diff treat everything as new writes, and skips concurrent modification checks. Without this, implementers might call `loadState()` on the renamed directory or pass an incorrect old state.
Resolution: DIRECTLY_ACTIONABLE

### I-2. `readStdin()` validation flow deferred rather than resolved
**Sources:** TypeScript and JavaScript, TUI and CLI, Agent Skill
Phase 2 says to "clarify whether this reuses `readStdin()` + `validateInput()` or introduces a new path" but never commits to an approach. The simplest path: use `readStdin()` as-is (it handles TTY detection, size limits, JSON parsing, returns `Record<string, unknown>`), then parse the returned record through `migrationResponseSchema.safeParse()` directly in `rpcMigrate()`, bypassing `validateInput()` since there are no entity-targeting flags to merge. The skill must also know the stdin payload must be a `{ round, answers }` object envelope, not just an answers array. The plan should commit to this approach rather than deferring.
Resolution: DIRECTLY_ACTIONABLE

### I-3. Direct state construction bypasses INV-001 without formal invariant amendment
**Source:** Software Architecture
The plan correctly bypasses the state machine (no `MIGRATE_PROJECT` event), but INV-001 states "Every state mutation goes through the state machine" with only version stamping as a documented exception. Phase 4 constructs `ProjectState` directly and calls `commitState()` — a clear INV-001 violation. The justification ("migration is a data import, not a state transition") is reasonable but must be formally documented as a known exception in `architecture/invariants.md`, similar to the version stamp exception.
Resolution: DIRECTLY_ACTIONABLE — Add task in Phase 4: "Add known exception to INV-001 in `architecture/invariants.md`."

### I-4. `rpcMigrate()` has dual responsibilities that should be separated for testability
**Source:** Software Architecture
`rpcMigrate()` handles both multi-round Q&A protocol orchestration AND final state construction. These are fundamentally different concerns. Extract state construction into an internal function (e.g., `buildMigrationState(validatedData): ProjectState`) within `src/core/rpc/migrate.ts`. This keeps a single public entry point while enabling focused unit tests. Phase 6 should include unit tests for `buildMigrationState()`.
Resolution: DIRECTLY_ACTIONABLE

### I-5. `project.goal` collected in inventory but `projectSchema` has no `goal` field
**Source:** TypeScript and JavaScript
Phase 1 collects `project: { name: string, goal: string }` but `projectSchema` has no `goal` field. If the goal belongs in `idea.md` (a markdown artifact), the inventory schema should not collect it as a structured field on the project object — or the plan should clarify that the goal is written to `idea.md` in the artifact copy step, not to `project.json`. As-is, the implementer will hit a schema validation error from `commitState()`.
Resolution: DIRECTLY_ACTIONABLE

### I-6. Phase 4 "Before" check is already false by implementation time
**Source:** Holistic
Phase 4's first "Before" check says `grep -r "rpcMigrate" src/core/rpc/` should have no matches. But `rpcMigrate()` is created in Phase 2 and receives answer submissions in Phase 3. The check should test something Phase 4 specifically adds — e.g., "rpcMigrate does not yet call commitState()" or "no `.project-old/` rename logic exists."
Resolution: DIRECTLY_ACTIONABLE

### I-7. `STATE_ALREADY_MIGRATED` error code doesn't belong in any existing namespace
**Source:** Holistic
`StateErrorCode` is defined in `src/schemas/state-events.ts` as a union literal type. Adding `STATE_ALREADY_MIGRATED` there pollutes the state machine's error surface for a non-state-machine concern. Better option: reuse `STATE_ALREADY_INITIALIZED` with a migration-specific message (semantics are identical — project.json already exists).
Resolution: DIRECTLY_ACTIONABLE

### I-8. Phase 2 does not specify file name for `rpcMigrate()`
**Source:** Holistic
Phase 2 says "Create `rpcMigrate()` in `src/core/rpc/`" but doesn't specify a file name. Existing RPC functions follow a naming convention: `init.ts`, `begin.ts`, `complete.ts`, `submit.ts`. The plan should specify `src/core/rpc/migrate.ts`.
Resolution: DIRECTLY_ACTIONABLE

### I-9. `MigrationResult` dual error path diverges from CLI conventions
**Source:** TUI and CLI
The `MigrationResult` type introduces a `status` discriminator (`'questions' | 'error' | 'complete'`) that embeds error info directly in the success response, creating two error paths: (1) `GoodplanError` thrown for pre-checks, and (2) `MigrationResult.status === 'error'` for validation failures. The plan should either document this dual path explicitly and ensure the skill handles both, or convert all validation errors to `GoodplanError` throws and simplify `MigrationResult` to `'questions' | 'complete'`.
Resolution: DIRECTLY_ACTIONABLE

### I-10. Phase 5 skill description under-triggers for proactive migration requests
**Source:** Agent Skill
The current description triggers on `DATA_NO_PROJECT` errors but misses proactive triggers like "convert my project to goodplan" or "migrate project." Append common trigger phrases to the skill description, following the `create-epic` pattern.
Resolution: DIRECTLY_ACTIONABLE

### I-11. `import type` compliance for migration schemas
**Source:** TypeScript and JavaScript
Migration schemas reference shared enum schemas (`epicStatusSchema`, etc.) as runtime Zod values, which need value imports. But any inferred types (`EpicStatus`, etc.) must use `import type` per `verbatimModuleSyntax: true`. The plan should explicitly call this out.
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

### M-1. `stdinSchemaRegistry` registration may not fit multi-round protocol
**Source:** Holistic
The existing `stdinSchemaRegistry` maps a single schema per command name, but migration has multiple rounds with different schemas per round. The plan should clarify what schema to register — perhaps a discriminated union of all round response types, or note the limitation.
Resolution: DIRECTLY_ACTIONABLE

### M-2. Phase 3 correction protocol question ID format inconsistent in examples
**Sources:** Holistic, TUI and CLI
Phase 3 shows `reAnswerIds: ["epic-details-initial"]` but tasks say question IDs are `epic-details-<name>`. The naming convention (kebab-case, entity-type prefix for parameterized IDs) should be documented in Phase 1's protocol types section. Note the dependency: question IDs for round N are derived from answers in round N-1.
Resolution: DIRECTLY_ACTIONABLE

### M-3. Phase 6 test references `GOODPLAN_DIR` env var but migrate checks cwd directly
**Sources:** Holistic, TUI and CLI
Phase 2 says migrate "checks cwd directly (not via resolveProjectDir)." If migrate doesn't use `resolveProjectDir()`, it won't respect `GOODPLAN_DIR`. Test setup should use `process.chdir()` to the temp directory, or `rpcMigrate()` should accept a `projectDir` argument like `rpcInit()`.
Resolution: CODEBASE_EXPLORATION (verify whether `GOODPLAN_DIR` is implemented in the codebase)

### M-4. No `.migration-in-progress.json` cleanup/rollback strategy on failure
**Sources:** Software Architecture, TypeScript and JavaScript
If `commitState()` fails after `.project/` has been renamed to `.project-old/`, the user is left with neither a working `.project/` nor a migration state. The plan should specify: preserve `.migration-in-progress.json` on failure so user can retry, and the error message should instruct the user to rename `.project-old/` back to `.project/`. Do NOT attempt automatic rollback.
Resolution: DIRECTLY_ACTIONABLE

### M-5. No explicit task for adding `.migration-in-progress.json` to `.gitignore`
**Source:** Holistic
The migration-in-progress file lives in cwd and is transient. If a user commits during migration, it could end up in version control.
Resolution: DIRECTLY_ACTIONABLE

### M-6. Activity log entry fields for migration unspecified
**Source:** Software Architecture
The plan says "append an activity log entry" but doesn't specify `phase` and `scope` values. Specify: `{ ts: <timestamp>, phase: "migration", scope: "project", status: "complete", summary: "Migrated from pre-CLI .project/ format", detail: "<entity counts>" }`.
Resolution: DIRECTLY_ACTIONABLE

### M-7. Per-status required fields not enumerated for state construction
**Source:** Software Architecture
Phase 4 mentions "Entities at intermediate/terminal statuses need all required fields populated" but is vague. Add a note listing non-obvious required fields per entity status (e.g., epic `activated` needs non-null `activated` timestamp and `sliceSequence`).
Resolution: DIRECTLY_ACTIONABLE

### M-8. `MigrationState` should have a Zod schema, not just a TypeScript type
**Source:** TypeScript and JavaScript
`MigrationState` is serialized to `.migration-in-progress.json` and validated on re-read (resume path). There should be a Zod schema per INV-005 (schema validation on every read), with `status: z.enum(["in-progress", "confirming", "complete"])`.
Resolution: DIRECTLY_ACTIONABLE

### M-9. Phase 4 artifact copy timestamp preservation requires extra API calls
**Source:** TypeScript and JavaScript
`fs.copyFileSync()` does not preserve mtime/atime. Would need `fs.statSync()` + `fs.utimesSync()`. Consider dropping the requirement — git tracks content, not filesystem timestamps.
Resolution: DIRECTLY_ACTIONABLE

### M-10. Phase 6 test answers should use schema-inferred types
**Source:** TypeScript and JavaScript
Tests should use `z.infer<typeof inventoryResponseSchema>` to type programmatic answers, ensuring test data stays in sync with schema changes.
Resolution: DIRECTLY_ACTIONABLE

### M-11. Phase 5 skill SKILL.md path references should be verified
**Source:** Agent Skill
Ensure SKILL.md body uses relative path `references/migration-heuristics.md` consistently, matching conventions in other skills.
Resolution: DIRECTLY_ACTIONABLE

### M-12. Phase 5 heuristic note: `~~archived~~` and `__active__` prefixes are mutually exclusive
**Source:** Agent Skill
Add a brief note confirming these prefixes never co-occur, preventing implementer confusion.
Resolution: DIRECTLY_ACTIONABLE

### M-13. Phase 5 verification references test fixture not yet created
**Source:** Agent Skill
Phase 5 verification says "Run on a test fixture" but the fixture is created in Phase 6. Clarify: use a copy of the real repo's `.project/` for Phase 5 verification.
Resolution: DIRECTLY_ACTIONABLE

### M-14. `--force` flag behavior for migrate should be documented as N/A
**Source:** TUI and CLI
Migration is destructive enough that `--force` should not bypass the "already migrated" guard. The plan should explicitly state `--force` is not applicable and is silently ignored.
Resolution: DIRECTLY_ACTIONABLE

## Contradictions Resolved

**None.** All reviewers aligned on the major design decisions (direct state construction, bypassing state machine, `.migration-in-progress.json` in cwd). Where multiple reviewers flagged the same issue (commitState old-state, readStdin validation), their recommendations converged.

## Aggregate Scores

| Reviewer | Score |
|---|---|
| Holistic | 8/10 |
| Software Architecture | 8/10 |
| TypeScript and JavaScript | 8/10 |
| TUI and CLI | 8/10 |
| Agent Skill | 8/10 |
| **Consensus** | **8/10** |
