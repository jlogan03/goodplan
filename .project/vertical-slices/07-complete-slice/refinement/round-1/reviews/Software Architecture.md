# Software Architecture Review

**Score: 7/10**

## Critical Issues

### 1. decisions/ file format and naming convention unspecified

The plan says "write a decision to `.project/decisions/`" in Step 6 but never specifies: what the file should be named, what format it should follow, or how it relates to the convention defined in workflow-v2's goal.md (which specifies status fields like `active | superseded by <link> | revisiting`, rationale, date/context). The implementing agent will have to invent a format, risking inconsistency with whatever other skills eventually write to `decisions/`.

**Recommendation:** Add a task in Phase 1 (reference files) that defines the decision file format in `references/guidance.md` — file naming (`NNNN-<slug>.md` or `<date>-<slug>.md`), required sections (Decision, Rationale, Date, Status, Context/Source), and an example. Reference the workflow-v2 goal.md convention as the source of truth.

### 2. completion/architecture-updates.md not addressed

The workflow.md file structure shows `completion/architecture-updates.md` as a file in the completion directory, but the plan never writes it. Step 6 edits architecture files directly and writes decisions, but the per-slice `completion/architecture-updates.md` — which would serve as a record of what architecture changes this slice triggered — is never created. This breaks the file structure contract.

**Recommendation:** After Step 6, write `completion/architecture-updates.md` summarizing all architecture changes made (or "No architecture updates needed"). This provides a self-contained record within the slice's completion directory without needing to cross-reference decisions/.

## Important Issues

### 3. Scope resolution auto-detect condition differs subtly from create-plan pattern

The plan claims "same pattern as create-plan" but the auto-detect condition is fundamentally different. Create-plan looks for slices with `goal.md + explore marker but no plan.md`. Complete-slice looks for slices with "implementation artifacts but no completion/learnings.md". The plan never precisely defines what "implementation is complete" means. Workflow.md says completion is ready when `after-implementation-fixes-and-polish.md` exists and no `completion/` directory exists. The plan's Step 2.3 says "scan for first slice with implementation artifacts but no completion/learnings.md" which is vaguer — a slice mid-implementation also has "implementation artifacts."

**Recommendation:** Make the auto-detect condition explicit: scan for the first slice where `after-implementation-fixes-and-polish.md` exists but `completion/learnings.md` does not. This exactly mirrors the state machine in workflow.md.

### 4. Architecture update protocol lacks conflict detection with in-flight slices

When complete-slice proposes editing architecture files, there is no check for whether other slices are currently in-flight on other branches. An architecture update here could silently conflict with a plan being written or implemented on another branch. The workflow.md merge conflict strategy section acknowledges this risk for global files but the plan has no mitigation.

**Recommendation:** Add a note in Step 6 to check state.md's work stack. If other slices are in progress, warn the user that architecture changes may conflict with in-flight work. This is informational only — the user decides whether to proceed.

### 5. Learnings rollup lacks idempotency safeguard

Step 5 says "check for overlap" before adding to top-level learnings.md, but provides no guidance on how to detect overlap. If complete-slice is interrupted after writing `completion/learnings.md` but before updating the top-level file, re-running will attempt the rollup again. The "check for overlap" instruction is too vague for an implementing agent to handle correctly — what constitutes overlap? Exact text match? Semantic similarity?

**Recommendation:** Use the source tag (`_Source: <slice-name>_`) as the idempotency key. Before adding entries, check if any existing entry in `learnings.md` already has a source tag matching the current slice. If so, skip or offer to replace.

### 6. Step ordering puts learnings before architecture review

Steps 4-5 synthesize and write learnings before Step 6 reviews architecture. But architecture divergences discovered in Step 6 may themselves be learnings worth capturing. The current ordering means either learnings are incomplete, or Step 6 needs to go back and amend the already-written learnings file.

**Recommendation:** Either reorder (architecture review before learnings synthesis), or add an explicit sub-step at the end of Step 6: "If architecture updates revealed additional learnings, append them to completion/learnings.md and update the top-level rollup."

## Minor Issues

### 7. No guidance on reading large implementation directories

Step 3 says "read phase results and review files (last iteration's merged.md for each phase gives the best summary)" but a slice with many phases and iterations could produce dozens of files. No truncation or prioritization strategy is given beyond "last iteration's merged.md."

**Recommendation:** Add: "For each phase, read only the last iteration's review.md (or merged.md if present). Read result.md only if the review references specific issues. Skip earlier iterations unless investigating a pattern of recurring problems."

### 8. Graceful stop state (b) is underspecified

The plan defines three graceful stop states but state (b) — "learnings written but no architecture updates yet" — says "state shows in-progress" without specifying what the state.md entry should look like. The formats.md reference defines a specific 4-section format; the plan should specify the Current Phase value for this intermediate state.

**Recommendation:** Specify: Current Phase should be `complete-slice in-progress — learnings written for <scope>`, Next Step should be `Resume /complete-slice for <scope> (architecture review pending)`.

### 9. Test coverage gaps for re-entry

Phase 3 tests don't cover re-entry after interruption. If complete-slice wrote learnings but was stopped before architecture review, does re-running it detect the partial state and resume from Step 6? The plan's scope resolution (Step 2) only checks for `completion/learnings.md` absence — if it exists, the slice looks "complete" and won't be auto-detected.

**Recommendation:** Add Test 4: Run complete-slice, stop after learnings are written but before architecture review. Re-run. Verify it detects the partial completion and resumes from architecture review rather than starting over or skipping the slice.

## Summary

The plan captures the core workflow correctly and the step sequencing is mostly sound. The critical gaps are around the decisions/ integration (format unspecified, implementing agent will improvise) and the missing `completion/architecture-updates.md` file. The scope resolution needs tightening to match the workflow state machine precisely. The architecture update protocol would benefit from conflict awareness and the learnings rollup needs an idempotency mechanism.
