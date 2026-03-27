# Plan: Tests and Migration

## Overview

Final slice of the entity-restructuring epic. Three concerns: (1) fix stale path references in 3 failing integration test files, 2 fixture files, and 2 additional test files so the test suite passes, (2) update `goodplan migrate` to support re-migration of already-initialized projects (removing the `project.json` guard), clean up stale `sliceSequence` output, add timestamped backup naming, and update command help text, (3) build+install the updated CLI, then self-migrate this repo's `.project/` and update architecture docs.

Migration philosophy: `goodplan migrate` is the general-purpose "rebuild state from current directory" tool, not a one-time pre-CLI conversion. As the state format evolves, users re-run migrate to restructure.

Note: `buildMigrationState` already nests slices under `epics/<epic>/slices/` — no structural changes needed there (only test assertions need updating). The `STATE_ALREADY_INITIALIZED` guard in `reduce.test.ts` relates to `INIT_PROJECT`, not migration — no changes needed.

## Phase 1: Fix Test Fixtures and Assertions

Get the full test suite green by fixing the 3 actually-failing integration test files (path references), updating 2 fixture files, and fixing the fitness test exemption. Note: all 9 unit test files (state.test.ts, status.test.ts, tree.test.ts, learnings.test.ts, collect.test.ts, rollup-learnings.test.ts, records.test.ts, schema-registry.test.ts, state-events.test.ts) already pass — fixed in slice 02's commit (68d9c05).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun test 2>&1 | grep -c 'FAIL'` → ~5 failing test files (actual count may vary slightly)
- [ ] `bun test tests/unit/` → all pass (confirming unit tests are already fixed)

**After implementation** (should pass / show presence):
- [ ] `bun test` → 0 failures, all tests pass
- [ ] `grep -rn '"slices/' tests/ | grep -v epics | grep -v migration | grep -v migrate` → 0 matches (no stale flat slice paths outside migration context)

### Tasks

**Fixture files** (update activity log scope strings):

- [x] `tests/fixtures/slice-in-progress/.project/activity-log.jsonl` — change `"scope":"slices/test-slice"` to `"scope":"epics/test-epic/slices/test-slice"` on all slice-related entries
- [x] `tests/fixtures/slice-refining-max-rounds/.project/activity-log.jsonl` — same scope string update

**Integration test files** (the actually-failing tests):

- [x] `tests/integration/workflow-slice.test.ts` — change `path.join(env.GOODPLAN_DIR, "slices", "new-slice")` to `path.join(env.GOODPLAN_DIR, "epics", "test-epic", "slices", "new-slice")` at lines 20 and 35 (2 failures)
- [x] `tests/integration/error-transitions.test.ts` — change flat `slices/test-slice/slice.json` path to nested `epics/test-epic/slices/test-slice/slice.json` at line 119 (1 failure)
- [x] `tests/integration/migrate.test.ts` — fix path references only in this phase: update `slices/overview.json` existence checks and `state.contents.slices` directory traversal to use `epics/<epic>/slices/` paths (3 failures; `sliceSequence` assertion changes deferred to Phase 2)
- [x] `tests/integration/result-paths.test.ts` — update hardcoded `path.join(env.GOODPLAN_DIR, "slices", "test-slice")` to `path.join(env.GOODPLAN_DIR, "epics", "test-epic", "slices", "test-slice")` (line 47), update assertion `"slices/test-slice/plan.md"` to `"epics/test-epic/slices/test-slice/plan.md"` (line 19)

**Fitness test**:

- [x] `tests/fitness/stateless-commands.test.ts` — create a new `ENTITY_EXEMPT_COMMANDS` set (containing `migrate`) with a comment that these commands operate on the entire project rather than targeting a specific entity, and a note that `init` is also project-scoped but lives in `READ_ONLY_COMMANDS`. Exempt this set from the entity-identifying stdin field check. Do not add `migrate` to `STDIN_ENTITY_COMMANDS` — its stdin payload (`{round, answers}`) has no entity identifier. (Alternative name `PROJECT_SCOPE_COMMANDS` is avoided because `init` in `READ_ONLY_COMMANDS` is also project-scoped, which would make the boundary confusing.)

**Context test**:

- [x] `tests/unit/context/startContext.test.ts` — remove `sliceSequence` from the fixture at line 43 for consistency with `epicSchema` (it's a raw JSON blob, not schema-validated, but should match the current schema shape). Note: this is cosmetic consistency, not a bug fix — tests pass either way.

### Verification

- `bun test` → all pass
- `grep -rn 'sliceSequence' tests/ | grep -v migrate | grep -v migration` → only legitimate references (or zero)
- Spot-check: read `tests/integration/result-paths.test.ts`, confirm nested path assertions

## Phase 2: Migration Code Updates

Update `goodplan migrate` to support re-migration of already-initialized projects and clean up stale fields in the migration output.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun test -- tests/unit/rpc/migrate.test.ts tests/integration/migrate.test.ts` → failures related to `sliceSequence` assertions and stale path references

**After implementation** (should pass / show presence):
- [ ] `bun test -- tests/unit/rpc/migrate.test.ts tests/integration/migrate.test.ts` → all pass
- [ ] `grep -n 'sliceSequence' src/core/rpc/migrate.ts` → matches only in Q&A collection (`epicDetailResponseSchema`), not in `buildMigrationState` output

### Tasks

**Migration code changes**:

- [x] `src/core/rpc/migrate.ts` — remove the `project.json` existence check (lines 999-1006) that throws `STATE_ALREADY_INITIALIZED`. Allow `migrate` to run on already-initialized projects.
- [x] `src/core/rpc/migrate.ts` — remove `sliceSequence` from `buildMigrationState` epic.json output (line 256). The field no longer exists in `epicSchema`. The migration Q&A still collects it via `epicDetailResponseSchema` (correct — used for slice ordering), but the output `epic.json` should not include it.
- [x] `src/core/rpc/migrate.ts` — type `epicJsonContent` using the `Epic` type alias (from `src/schemas/entities/epic.ts`) or `z.infer<typeof epicSchema>` instead of `Record<string, unknown>`, so future schema changes are caught at compile time (this is how `sliceSequence` survived undetected in migration output). Use `z.infer` not `z.input` — the codebase consistently uses `z.infer` (10+ usages, zero `z.input`). Ensure `epicSchema`/`Epic` import is added to `migrate.ts`. Task ordering: remove `sliceSequence` first, then apply the type annotation, then verify the resulting object satisfies the type exactly. After removal, `epicJsonContent` should have exactly 8 fields matching `epicSchema`'s required fields — verify the field count explicitly before applying the type annotation.
- [x] `src/core/rpc/migrate.ts` — update `renameProjectDir()` to use timestamped backup names (`.project-old-<YYYYMMDD-HHmmss>/`, ISO 8601 compact format) instead of fixed `.project-old/`, so multiple backups can accumulate and re-migration doesn't fail on `.project-old/` collision. Retain `fs.existsSync` guard for the edge case of sub-second collisions — it must check the new timestamped path (the value of `projectOldDir`), not the old fixed `.project-old/` path. Ensure any error recovery message in `executeMigration` uses the runtime `projectOldDir` variable via string interpolation (not a hardcoded `.project-old/` string). Note: `Date.getMonth()` is 0-indexed — add 1 when formatting.
- [x] `src/core/rpc/migrate.ts` — when `project.json` exists (re-migration scenario), include a `warning` field in the structured JSON response: "Project is already initialized. Re-migration will rebuild state from directory contents." This keeps output machine-parseable for the `/migrate` skill, consistent with INV-007's structured error responses. Do not use raw stderr.
- [x] `src/commands/global/migrate/schemas.ts` — add `warning: z.string().optional()` to the `questions` variant only of the `migrationResultSchema` discriminated union. The warning is emitted during the pre-check phase before Q&A starts, so it belongs on the first `questions` response — not the `complete` variant (which would surface a stale warning at the wrong time). Without this field on the `questions` variant, `exactOptionalPropertyTypes` rejects the extra property at compile time and Zod strips unknown keys by default.
- [x] `src/commands/global/migrate.ts` — update `meta.description`, JSDoc comment (line 19), and preconditions block to reflect that `migrate` now supports re-migration of initialized projects (currently says "Requires .project/ to exist and .project/project.json to NOT exist").

**Migration unit tests** (specific assertion changes):

- [x] `tests/unit/rpc/migrate.test.ts` — remove all `sliceSequence` references in output assertions (grep for `sliceSequence` and remove only those in `buildMigrationState` output / result assertions). Keep `sliceSequence` in Q&A input assertions (those are correct — it's collected via `epicDetailResponseSchema`).

**Migration integration tests** (specific assertion changes):

- [x] `tests/integration/migrate.test.ts` — remove `sliceSequence` from the remaining output assertion (line 439 in the unit test section). The integration test assertion at line 212 was already removed in Phase 1 (necessary because `commitState` strips unknown keys via Zod validation). Q&A input references (~6 locations) remain unchanged. (Path fixes and `slices/overview.json` updates from Phase 1 already applied; this phase handles `sliceSequence` removal from `buildMigrationState` source and remaining test assertions.)

### Verification

- `bun test -- tests/unit/rpc/migrate.test.ts tests/integration/migrate.test.ts` → all pass
- `bun test` → full suite still passes
- `grep -n 'sliceSequence' src/core/rpc/migrate.ts` → confirm matches are only in Q&A section, not in `buildMigrationState`

## Phase 2.5: Build and Install Updated CLI

The installed CLI still has the old `STATE_ALREADY_INITIALIZED` guard. Phase 3 runs `goodplan migrate` on this repo using the installed CLI, so Phase 2's changes must be built and installed first.

### Tasks

- [x] `bun run build` — build the updated CLI with Phase 2 changes
- [x] `bun run install:cli` — install the updated CLI so `goodplan` on PATH has the re-migration support (actual: `cp goodplan ~/.local/bin/goodplan`)
- (no skill changes in this slice — `bun run install:skills` not needed)

### Verification

- `bun run build` exit code 0 — confirm build succeeds before installing
- `goodplan migrate --help` → description reflects re-migration support (updated in Phase 2)

## Phase 3: Self-Migrate and Architecture Docs

Run `goodplan migrate` on this repo's `.project/` to restructure flat slice paths to nested epic paths. Update architecture docs to reflect the completed entity restructuring.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls .project/slices/` → directory exists with flat slice directories
- [ ] `goodplan status --json | jq '.artifacts.totalSlices'` → current count (26)

**After implementation** (should pass / show presence):
- [ ] `ls .project/slices/ 2>/dev/null` → directory should not exist (slices moved under epics)
- [ ] `goodplan status --json` → all entities intact, same counts, no warnings
- [ ] `ls .project/epics/entity-restructuring/slices/` → contains 05-tests-and-migration and siblings
- [ ] `grep -c 'epics.*slices' .project/architecture/data-model.md` → non-zero (docs updated)

### Tasks

**Self-migration**:

- [x] Back up `.project/` state: `cp -r .project .project-backup` (belt-and-suspenders beyond `.project-old-<timestamp>/`)
- [x] Verify backup: `ls .project-backup/project.json` → exists
- [x] Run `goodplan migrate` — the `/migrate` skill answers Q&A questions by reading the current directory structure (both flat and nested locations). The migration rebuilds state with slices nested under their parent epics.
- [x] Verify: `goodplan status --json` — confirm all entities are intact (same epic count, slice count, quest count, task count)
- [x] Verify: all slice `slice.json` files exist at `epics/<epic>/slices/<name>/slice.json`
- [x] Clean up: remove `.project-backup/` after verification (`.project-old-<timestamp>/` is kept as the standard backup)

**Architecture doc updates** (reflect completed restructuring):

- [x] `.project/architecture/data-model.md` — update `slice.json` location examples, directory structure, state tree example, schema registry patterns, `hasChild` guard examples to use nested paths
- [x] `.project/architecture/state-machine-api.md` — update all State Key Dependencies table rows for slice events (`CREATE_SLICE`, `BEGIN_PLAN`, `COMPLETE_PLAN`, `COMPLETE_REFINEMENT_ROUND`, `COMPLETE_SLICE`, `COMPLETE_EPIC` — lines 235-240) changing `slices/<name>/` to `epics/<epic>/slices/<name>/`; also update any `slices/overview.json` references in those rows — `CREATE_SLICE`, `COMPLETE_SLICE`, and `COMPLETE_EPIC` rows likely reference this eliminated file and need replacement paths reflecting the embedded-overview approach; update `hasChild` guard examples (lines 262-263) with the same nested path treatment; update Directory-Based Guards section (check for stale flat `slices/<name>/` path references in guard examples and path resolution descriptions). Note: event type definitions may already be correct — verify before changing.
- [x] `.project/architecture/rpc-layer-api.md` — update `Target` type definition (epic field on slice variant), `resolveEntityDir` examples
- [x] `.project/architecture/flows.md` — update any slice workflow path references
- [x] `.project/architecture/commands-api.md` — update slice command path resolution, `--epic`/`--all` flags on `slice:list`
- [x] `.project/architecture/_overview.md` — verify maturity levels remain appropriate; no changes expected

### Verification

- `goodplan status --json` → no warnings, all counts match
- `bun test` → all pass (tests work against the new directory structure)
- Spot-check: read `data-model.md`, confirm nested path examples
- Grep: `grep -rn 'slices/overview\.json' .project/architecture/` → 0 matches (eliminated file not referenced)
