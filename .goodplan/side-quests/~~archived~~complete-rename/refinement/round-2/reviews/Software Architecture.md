# Software Architecture Review

## Round 1 Issue Resolution Check

The plan has addressed all 8 issues from round 1 that were attributed to this reviewer:

- **CRITICAL flow-log backward compatibility**: Resolved. Phase 1 task 2 explicitly updates the signal tracking filter to match both `"complete-slice"` and `"complete"`. Phase 2's Step 6d intermediate-steps task reiterates this.
- **IMPORTANT flow-log scope value**: Resolved. Step 10 initiative variant specifies `"scope":"initiatives/<name>"` (not `__active__` form) and `"phase":"complete"`. Uses `complete done` instead of `complete complete`.
- **IMPORTANT archive-then-reference ordering**: Resolved. Step 10 initiative variant sets Active Slice = "none" before Step 10b archives.
- **IMPORTANT intermediate steps**: Resolved. The "Handle intermediate steps" task explicitly addresses 6b (skip), 6c (skip), 6d (apply with dual filter), 7 (apply), 9 (adapt), 9b (apply).
- **MINOR Phase 3 initiative-conventions.md no-ops**: Resolved. Phase 3 no longer targets initiative-conventions.md.
- **MINOR historical references decision**: Resolved. Phase 1 has an explicit task: "Leave historical provenance markers unchanged" with rationale.
- **MINOR $SLICES_DIR**: Resolved. Step 0 extension sets `$SLICES_DIR = $INITIATIVE_DIR/vertical-slices/`.
- **Step 6e ordering**: Resolved. Description now says "after signal tracking" and numbering is 6e (after 6d).

## Issues

**[IMPORTANT]** Step 9 adaptation for initiative scope is internally inconsistent

The "Handle intermediate steps" task says Step 9 should skip the "next slice" framing and instead "focus on: are there leftover temp files, stale state entries, or dangling references to the initiative?" But the current SKILL.md Step 9 is a simple user question ("Do you want a cleanup/refactor pass before moving to the next slice?"). The plan's adaptation changes the *purpose* of Step 9 from "ask about cleanup work" to "check for stale references" -- the former is a user-facing question, the latter is an automated check. These are different operations. For initiative scope, the cleanup check should be: "Are there leftover temp files, stale state entries, or dangling references to the initiative?" presented to the user, not silently executed. Clarify whether this is interactive (AskUserQuestion with findings) or automated.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Artifact promotion destination directories not specified

Step 6e says "Copy [artifact] to project-level [directory]" but doesn't specify where. The initiative has `research/`, `brainstorm/`, `prototypes/` subdirectories. The project level (`.project/`) currently has no `research/`, `brainstorm/`, or `prototypes/` directories (this is a skills-only project per the research file). The plan should specify: (a) create `.project/research/`, `.project/brainstorm/`, `.project/prototypes/` as needed? (b) or copy into some other location? (c) what if the project-level directory already has a file with the same name? The artifact promotion step needs concrete destination paths and conflict handling.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Re-entry handling for initiative scope not addressed

Step 2 sub-step 7 handles re-entry for slice/quest completion (checks `completion/learnings.md` exists, offers revise/skip/cancel). For initiative completion, the re-entry surface is larger: learnings might be written but reconciliation not done, or reconciliation done but artifact promotion not done. The graceful stop task adds states (e) and (f) for these partial states, but the re-entry detection in Step 2 doesn't mention how to detect these states and offer to resume. Currently Step 2 only checks for `completion/learnings.md` -- for initiative scope, it should also check for `completion/architecture-updates.md` to distinguish "learnings done, reconciliation pending" from "fully done." Add re-entry detection logic for initiative-specific partial states.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 still lists files that don't need updating

Phase 1 task 4 lists `workflow.md`, `CLAUDE.md`, `.project/idea.md` as files to update, but the research file explicitly confirms these already use `/complete` and need no changes. The task will grep and find nothing to change in these files -- not harmful, but misleading. Either remove these specific files from the list (rely on the "Any other non-archived files found" catch-all) or add a note that these are included for completeness verification only.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has substantially improved from round 1 (was 6/10). All critical and important issues from round 1 are resolved. The three-phase structure is sound, the initiative completion workflow is well-designed, and the intermediate step handling is now explicit. The remaining issues are: (1) artifact promotion needs concrete destination paths and conflict handling -- this is an important gap that could cause implementation confusion, (2) Step 9's adaptation conflates two different operations (interactive question vs automated check), and (3) re-entry detection for initiative partial states is missing. To reach 9+: specify artifact promotion destinations and add initiative re-entry detection to Step 2.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
