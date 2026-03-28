# Agent Skill Review — Architecture Quality Plan (Round 2)

## Round 1 Resolution Check

All 6 IMPORTANT and 4 MINOR issues from Round 1 were addressed:

- **Frontmatter descriptions** (I6): Both Phase 4 and Phase 5 now include draft descriptions and 8+ trigger phrases. Addressed.
- **SKILL.md size / progressive disclosure** (I8): Phases 2 and 3 now specify reference files (`design-tree.md`, `design-it-twice.md`) with SKILL.md containing summaries only. Addressed.
- **Sub-agent self-containment** (I9): Phase 3 now explicitly states the prompt template "Must be fully self-contained" with the required elements listed. Addressed.
- **Working copy path and resume** (I7): Phase 4 Step 0 now specifies `.project/architecture-refining/` and resume behavior. Addressed.
- **Reviewer infrastructure reuse** (I2/Agent Skill portion): Phase 4 now specifies shared `iteration-loop.md` in `_shared/references/` and skill-specific references in `refine-architecture/references/`. Addressed.
- **Per-file parallelism for audit** (I3/Agent Skill portion): Phase 5 Step 2 now specifies one sub-agent per architecture file running in parallel. Addressed.
- **Reviewer registry reference** (M8): Phase 4 now references `reviewer-registry.md` explicitly. Addressed.
- **grep portability** (M1): Verification now uses `grep -cE`. Addressed.
- **Design tree progress format** (M2): Phase 2 now specifies tracking format and acknowledges persistence limitation. Addressed.
- **Reviewer weighting mechanism** (M6): Phase 4 now specifies weighting preamble injected into reviewer bootstrap context. Addressed.

## Issues

**[IMPORTANT]** Phase 4 refine-architecture SKILL.md will likely exceed 500 lines even with iteration-loop.md extracted

Phase 4 specifies a SKILL.md with: frontmatter, usage, Step 0 (load/prepare with prerequisite check + resume logic), Step 1 (verify goal), Step 2 (refinement loop with reviewer selection, synthesis, feedback handling, editor guardrails), Step 3 (final verification), Step 4 (finalize), plus decisions loading and expertise check. The refinement loop alone (Step 2) has 6+ substeps including editor guardrails specification. The plan extracts the iteration loop skeleton to `_shared/references/iteration-loop.md`, but the architecture-specific parameters filling that skeleton (editor guardrails, reviewer weighting, scope constraints) remain in SKILL.md. The `guidance.md` reference file covers "evaluation priorities" and "how to handle conflicting reviewer feedback" but the editor guardrails are specified inline in Step 2 of SKILL.md. Move the editor guardrails specification and the detailed reviewer weighting preamble to `sub-agent-prompts.md` (the architecture editor prompt reference file), keeping only a one-line reference in SKILL.md Step 2: "Spawn architecture-editor sub-agent using the prompt in `references/sub-agent-prompts.md`, which includes guardrails for what can be modified vs must be preserved."

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 `iteration-loop.md` extraction task is underspecified — unclear what parameters the shared file expects

The plan says "extract the shared iteration loop skeleton from refine-plan into a shared reference file" and "both refine-plan and refine-architecture reference this file, filling in their own skill-specific parameters." But the plan does not specify: (a) what the parameter interface of iteration-loop.md looks like (what placeholders does it define?), (b) how skills "fill in" parameters (inline substitution? separate config section? the skill's SKILL.md just describes its own values and says "follow the loop in iteration-loop.md"?), or (c) whether refine-plan's SKILL.md needs modification to reference the extracted file (currently refine-plan's Step 3 contains the full loop inline). The implementer needs to know whether this is a "read this file for the pattern, then implement it with your parameters" reference or a parameterized template with formal placeholders. Given how other shared references work in this codebase (e.g., `decisions-format.md` is a "read and follow" reference, not a parameterized template), the plan should clarify that `iteration-loop.md` is a structural reference document that skills read for the orchestration pattern, with each skill's SKILL.md specifying its own concrete values. Also clarify: does refine-plan's SKILL.md get refactored in this plan to reference the shared file, or is that a separate task?

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 description field is 148 characters — within limit but could be more triggering-specific

The draft description "Iteratively review and improve architecture files using the reviewer infrastructure. Evaluates module depth, subsystem boundaries, API surfaces, and alignment with decisions." is accurate but leads with implementation mechanism ("using the reviewer infrastructure") rather than user intent. Descriptions that lead with user-facing language trigger better. Consider: "Iteratively review and improve project architecture files. Catches shallow modules, weak subsystem boundaries, misaligned API surfaces, and decision drift. Run after /define-architecture to strengthen the design." This also adds the "when to use" signal (after define-architecture) per evaluation criterion 1.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 description misses "when to use" signal

The draft description "Compare intended architecture against actual code, evaluate whether the target architecture should evolve, and propose side quests for gaps and improvements." accurately describes both functions but doesn't indicate when to use it. Add timing context: "Run after several implementation slices to detect drift and improve the target." This helps Claude decide whether to trigger it during a conversation where the user mentions implementation gaps.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 design-tree.md reference file content is well-specified but the reference loading instruction (Step 1 update) doesn't mention conditional loading

The plan says "Update the skill's reference loading (Step 1) to include the new `design-tree.md` reference file." Currently, define-architecture's Step 1 loads all references unconditionally ("Use the Read tool to load these files"). Adding `design-tree.md` and `design-it-twice.md` (Phase 3) means Step 1 now loads 6 reference files before any conversation happens. This is fine for the current skill size, but if the references grow, consider noting that `design-tree.md` and `design-it-twice.md` are only needed during Steps 5-7 and could be loaded on-demand. Not urgent — the current approach works and matches existing patterns — but worth a one-line note for future maintainers.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 design-it-twice sub-agent model is specified as "opus" but no cost-reduction policy exists

Phase 3 Step 6.2 says "spawn 2-3 sub-agents (model: 'opus') in parallel." Refine-plan's iteration loop has an explicit model selection policy table (opus by default, sonnet when scores are high). Design-it-twice sub-agents produce lightweight artifacts (interface signatures + trade-offs), which is a well-scoped task. Consider noting that sonnet may be sufficient for design generation sub-agents when the broad pass has already narrowed the design space significantly. Not critical — opus is safe and the cost is bounded (2-3 sub-agents, once per skill run) — but worth noting for consistency with the cost-conscious pattern established in refine-plan.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Substantial improvement from round 1 (6/10). All 10 previous issues were addressed, most thoroughly. The plan now has well-specified frontmatter, reference file extraction for progressive disclosure, self-contained sub-agent prompts, explicit working copy conventions, and proper shared infrastructure references. The two remaining IMPORTANT issues are about the iteration-loop.md extraction interface (which needs more specification to be implementable without guessing) and SKILL.md size management for refine-architecture (which needs the editor guardrails moved to the reference file). To reach 9+: clarify the iteration-loop.md parameter interface and move the editor guardrails specification out of SKILL.md Step 2 into the sub-agent-prompts.md reference file.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
