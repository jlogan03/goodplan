# Agent Skill Review — Architecture Quality Plan (Round 3)

## Round 2 Resolution Check

Both IMPORTANT issues from Round 2 were addressed:

- **Editor guardrails in SKILL.md** (I1 R2): Phase 4 Step 2 bullet 4 now says "Editor guardrails and the reviewer weighting preamble are specified in `references/sub-agent-prompts.md` (not inline here — keeps SKILL.md under 500 lines)." Resolved.
- **iteration-loop.md parameter interface underspecified** (I2 R2): Phase 4 now explicitly states "This is a structural reference document that skills read for the orchestration pattern; each skill's SKILL.md specifies its own concrete parameter values." Clarifies it's a "read and follow" reference, not a parameterized template. Refine-plan refactoring is explicitly out-of-scope with a note. Resolved.

All four MINOR issues from Round 2 were also addressed:

- Description leading with user-facing language: Phase 4 description updated.
- Phase 5 "when to use" signal: addressed.
- Conditional loading note for design-tree.md: Phase 2 now includes the note explicitly.
- Model cost-reduction policy: Phase 3 now specifies sonnet acceptable when "broad pass has already narrowed the design space significantly."

## Issues

**[IMPORTANT]** Phase 4 `refine-architecture` working copy path in plan contradicts SKILL.md description

Phase 4 Step 0 says edits happen in-place on `.project/architecture/` with a backup at `.project/architecture-backup-<timestamp>/`. This matches the plan overview which also says "Edits happen in-place on `architecture/` with a timestamped backup (no separate working copy directory)." However, the Round 2 review (I7 R1, resolved in R2) mentioned the path `.project/architecture-refining/` — and the R2 resolution check in the previous review confirmed this was addressed. But re-reading Phase 4 Step 0 carefully, the backup path is `.project/architecture-backup-<timestamp>/` while the run directory (for reviews, merged.md, etc.) is not defined at all. The refinement loop (Step 2) spawns reviewers and produces per-iteration round directories — where do these go? The plan says the shared `iteration-loop.md` defines "Run directory structure: naming convention (`<thing>-refining/`), resume detection, flow-log location." For refine-plan, the run directory is `scope_dir/refinement/`. For refine-architecture, no run directory is specified. The implementer will need to infer this. Specify the run directory for refine-architecture (likely `.project/architecture-refining/` or `.project/refinement/architecture/`) and state that it is distinct from the backup directory (which is for rollback, not for review artifacts).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 consolidation strategy needs a note about install-time behavior

Phase 1 instructs creating `~/.claude/skills/_shared/references/reviewers-cross-cutting.md` (shared) and replacing each skill's copy with a "one-line include instruction." This works for Claude Code at the user level, but it requires the consuming skill (refine-plan, implement-plan) to implement a one-line include mechanism that their SKILL.md currently doesn't have. The existing SKILL.md for refine-plan (Step 3c) says "spawn a sub-agent using the reviewer bootstrap prompt from `references/sub-agent-prompts.md`" — the reviewer reads its own instructions via bootstrap self-assembly. The bootstrap template at `sub-agent-prompts.md` already has the reviewer read `{shared_preamble_path}` and `{prompt_file_path}`. Replacing the skill-local `reviewers-cross-cutting.md` with a one-line include file means the reviewer's prompt_file_path now points to a file containing an include instruction rather than the actual prompt. This is an indirect indirection pattern not currently used elsewhere in the codebase. The plan should clarify how the include instruction is resolved: does the sub-agent read the include file and then read the referenced path? Does the orchestrator resolve it before passing to the sub-agent? Or is this simply a file redirect (`cat` the shared file)? The consolidation goal is sound but the mechanical implementation is underspecified for the agent responsible for Phase 1.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 `audit-architecture` sub-agent prompt self-containment is asserted but not ensured

Phase 3 explicitly flags sub-agent self-containment as a requirement ("Must be fully self-contained"). Phase 5 says exploration sub-agents are prompted from `references/sub-agent-prompts.md` (line in Tasks: "sub-agent-prompts.md — exploration agent prompt (reads architecture, explores codebase, returns structured findings)") but does not include a self-containment requirement for this prompt. The gap analysis sub-agents each receive a single architecture file scope — they need: the architecture file content (or path), the codebase areas to explore, the comparison dimensions, and the output structure (structured findings with evidence). The plan does not specify whether the sub-agent prompt template includes these elements or whether the orchestrator fills them in as placeholders. Add a self-containment note to Phase 5's `sub-agent-prompts.md` task analogous to Phase 3: "Must be fully self-contained: include assigned architecture file path, codebase exploration scope, comparison dimensions (aligned with Software Architecture reviewer criteria 1-11), output format, and enough framing that the sub-agent can execute without reading SKILL.md."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 dry-run verification asks implementer to "flag any broken chains" but doesn't specify how

The Phase 2 Verification section says "Dry-run verification: Walk through the updated SKILL.md as if executing on a sample idea.md. Trace the flow... Flag any broken chains." This is a verification step for the implementer, not an agent runtime step — it's asking a human or agent doing the plan to perform a mental walkthrough. As written, it's not actionable as a verification task: there's no specific artifact to produce, no pass/fail criterion, and no example of what "broken chains" means in concrete terms. Compare with the Phase 3 dry-run which is clearer ("Confirm: broad pass output feeds design-it-twice input; design-it-twice output feeds deep pass input; no information is assumed that wasn't produced by a prior step"). Tighten Phase 2's dry-run to match Phase 3's specificity: "Confirm: Step 4 (conventions) produces conventions.md. Step 5 (broad pass) consumes idea.md + conventions.md and produces subsystem map + constraints summary. Step 6 (design-it-twice) consumes Step 5 output and produces a chosen design. Step 7 (deep pass) consumes the chosen design and produces a fully specified architecture. No step assumes inputs not produced by a prior step."

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Strong plan at this point. Both R2 IMPORTANT fixes are cleanly resolved and all four MINOR items addressed. The remaining IMPORTANT issue (run directory for refine-architecture's review artifacts is unspecified) is a genuine implementability gap — the implementer will have to guess where round-N/reviews/ directories go relative to the backup directory. The three MINOR issues are clarification items that prevent ambiguity for the implementing agent but don't block correctness. To reach 9+: specify the run directory in Phase 4 Step 0 or Step 2. The consolidation mechanism ambiguity (Phase 1 include resolution) could cause a retry loop during implementation if the agent picks the wrong interpretation.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
