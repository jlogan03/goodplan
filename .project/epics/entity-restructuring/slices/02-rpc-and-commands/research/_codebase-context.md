# Codebase Context for Slice 02: RPC and Commands

_Generated 2026-03-26_

## Fresh Documentation (reliable refs)

| Document | Last Updated | Freshness |
|---|---|---|
| `.project/epics/entity-restructuring/architecture/_overview.md` | 2026-03-26 (today) | Fresh — refined architecture, 3 rounds, scores 9/9 |
| `.project/epics/entity-restructuring/architecture/affected-apis.md` | 2026-03-26 (today) | Fresh — same commit as overview |
| `.project/epics/entity-restructuring/architecture/data-model-changes.md` | 2026-03-26 (today) | Fresh — same commit as overview |
| `.project/architecture/_overview.md` | 2026-03-26 (today) | Fresh — updated during task-capture phase 3 |
| `.project/architecture/data-model.md` | 2026-03-26 (today) | Fresh — same commit as _overview |
| `.project/architecture/commands-api.md` | 2026-03-26 | Fresh — updated during migrate-to-cli phase 4 |

## Stale Documentation (flagged)

| Document | Last Updated | Staleness Issue |
|---|---|---|
| `.project/architecture/rpc-layer-api.md` | 2026-03-23 | **Stale** — predates slice 01. Still shows `{ type: 'slice'; name: string }` without `epic` field on line 59. Code (`src/core/rpc/types.ts:67`) already has `{ type: "slice"; name: string; epic: string }` from slice 01. The plan should treat this doc as aspirational (epic architecture docs are the source of truth for target state), not as current-state reference. |

Note: `commands-api.md` already references `--epic` flags on slice commands (line 82-84), which is consistent with the target state. However, it does not document the `epic` field on the Target type (it delegates to `rpc-layer-api.md` for that).

## Recent Development Activity

**No changes to plan-affected files since slice 01 completed** (`fa27d22`, 2026-03-26). The `git log` from slice 01 to HEAD shows zero commits touching `src/core/rpc/`, `src/commands/slice/`, `src/commands/subagent/`, `src/commands/global/status.ts`, or `src/core/context/priorities.ts`. This means the plan's assumptions about file state are still valid.

Most plan-affected files were last touched by slice 01 itself (`19c15e2`, schema-state-machine Phase 1), which inserted the `@ts-expect-error` annotations this slice must clear. Exceptions:
- `src/commands/slice/list.ts` — last touched by decisions-learnings (2026-03-23), not by slice 01 (no annotations)
- `src/commands/slice/show.ts` — last touched by show-status-enrich (2026-03-23), not by slice 01 (no annotations)
- `src/commands/global/status.ts` — last touched by task-capture Phase 2 (2026-03-26), not by slice 01

## Annotation Count Verification

**Plan states 22 annotations; actual count is 22** (20 `@ts-expect-error` + 2 `TODO(slice-02)`).

Breakdown:
- `@ts-expect-error` annotations: **20 total**
  - `src/core/rpc/begin.ts`: 4 (event needs epic from target.epic)
  - `src/core/rpc/submit.ts`: 3 (event needs epic from target.epic)
  - `src/core/rpc/complete.ts`: 1 (event needs epic from target.epic)
  - `src/commands/slice/*.ts`: 6 (Target needs epic field — create, plan, refine-plan, implement, complete, abandon)
  - `src/commands/subagent/*.ts`: 6 (Target needs epic field — start-plan, start-refinement, start-implementation, submit-plan, submit-refinement, submit-implementation)

- `TODO(slice-02)` annotations: **2 total**
  - `src/core/rpc/paths.ts:150` — path should be `epics/${target.epic}/slices/${target.name}`
  - `src/core/context/priorities.ts:17` — path should be `epics/${target.epic}/slices/${target.name}`

## Key Decisions and Constraints

1. **Target type already updated** (slice 01): `Target` slice variant is `{ type: "slice"; name: string; epic: string }` in `src/core/rpc/types.ts:67`. The `@ts-expect-error` annotations exist because callers are not yet passing `epic` — they construct targets without the field and suppress the type error. Slice 02 resolves each by adding `epic` from `project.json.activeEpic` or flag.

2. **State events already updated** (slice 01): All slice `StateEvent` variants carry `epic: string` (schemas and state machine handlers updated in Phase 1-2). The RPC builders (`buildBeginEvent`, `buildCompleteEvent`, etc.) just need to read `target.epic` and pass it through.

3. **activeSlice invariant**: `project.json.activeSlice` is a bare string, always scoped to `activeEpic`. Commands must resolve epic from `project.json.activeEpic` when `--epic` flag is absent. Error if neither is set.

4. **`commands-api.md` already documents `--epic` flag on `slice:create`** (line 84) — this is consistent with the plan's approach of deriving epic from flag or activeEpic.

5. **Schema registry already updated** (slice 01): `epicOverviewSchema` and nested path patterns were done in Phase 1. No registry work needed in slice 02.

6. **INV-005 (schema validation)**: All JSON writes go through `commitState` with Zod validation. The epic overview schema requires `slices` array — already enforced by slice 01's schema changes.

## Areas of Active Churn vs Stability

**Stable** (no changes expected outside this plan):
- `src/core/state/` — fully updated in slice 01, no slice 02 annotations remain
- `src/core/data/` — schema registry and data layer are complete
- `src/schemas/` — all entity schemas finalized in slice 01
- `src/commands/epic/` — no slice 02 work needed (epic commands don't reference slice paths)

**Active churn** (files this plan will modify):
- `src/core/rpc/begin.ts` — 4 annotations to clear (highest concentration)
- `src/core/rpc/submit.ts` — 3 annotations
- `src/core/rpc/paths.ts` — 1 TODO (path resolution)
- `src/core/rpc/complete.ts` — 1 annotation
- `src/core/context/priorities.ts` — 1 TODO (scope path)
- All `src/commands/slice/*.ts` mutation commands — 6 annotations across 6 files
- All `src/commands/subagent/start-*` and `submit-*` for slice targets — 6 annotations across 6 files
- `src/commands/global/status.ts` — reads slices from embedded overview

**Not modified by plan but in adjacent concern**:
- `src/commands/slice/list.ts` and `src/commands/slice/show.ts` — no `@ts-expect-error` annotations. `list.ts` may need updates if it reads `slices/overview.json` (eliminated), but the plan does list it. `show.ts` resolves path via `resolveEntityDir` which will be fixed by `paths.ts` update.

## Epic Architecture Conflicts

**No conflicts detected.** The epic architecture docs (refined today, 2026-03-26) and the slice 01 code changes are aligned:

- Target type: code matches epic architecture spec (`epic: string` on slice variant)
- State events: code matches spec (all slice events carry `epic`)
- Path resolution: `paths.ts` TODO matches spec (`epics/${epic}/slices/${name}`)
- Overview structure: `epicOverviewSchema` with embedded slices matches spec

The only divergence is **documentation lag**: `rpc-layer-api.md` (2026-03-23) still shows the old Target type without `epic`. This should be updated as part of or after slice 02, per the epic architecture's "Documentation Update Phase" table.
