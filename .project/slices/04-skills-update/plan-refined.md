# Plan: Skills Update

## Overview

Update all skill files referencing `.project/slices/` flat paths to use nested epic paths (`.project/epics/<epic>/slices/<name>/`), and remove direct `.project/learnings.md` writes from the `/complete` skill (making `learnings.jsonl` via CLI payload the sole structured source). All changes are content-only markdown — no TypeScript code.

11 files across 7 skills + 1 shared reference. Per existing learnings: "Skill-only slices don't need formal review cycles — grep + smoke test is sufficient."

Note: `skills/_shared/references/state-and-activity-formats.md` was originally counted but already documents both flat and nested scope formats correctly — no changes needed.

Important: edit files under `skills/` in this repo (source of truth), NOT the installed copies at `~/.claude/skills/`.

## Phase 1: Path Updates & Learnings Removal

Update flat `.project/slices/` references to support nested `epics/<epic>/slices/` paths. Not all changes are simple replacements — some references are intentional no-active-epic fallbacks (preserve), some globs need dual-path expansion (flat + epic), and some skills need conditional logic. Remove all `.project/learnings.md` references from /complete (loads and writes). Single phase — changes are interdependent.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x]`grep -rc '\.project/slices/' skills/ | awk -F: '{s+=$2}END{print s}'` → 36 or more (flat path references; re-establish baseline during implementation as files may have changed)
- [x]`grep -c '\.project/learnings\.md' skills/complete/SKILL.md skills/complete/references/guidance.md` → count > 0 (all learnings.md references including loads and writes)

**After implementation** (should pass / show presence):
- [x]`grep -rc '\.project/slices/' skills/ | awk -F: '{s+=$2}END{print s}'` → ~10-12 (only intentional no-active-epic fallback references remain across create-slices, refine-slices, project-status, explore); all stale references converted or removed
- [x]`grep -c '\.project/learnings\.md' skills/complete/SKILL.md skills/complete/references/guidance.md` → 0 (no learnings.md references remain)
- [x]`grep -rc 'epics/.*slices/' skills/ | awk -F: '{s+=$2}END{print s}'` → non-zero (nested paths present)

### Tasks

**Path updates** (update `.project/slices/` references — see per-file notes for replacement vs. dual-path vs. conditional approach):

- [x]`skills/complete/SKILL.md` — update $SLICES_DIR resolution, scope dir derivation, stat paths, sequencing.md references. The complete skill's `$SLICES_DIR` currently says `.project/slices/` for epic-slice scope — update to `.project/epics/<epic>/slices/`. Line 154: remove or invert the "NOT .project/epics/<epic>/slices/<name>/" comment — it explicitly contradicts the target architecture and could mislead implementers doing mechanical replacements. For glob patterns (lines 266-267) scanning `.project/slices/*/completion/learnings.md`: expand to dual-path globs covering both `.project/slices/*/completion/learnings.md` AND `.project/epics/*/slices/*/completion/learnings.md` (pre-epic completed slices may still exist at flat paths). Line 277 references `.project/slices/slices-refining/` — this is a conceptual reference to the refine-slices working directory; update to handle both flat and epic-nested paths (`epics/<epic>/slices/slices-refining/`), same dual-path approach as the glob patterns. Line 341 references `.project/slices/sequencing.md` for top-level slices — update path or note that top-level slices are legacy-only (no-active-epic fallback).
- [x]`skills/complete/references/guidance.md` — update scope resolution, remaining slice review paths. Line 15 references `slices/sequencing.md` which no longer exists (sequencing is now embedded in `epics/overview.json` slice array ordering) — update or remove this reference. Line 111 glob scanning `.project/slices/*/completion/learnings.md`: expand to dual-path globs (same approach as SKILL.md globs above). Line 124 references `.project/slices/slices-refining/` — apply the same dual-path treatment as SKILL.md line 277 (`epics/<epic>/slices/slices-refining/`).
- [x]`skills/create-plan/SKILL.md` — update scope resolution (Step 2), sequencing.md fallback path
- [x]`skills/create-plan/references/guidance.md` — update scope resolution, auto-detect scan paths; also remove the `.project/slices/sequencing.md` fallback from the artifact loading section (line 13 — sequencing is now in `epics/overview.json` slice array ordering)
- [x]`skills/create-slices/SKILL.md` — update $SLICES_DIR default, slice.json path reference, stale path examples. Note: some `.project/slices/` references (e.g., lines 50, 52) are intentional no-active-epic fallback paths — preserve these, only update stale references that assume flat paths are the only layout.
- [x]`skills/create-slices/references/guidance.md` — update stale path references, CLAUDE.md migration check. Note: lines 28-37 handle adding `sequencing.md` to CLAUDE.md — this is still valid at the nested path. The only stale reference is the hard-coded `.project/slices/sequencing.md` at line 37 (Migration note); update that specific path to use the epic-scoped path. Do NOT remove the sequencing.md creation or CLAUDE.md-update logic — sequencing.md still exists and is actively used; its elimination is in slice 05.
- [x]`skills/explore/SKILL.md` — update scope resolution, ls scan paths, activeSlice path derivation. This skill lacks `$SLICES_DIR` or `$EPIC_DIR` variables — lines 52, 69, 87 need conditional logic: if `.activeEpic` exists, use `.project/epics/<epicName>/slices/<activeSlice.name>/`; otherwise use `.project/slices/<activeSlice.name>/`. Do not use simple find-and-replace; insert the conditional pattern.
- [x]`skills/explore/references/explore-logic.md` — the Scope Path Mapping table's Slice row (`.project/slices/<name>/...`) must be kept and renamed to "Top-Level Slice". Add a new "Epic Slice" row with `epics/<epic>/slices/<name>/...` paths. Do not replace the existing row.
- [x]`skills/refine-slices/SKILL.md` — update $SLICES_ROOT definition and fallback. Note: some `.project/slices/` references (e.g., lines 33, 37) are intentional no-active-epic fallback paths — preserve these, only update stale references.
- [x]`skills/project-status/SKILL.md` — update slice discovery path. Note: line 256 contains an intentional no-active-epic fallback `.project/slices/` reference — preserve it.
- [x]`skills/_shared/references/cli-interaction.md` — update example paths in CLI response examples

**Learnings.md removal** (from /complete skill):

- [x]`skills/complete/SKILL.md` — remove all `.project/learnings.md` references. This includes Step 4 artifact loading lines (lines 109, 135) where `learnings.md` is loaded for deduplication, and Step 5 direct-write instructions (lines 185, 189, 233). The JSONL payload in `slice:complete` handles learnings rollup. Keep `completion/learnings.md` (local to the slice's completion dir) — that's the synthesis artifact, not the project-level file.
- [x]`skills/complete/references/guidance.md` — remove all `.project/learnings.md` references (lines 15, 34, 38). Line 53 says "append to `completion/learnings.md` + update rollup" — "update rollup" is an implicit instruction to write `.project/learnings.md`; change to just "append to `completion/learnings.md`". Update Learnings.md Entry Format section to remove the project-level `.project/learnings.md` edit instructions. Keep the `completion/learnings.md` synthesis instructions (local artifact).

### Verification

- `grep -rc '\.project/slices/' skills/` → only intentional no-active-epic fallback references remain
- `grep -c '\.project/learnings\.md' skills/complete/SKILL.md skills/complete/references/guidance.md` → 0
- Spot-check: read `skills/complete/SKILL.md` Step 5, confirm no `learnings.md` direct edit instructions remain
- Spot-check: read `skills/complete/SKILL.md` Step 0, confirm $SLICES_DIR uses nested paths for epic-slice scope
- `grep -rc 'epics/.*slices/' skills/` → verify nested path references are present
- Semantic coherence check: read each updated SKILL.md's scope resolution section end-to-end and confirm: (1) epic-slice scope resolves correctly, (2) no-active-epic fallback still works, (3) no dangling references
- Note: CLAUDE.md references `.project/epics/entity-restructuring/slices/sequencing.md` which may be stale — out of scope for this slice but should be tracked separately
