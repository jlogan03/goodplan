# Harness Run 003 — Analysis

**Date:** 2026-03-24
**Duration:** ~18 min (aborted at epic completion verification)
**Total cost:** $4.15
**Model:** claude-haiku-4-5
**Fix applied:** env spread for auth + PATH with ~/bin

## Per-Step Metrics

| Step | Duration | Cost | Tool Calls | Msgs | State Transition |
|------|----------|------|------------|------|------------------|
| Explore | 145s | $0.77 | 73 | 234 | OK (automatic!) |
| Architecture | 42s | $0.09 | 17 | 54 | FAILED (manual fallback) |
| Refine Architecture | 313s | $1.67 | 89 | 292 | OK (automatic) |
| Create Slices | 65s | $0.10 | 19 | 61 | OK (reached slices-defined) |
| Refine Slices | 313s | $1.39 | 48 | 202 | OK (reached slices-refined) |
| Complete (epic) | 62s | $0.12 | 19 | 61 | Completed but renamed dir |

## Critical Findings

### 1. PATH fix resolved most state transition failures
- Explore: automatic ✓ (was failing in run-001)
- Refine-architecture: automatic ✓
- Create-slices: automatic ✓
- Refine-slices: automatic ✓
- Only architecture still needs manual fallback

### 2. Slices registered in CLI but not populated with entities
`slice:list` returns empty `[]` after create-slices and refine-slices. The skills call CLI transitions (state advanced to `slices-defined` → `slices-refined`) but don't call `slice:create` to register individual slices. Slice directories exist at `epics/core-provider/slices/01-provider-scaffold/` but the CLI has no record of them.

**Root cause:** The `/create-slices` skill creates sequencing.md and goal.md files in the epic's slices directory, and calls `submit-slices` to advance the epic state. But it never calls `slice:create` for each individual slice. The CLI's `slice:create` is what registers a slice entity at `.project/slices/<name>/`.

**Impact:** Per-slice plan/implement/complete cycles can't run because the harness has no slices to iterate over.

### 3. /complete skill renames epic directory, breaking CLI access
The `/complete` skill renames `epics/core-provider/` to `~~archived~~01_core-provider/`. The CLI's `epic:show --epic core-provider` then fails with DATA_FILE_NOT_FOUND because it looks for `epics/core-provider/epic.json`.

**Root cause:** The `~~archived~~` prefix is a skill-layer convention (from epic-conventions.md). The CLI doesn't know about it — it uses the entity name to construct the path.

**Impact:** Any harness/automation that queries epic status after completion will crash.

### 4. Architecture submit-* is the only remaining manual fallback
Every other skill completed its CLI transitions automatically. Only `/create-architecture` failed to call `submit-architecture`. This suggests the architecture skill's CLI integration is incomplete for the submit step.

### 5. Cost breakdown
- Refinement skills (refine-architecture, refine-slices) dominate cost: $3.06 of $4.15 (74%)
- Simple skills (create-*, complete) are cheap: $0.09-$0.12 each
- Explore is moderate: $0.77 (spawns 3 research sub-agents)
- Total Haiku cost for 6 skills: $4.15 — very reasonable

### 6. Timing breakdown
- Refinement skills are slowest: ~5 min each (reviewer sub-agents)
- Simple skills: ~1 min each
- Explore: ~2.5 min (3 parallel research agents)
- Total: ~16 min of skill execution

### 7. Tool call density
- Explore: 73 calls (high — research + brainstorm + file writes)
- Refine-architecture: 89 calls (highest — 5 reviewers + editor + second pass)
- Refine-slices: 48 calls (moderate — 4 reviewers + editor)
- Simple skills: 17-19 calls each

## Bugs to Fix

### Bug 1: `/create-slices` doesn't call `slice:create`
The skill writes files but doesn't register slices with the CLI. Need to add `slice:create` calls for each slice.

### Bug 2: `/complete` skill renames epic dir, breaking CLI
The `~~archived~~` convention is incompatible with CLI path resolution. Either:
- a) The CLI needs to support the archived prefix (complex)
- b) The /complete skill should use `epic:complete` CLI command instead of manual rename
- c) The harness needs to handle this gracefully

### Bug 3: `/create-architecture` doesn't call `submit-architecture`
Needs investigation — may be a skill migration gap.

## Comparison with Run 001

| Metric | Run 001 (no PATH) | Run 003 (PATH fixed) |
|--------|-------------------|---------------------|
| Skills completing transitions | 1/5 (explore only*) | 4/6 |
| Total cost | $2.07 | $4.15 |
| Duration | 26 min (aborted) | 18 min (aborted) |
| Furthest point | Activate (stuck at defining-slices) | Epic complete (archived) |

*Run 001 explore transition was manually detected; it's possible the skill did it in that run too.

## Next Steps

1. Fix `/create-slices` to call `slice:create` for each slice
2. Fix `/complete` to use CLI for epic completion (or handle archived path)
3. Investigate `/create-architecture` submit-architecture gap
4. Fix harness to handle `~~archived~~` gracefully in `epicStatus()`
5. Re-run to get full Phase 2 (including per-slice cycles)
