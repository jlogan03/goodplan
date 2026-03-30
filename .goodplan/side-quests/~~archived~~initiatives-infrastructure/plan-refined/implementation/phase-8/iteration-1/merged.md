# Phase 8 Merged Review — `/complete-slice` + `/refine-slices` Scope Resolution

**Score**: 8/10 (consensus across all three reviewers)
**Findings**: Critical: 1, Important: 3, Minor: 3

---

## Critical

### 1. Archive step (Step 10b) missing initiative slice example
**Raised by**: All three reviewers (Generalist: Critical, Architecture: Important, Agent Skill: Important)
**Elevated to Critical**: Three-reviewer consensus, directly actionable gap in a core workflow step.

Step 10b shows archive `mv` commands for vertical slices and side quests but omits initiative slices. An agent completing an initiative slice has no example for the correct path and could archive at the wrong directory level.

**Fix**: Add a third example to Step 10b:
```bash
# For initiative slices:
mv .project/initiatives/__active__<name>/vertical-slices/<slice> \
   '.project/initiatives/__active__<name>/vertical-slices/~~archived~~<slice>'
```
**File**: `~/.claude/skills/complete-slice/SKILL.md:189`

---

## Important

### 2. Signal tracking glob misses archived initiative directories
**Raised by**: Architecture + Agent Skill (both Important)

Step 6d globs `.project/initiatives/__active__*/vertical-slices/*/completion/learnings.md`. Once an initiative is archived (`~~archived~~NN_<name>/`), its slices no longer match — signal tracking silently loses historical data. `guidance.md` line 95 has the same pattern.

**Fix**: Either extend the glob to also cover `~~archived~~*/vertical-slices/*/` or document that signal tracking is intentionally scoped to the current active initiative only.

**File**: `~/.claude/skills/complete-slice/SKILL.md:122`, `guidance.md:95`

### 3. `complete-slice` spreads initiative path knowledge across many steps (shotgun surgery)
**Raised by**: Architecture (Important)

`define-slices` has an explicit Step 0 with variable resolution; `refine-slices` uses clean `<slices-root>` parameterization. `complete-slice` inlines initiative path patterns across Steps 2, 3, 6, 6d, 8, and 10b with no single resolution step. Every new step must independently know the `initiatives/__active__*/vertical-slices/` pattern.

**Fix**: Consolidate initiative detection into a Step 0 or "Scope Resolution" preamble that sets a single variable used throughout, matching the pattern in `define-slices` and `refine-slices`.

**File**: `~/.claude/skills/complete-slice/SKILL.md:26`

### 4. `guidance.md` artifact loading references `vertical-slices/sequencing.md` without initiative qualification
**Raised by**: Generalist (Important)

Line 14 of `guidance.md` lists artifacts to load including `vertical-slices/sequencing.md` — not parameterized for initiative scope. SKILL.md Step 8 correctly handles the initiative case, but `guidance.md` (the operational reference re-read during execution) only points to the top-level path.

**Fix**: Update to: `vertical-slices/sequencing.md` (or initiative's `vertical-slices/sequencing.md` for initiative slices).

**File**: `~/.claude/skills/complete-slice/guidance.md:14`

---

## Minor

### 5. `refine-slices` does not load `initiative-conventions.md`
**Raised by**: Architecture

`define-slices` explicitly loads `~/.claude/skills/_shared/references/initiative-conventions.md` before initiative detection. `refine-slices` performs initiative detection but never loads the conventions file.

**File**: `~/.claude/skills/refine-slices/SKILL.md:32`

### 6. Terminology mismatch in `guidance.md` — "reconciliation" vs "alignment verification"
**Raised by**: Generalist

`guidance.md` point 2 says the agent reads initiative architecture for "reconciliation" at slice completion. Per initiative-conventions.md and SKILL.md Step 6, reconciliation happens at initiative completion; slice completion does "alignment verification."

**File**: `~/.claude/skills/complete-slice/guidance.md`

### 7. `refine-slices` flow-log scope example could be clearer
**Raised by**: Generalist + Agent Skill (overlapping)

Step 5 scope example `initiatives/__active__<name>/vertical-slices` is correct but the surrounding text could be clearer. A concrete example like `initiatives/__active__payments/vertical-slices` would help. Additionally, the `__active__` prefix in flow-log entries becomes stale after initiative archival.

**File**: `~/.claude/skills/refine-slices/SKILL.md:115`

---

## Dropped / Resolved

- Agent Skill Minor #4 (cleanup on interruption with `*-refining.md`): Reviewer confirmed the `<slices-root>` parameterization already covers this correctly. No issue.

## Plan Adherence

All plan tasks completed correctly. Gaps are in edge cases (archive path, signal tracking glob) and consistency (scope resolution pattern, terminology) rather than missing functionality.
