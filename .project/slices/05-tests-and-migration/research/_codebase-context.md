# Codebase Context: Slice 05 — Tests and Migration

## Fresh Documentation (Reliable References)

These docs were updated within the last 1-2 days and reflect the current codebase state:

| Doc | Last Updated | Notes |
|---|---|---|
| `.project/architecture/rpc-layer-api.md` | 2026-03-26 22:27 | Updated in slice 02 commit (68d9c05) — `Target` type already shows `epic` on slice variant |
| `.project/architecture/transition-tables.md` | 2026-03-26 15:00 | Recent, likely accurate |
| `.project/architecture/_overview.md` | 2026-03-26 15:16 | Recent |
| `.project/architecture/data-model.md` | 2026-03-26 15:16 | Recent but still contains stale flat-path references (see below) |
| `.project/architecture/commands-api.md` | 2026-03-26 00:55 | Recent, no `slices/overview.json` or `sliceSequence` references |
| `.project/architecture/invariants.md` | 2026-03-26 00:55 | Recent |
| `.project/conventions.md` | Current | Tech stack, repo structure, testing patterns — all accurate |
| `.project/learnings.md` | Current | 50+ learnings, heavily referenced — reliable |

**Epic architecture docs** (all from 2026-03-26 18:43, refined to 9/9 scores):
- `.project/epics/entity-restructuring/architecture/_overview.md` — comprehensive change spec
- `.project/epics/entity-restructuring/architecture/affected-apis.md` — detailed API surface enumeration
- `.project/epics/entity-restructuring/architecture/data-model-changes.md` — schema/path changes

These epic architecture docs are the authoritative reference for what was planned. Slices 01-04 have been implemented; this slice (05) is the final cleanup.

## Stale Documentation (Needs Updating in Phase 3)

Architecture docs that still contain pre-restructuring references:

| Doc | Stale Content | Count |
|---|---|---|
| `data-model.md` | `slices/overview.json` references | 1 |
| `data-model.md` | `sliceSequence` references | 2 |
| `data-model.md` | Flat `slices/` path references (not under `epics/`) | ~9 total, only ~2 are nested |
| `state-machine-api.md` | `slices/overview.json` references | 4 |
| `flows.md` | `slices/overview.json` references | 1 |

These are exactly the docs Phase 3 of the plan targets for update. No surprises here.

## Recent Development Activity

### Entity-Restructuring Epic Progress (Slices 01-04 Complete)

| Commit | Slice | What Changed |
|---|---|---|
| `19c15e2` | 01 — Schema & State Machine | Schemas, types, registry (epicOverviewSchema, nested patterns) |
| `751600d` | 01 — Schema & State Machine | Handlers, helpers, tests |
| `68d9c05` | 02 — RPC & Commands | RPC paths, commands, context, 41 files changed |
| `3e9c884` | 04 — Skills Update | 8 skill/reference files, dual-path globs, learnings.md removal |

Slice 03 (Context & Learnings) was apparently addressed within slice 02's commit based on the file changes.

### Current Test Suite State

**8 failures** across 4 test files:

1. **`tests/integration/migrate.test.ts`** (3 failures): `buildMigrationState` still produces `state.contents.slices` (flat top-level `slices/` directory), but code now nests slices under epics. Tests expect `state.contents.slices` to be a directory — it no longer exists. Also, `sliceSequence` assertions on `epic.json` output.

2. **`tests/integration/workflow-slice.test.ts`** (2 failures): Slice lifecycle integration tests fail — likely path resolution issues with flat vs nested paths in fixture setup.

3. **`tests/integration/error-transitions.test.ts`** (1 failure): `slice:abandon` transition test fails.

4. **`tests/integration/result-paths.test.ts`** (1 failure): Hardcoded `path.join(env.GOODPLAN_DIR, "slices", "test-slice")` — needs nested path.

5. **`tests/fitness/stateless-commands.test.ts`** (1 failure): `migrate` command not in exemption list for entity-identifying args.

### Unit Test State

All unit tests pass (13/13 migrate unit tests, all others). The plan's Phase 1 estimate of "8 or more failing test files" is **overstated** — the actual failures are concentrated in 4 integration/fitness test files plus the 3 migration test failures. The plan lists 12 test files needing updates; many of those were already fixed in slice 02's commit (68d9c05), which touched 14 test files.

## Key Decisions and Constraints

1. **Installed CLI vs repo CLI**: The installed `goodplan` CLI is used for `.project/` state mutations. The locally-built `./goodplan` binary is for testing on fixture repos only. Phase 3's self-migration MUST use the installed CLI.

2. **Migration philosophy**: `goodplan migrate` is a general-purpose "rebuild state from current directory" tool, not a one-time conversion. Phase 2 removes the `project.json` guard to support re-migration.

3. **`sliceSequence` removal**: The field was removed from `epicSchema` (slice 01), but `buildMigrationState` in `migrate.ts` still outputs it at line 256. Migration Q&A still collects it via `epicDetailResponseSchema` (correct — used for ordering the embedded `slices` array).

4. **`STATE_ALREADY_INITIALIZED`**: Still present in `migrate.ts` (1 reference). Phase 2 removes this guard.

5. **Database backup**: Per user's CLAUDE.md, ask before DB changes. Phase 3 includes a backup step (`cp -r .project .project-backup`).

## Areas of Active Churn vs Stability

### Active Churn
- `src/core/rpc/migrate.ts` — touched in 4 commits, most recently slice 02 (68d9c05)
- `tests/integration/` — 4 files still failing, will be modified
- Architecture docs — pending Phase 3 updates

### Stable (No Expected Changes)
- `src/core/state/transitions/` — last changed 2026-03-26 21:03, all handlers already use nested paths (done in slice 01)
- `src/core/data/` — last changed 2026-03-26 20:45, schema registry already updated (done in slice 01)
- `src/commands/` — last changed 2026-03-26 22:27, all slice commands already use nested paths (done in slice 02)
- `skills/` — last changed 2026-03-27 00:00, dual-path support done (slice 04)
- Unit tests — all passing, already updated in slices 01-02

### Stability Assessment
The codebase is in good shape for this final slice. The heavy lifting (schema changes, state machine, RPC, commands) was done in slices 01-02. This slice is cleanup: fix remaining integration test paths, update migration output, and update docs.

## Epic Architecture Awareness

### Alignment: Epic Target vs Current Reality

The epic architecture docs describe the full target state. Here is the implementation status:

| Epic Target | Status | Notes |
|---|---|---|
| Nested slice paths (`epics/<epic>/slices/<name>/`) | Done (slices 01-02) | All code uses nested paths |
| Consolidated overview (`epics/overview.json` with embedded slices) | Done (slice 01) | `epicOverviewSchema` in registry |
| `slices/overview.json` eliminated | Done (slice 01) | Schema registry pattern removed |
| `sliceSequence` removed from `epicSchema` | Done (slice 01) | But `buildMigrationState` still outputs it |
| Learnings source of truth (`learnings.jsonl` only) | Done (slice 04) | `/complete` no longer writes `learnings.md` |
| `Target` type: `epic` field on slice variant | Done (slice 02) | `rpc-layer-api.md` already updated |
| All state events gain `epic` field | Done (slice 01) | Handlers use `event.epic` |
| Migration support for re-initialized projects | Not done | Phase 2 of this slice |
| Architecture doc updates | Not done | Phase 3 of this slice |
| Integration tests fixed | Not done | Phase 1 of this slice |

### No Conflicts Detected

The epic architecture docs and the current codebase are aligned on the target. The remaining work in this slice is well-scoped: test fixes, migration guard removal, and doc updates. No architectural conflicts or surprises.

### Plan Accuracy Notes

1. **Phase 1 scope is narrower than planned**: The plan lists 12 test files and 2 fixtures needing updates. Many were already fixed in slice 02 (commit 68d9c05 touched 14 test files). The actual failing tests are in 4 files (3 integration + 1 fitness). The plan's unit test file list (state.test.ts, status.test.ts, tree.test.ts, learnings.test.ts, collect.test.ts, rollup-learnings.test.ts, records.test.ts, schema-registry.test.ts, state-events.test.ts) should be verified — most may already pass.

2. **Phase 2 is accurate**: `STATE_ALREADY_INITIALIZED` exists (1 ref), `sliceSequence` in `buildMigrationState` output exists (line 256). Migration test assertions for `sliceSequence` and `state.contents.slices` need updating.

3. **Phase 3 stale-reference counts match**: `data-model.md` has stale references, `state-machine-api.md` has 4 `slices/overview.json` refs, `flows.md` has 1. The plan's doc update targets are accurate.
