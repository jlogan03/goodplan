## Issues

**[CRITICAL]** Step numbering collision in Phase 2 — "Step 9b" already exists
Phase 2 introduces Steps 9b, 9c, 9d for maturity table, invariants, and fitness function candidates. However, `define-architecture/SKILL.md` already has "Step 9b — Expertise Check" (line 184). Implementing the plan as written will create ambiguous step references. The plan must explicitly state how to renumber: either rename the existing 9b to a later number (e.g., Step 9e or Step 10, shifting current 10-11 to 11-12) or use different labels for the new steps.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Phase 2 maturity steps insert after CLAUDE.md update, causing CLAUDE.md to miss new artifacts
Phase 2 says "After architecture files are written (Step 9)" — but Step 9 is the CLAUDE.md Update step, not the last architecture writing step (that is Step 8). If Steps 9b-9d (maturity table, invariants, fitness candidates) are inserted after Step 9, then `_overview.md` gets its Subsystem Maturity section and `invariants.md` gets created after CLAUDE.md has already been updated. CLAUDE.md's "Also check" entries and architecture file references will not include the new content. The new steps should be inserted between Step 8e and Step 9, or Step 9 should be moved after the new steps. The plan must clarify this sequencing explicitly.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 audit-architecture: no finding category template for fitness/invariant compliance failures
The existing `audit-architecture/references/guidance.md` has templates for gap findings and improvement findings. Phase 3 adds Steps 3b (fitness function audit) and 3c (invariant compliance check), which produce a new category of findings — compliance failures and stale documentation. The task to "Update `references/guidance.md`" mentions adding sections for audit strategy but does not specify a finding template format for these new categories. Without templates, findings will be ad-hoc and inconsistent. The task should explicitly require adding finding category templates (e.g., "compliance-failure" and "stale-documentation") with severity mapping guidance and instructions for how these flow into side quest proposals (Step 4).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 fitness function candidate location is ambiguous
Phase 2, Step 9d says fitness function candidates go "in the relevant architecture file or as a section in `_overview.md` — whichever is simpler." This leaves implementers to make a judgment call that could produce inconsistent results across projects. The design spec (line 205) says they are "documented in the architecture files alongside the subsystem they protect." The maturity table's Fitness Functions column contains a reference pointer. Phase 1's `maturity-conventions.md` should define a canonical placement rule (e.g., "in the subsystem's architecture file, referenced by path in the maturity table column"), and Phase 2 Step 9d should follow that rule rather than offering a choice.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 graceful stop cases are incomplete
The task says "Add handling for interruption during Steps 3b/3c/3d" but only describes partial markers for 3b and 3c. It does not specify the marker format for Step 3d (maturity promotion suggestions). It also does not address how the existing graceful stop section (Step 6 in audit-architecture SKILL.md) should be restructured — currently Step 6 handles Steps 2, 3, 4, and 5b. The new stops for 3b/3c/3d need to be inserted between the existing Step 3 and Step 4 cases. The task should specify the marker text for all three new steps and state where they insert in the existing graceful stop sequence.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 verification mentions checking `/refine-slices` and `/implement-plan` but Phase 4 does not update those skills
Phase 4's verification section says "Verify the same reviewer files are also used by `/refine-slices` and `/implement-plan`." This implies these skills should automatically pick up the reviewer changes. However, this has not been verified by the plan — if those skills use different reviewer loading mechanisms or different preamble files, the updates would silently not apply. The plan should include a codebase exploration task to confirm that `/refine-slices` and `/implement-plan` use the same shared-preamble.md and reviewers-always.md files, and document the finding.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 1 verification is read-only — no runtime verification
Phase 1 creates a reference file (`maturity-conventions.md`) that other skills will consume. The verification section says "Read the file. Confirm all 6 sections present with examples." This is adequate for a static reference file, but it does not verify that the format descriptions are machine-parseable by consuming skills. Since this is a convention file (not executable code), read-and-confirm is reasonable, but adding "Verify that the maturity table format example is valid Markdown that renders correctly" would strengthen it.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 refine-architecture context loading task is underspecified
The task says "add: Read `maturity-conventions.md`" to the context-loading step, but does not specify where in refine-architecture's SKILL.md Step 0 this load should be inserted. Step 0 has 6 sub-steps (read architecture files, load decisions, prerequisite check, resume detection, create backup, read iteration loop). The maturity conventions load should logically go after sub-step 1 (read architecture files) and before sub-step 3 (prerequisite check), since maturity context informs the prerequisite understanding. The task should specify the insertion point.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 Holistic reviewer criteria numbering not specified
Phase 4 adds "Invariant compliance" and "Fitness function awareness" to the Holistic reviewer but does not assign criterion numbers. The current Holistic reviewer has 11 criteria (ending with "Simplicity and design"). The new criteria should be numbered 12 and 13 to maintain the sequential numbering convention used across all reviewer prompts.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10
The plan has sound overall structure and the four-phase dependency ordering is correct. However, two critical issues (step numbering collision and CLAUDE.md sequencing) would cause implementation failures, and several important issues around ambiguous format specifications and incomplete graceful stop handling would lead to inconsistent results. To reach 9+: resolve the step numbering collision explicitly, fix the step insertion ordering relative to CLAUDE.md update, define finding category templates for audit-architecture, canonicalize fitness function candidate placement, and complete the graceful stop specifications.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
