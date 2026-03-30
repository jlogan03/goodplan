# Software Architecture Review

## Issues

**[IMPORTANT]** Reviewer file duplication between refine-plan and implement-plan creates a maintenance liability for Phase 1
Phase 1 adds criteria 8-11 to `reviewers-cross-cutting.md` in both `~/.claude/skills/refine-plan/references/` and `~/.claude/skills/implement-plan/references/`. These are already near-duplicates that differ only in framing ("for an implementation plan" vs "for a code implementation"). Adding 4 more criteria to both files increases the divergence surface. The plan should either: (a) consolidate to a single shared file in `_shared/references/` that both skills reference (with per-skill framing injected by the bootstrap), or (b) explicitly acknowledge the duplication cost and add a verification step that diffs the two files to ensure criteria stay in sync. Option (a) is architecturally better -- it centralizes the reviewer content and lets per-skill differences live in the bootstrap prompt or a thin wrapper. This is the most impactful structural issue in the plan because every future reviewer change will need to be applied twice.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 (refine-architecture) duplicates the refine-plan iteration loop without a shared abstraction
The plan describes refine-architecture as having "the same iteration loop structure as refine-plan" -- spawn reviewers, synthesize, handle USER_INPUT/RESEARCH_NEEDED, spawn editor, iterate until scores pass. This is the core orchestration logic (~100 lines in refine-plan's SKILL.md). Duplicating it in a second SKILL.md creates two copies of the same loop that must evolve together. The plan should define how the shared loop infrastructure is factored: either a shared reference file that both skills include (with configuration parameters for reviewer selection, working directory naming, and exit criteria), or explicit acknowledgment that the duplication is intentional and each skill's loop will diverge. The current plan says "can diverge from plan refinement over time" but doesn't identify which parts are shared vs skill-specific, making it unclear where future changes should go.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 sub-agent design philosophy constraints are too prescriptive for the problem domain
The design-it-twice step specifies spawning sub-agents with fixed constraints: "Minimize API surface," "Maximize flexibility," "Optimize for the most common case." These are reasonable for general software but this project builds Claude Code skills -- markdown-driven agent prompts with file I/O. The design choices for skills are more about: prompt structure and decomposition, sub-agent vs inline tradeoffs, reference file organization, and state management patterns. The plan should either: (a) make the constraint set configurable per project type (derived from conventions.md or idea.md), or (b) replace the fixed list with a meta-instruction: "derive 2-3 meaningfully different design philosophies from the project's domain and constraints." Option (b) is simpler and more general.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 gap analysis sub-agent scope is unbounded
The audit-architecture exploration sub-agent is asked to "systematically explore the codebase: file structure, imports, module boundaries, API surfaces, dependency graph" for every architecture file. For a large codebase this is infeasible in a single sub-agent context window. The plan needs scoping guidance: how does the sub-agent decide what to explore? Priority order? Depth limits? Should it spawn per-architecture-file sub-agents instead of one monolithic explorer? The `codebase-context-discovery.md` shared reference already solves part of this for refine-plan -- the plan should either reuse it or explain why a different approach is needed.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** No dependency ordering between Phases 2-3 and Phase 1 at the code level
Phase 2 restructures define-architecture's SKILL.md and Phase 3 adds Step 6 into that restructured file. Phase 1 modifies a different file (reviewers-cross-cutting.md). But Phase 4 (refine-architecture) depends on Phase 1's criteria existing. The plan's overview says "each phase is independently testable" but Phase 4's verification assumes criteria 8-11 exist. This is stated correctly in the phase ordering but Phase 4's tasks don't include a verification that Phase 1 was completed -- it just assumes the enhanced reviewer is available. Add an explicit prerequisite check or a task that verifies the criteria exist before building the skill around them.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 in-memory design tree tracking has no persistence story for long conversations
The design tree tracks "resolved vs open branches in-memory" and "presents progress periodically." Claude Code conversations can hit context limits and need checkpointing. The plan mentions graceful stop states but doesn't address what happens to the in-memory branch tracking when the conversation compacts or the user starts a fresh session. The re-entry check (Step 3) handles file-level state, but the branch resolution state within a design tree pass would be lost. Consider writing intermediate state to a temporary file (e.g., `.project/architecture/.design-tree-state.md`) that the skill reads on re-entry, or acknowledge this as an acceptable limitation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 reviewer weighting guidance is vague
The plan says "Software Architecture reviewer should weight deep module criteria more heavily when reviewing architecture files vs plans" but doesn't specify how this weighting is communicated to the reviewer sub-agent. The reviewer prompt is generic -- it doesn't know whether it's reviewing a plan or architecture files. The weighting instruction needs to be injected somewhere: either in the bootstrap prompt's placeholder values (a new `{review_context}` placeholder), in the shared preamble, or in the refine-architecture guidance.md. Specify the mechanism.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 audit report written to architecture/ directory pollutes the canonical architecture files
The plan writes `audit-<date>.md` to `.project/architecture/`. Architecture files are described in workflow.md as "canonical technical design." Audit reports are operational artifacts -- they're closer to flow-log entries or refinement round outputs. Consider writing to `.project/side-quests/` or `.project/audits/` or including them in the flow-log detail directory (`flow-log/`), keeping `architecture/` clean for canonical design documents only.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No explicit data flow between Phase 5 audit findings and the slice-quality-and-health quest's system-profile.md
The plan notes that system-profile.md is deferred to slice-quality-and-health and says "add this to the slice-quality-and-health goal.md." But the actual integration point (audit-architecture refreshing system-profile.md) is only mentioned in a task note, not in the architecture of the skill itself. When slice-quality-and-health implements system-profile.md, someone needs to come back and add a step to audit-architecture's SKILL.md. This cross-quest dependency should be tracked more explicitly -- either as a TODO in the SKILL.md itself (a commented-out step) or as a decision in `.project/decisions/`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan is well-structured at the phase level with clear ordering and good separation of concerns. However, it has significant architectural issues around code duplication (reviewer files maintained in two places, iteration loop duplicated between refine-plan and refine-architecture) that contradict the deep module principles the plan itself is trying to introduce. The design-it-twice sub-agent constraints are mismatched to the actual project domain. The audit sub-agent scope is unbounded. Addressing the two IMPORTANT duplication issues and the sub-agent scoping would bring this to 8+. Consolidating the reviewer files into `_shared/` and extracting the iteration loop into a shared reference would bring it to 9.

## Summary
- Critical: 0
- Important: 5
- Minor: 4
