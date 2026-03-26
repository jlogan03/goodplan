# Generalist Review — Phase 3: Project-Status Tracer Bullet

**Score: 8/10** | Critical: 0, Important: 2, Minor: 2

## Summary

The rewrite successfully migrates the `project-status` skill from direct `.project/` file access to CLI-based interaction. All expected-behavior checks pass: zero direct state.md/activity-log.jsonl/ls references, 8 CLI command references, convention doc referenced. The skill is correctly marked read-only with Step 9 (state writeback) removed entirely. The two-stage detection pattern in Step 1 follows the convention doc precisely.

## Important Issues

### I1 — Stale state.md reference in status-logic.md line 18

`status-logic.md` line 18 reads: "Authoritative source of truth. `state.md` is an optimization hint — these rules override it." This sentence is a leftover from the pre-CLI era. The file-existence state machine section header itself is fine (it documents conceptual states), but the state.md reference is contradictory given the new "State Orientation (CLI)" section at the bottom of the same file which says skills no longer read or write state.md. The sentence should be updated to remove the state.md mention — e.g., "Authoritative source of truth for determining entity state from file artifacts."

### I2 — File-Existence State Machine still implies direct file checks

The File-Existence State Machine table in `status-logic.md` (lines 24-39) describes conditions like "`abandoned.md` exists", "`completion/learnings.md` exists", etc. The SKILL.md Step 6 correctly instructs using `state --json --query` and `show --json` for these checks, but `status-logic.md` itself never explains *how* to check these conditions via CLI. The "Checking Implementation Progress" subsection (lines 43-51) still says "List directories under `implementation/`" and "check if `review.md` exists" without specifying the CLI method. While the SKILL.md compensates for this (Step 6 shows the `state --json --query` approach), the reference doc and the skill doc are slightly inconsistent. A brief note in status-logic.md saying "Use `state --json --query` or `show --json` to check these conditions" would align the two documents.

## Minor Issues

### M1 — Fallback in Step 4 uses --limit 5 but may not return last 5

The fallback in Step 4 uses `--limit 5` without `--offset`, which returns the *first* 5 entries, not the last 5. The plan says "fall back to querying the full array and taking the tail" but the implementation uses `--limit 5`. Per the convention doc, `--offset`/`--limit` page from the beginning. To get the last 5 without negative indexing, the skill would need to fetch the full array and slice in the agent's logic, or note this returns the oldest 5 (not most recent). This is a minor behavioral difference that may confuse agents.

### M2 — Interrupted work query may be fragile

Step 7's query `'[.. | .["interrupted.md"]? | select(. != null)]'` uses the recursive descent operator (`..`) which could be slow on large state trees and may match unexpected nested structures. The previous version explicitly targeted known paths. This is acceptable for a tracer bullet but worth noting for future optimization.

## Positives

- Clean removal of Step 9 (state writeback) and the old Step 10 renumbered to Step 9
- Convention doc reference added in Step 2 as required
- Frontmatter correctly updated with `requires` field and updated description
- Two-stage detection pattern (binary then project) matches convention doc exactly
- Epic directory scanning properly uses `epic:list --json` and `slice:list --json`
- Sequencing.md reads via Read tool correctly identified as permitted (LLM-owned markdown)
- The "read-only skill" callout in the intro paragraph is a nice addition
