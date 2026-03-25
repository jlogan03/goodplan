# Run-009 Final Analysis — Best Run

**Date:** 2026-03-25
**Duration:** ~100 min
**Total cost:** $12.01 (22 completed skills)
**Model:** claude-haiku-4-5
**Phases:** 2 complete, 3 complete, 4 partial (crashed at slice status check)

## Completion Status

| Phase | Status | Skills | Cost |
|-------|--------|--------|------|
| 2: First Epic | COMPLETE | 12 | ~$5.95 |
| 3: Quest | COMPLETE | 3 | ~$0.88 |
| 4: Second Epic | PARTIAL (23/~26 steps) | 7+ | ~$5.18 |

## Phase 2 Detail — Both Slices Completed

| Step | Cost | Duration | Tool Calls |
|------|------|----------|------------|
| explore | $1.06 | 378s | 109 |
| create-architecture | $0.28 | 200s | 21 |
| refine-architecture | $0.27 | 88s | 31 |
| create-slices | $0.15 | 74s | 20 |
| refine-slices | $1.05 | 267s | 64 |
| slice-01: create-plan | $0.24 | 106s | 33 |
| slice-01: refine-plan | $0.31 | 142s | 34 |
| slice-01: implement-plan | $1.68 | 756s | 166 |
| slice-02: create-plan | $0.42 | 137s | 47 |
| slice-02: refine-plan | $0.56 | 197s | 62 |
| slice-02: implement-plan | $0.51 | 256s | 50 |
| slice-02: complete | $0.25 | 100s | 43 |

## Phase 3 Detail — Quest Completed

| Step | Cost | Duration | Tool Calls |
|------|------|----------|------------|
| create-plan | $0.08 | 37s | 14 |
| refine-plan | $0.59 | 210s | 75 |
| implement-plan | $0.21 | 105s | 30 |

## Phase 4 Detail — Second Epic (Partial)

| Step | Cost | Duration | Tool Calls |
|------|------|----------|------------|
| explore | $1.37 | 218s | 89 |
| create-architecture | $0.17 | 107s | 22 |
| refine-architecture | $0.60 | 171s | 27 |
| create-slices | $0.15 | 85s | 27 |
| refine-slices | $1.21 | 464s | 183 |
| slice-01: create-plan | $0.18 | 97s | 26 |
| slice-01: refine-plan | $0.66 | 218s | 83 |
| slice-01: implement-plan | ??? | running | — |

## Direct .project/ Access Violations

**None detected by the canUseTool hook.** However, concurrent modification errors suggest sub-agents modify JSON files through Bash commands our regex patterns don't catch, OR through sub-agents where canUseTool doesn't apply.

## Bugs Found Across All 9 Runs

### Fixed (7)
1. Skills hardcoded `~/.claude/skills/_shared/` → relative paths
2. Agent SDK env override strips auth → `...process.env` spread
3. `goodplan` not on PATH in SDK sessions → `env.PATH`
4. `/create-slices` missing `slice:create` → added Step 7b
5. `/refine-plan` doesn't create plan-refined.md → harness fallback
6. `~~archived~~` rename breaks CLI → removed convention
7. Submit-implementation concurrent mod → nuclear recovery in harness

### Open (6)
1. **Concurrent modification is permanent** — no CLI recovery mechanism
2. **Haiku skips submit-\* steps ~50%** — harness compensates but this is a skill reliability issue
3. **implement-plan test retry loops** — Haiku spawns failing test commands repeatedly
4. **epic:complete state not reached** — `/complete` skill doesn't always call `epic:complete`
5. **quest:complete sometimes fails** — exit 1 in some runs
6. **Sub-agents may modify JSON files directly** — canUseTool hook doesn't cover sub-agent Bash

### CLI Issues
1. `goodplan init` fails if `.project/` exists without `project.json`
2. `status --json` recommendations don't detect non-activated epics
3. `epic:create` returns empty `paths: {}`
4. No `--force` flag for concurrent modification recovery
5. `DATA_CONCURRENT_MODIFICATION` is permanent (no self-healing)

## Performance Insights

### Cost Distribution (across all completed skills)
- **Refinement skills** (refine-*): 45% of total cost
- **Implementation**: 30% of total cost
- **Exploration**: 15% of total cost
- **Simple skills** (create-*, complete): 10% of total cost

### Timing
- **Fastest skill**: create-plan (37s average)
- **Slowest skill**: implement-plan (756s peak, 6-12 min average)
- **Bottleneck**: refine-* with reviewer sub-agents (3-5 min each)
- **Total skill execution**: ~80 min for 22 skills

### Token/Context Pressure Indicators
- **Message counts**: range from 45 (simple create-plan) to 570 (complex refine-slices)
- **Tool call counts**: range from 14 to 183
- **Sub-agent spawning**: up to 5 parallel reviewers in refine-architecture
- **No context compaction triggered** (Haiku has 200K context)

### Haiku Quality Assessment
- **Strength**: Core work execution (research, code writing, architecture)
- **Weakness**: Final administrative steps (submit-*, file renames, cleanup)
- **Pattern**: Model handles complex multi-step reasoning but drops "housekeeping" at end
- **Recommendation**: Move submit-* calls earlier in skill files, or add harness-level post-skill hooks

## Recommendations

### For the CLI
1. Add `--force` or `--recover` flag to bypass concurrent modification check
2. Consider auto-submitting when a "working" state has been active for >N minutes
3. Make `DATA_CONCURRENT_MODIFICATION` self-healing (re-read and retry internally)

### For Skills
1. Move submit-* calls to immediately after the core work, before cleanup/summary
2. Add "CRITICAL: Complete this step" markers near submit calls
3. Consider having skills write a `.pending-submit` marker that the harness can detect

### For the Harness
1. Add sub-agent tool monitoring (currently only main agent's canUseTool is hooked)
2. Add per-phase cost budgets (not just per-skill)
3. Add a `--resume` flag to continue from where the last run failed
4. Add timing breakdown per phase in the summary

### For the Architecture
1. The concurrent modification check is the #1 reliability issue — needs a design decision
2. Consider whether skills should have any ability to modify JSON state (even for recovery)
3. The `canUseTool` hook only covers the main agent — sub-agents need independent monitoring
