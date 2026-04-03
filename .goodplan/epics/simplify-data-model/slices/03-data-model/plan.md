# Plan: Data Model Changes

## Overview

Three additive data model changes to the CLI, ordered from smallest to largest blast radius: (1) decision provenance fields, (2) learning validity field, (3) overview consolidation. All changes are backward-compatible — existing state without new fields remains valid. The overview consolidation requires a migration step (`gp upgrade`) before the new CLI version can read the project.

**Slug**: `data-model`

**Key decisions from planning Q&A**:
- `entityPath` is validated against actual entity paths in `.goodplan/` (not just stored as-is)
- `reconsiderWhen` has no array size constraints
- `validUntil` accepted only through completion payloads (not learning:rollup)
- Slices stay embedded in epics in the unified overview (not promoted to top-level)
- Require migration (clean break) — no dual-path reading
- Migration is idempotent — handles interrupted previous runs

## Phase 1: Decision Provenance

Add optional `entityPath` and `reconsiderWhen` fields to the decision schema and CLI commands.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `echo '{"id":"test","domain":"test","title":"Test","summary":"Test","entityPath":"epics/foo"}' | gp decision:create --json` → succeeds but `gp decision:show --decision test --json` output has no `entityPath` field
- [ ] `grep "entityPath" src/schemas/records/decision.ts` → no match
- [ ] `grep "reconsiderWhen" src/schemas/records/decision.ts` → no match

**After implementation** (should pass / show presence):
- [ ] `echo '{"id":"test-prov","domain":"test","title":"Test","summary":"Test","entityPath":"epics/simplify-data-model/slices/01-test-harness","reconsiderWhen":["Binary exceeds 100MB","Multi-platform needed"]}' | gp decision:create --json` → succeeds
- [ ] `gp decision:show --decision test-prov --json` → includes `entityPath` and `reconsiderWhen` fields with correct values
- [ ] `echo '{"id":"test-noprov","domain":"test","title":"No provenance","summary":"Test"}' | gp decision:create --json` → succeeds (backward compatible, no entityPath)
- [ ] `echo '{"id":"test-badpath","domain":"test","title":"Bad","summary":"Test","entityPath":"nonexistent/path"}' | gp decision:create --json` → fails with validation error (path doesn't resolve to entity)
- [ ] `bun test` → all existing tests pass (no regressions)

### Tasks

- [ ] Add optional `entityPath` (string) and `reconsiderWhen` (string array) to `src/schemas/records/decision.ts` decision entry schema
- [ ] Add optional `entityPath` and `reconsiderWhen` to `src/schemas/commands/decision.ts` create input schema
- [ ] Add `entityPath` validation in `decision:create` command: if provided, verify the path resolves to an entity directory in `.goodplan/` (check that the path + entity JSON file exists, e.g., `epics/<name>/epic.json` or `slices/<name>/slice.json`)
- [ ] Update `decision:create` handler to pass new fields through to the state machine event
- [ ] Update `decision:show` command to include new fields in JSON output
- [ ] Add unit tests for the new schema fields (roundtrip: create with fields → show includes them)
- [ ] Add unit test for entityPath validation (valid path accepted, invalid path rejected)
- [ ] Add unit test for backward compatibility (create without new fields succeeds)

### Verification

- Run `bun test` — all tests pass
- Run fitness tests — schema validation passes with new fields

## Phase 2: Learning Validity

Add optional `validUntil` field to learning schemas and completion handlers.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "validUntil" src/schemas/records/learning.ts` → no match

**After implementation** (should pass / show presence):
- [ ] `grep "validUntil" src/schemas/records/learning.ts` → matches in both `learningEntrySchema` and `learningInputSchema`
- [ ] In a test fixture: complete a slice with a learning that includes `validUntil: ["Build pipeline migrates to TypeScript"]` → `gp learning:list --json` shows the `validUntil` field on that learning
- [ ] Complete a slice with a learning without `validUntil` → succeeds (backward compatible)
- [ ] `bun test` → all tests pass

### Tasks

- [ ] Add optional `validUntil` (string array) to `learningEntrySchema` in `src/schemas/records/learning.ts`
- [ ] Add optional `validUntil` to `learningInputSchema` in `src/schemas/records/learning.ts`
- [ ] Update completion handler (`processLearnings` or equivalent in state machine transitions) to pass `validUntil` through from input to persisted record
- [ ] Verify `learning:list --json` output includes `validUntil` when present (may already work if schema drives serialization)
- [ ] Add unit test: learning with `validUntil` roundtrips through create → list
- [ ] Add unit test: learning without `validUntil` still works (backward compat)

### Verification

- Run `bun test` — all tests pass
- Run fitness tests — schema validation passes with new field

## Phase 3: Overview Consolidation

Merge `quests/overview.json` and `tasks/overview.json` into a single root `overview.json` alongside epic overview data. This is the largest phase — ~30 files affected across Data Layer, State Machine, Commands, and RPC Layer.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls .goodplan/overview.json` on a test fixture → "No such file or directory"
- [ ] Schema registry has 3 separate overview patterns (epics/, quests/, tasks/)

**After implementation** (should pass / show presence):
- [ ] New test fixture created via `gp init` + `gp epic:create` + `gp quest:create` + `gp task:create` → single `.goodplan/overview.json` with `{ epics: [...], quests: [...], tasks: [...] }` shape
- [ ] `gp quest:list --json` returns correct data from consolidated overview
- [ ] `gp task:list --json` returns correct data from consolidated overview
- [ ] `gp quest:create` and `gp task:create` write to consolidated overview
- [ ] `gp epic:create` writes to consolidated overview (epics section)
- [ ] `gp slice:create` writes to consolidated overview (embedded in epics[].slices)
- [ ] `assembleState` → `reduce` → `commitState` roundtrip works with new overview path (integration test)
- [ ] Schema registry has 1 overview pattern: `overview.json` with unified schema
- [ ] `bun test` → all tests pass
- [ ] Fitness tests pass

### Tasks

- [ ] Create unified overview schema in `src/schemas/entities/overview.ts`: `{ epics: epicItem[], quests: questItem[], tasks: taskItem[] }` — epics keep embedded slices array
- [ ] Update schema registry in `src/core/data/schema-registry.ts`: replace 3 overview patterns with single `overview.json` → unified schema
- [ ] Update `assembleState()` in `src/core/data/assemble.ts` to read from single `overview.json`
- [ ] Update `commitState()` in `src/core/data/commit.ts` to write single `overview.json`
- [ ] Update `init.ts` transition handler: create single `overview.json` with `{ epics: [], quests: [], tasks: [] }` instead of 3 files
- [ ] Update all transition handler helpers in `helpers.ts`: `updateEpicStatus`, `updateSliceStatus`, `updateQuestStatus`, `addQuestToOverview`, `addEpicToOverview`, `addSliceToOverview`, `updateTaskStatus` — all must operate on the unified structure
- [ ] Update `epic-create.ts`, `quest-create.ts`, `task-create.ts`, `slice-create.ts` transition handlers for new overview path
- [ ] Update `task-lifecycle.ts` (task drop/convert) for new overview path
- [ ] Update `slice-plan.ts`, `slice-submit.ts`, and other slice transition files that touch overview
- [ ] Update commands: `quest:list`, `task:list`, `slice:list`, `epic:list`, `status` — update any direct overview path references
- [ ] Update RPC layer files (`migrate.ts`, `complete.ts`) for new overview path
- [ ] Grep exhaustively for `quests/overview.json` and `tasks/overview.json` across all source files — update every reference
- [ ] Update all test fixtures: replace separate overview files with single `overview.json`
- [ ] Create `tests/integration/overview-consolidation.test.ts`: test `assembleState` → `reduce` → `commitState` roundtrip with consolidated overview
- [ ] Update existing unit tests for changed function signatures and return shapes
- [ ] Run full test suite and fix any failures

### Verification

- Run `bun test` — all tests pass including new integration test
- Run fitness tests — all pass (schema validation, data determinism, tree accuracy)
- Run `gp quest:list`, `gp task:list`, `gp epic:list` against a fresh fixture — all return correct data

## Phase 4: Upgrade Migration

Add migration logic to `gp upgrade` to consolidate existing overview files into the new unified structure.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Create a fixture with old-style separate `quests/overview.json` and `tasks/overview.json` → `gp quest:list --json` fails (CLI expects consolidated `overview.json`)

**After implementation** (should pass / show presence):
- [ ] Same fixture → `gp upgrade --json` detects old overview structure and consolidates
- [ ] After upgrade: single `overview.json` with correct merged data, HMAC passes, old files removed
- [ ] `gp quest:list --json` and `gp task:list --json` return correct data post-upgrade
- [ ] Re-running `gp upgrade --json` on an already-migrated project → no-op (idempotent)
- [ ] Interrupted migration (old files + new file both present) → re-run succeeds (idempotent)
- [ ] `bun test` → all tests pass

### Tasks

- [ ] Add overview consolidation detection in upgrade command: check for existence of `quests/overview.json` or `tasks/overview.json`
- [ ] Implement crash-safe migration: (1) read old files, (2) merge into unified structure, (3) write `overview.json`, (4) update HMAC, (5) verify new file parses + HMAC passes, (6) remove old files
- [ ] Handle idempotent re-entry: if `overview.json` exists AND old files exist, re-run from step 1 (old files mean previous run didn't complete cleanup)
- [ ] Handle clean state: if `overview.json` exists and no old files, skip (already migrated)
- [ ] Add integration test: create fixture with old structure, run upgrade, verify consolidated result
- [ ] Add integration test: run upgrade twice, verify second run is no-op
- [ ] Add integration test: simulate interrupted migration (both old and new files present), verify re-run completes

### Verification

- Run `bun test` — all tests pass
- Run upgrade against this repo's own `.goodplan/` state → verify it works on real data
