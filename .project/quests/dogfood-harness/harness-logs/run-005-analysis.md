# Harness Run 005 — Analysis

**Date:** 2026-03-24/25
**Duration:** ~40 min (aborted at slice 02 plan — sequential enforcement)
**Total cost:** $4.89
**Model:** claude-haiku-4-5

## Per-Step Metrics

| Step | Duration | Cost | Tool Calls | Msgs | State Transition |
|------|----------|------|------------|------|------------------|
| Explore | 199s | $1.06 | 71 | 228 | OK (automatic) |
| Architecture | 185s | $0.23 | 26 | 83 | OK (automatic) |
| Refine Architecture | 139s | $0.33 | 48 | 152 | OK (automatic) |
| Create Slices | 92s | $0.16 | 28 | 93 | OK + slices registered |
| Refine Slices | 323s | $1.10 | 42 | 266 | OK |
| Slice 01: Create Plan | 243s | $0.31 | 46 | 135 | OK |
| Slice 01: Refine Plan | 332s | $0.77 | 92 | 291 | OK |
| Slice 01: Implement | 363s | $0.92 | 90 | 278 | PARTIAL (no submit) |

## What Happened

1. Phase 2 pipeline ran smoothly through explore → architecture → refine-arch → slices → refine-slices → activate
2. Slice 01 cycle: plan → refine → implement all ran
3. implement-plan completed code writing but didn't call submit-implementation
4. Harness fallback attempted submit-implementation but got DATA_CONCURRENT_MODIFICATION
5. Slice 01 stuck at `implementing` status
6. Slice 02 couldn't start planning due to sequential slice enforcement (slice 01 not completed)

## New Findings

### 1. DATA_CONCURRENT_MODIFICATION blocks recovery
When the harness tries to manually submit-implementation after a skill fails to submit, the concurrent modification check blocks it. The skill wrote to overview.json out of band, and the CLI's optimistic concurrency detects the mismatch. Retry also fails — the check is persistent.

### 2. Submit-implementation is consistently skipped by Haiku
Same pattern as submit-architecture in earlier runs — the skill reaches the end of its work but doesn't call the final submit command. This is a Haiku capability issue: the model handles complex multi-step work but often drops the final administrative step.

### 3. Sequential slice enforcement is strict
`STATE_SLICE_NOT_READY` prevents starting any work on slice N+1 until slice N reaches `completed` or `abandoned`. Combined with the submit failure, this creates a cascade: one stuck slice blocks all subsequent slices.

### 4. Refine-architecture was much faster this run
139s vs 231-313s in previous runs. Fewer review iterations. Haiku's architecture output may have been simpler to review.

## Cost Comparison Across All Runs

| Run | Duration | Cost | Furthest Point |
|-----|----------|------|----------------|
| 001 | 26 min | $2.07 | Activate |
| 002 | 14s | $0 | Auth failure |
| 003 | 18 min | $4.15 | Epic complete (no slices) |
| 004 | 40 min | $5.39 | Slice 02 refine (missing file rename) |
| 005 | 40 min | $4.89 | Slice 01 implement (no submit) |

## Systemic Issue: Haiku Skips Final Submit Steps

This is now the #1 reliability issue. Across 5 runs:
- submit-explore: works sometimes, fails sometimes
- submit-architecture: works in run-004, fails in earlier runs
- submit-implementation: consistently fails
- submit-refinement: inconsistent

The pattern: Haiku handles the core work (research, code writing, review) but often skips the final "administrative" step of calling the CLI submit command. This is likely because:
1. The submit call is at the very end of long skill files (context pressure)
2. Haiku doesn't prioritize "cleanup" steps as highly as "work" steps
3. The system prompt says "always complete CLI state transitions" but this competes with other instructions

## Recommendations

### For immediate harness reliability:
1. **Add robust submit fallback with concurrent-mod retry**: After detecting concurrent modification, re-read the file and retry once with fresh state
2. **Add `slice:complete` fallback**: If submit-implementation fails, try completing the slice directly with minimal payload
3. **Add `--force` or `--skip-concurrent-check` flag to CLI**: For test/recovery scenarios where concurrent modification is expected

### For skill improvement:
4. **Move submit-* calls earlier in skill files**: Put them before cleanup/summary steps so they run even if the skill hits budget limits
5. **Add a "CRITICAL: Call submit-X before doing anything else" instruction**: Near the end of each skill, emphasize the submit call
6. **Consider having the CLI auto-submit when a session ends**: If the state is in a "working" status and the skill session terminates, auto-advance
