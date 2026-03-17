# Merged Review Feedback — Round 1

**Scores:** Holistic=8/10, SoftArch=7/10, AgentSkill=8/10

## Critical Issues

### C1: Missing `completion/architecture-updates.md` output
_Sources: Holistic C1, SoftArch #2, AgentSkill M3_
_Action: DIRECTLY_ACTIONABLE_

Workflow.md's directory structure specifies `completion/architecture-updates.md` as a file inside the slice's `completion/` directory. The plan writes architecture changes directly to `.project/architecture/` and `.project/decisions/` but never creates this file. This breaks the file structure contract.

**Fix:** Add a task after Step 6 to write `completion/architecture-updates.md` summarizing all architecture changes made, declined, and flagged as tech debt. If none were needed, write a brief "No architecture updates needed" note.

### C2: Missing `plan-learnings-and-feedback.md` from artifact loading
_Sources: Holistic I1, AgentSkill C1_
_Action: DIRECTLY_ACTIONABLE_

Goal.md explicitly lists `plan-learnings-and-feedback.md` as an artifact to read. The plan's Step 3 artifact loading omits it. This file (written by `/refine-plan`) contains insights about plan weaknesses — directly relevant to the "What worked well / poorly in the plan?" learnings question.

**Fix:** Add `plan-learnings-and-feedback.md` to Step 3's artifact list and reference it in Step 4's analysis (especially question 2).

### C3: decisions/ file format and naming convention unspecified
_Source: SoftArch #1_
_Action: DIRECTLY_ACTIONABLE_

The plan says "write a decision to `.project/decisions/`" but never specifies file naming, format, or how it relates to the convention in workflow-v2's goal.md (status fields like `active | superseded by <link> | revisiting`, rationale, date/context). The implementing agent will have to invent a format.

**Fix:** Define the decision file format in `references/guidance.md` — file naming (`NNNN-<slug>.md` or `<date>-<slug>.md`), required sections (Decision, Rationale, Date, Status, Context/Source), and an example. Reference the workflow-v2 goal.md convention as the source of truth.

## Important Issues

### I1: Scope resolution auto-detect condition is vague
_Sources: Holistic I3, SoftArch #3, AgentSkill I2_
_Action: DIRECTLY_ACTIONABLE_

The plan's Step 2.3 says "scan for first slice with implementation artifacts but no completion/learnings.md" — but "implementation is complete" is underspecified. A slice mid-implementation also has "implementation artifacts." Per workflow.md, completion readiness requires `after-implementation-fixes-and-polish.md` to exist.

**Fix:** Make the auto-detect condition explicit: scan for the first slice where `after-implementation-fixes-and-polish.md` exists but `completion/learnings.md` does not.

### I2: No CLAUDE.md update step
_Sources: Holistic I2, AgentSkill M2_
_Action: DIRECTLY_ACTIONABLE_

Idea.md states: "/complete-slice → updates if new architecture files were added during the slice." The plan has no step for updating CLAUDE.md's Project Context section when architecture files are added or changed. Prior skills (define-slices, create-plan) all include an explicit CLAUDE.md update step.

**Fix:** Add a step (after Step 6) to check whether any architecture files were added or renamed during this slice's completion, and update CLAUDE.md references accordingly. Follow the three-case logic pattern from define-slices.

### I3: No re-entry check
_Sources: Holistic M1, AgentSkill I3, SoftArch #9_
_Action: DIRECTLY_ACTIONABLE_

Prior skills (create-plan, define-slices) include explicit re-entry handling — detecting existing artifacts and offering overwrite/revise/cancel. If `/complete-slice` is run twice on the same slice, there's no guidance. The scope resolution (Step 2) only checks for `completion/learnings.md` absence — if it exists, the slice looks "complete" and won't be auto-detected.

**Fix:** Add re-entry check: if `completion/learnings.md` already exists, offer to revise or skip. Also handle partial state (learnings written but architecture review not done).

### I4: Architecture update protocol lacks conflict detection with in-flight slices
_Source: SoftArch #4_
_Action: DIRECTLY_ACTIONABLE_

When complete-slice proposes editing architecture files, there is no check for whether other slices are in-flight. An architecture update could silently conflict with work on another branch.

**Fix:** Add a note in Step 6 to check state.md's work stack. If other slices are in progress, warn the user that architecture changes may conflict with in-flight work (informational only).

### I5: Learnings rollup lacks idempotency safeguard
_Source: SoftArch #5_
_Action: DIRECTLY_ACTIONABLE_

Step 5 says "check for overlap" but provides no mechanism. If complete-slice is interrupted after writing `completion/learnings.md` but before updating the top-level file, re-running will attempt the rollup again.

**Fix:** Use the source tag (`_Source: <slice-name>_`) as the idempotency key. Before adding entries, check if any existing entry in `learnings.md` already has a source tag matching the current slice. If so, skip or offer to replace.

### I6: Step ordering puts learnings before architecture review
_Source: SoftArch #6_
_Action: DIRECTLY_ACTIONABLE_

Steps 4-5 synthesize and write learnings before Step 6 reviews architecture. But architecture divergences discovered in Step 6 may themselves be learnings worth capturing. Current ordering means learnings are potentially incomplete.

**Fix:** Either reorder (architecture review before learnings synthesis), or add an explicit sub-step at the end of Step 6: "If architecture updates revealed additional learnings, append them to completion/learnings.md and update the top-level rollup."

## Minor Issues

### M1: Reference file re-loading not specified for late steps
_Sources: Holistic M2, AgentSkill I1_
_Action: DIRECTLY_ACTIONABLE_

Step 9 says "Load references/formats.md" but it's ambiguous whether it's loaded or just referenced. Step 6 (architecture updates) is a long interactive step — guidance.md should be re-loaded before it.

**Fix:** Either load formats.md in Step 1 alongside guidance.md, or add explicit Read instructions at the point of use (matching the pattern from define-slices and create-plan).

### M2: No size guidance for SKILL.md body
_Source: Holistic M3_
_Action: DIRECTLY_ACTIONABLE_

With 10 steps (several with multi-item sub-lists), this skill could push the 500-line limit. The plan doesn't mention offloading detail to guidance.md to keep SKILL.md lean.

**Fix:** Note the expected size estimate (~150-200 lines) and offload Steps 4-7 detail to guidance.md if needed.

### M3: Graceful stop state (b) is underspecified
_Source: SoftArch #8_
_Action: DIRECTLY_ACTIONABLE_

State (b) — "learnings written but no architecture updates yet" — says "state shows in-progress" without specifying the state.md entry format.

**Fix:** Specify: Current Phase should be `complete-slice in-progress — learnings written for <scope>`, Next Step should be `Resume /complete-slice for <scope> (architecture review pending)`.

### M4: No guidance on reading large implementation directories
_Source: SoftArch #7_
_Action: DIRECTLY_ACTIONABLE_

Step 3 says "read phase results and review files" but a slice with many phases could produce dozens of files. No prioritization strategy beyond "last iteration's merged.md."

**Fix:** Add: "For each phase, read only the last iteration's merged.md. Read result.md only if the review references specific issues. Skip earlier iterations unless investigating recurring problems."
