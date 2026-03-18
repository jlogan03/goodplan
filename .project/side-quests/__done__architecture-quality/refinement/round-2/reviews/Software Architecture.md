# Software Architecture Review

## Issues

**[IMPORTANT]** Phase 4 iteration loop extraction is underspecified -- shared reference file has no defined contract
Phase 4 says refine-architecture shares the iteration loop via `_shared/references/iteration-loop.md`, and the task says to "extract the shared iteration loop skeleton from refine-plan." But the plan never defines what this shared file contains: is it a prose description of the loop steps, a numbered protocol, a template with placeholders? The refine-plan SKILL.md currently embeds the loop inline (Step 3a-m, ~60 lines of detailed orchestration). The plan needs to specify: (1) what the iteration-loop.md file contains (skeleton with named extension points? prose reference?), (2) what the extension points/parameters are (reviewer selection, exit criteria, editor prompt, working directory naming, scope constraints -- these are listed in the overview but not in the Phase 4 tasks), and (3) how each skill "fills in" its parameters (does SKILL.md inline the loop and reference iteration-loop.md for structure, or does it only specify parameters and delegate entirely?). Without this, the implementer will either duplicate the loop anyway or invent an abstraction that doesn't fit refine-plan's existing structure.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 consolidation plan conflicts with how the two reviewer files actually differ
The plan says to consolidate `reviewers-cross-cutting.md` into `_shared/references/` and have both skills reference it. But the two files differ intentionally -- refine-plan's says "for an implementation plan" and implement-plan's says "for a code implementation" throughout. The `_shared/references/README.md` explicitly states: "only move a file here if it is expected to stay unified long-term across all consuming skills. If skills are likely to diverge (e.g., reviewer prompts with different placeholder sets), keep separate copies." The plan needs to address this tension: either (a) make the framing difference a bootstrap-time injection (e.g., a `{review_context}` placeholder that the bootstrap replaces with "plan" or "code implementation"), keeping the criteria unified, or (b) consolidate only the criteria text (items 1-11) into a shared fragment that both files include, while keeping the per-skill framing separate. Option (a) is cleaner but requires modifying the shared preamble or bootstrap prompt. The current plan ignores the framing difference entirely.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 working copy pattern (`architecture-refining/`) creates an awkward parallel with the canonical directory
Phase 4 copies `architecture/` to `architecture-refining/`, edits the copy, then renames back. This parallels refine-plan's `-refining` suffix pattern. But architecture files have a different lifecycle than plans -- they're referenced by CLAUDE.md's Project Context section (pointing to `.project/architecture/*`), by decisions, and potentially by in-progress plans. During refinement, should other skills read from `architecture/` (stale) or `architecture-refining/` (in-progress)? Refine-plan doesn't have this problem because plans aren't referenced by other skills during refinement. The plan needs to specify: (a) whether `architecture/` is deleted or preserved during refinement, (b) how concurrent skill invocations should behave if they try to read architecture files mid-refinement, and (c) whether CLAUDE.md should be updated to point to the working copy during refinement or left pointing to the originals.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 editor guardrails reference `.project/decisions/` but don't specify the lookup mechanism
The editor guardrails say "check `.project/decisions/` for references" to detect whether a change would invalidate an existing plan or decision. But decisions reference architecture concepts by description, not by file path or section anchor. How does the editor determine which decisions depend on a specific architectural boundary? String matching on subsystem names? This is likely infeasible to fully automate. The plan should acknowledge this limitation and specify a practical heuristic (e.g., "search decisions for mentions of the subsystem/module name being modified; if found, flag for user review") rather than implying the editor can reliably detect all dependency chains.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 gap analysis dimensions overlap with Phase 1 reviewer criteria without referencing them
Phase 5's gap analysis checks "interface depth: are modules deep or shallow in practice?" and "coupling between subsystems: imports crossing documented boundaries." These are criteria 8 (module depth) and 2 (dependency direction) from the enhanced Software Architecture reviewer. But the audit sub-agent prompt doesn't reference the reviewer criteria -- it defines its own parallel evaluation dimensions. This creates divergence risk: if reviewer criteria evolve, the audit dimensions won't track. The plan should either have the audit sub-agent reference the Software Architecture reviewer criteria directly (reuse, not restate), or explicitly justify why audit needs its own dimensions.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 decision writing during design tree lacks deduplication with existing decisions
Phase 2 says "when a durable decision emerges, propose and write to `.project/decisions/`." But the Loading Protocol in `decisions-format.md` only handles reading existing decisions -- it doesn't specify how to detect that a newly surfaced decision duplicates or supersedes an existing one. The design tree broad pass could surface a decision that was already recorded during a prior `/explore` or `/define-architecture` run. The plan should specify that before writing a decision, the skill checks existing decisions for overlap and either supersedes the old one or skips the write.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No architectural consideration for how refine-architecture and audit-architecture interact in sequence
The overview positions these as independent skills, but in practice they form a natural workflow: audit finds drift, proposes side quests, some quests update architecture files, then refine-architecture polishes. The plan doesn't address whether audit-architecture's output (updated architecture files + side quest proposals) is in a state that refine-architecture can consume directly, or whether there's a gap. For example, if audit-architecture updates an architecture file and also proposes a side quest to refactor code, should refine-architecture run before or after the side quest? This sequencing ambiguity could lead to refine-architecture optimizing architecture files that are about to be invalidated by a side quest.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 1 issues (duplication, sub-agent scoping, domain-appropriate constraints, audit report location, prerequisite check) are all well-addressed. The plan is stronger structurally. The remaining issues center on: (1) the iteration-loop.md extraction lacking a concrete contract, (2) the consolidation plan ignoring the intentional framing differences between the two reviewer files, and (3) the architecture-refining working copy creating reference ambiguity that plans don't have. Addressing items 1-3 (specifying the shared loop contract, resolving the framing tension, and defining working copy semantics) would bring this to 9.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
