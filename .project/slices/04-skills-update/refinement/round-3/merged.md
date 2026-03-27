# Merged Feedback: 04-skills-update Round 3

## Summary

- Critical: 0
- Important: 0
- Minor: 3

All IMPORTANT issues from rounds 1 and 2 are confirmed resolved. Three MINOR gaps remain, all DIRECTLY_ACTIONABLE.

---

## Issues

### [MINOR] `create-plan/references/guidance.md` line 13 sequencing.md fallback not explicitly called out (agent-skill reviewer)

The plan task for `create-plan/references/guidance.md` says "update scope resolution, auto-detect scan paths" but does not explicitly name the `sequencing.md` fallback at line 13. The parallel reference in `create-plan/SKILL.md` line 65 is explicitly called out (plan line 34), but line 13 of `guidance.md` contains the same stale fallback: "fall back to `.project/slices/sequencing.md`". Risk: an implementer updates SKILL.md line 65 but misses guidance.md line 13.

**Fix:** Append "also remove the `.project/slices/sequencing.md` fallback from the artifact loading section (line 13 — sequencing is now in `epics/overview.json` slice array ordering)" to the `create-plan/references/guidance.md` task description.

Resolution: DIRECTLY_ACTIONABLE

---

### [MINOR] `create-slices/references/guidance.md` task rationale is misleading: sequencing.md still exists at nested path (holistic reviewer)

The plan says "sequencing.md no longer exists — sequencing is now embedded in `epics/overview.json` slice array ordering. This requires a conceptual update." This is incorrect for current state. `sequencing.md` still exists at `.project/epics/<epic>/slices/sequencing.md` and is actively used; its elimination is planned for slice 05. Lines 28-37 correctly instruct adding `$SLICES_DIR/sequencing.md` to CLAUDE.md — that logic is still valid. The only stale reference is the hard-coded `.project/slices/sequencing.md` at line 37 (Migration note). Risk: an implementer reading "no longer exists — conceptual update" might remove sequencing.md creation and CLAUDE.md-update instructions entirely, breaking the currently-working workflow.

**Fix:** Revise the task note to: "Lines 28-37 handle adding `sequencing.md` to CLAUDE.md — this is still valid at the nested path. The only stale reference is the hard-coded `.project/slices/sequencing.md` at line 37 (Migration note). Update that specific path to use the epic-scoped path. Do NOT remove the sequencing.md creation or CLAUDE.md-update logic — sequencing.md still exists and is actively used; its elimination is in slice 05."

Resolution: DIRECTLY_ACTIONABLE

---

### [MINOR] `complete/SKILL.md` line 341 flat sequencing.md path not explicitly called out (holistic reviewer)

Line 341 reads: "read the relevant `sequencing.md` (`.project/slices/sequencing.md` for top-level slices, or the epic's `slices/sequencing.md` for epic slices)." The flat `.project/slices/sequencing.md` reference is stale. The plan covers `complete/SKILL.md` generically via "sequencing.md references" but explicitly numbers other lines (154, 266-267, 277) — line 341 deserves the same treatment given the plan's own pattern. Low-risk since a systematic grep would surface it, but consistent with the plan's approach.

**Fix:** Add "Line 341 references `.project/slices/sequencing.md` for top-level slices — update path or note that top-level slices are legacy-only (no-active-epic fallback)" to the `complete/SKILL.md` task description.

Resolution: DIRECTLY_ACTIONABLE

---

## Round 2 Fixes Confirmed

- **IMPORTANT** (guidance.md line 53 "update rollup"): Plan line 47 correctly addresses this. ✓
- **MINOR** (guidance.md line 124 slices-refining dual-path): Plan line 33 correctly addresses this. ✓
- **MINOR** (before-count drift): Plan line 20 now says "36 or more" with re-establish note. ✓
