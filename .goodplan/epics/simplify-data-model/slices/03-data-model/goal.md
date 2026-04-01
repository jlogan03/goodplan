# Data Model Changes

## What We're Building
Three additive data model changes to the CLI: decision provenance (entityPath + reconsiderWhen fields), learning validity (validUntil field), and overview consolidation (merge quests/tasks into a single root overview.json). All changes are backward-compatible — existing state without the new fields remains valid. The overview consolidation includes a migration path in the upgrade command.

The overview consolidation is the largest change: three separate overview paths with two distinct schemas (`epicOverviewSchema`, `overviewSchema`) merge into a single unified `overviewSchema` at `.goodplan/overview.json`. This replaces `schemaRegistry` entries for `quests/overview.json` and `tasks/overview.json` with a single `overview.json` entry. Affected subsystems: Data Layer (`assembleState`/`commitState`), State Machine (reducers consuming overview), Commands (all list/create/show commands), RPC Layer (context/priorities). Estimated ~30 total files affected (source + test).

**Maturity Note:** State Machine, Commands, Data Layer, and RPC Layer subsystems move to "Developing (modified)" maturity during this slice. The overview consolidation is primarily Data Layer work (`assembleState`, `commitState`, schema registry). RPC Layer is affected indirectly through path changes flowing through Data Layer.

## Behavior
1. Add optional `entityPath` (string) and `reconsiderWhen` (string[]) fields to the decision JSONL schema in `src/schemas/records/decision.ts`.
2. Update `decision:create` command to accept `entityPath` and `reconsiderWhen` in stdin JSON. Update `decision:show` to display them.
3. Add optional `validUntil` (string[]) field to the learning JSONL schema (both `learningEntrySchema` and `learningInputSchema`).
4. Update completion handlers to pass `validUntil` through from input to persisted record.
5. Create a unified overview schema at `.goodplan/overview.json` combining epics (with embedded slices), quests, and tasks.
6. Update schema registry regex patterns for the new overview path.
7. Update `assembleState()` and `commitState()` to use the consolidated overview.
8. Update all commands that read/write quest and task overviews (`quest:create`, `quest:list`, `task:create`, `task:list`, etc.) to use the new path.
9. Add migration logic to the upgrade command: detect separate `quests/overview.json` and `tasks/overview.json`, merge into consolidated `overview.json`, update HMAC, verify, then remove old files (crash-safe ordering).
10. Update ~30 total files (source + test) for new overview path, fixture paths, and assertions. This includes creating `tests/integration/overview-consolidation.test.ts` (new file) to cover the `assembleState` → `reduce` → `commitState` roundtrip with the consolidated overview path.

## Verification
- [ ] Run `echo '{"id":"test-decision","domain":"test","title":"Test","summary":"Test","entityPath":"epics/foo/slices/01-bar","reconsiderWhen":["Binary exceeds 100MB"]}' | gp decision:create --json` — succeeds, `gp decision:show --decision test-decision --json` includes both new fields
- [ ] Run `gp decision:create` without the new fields — succeeds (backward compatible)
- [ ] Complete a slice with a learning that includes `validUntil` — `gp learning:list --json` shows the `validUntil` field
- [ ] Run `gp quest:list --json` and `gp task:list --json` against a project with the consolidated overview — returns correct data
- [ ] Run `gp quest:create` and `gp task:create` — new entries written to consolidated `overview.json`
- [ ] Run `gp quest:show` and `gp task:show` — reads from consolidated `overview.json` correctly
- [ ] Verify `assembleState` → `reduce` → `commitState` roundtrip with the new overview path (integration tests in `tests/integration/overview-consolidation.test.ts`)
- [ ] Run `gp upgrade` against a fixture with separate `quests/overview.json` and `tasks/overview.json` — consolidates into single `overview.json`, HMAC passes, old files removed
- [ ] Run `bun test` — all unit and integration tests pass
- [ ] Run fitness tests — all pass (schema validation, data determinism, tree accuracy)

Create a test fixture with the old overview structure (separate quest and task overview files). Run `gp upgrade --json` and verify the migration produces a valid consolidated `overview.json` with correct HMAC. Create decisions with `entityPath` and `reconsiderWhen` via CLI, verify they roundtrip through `decision:show`. Create learnings with `validUntil`, verify they appear in `learning:list`. Run the full test suite to confirm nothing regresses.

## Scope Boundaries
**In scope:** Schema changes (decision, learning, overview), CLI command updates, assembleState/commitState changes, schema registry updates, upgrade migration, test updates (~30 files across Data Layer, State Machine, Commands, RPC Layer)
**Out of scope:** Skill-side evaluation of `reconsiderWhen` and `validUntil` conditions (that logic lives in phase agents, built in later slices). State cache invalidation strategy (existing cache bypass is acceptable for now).

**Note:** The three changes (decision provenance, learning validity, overview consolidation) are independent and could be split if overview consolidation proves more complex than expected.
