# Harness Run 004 — Analysis

**Date:** 2026-03-24
**Duration:** ~40 min (aborted at slice 02 implement)
**Total cost:** $5.39
**Model:** claude-haiku-4-5

## Per-Step Metrics

| Step | Duration | Cost | Tool Calls | Msgs | State Transition | Notes |
|------|----------|------|------------|------|------------------|-------|
| Explore | 148s | $0.96 | 98 | 307 | OK (automatic) | |
| Architecture | 179s | $0.23 | 22 | 73 | OK (automatic!) | Fixed from run-003 |
| Refine Architecture | 231s | $0.68 | 97 | 314 | OK (automatic) | |
| Create Slices | 74s | $0.13 | 20 | 68 | OK + slices registered | slice:create fix worked! |
| Refine Slices | 277s | $1.03 | 148 | 462 | OK (automatic) | |
| Slice 01: Create Plan | 83s | $0.16 | 23 | 72 | OK | |
| Slice 01: Refine Plan | 182s | $0.53 | 65 | 210 | OK | |
| Slice 01: Implement | 926s | $1.03 | 136 | 438 | OK | Longest skill! |
| Slice 01: Complete | — | — | — | — | OK (status=completed) | |
| Slice 02: Create Plan | 151s | $0.30 | 34 | 103 | OK | |
| Slice 02: Refine Plan | 157s | $0.35 | 34 | 117 | OK (scores submitted) | plan-refining.md not renamed |

## Major Achievement: First Full Slice Lifecycle!

Slice 01-provider-scaffold completed the entire lifecycle:
- created → planning → plan-created → plan-refined → implementing → implementation-complete → completed

This is the first time the full plan → refine → implement → complete cycle has run end-to-end via the harness.

## Key Findings

### 1. Architecture submit now works (fixed from run-003)
The create-architecture skill successfully called submit-architecture this time. The earlier failures may have been budget-related (run-003 used $0.09 vs run-004's $0.23).

### 2. slice:create fix validated
`Slices: ["01-provider-scaffold:created","02-cli-runner:created"]` — both slices registered in CLI state. The Step 7b addition to create-slices/SKILL.md works.

### 3. implement-plan is the most expensive skill
926 seconds (~15 min), $1.03, 136 tool calls, 438 messages. This is the dominant cost and time sink. It spawned 3 implementation sub-agents sequentially.

### 4. plan-refining.md → plan-refined.md rename skipped
The /refine-plan skill submitted refinement scores (advancing state to plan-refined) but didn't rename the working copy. The CLI's STATE_CONTENT_MISSING guard then blocked implementation.

**Root cause:** Likely a Haiku quality issue — the skill's final step (rename + cleanup) is easy to skip when the model is operating at lower capability.

### 5. Cost distribution
- Refinement skills (refine-arch + refine-slices + 2×refine-plan): $2.59 (48%)
- Implementation: $1.03 (19%)
- Exploration: $0.96 (18%)
- Simple skills (create-*, complete): ~$0.82 (15%)

### 6. All state transitions work when PATH is correct
The only remaining non-automated transition is the plan-refining rename — a file operation, not a CLI transition.

## Comparison Across Runs

| Run | Duration | Cost | Furthest Point | Key Issue |
|-----|----------|------|----------------|-----------|
| 001 | 26 min | $2.07 | Activate (no PATH) | CLI not on PATH |
| 002 | 14s | $0 | Explore (no auth) | env override lost auth |
| 003 | 18 min | $4.15 | Epic complete (no slices) | No slice:create |
| 004 | 40 min | $5.39 | Slice 02 implement | plan-refining rename |

Progressive improvement: each run gets further through the lifecycle.

## Remaining Issues

1. **plan-refining.md rename** — harness fix-up added, needs re-test
2. **~~archived~~ rename** — harness handles gracefully but CLI data layer doesn't understand prefixed paths
3. **Haiku quality** — model sometimes skips final cleanup steps in skills
