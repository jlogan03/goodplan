# Plan: Tests and Migration

## Overview

Final slice of the entity-restructuring epic. Three concerns: (1) fix ~40 stale path references across 12 test files and 2 fixture files so the test suite passes, (2) update `goodplan migrate` to support re-migration of already-initialized projects (removing the `project.json` guard) and clean up stale `sliceSequence` output, (3) self-migrate this repo's `.project/` and update architecture docs.

Migration philosophy: `goodplan migrate` is the general-purpose "rebuild state from current directory" tool, not a one-time pre-CLI conversion. As the state format evolves, users re-run migrate to restructure.

## Phase 1: Fix Test Fixtures and Assertions

Get the full test suite green by updating all references to flat `slices/<name>` paths to nested `epics/<epic>/slices/<name>` paths. Also remove stale `sliceSequence` from non-migration test fixtures and fix the fitness test exemption.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun test 2>&1 | grep -c 'FAIL'` → 8 or more failing test files

**After implementation** (should pass / show presence):
- [ ] `bun test` → 0 failures, all tests pass
- [ ] `grep -rn '"slices/' tests/ | grep -v epics | grep -v migration | grep -v migrate` → 0 matches (no stale flat slice paths outside migration context)

### Tasks

**Fixture files** (update activity log scope strings):

- [ ] `tests/fixtures/slice-in-progress/.project/activity-log.jsonl` — change `"scope":"slices/test-slice"` to `"scope":"epics/test-epic/slices/test-slice"` on all slice-related entries
- [ ] `tests/fixtures/slice-refining-max-rounds/.project/activity-log.jsonl` — same scope string update

**Unit test files** (update path strings, fixture objects, and assertions):

- [ ] `tests/unit/commands/state.test.ts` — remove `writeJson` for `slices/overview.json` (line 74, file eliminated), update `source: "slices/01-auth"` to `"epics/my-epic/slices/01-auth"` (line 85), update `scope: "slices/test"` to `"epics/test-epic/slices/test"` (line 94)
- [ ] `tests/unit/commands/status.test.ts` — update `source: "slices/01-auth"` to `"epics/my-epic/slices/01-auth"` (line 162). Remove `sliceSequence` from non-migration epic.json fixtures (lines 98, 310, 382) since the field no longer exists in the epic schema
- [ ] `tests/unit/data/tree.test.ts` — update flat `slices/01-data/slice.json` paths to `epics/my-epic/slices/01-data/slice.json` (lines 307-315), remove `slices/overview.json` reference (line 315, file eliminated)
- [ ] `tests/unit/context/learnings.test.ts` — restructure inline `ProjectState` fixture from flat `slices:` to nested `epics/<epic>/slices/`, update `source: "slices/01-data-layer"` to `"epics/my-epic/slices/01-data-layer"` (lines 25, 50), update `collectLearnings` scope arguments (lines 45, 71)
- [ ] `tests/unit/context/collect.test.ts` — restructure inline `ProjectState` fixture from flat `slices:` to nested `epics/<epic>/slices/` (lines 55-71), update `collectMarkdownEntries` path arguments (line 116), update key assertions (line 118), update `ContentSource` paths (line 144)
- [ ] `tests/unit/state/rollup-learnings.test.ts` — update all `"slices/s1"` path references to `"epics/e1/slices/s1"` in `setEntry` calls, `ROLLUP_LEARNINGS` event `from` fields, and `source` strings in learning data (~16 locations)
- [ ] `tests/unit/schemas/records.test.ts` — update `scope: "slices/01-data-layer"` to `"epics/my-epic/slices/01-data-layer"` (line 12), update `source: "slices/01-auth"` to `"epics/my-epic/slices/01-auth"` (line 121)
- [ ] `tests/unit/schemas/schema-registry.test.ts` — update `findSchema("slices/01-data-layer/plan.md")` to `"epics/my-epic/slices/01-data-layer/plan.md"` (line 86)
- [ ] `tests/unit/schemas/state-events.test.ts` — update `from: "slices/01-auth"` to `"epics/my-epic/slices/01-auth"` (line 194)

**Integration test files**:

- [ ] `tests/integration/result-paths.test.ts` — update hardcoded `path.join(env.GOODPLAN_DIR, "slices", "test-slice")` to `path.join(env.GOODPLAN_DIR, "epics", "test-epic", "slices", "test-slice")` (line 47), update assertion `"slices/test-slice/plan.md"` to `"epics/test-epic/slices/test-slice/plan.md"` (line 19)

**Fitness test**:

- [ ] `tests/fitness/stateless-commands.test.ts` — add `migrate` command to the read-only/exemption list (it has no entity-identifying arg but is read-only at the command level; actual mutations happen via stdin piping)

**Context test** (verify already correct):

- [ ] `tests/unit/context/startContext.test.ts` — verify `sliceSequence` usage is in migration context or remove if it's in an epic.json fixture that no longer has the field

### Verification

- `bun test` → all pass
- `grep -rn 'sliceSequence' tests/ | grep -v migrate | grep -v migration` → only legitimate references (or zero)
- Spot-check: read `tests/integration/result-paths.test.ts`, confirm nested path assertions

## Phase 2: Migration Code Updates

Update `goodplan migrate` to support re-migration of already-initialized projects and clean up stale fields in the migration output.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `echo '' | goodplan migrate --json 2>&1 | grep STATE_ALREADY_INITIALIZED` → matches (rejects initialized projects)

**After implementation** (should pass / show presence):
- [ ] `echo '' | goodplan migrate --json 2>&1 | grep -v STATE_ALREADY_INITIALIZED` → no rejection (proceeds to Q&A)
- [ ] `grep -c 'sliceSequence' src/core/rpc/migrate.ts` → only in Q&A collection (not in `buildMigrationState` output)

### Tasks

- [ ] `src/core/rpc/migrate.ts` — remove the `project.json` existence check (lines 999-1006) that throws `STATE_ALREADY_INITIALIZED`. Allow `migrate` to run on already-initialized projects.
- [ ] `src/core/rpc/migrate.ts` — remove `sliceSequence` from `buildMigrationState` epic.json output (line 256). The field no longer exists in `epicSchema`. The migration Q&A still collects it via `epicDetailResponseSchema` (correct — used for slice ordering), but the output `epic.json` should not include it.
- [ ] Migration tests — verify existing migration unit tests (`tests/unit/rpc/migrate.test.ts`) still pass after removing `sliceSequence` from output. Update assertions that check `epic.json` content if they expect `sliceSequence`.
- [ ] Migration integration tests — verify `tests/integration/migrate.test.ts` still passes. Update any assertions checking for `STATE_ALREADY_INITIALIZED` behavior (if any — the test may use a pre-CLI fixture that doesn't have `project.json`).

### Verification

- `bun test -- tests/unit/rpc/migrate.test.ts tests/integration/migrate.test.ts` → all pass
- `bun test` → full suite still passes
- Manual check: on a test fixture with `project.json`, `echo '' | goodplan migrate --json` proceeds to Q&A instead of rejecting

## Phase 3: Self-Migrate and Architecture Docs

Run `goodplan migrate` on this repo's `.project/` to restructure flat slice paths to nested epic paths. Update architecture docs to reflect the completed entity restructuring.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls .project/slices/` → directory exists with flat slice directories
- [ ] `goodplan status --json | grep totalSlices` → current count (26)

**After implementation** (should pass / show presence):
- [ ] `ls .project/slices/ 2>/dev/null` → directory should not exist (slices moved under epics)
- [ ] `goodplan status --json` → all entities intact, same counts, no warnings
- [ ] `ls .project/epics/entity-restructuring/slices/` → contains 05-tests-and-migration and siblings
- [ ] `grep -c 'epics.*slices' .project/architecture/data-model.md` → non-zero (docs updated)

### Tasks

**Self-migration**:

- [ ] Back up `.project/` state: `cp -r .project .project-backup` (belt-and-suspenders beyond `.project-old/`)
- [ ] Run `goodplan migrate` — the `/migrate` skill answers Q&A questions by reading the current directory structure (both flat and nested locations). The migration rebuilds state with slices nested under their parent epics.
- [ ] Verify: `goodplan status --json` — confirm all entities are intact (same epic count, slice count, quest count, task count)
- [ ] Verify: all slice `slice.json` files exist at `epics/<epic>/slices/<name>/slice.json`
- [ ] Clean up: remove `.project-backup/` after verification (`.project-old/` is kept as the standard backup)

**Architecture doc updates** (reflect completed restructuring):

- [ ] `.project/architecture/data-model.md` — update `slice.json` location examples, directory structure, state tree example, schema registry patterns, `hasChild` guard examples to use nested paths
- [ ] `.project/architecture/state-machine-api.md` — update State Key Dependencies table (`slices/` → `epics/<epic>/slices/`), Directory-Based Guards section, event type definitions (epic field on all slice events)
- [ ] `.project/architecture/rpc-layer-api.md` — update `Target` type definition (epic field on slice variant), `resolveEntityDir` examples
- [ ] `.project/architecture/flows.md` — update any slice workflow path references
- [ ] `.project/architecture/commands-api.md` — update slice command path resolution, `--epic`/`--all` flags on `slice:list`
- [ ] `.project/architecture/_overview.md` — update subsystem maturity table if warranted by the epic's cross-cutting changes

### Verification

- `goodplan status --json` → no warnings, all counts match
- `bun test` → all pass (tests work against the new directory structure)
- Spot-check: read `data-model.md`, confirm nested path examples
- Grep: `grep -rn 'slices/overview\.json' .project/architecture/` → 0 matches (eliminated file not referenced)
