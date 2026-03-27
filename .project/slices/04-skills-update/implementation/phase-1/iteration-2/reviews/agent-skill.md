# Agent Skill Review — Phase 1: Path Updates & Learnings Removal (Iteration 2)

Reviewer: agent-skill
Phase: Phase 1: Path Updates & Learnings Removal
Changed files: skills/create-plan/references/guidance.md, skills/explore/SKILL.md

## Issues

**[MINOR]** explore-logic.md scope table still shows "Top-Level Slice" entry without a corresponding update to examples for the new world

The `explore-logic.md` scope path mapping table (line 9) correctly includes "Epic Slice" rows — this was already in place before this phase. The changed files in this phase do not touch `explore-logic.md`. The scope table is correct, and the explore skill now resolves epic slices to `.project/epics/<epic>/slices/<name>/` which matches the table. No inconsistency found.
File: skills/explore/references/explore-logic.md:9
Resolution: DIRECTLY_ACTIONABLE

**Correction**: Upon closer review, this is NOT an issue. The explore-logic.md table was already updated in a prior phase to include the Epic Slice row. No changes needed here.

No remaining issues found. The two fixes from Iteration 1 are verified correct:

### Verification of Iteration 1 Fix #1: guidance.md scan order inconsistency

**Original issue**: Scope Resolution item 3 (Auto-detect) was scanning both `.project/slices/` and `.project/epics/<name>/slices/` but in an ambiguous way that didn't prioritize the epic-nested path correctly.

**Fix applied** (confirmed in diff):
- Old: `scan .project/slices/ and .project/epics/<name>/slices/` (flat + nested, no priority)
- New: `If an active epic exists, scan .project/epics/<name>/slices/`; `If no active epic, scan .project/slices/` (clear mutual exclusion)

The new phrasing is correct and unambiguous. It matches the pattern used in `create-plan/SKILL.md` Step 2 item 3 (lines 46), and in `explore/SKILL.md` Step 2 (line 69). The scan order is now consistent across all three files.

### Verification of Iteration 1 Fix #2: missing epic-nested path resolution

**Original issue**: `explore/SKILL.md` item 1 under "no argument" scope resolution still used flat `.project/slices/<activeSlice.name>/` path even when an active epic exists.

**Fix applied** (confirmed in diff, line 69):
- Old: `use .project/slices/<activeSlice.name>/ as scope`
- New: `if .activeEpic also exists, use .project/epics/<activeEpic.name>/slices/<activeSlice.name>/` as scope; otherwise use `.project/slices/<activeSlice.name>/`

This matches the canonical pattern established in `create-plan/SKILL.md` Step 2 item 2 (line 44) and the `create-plan/references/guidance.md` Scope Resolution item 2 (line 6). The fix is correct.

### Additional verification: short-name search command (explore/SKILL.md line 52)

The `ls -d` command for short name resolution was updated to add `.project/epics/*/slices/*"$SHORT_NAME"*` before `.project/side-quests/`. The ordering places the epic-nested slice search before side-quests, which is the correct priority. This matches the resolution order (Active Slice before Active Quest before Active Epic).

### Additional verification: fallback listing command (explore/SKILL.md line 87)

The `ls` command listing available scopes was updated to include `.project/epics/*/slices/` in the output. This is correct — an agent listing available scopes should show epic-nested slices, not just top-level ones.

### Additional verification: no regression on intentional flat-path references

Checked `create-plan/references/guidance.md` — the "No argument" Scope Resolution item 2 also retains `.project/slices/<activeSlice.name>/` as the correct fallback when no `.activeEpic` exists. The "Auto-detect" item 3 retains `.project/slices/` as the fallback for no-epic projects. These are both correct per the codebase research (intentional fallbacks, not stale references).

### Additional verification: sequencing.md path fix

The Context Loading section of `guidance.md` now reads: `load from .project/epics/<epicName>/slices/sequencing.md ... if no active epic, load .project/slices/sequencing.md`. This matches `create-plan/SKILL.md` Step 3 item 6 (line 65) exactly. The prior form had `epics/<epicName>/slices/sequencing.md` (missing `.project/` prefix) which was a latent bug. The fix is correct.

### Epic architecture compatibility

Active epic is `entity-restructuring`. The changes are directly implementing the epic's target architecture:
- "Nested Slice Paths: `.project/slices/<name>/` → `.project/epics/<epic>/slices/<name>/`" — both changed files now use the nested path for epic slices
- Invariant: "activeSlice is only meaningful when activeEpic is set" — the updated logic checks `.activeEpic` before constructing the nested path, and falls back to flat path only when no active epic exists. Invariants respected.

No issues found. Both Iteration 1 fixes are correct and complete. No regressions or new issues introduced.

## Score: 10/10

Both IMPORTANT issues from Iteration 1 were fixed correctly and completely. The fixes are consistent with the patterns established across the rest of the codebase (create-plan SKILL.md, guidance.md, and explore-logic.md all use the same conditional epic path logic). No new issues introduced. The implementation is a clean mechanical migration with no over-engineering.

## Summary
- Critical: 0
- Important: 0
- Minor: 0
