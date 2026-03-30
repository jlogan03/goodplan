# Merged Review — Phase 3: Project-Status Tracer Bullet

**Score: 8/10** | Critical: 0, Important: 2, Minor: 2

## Summary

The rewrite successfully migrates `project-status` from direct `.project/` file access to CLI-based interaction. All expected-behavior checks pass: zero direct state.md/activity-log.jsonl/ls references, 8 CLI command references, convention doc referenced. Step 9 (state writeback) was correctly removed. The two-stage detection pattern in Step 1 matches the convention doc exactly.

To reach 9+: fix the Step 4 fallback semantic mismatch (first-5 vs last-5) and add a brief mechanism note to the file-existence state machine in status-logic.md.

---

## Important Issues

### I1 — Step 4 fallback returns first 5 entries instead of last 5

The primary query uses `.[-5:]` to get the most recent 5 activity entries. The fallback uses `--limit 5` without `--offset`, which returns the *oldest* 5 — a semantic mismatch.

Options:
- Use `goodplan state --json --query '.["activity-log.jsonl"] | reverse' --limit 5` for the fallback, or
- Use `.["activity-log.jsonl"] | .[-5:]` in both cases and drop the `--limit` variant.

Since the jq slice failing while a full array fetch succeeds is unlikely, consider removing the fallback entirely.

File: `skills/project-status/SKILL.md:81`

### I2 — File-existence state machine in status-logic.md is partially obsolete

The "Checking Implementation Progress" subsection in `status-logic.md` (lines 43–51) still reads as imperative instructions for direct filesystem operations ("List directories under `implementation/`", "check if `review.md` exists"). The SKILL.md Step 6 correctly uses `state --json --query` and `show --json` for these checks, so the skill body is correct — but the reference doc and skill doc are inconsistent.

Additionally, line 18 of `status-logic.md` reads: "Authoritative source of truth. `state.md` is an optimization hint — these rules override it." This is a leftover from the pre-CLI era and contradicts the new "State Orientation (CLI)" section at the bottom of the same file.

Resolution: Add a one-line note at the top of the "File-Existence State Machine" section — e.g., "These rules define state semantics. Use CLI commands (state --json --query, show --json) to evaluate conditions — not direct filesystem access." Also update line 18 to remove the `state.md` mention.

File: `skills/project-status/references/status-logic.md:18-19, 45-51`

---

## Minor Issues

### M1 — Interrupted work query is fragile with recursive descent

Step 5 uses `.epics | .. | .["interrupted.md"]? // empty` and Step 7 uses `[.. | .["interrupted.md"]? | select(. != null)]`. Both rely on `..` (recursive descent), which traverses all values including strings and arrays and can be slow on large state trees.

A more targeted alternative: `.epics[][].slices[][] | select(has("interrupted.md")) | .["interrupted.md"]`

Acceptable for this tracer bullet; worth addressing in a future optimization pass.

File: `skills/project-status/SKILL.md:113`

### M2 — Description could add one more trigger scenario

The description was updated from "Read .project/ state" to "Query project state via the goodplan CLI" and already lists several trigger scenarios. One missing case: "after completing a slice or epic." Minor — existing triggers are adequate.

File: `skills/project-status/SKILL.md:4`

---

## Positives

- Clean removal of Step 9 (state writeback); old Step 10 correctly renumbered
- Convention doc reference added in Step 2 as required
- Frontmatter updated with `requires` field and revised description
- Two-stage detection pattern (binary then project) matches convention doc exactly
- Epic/slice scanning uses `epic:list --json` and `slice:list --json` correctly
- `sequencing.md` read via Read tool correctly identified as permitted (LLM-owned markdown)
- "Read-only skill" callout in the intro paragraph is a good addition
