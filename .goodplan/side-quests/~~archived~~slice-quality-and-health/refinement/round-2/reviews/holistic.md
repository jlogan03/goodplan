## Issues

**[IMPORTANT]** Phase 2 working copy pattern needs clarification for N goal.md files

The plan says the editor receives "a manifest listing all working copy paths (one sequencing-refining.md + N goal-refining.md)" and that reviewer prompts "must prefix each issue with the target filename." However, it does not specify how goal-refining.md files are named when there are N of them. The original files are `<NN-slice-name>/goal.md` — do the working copies become `<NN-slice-name>/goal-refining.md` (one per slice directory) or are they all co-located in the run directory? The naming scheme matters because the editor and reviewers need unambiguous file references. Co-locating them in a flat run directory would lose the slice-name context; keeping them in their original directories would scatter working copies across the tree.

Suggested fix: Specify that working copies are created in-place within each slice directory (e.g., `.project/vertical-slices/01-start-project/goal-refining.md`) and that the manifest lists their full paths. This is consistent with refine-plan's pattern where the working copy (`plan-refining.md` or `working-plan.md`) lives alongside the original.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 Step 6d signal tracking window specification is incomplete

The plan says "examine artifact directories for the last 3 completed slices" but doesn't specify how to determine which slices are the "last 3 completed." The file existence state machine (workflow.md) defines a slice as complete when `completion/learnings.md` exists. The plan should specify: scan all slice directories under `.project/vertical-slices/` and `.project/side-quests/`, filter to those with `completion/learnings.md`, sort by flow-log timestamp (or directory modification time), take the last 3. Without this, the agent might count differently (e.g., by NN prefix, by sequencing.md order, or by directory name).

Additionally, the plan says to count `round-N/` directories in `<scope>/refinement/` for iteration count, but for side quests the refinement directory is also `refinement/` — is the signal tracking meant to cover side quests too, or only vertical slices? The wording "last 3 completed slices" is ambiguous.

Suggested fix: Add explicit logic: "Scan `.project/vertical-slices/*/completion/learnings.md` and `.project/side-quests/*/completion/learnings.md`. Sort by the `complete` entry timestamp in `flow-log.jsonl`. Take the 3 most recent. Count `round-N/` directories in each scope's `refinement/` directory." This removes ambiguity.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 verification still partially relies on hypothetical output

The Phase 1 verification says "Read the output files (sequencing.md and each goal.md) and verify: (a) slice ordering satisfies all three lens criteria, (b) each goal.md has concrete success criteria, (c) the file structure matches the defined format. Trace the 5-slice case where observability is placed last." This is better than round 1's "mentally trace," but the last sentence still describes a hypothetical trace rather than something an implementer can verify against actual files. Since Phase 1 modifies a *skill* (not producing output files itself), the real verification is reading the updated SKILL.md and guidance.md and confirming the instructions are unambiguous. The "5-slice case" is a design-time thought experiment, not a verification step.

Suggested fix: Move the 5-slice trace into the guidance.md as an example scenario, and limit the verification section to: "Read the updated SKILL.md and guidance.md. Confirm: (a) Step 4 includes tracer bullet framing language, (b) Step 4b describes the three-lens evaluation with concrete pass/fail criteria and iteration cap, (c) Step 5 writes sequencing.md after user selects from alternatives, (d) guidance.md has Three-Lens Evaluation and Tracer Bullet Framing sections with the example scenario."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `system-profile-format.md` task lacks sub-structure detail

The plan says to create `_shared/references/system-profile-format.md` defining the five sections with "their sub-structures." However, the task description only lists the section names (Health, Performance Characteristics, Extensibility, Technical Debt, Recent Changes) without specifying what those sub-structures are. The goal.md provides more detail (e.g., Health has "Well-tested / Undertested / Known fragile" sub-headings). The plan should either inline the sub-structure or reference goal.md's format block explicitly.

Suggested fix: Add to the task: "Use the format from goal.md as the starting template: Health (Well-tested, Undertested, Known fragile), Performance Characteristics (key metrics and bottlenecks), Extensibility (Easy to extend, Hard to extend), Technical Debt (known shortcuts and deferred refactors), Recent Changes (last 3 slices, what changed and why)."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 run directory `.project/vertical-slices/slices-refining/` is oddly nested

The run directory is specified as `.project/vertical-slices/slices-refining/`. The naming convention from iteration-loop.md is `<thing>-refining/`, co-located with the files being refined. But `slices-refining/` sits alongside the slice directories (`01-start-project/`, `02-project-status/`, etc.) rather than being clearly distinguishable. It also doesn't have a NN prefix, which is fine but could be confusing when listing the directory. More importantly, if refine-slices is run for a specific subset of slices (the plan doesn't mention this but it's a natural future extension), a single flat directory won't scale.

This is minor since the plan is consistent with the naming convention and the current scope is "all slices at once."

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has addressed all round-1 issues well. The critical shared-preamble duplication is eliminated. Signal tracking now reads artifact directories instead of parsing flow-log prose. The three-lens evaluation has concrete criteria and an iteration cap. Early exit thresholds are properly differentiated from full pass. The system-profile.md has a shared canonical format. The reviewer count deviation is acknowledged with rationale.

Two IMPORTANT issues remain: the multi-file working copy naming pattern needs specification (the editor must know unambiguous paths), and the signal tracking window needs explicit slice discovery logic. Three MINOR issues round out areas that could be tightened. Resolving the two IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
