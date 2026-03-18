# Software Architecture Review

## Issues

**[IMPORTANT]** iteration-loop.md content outline lists topics but not the parameter interface contract between shared skeleton and skill-specific SKILL.md

Phase 4 now specifies what `iteration-loop.md` covers (run directory structure, reviewer spawn pattern, synthesis prompt skeleton, editor sub-agent pattern, exit criteria evaluation, graceful stop) and what remains skill-specific (editor prompt, reviewer selection, score thresholds, max iterations, scope constraints, working directory path). This is a significant improvement over R2. However, the plan does not define the **interface contract** between the shared file and the consuming skill. Specifically: how does a skill "fill in" its parameters? Does `iteration-loop.md` contain `{placeholders}` that SKILL.md documents values for? Does SKILL.md inline the loop steps and reference `iteration-loop.md` for structural guidance? Or does each skill define a parameters section that the orchestrator reads alongside the shared file? The six skill-specific items are listed but their shapes are undefined (e.g., "reviewer selection" could be a list of reviewer names, a selection function, or a registry reference). Without specifying the binding mechanism, the implementer must invent one, risking a design that doesn't compose well when a third skill (e.g., a future refine-decisions) tries to use the same skeleton. Fix: add a "Parameter Interface" subsection to the iteration-loop.md task specifying: (a) the shared file uses named extension points (e.g., `{reviewer_list}`, `{exit_criteria}`, `{editor_prompt_path}`), (b) each consuming skill's SKILL.md defines these values in a "Loop Parameters" section, and (c) the orchestrator reads both files and substitutes before execution.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 note about refine-plan refactoring is deferred but has no tracking mechanism

Phase 4 says "refine-plan's SKILL.md should be refactored to reference this shared file in a follow-up task (out of scope for this plan -- tracked as a note in verification)." But a verification note is not a tracking mechanism -- it will be read once during implementation verification and then forgotten. If this refactoring never happens, the two skills will use different loop implementations (refine-plan inline, refine-architecture via shared reference), defeating the purpose of the shared file. Fix: either (a) add a task in Phase 4 to update refine-plan's SKILL.md to reference iteration-loop.md (making it in-scope), or (b) specify that this goes into a concrete tracking artifact (e.g., a TODO in the side quest's goal.md or a new side quest proposal) rather than a verification note.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 audit sub-agent prompt scoping could leak across architecture file boundaries

Phase 5 says each gap-analysis sub-agent is "scoped to a single architecture file and the codebase areas it describes." But architecture files often describe overlapping concerns -- e.g., `_overview.md` describes subsystem boundaries that `data-model.md` also references from a data perspective. If two sub-agents independently explore the same codebase area from different architecture files, they may produce contradictory findings (one says a boundary is violated, the other says it's fine from its perspective). The plan doesn't specify how findings from parallel sub-agents are reconciled. The synthesis step in Phase 4 (refine-architecture) has a dedicated synthesis sub-agent, but Phase 5's gap analysis has no equivalent -- findings go straight to "Architecture reassessment" (Step 3). Fix: add a brief deduplication/reconciliation step between Step 2 (gap analysis) and Step 3 (reassessment) that merges findings from parallel sub-agents, resolves contradictions, and deduplicates overlapping observations.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 consolidation creates a dependency that Phase 4's prerequisite check doesn't fully validate

Phase 4's prerequisite check verifies "the Software Architecture reviewer contains criteria 8-11." But after Phase 1's consolidation, the reviewer criteria live in `_shared/references/reviewers-cross-cutting.md` with a `{review_context}` placeholder, and each skill's copy is replaced with an include instruction. The prerequisite check should verify not just that criteria 8-11 exist in the shared file, but also that the include instruction in refine-plan and implement-plan correctly resolves -- otherwise a broken include would silently drop the enhanced criteria. This is a minor gap because the failure mode (missing criteria) would be caught during the first review iteration, but it would waste a full iteration before being detected.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All three R2 IMPORTANT issues are well-resolved: (1) iteration-loop.md now has a concrete content outline with six structural topics and six skill-specific parameters, (2) the `{review_context}` placeholder strategy cleanly resolves the framing tension between refine-plan and implement-plan copies, and (3) in-place editing with timestamped backup eliminates the working-copy reference ambiguity. The R2 MINOR issues are also addressed: gap analysis dimensions now explicitly align with reviewer criteria numbers, decision deduplication is specified in the design tree protocol, and audit-to-refine sequencing guidance is included. The one remaining IMPORTANT is that the iteration-loop.md parameter interface -- the binding mechanism between shared skeleton and skill-specific values -- needs to be made concrete. The MINOR items are low-risk and won't block implementation.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
