# Plan: Skills Update

## Overview

Update all skill files referencing `.project/slices/` flat paths to use nested epic paths (`.project/epics/<epic>/slices/<name>/`), and remove direct `.project/learnings.md` writes from the `/complete` skill (making `learnings.jsonl` via CLI payload the sole structured source). All changes are content-only markdown — no TypeScript code.

12 files across 7 skills + 2 shared references. Per existing learnings: "Skill-only slices don't need formal review cycles — grep + smoke test is sufficient."

Important: edit files under `skills/` in this repo (source of truth), NOT the installed copies at `~/.claude/skills/`.

## Phase 1: Path Updates & Learnings Removal

Update all flat `.project/slices/` references to nested `epics/<epic>/slices/` paths. Remove direct `learnings.md` writes from /complete. Single phase — changes are mechanical and interdependent.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rc '\.project/slices/' skills/ | awk -F: '{s+=$2}END{print s}'` → 36 (flat path references)
- [ ] `grep -c 'edit.*learnings\.md\|write.*learnings\.md\|writes.*learnings\.md' skills/complete/SKILL.md` → count > 0 (direct write instructions)

**After implementation** (should pass / show presence):
- [ ] `grep -rc '\.project/slices/' skills/ | awk -F: '{s+=$2}END{print s}'` → 0 (all converted to nested paths or removed)
- [ ] `grep -c 'edit.*learnings\.md\|write.*learnings\.md\|writes.*learnings\.md' skills/complete/SKILL.md` → 0 (no direct write instructions)
- [ ] `grep -rc 'epics/.*slices/' skills/ | awk -F: '{s+=$2}END{print s}'` → non-zero (nested paths present)

### Tasks

**Path updates** (replace `.project/slices/<name>/` with `.project/epics/<epic>/slices/<name>/`):

- [ ] `skills/complete/SKILL.md` — update $SLICES_DIR resolution, scope dir derivation, stat paths, glob patterns, sequencing.md references. The complete skill's `$SLICES_DIR` currently says `.project/slices/` for epic-slice scope — update to `.project/epics/<epic>/slices/`
- [ ] `skills/complete/references/guidance.md` — update scope resolution, signal tracking glob paths, remaining slice review paths
- [ ] `skills/create-plan/SKILL.md` — update scope resolution (Step 2), sequencing.md fallback path
- [ ] `skills/create-plan/references/guidance.md` — update scope resolution, auto-detect scan paths
- [ ] `skills/create-slices/SKILL.md` — update $SLICES_DIR default, slice.json path reference, stale path examples
- [ ] `skills/create-slices/references/guidance.md` — update stale path references, CLAUDE.md migration check
- [ ] `skills/explore/SKILL.md` — update scope resolution, ls scan paths, activeSlice path derivation
- [ ] `skills/explore/references/explore-logic.md` — update scope directory examples
- [ ] `skills/refine-slices/SKILL.md` — update $SLICES_ROOT definition and fallback
- [ ] `skills/project-status/SKILL.md` — update slice discovery path
- [ ] `skills/_shared/references/cli-interaction.md` — update example paths in CLI response examples
- [ ] `skills/_shared/references/state-and-activity-formats.md` — update scope format examples

**Learnings.md removal** (from /complete skill):

- [ ] `skills/complete/SKILL.md` Step 5 — remove instructions to read/edit `.project/learnings.md` directly. The JSONL payload in `slice:complete` handles learnings rollup. Keep `completion/learnings.md` (local to the slice's completion dir) — that's the synthesis artifact, not the project-level file.
- [ ] `skills/complete/references/guidance.md` — update Learnings.md Entry Format section to remove the project-level `.project/learnings.md` edit instructions. Keep the `completion/learnings.md` synthesis instructions (local artifact).

### Verification

- `grep -rc '\.project/slices/' skills/` → all counts should be 0
- Spot-check: read `skills/complete/SKILL.md` Step 5, confirm no `learnings.md` direct edit instructions remain
- Spot-check: read `skills/complete/SKILL.md` Step 0, confirm $SLICES_DIR uses nested paths for epic-slice scope
- `grep -rc 'epics/.*slices/' skills/` → verify nested path references are present
