# Agent Skill Review

## Issues

**[IMPORTANT]** Phase 2 multi-file editing strategy is under-specified for the shared iteration loop
The plan proposes `/refine-slices` using the shared `iteration-loop.md` infrastructure, but the iteration loop's reviewer bootstrap, synthesis, and editor patterns are all built around a single `{plan_file_paths}` placeholder and a single plan path. The plan mentions "The editor receives a manifest listing all working copy paths" and "Reviewer prompts must prefix each issue with the target filename," but the shared preamble (`shared-preamble.md`) has `Plan location: {plan_file_paths}` as a single value and the plan editor prompt template (`sub-agent-prompts.md`) uses `Plan path: {plan_path}` (singular). The plan needs to specify exactly how the multi-file case maps onto these existing templates: does `{plan_file_paths}` become a newline-separated list? Does the editor prompt need a new variant? The plan says "Reuse refine-plan's reviewer bootstrap and synthesis prompt templates by path" but then says "Create only the editor prompt section, customized for multi-file slice editing" -- this implies the editor is custom but the reviewer bootstrap is reused as-is. The bootstrap template's `Plan location:` field needs to handle multiple files, and the plan should state explicitly whether this works with a newline-separated list or requires a modified template.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing SKILL.md frontmatter specification for `/refine-slices`
The plan says "Create `~/.claude/skills/refine-slices/SKILL.md`" but does not specify the `name` and `description` frontmatter fields. These are the primary trigger mechanism -- per the agentskills.io spec, the `description` field must include both what the skill does AND when to use it, with common trigger phrases. Looking at existing skills (refine-plan, refine-architecture), each has carefully crafted frontmatter. The plan should include the frontmatter text or at least specify the trigger phrases and description content so the implementer doesn't have to invent them.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 references refine-plan's shared-preamble.md directly but doesn't account for `{review_context}` value
The plan says the skill references `~/.claude/skills/refine-plan/references/shared-preamble.md` directly and sets `review_context` to `"slice goal definitions and sequencing"`. This is correct in principle -- the shared preamble uses `{review_context}` as a placeholder. However, the plan should explicitly state that the reviewer-registry.md for refine-slices must include a `review_context` row (as refine-architecture's registry does) so the orchestrator knows to substitute it. The existing pattern in refine-architecture's registry has a dedicated `## review_context Value` section. Without this, the orchestrator may not fill the placeholder correctly for the slice-specific reviewers defined in `reviewers-slices.md`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 three-lens evaluation adds significant SKILL.md complexity without progressive disclosure
The plan adds Step 4b (three-lens evaluation loop with internal iteration, always-2-alternatives, prose-plus-summary-table output) directly into SKILL.md. Based on the existing `define-slices/SKILL.md` (currently ~149 lines), adding the three-lens evaluation inline would push it well beyond 150 lines. The plan does say to add a "Three-Lens Evaluation" section to `references/guidance.md`, but the SKILL.md step description itself is quite detailed (specific lens criteria, cap at 3 iterations, conflict handling, always-2-alternatives, prose+table format). The step description in SKILL.md should be kept lean (describe the what and why, reference guidance.md for the how) to maintain progressive disclosure. Currently the plan's task description reads like the full SKILL.md text rather than a plan task.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 signal tracking reads artifact directories but doesn't specify how to identify "last 3 completed slices"
Step 6d says "examine artifact directories for the last 3 completed slices" and "Look for trends in refinement iteration counts" by counting `round-N/` directories. But the plan doesn't specify how to determine which slices are "completed" or their completion order. The flow-log.jsonl has `complete-slice` entries with timestamps, but the plan doesn't instruct the skill to read flow-log.jsonl for this purpose. Alternatively, the skill could check for `completion/learnings.md` existence and use file modification times, but this is fragile. The plan should specify the data source for determining the last 3 completed slices and their order.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 run directory naming doesn't follow the established convention
The plan specifies the run directory as `.project/vertical-slices/slices-refining/`. The naming convention from `iteration-loop.md` is `<thing>-refining/` co-located with the files being refined. For refine-plan, the run directory is `<scope_dir>/refinement`. For refine-architecture, it's `.project/architecture-refining/`. Since refine-slices operates on files within `.project/vertical-slices/` (sequencing.md and per-slice goal.md files), the co-located convention would suggest `.project/vertical-slices-refining/` or similar. The proposed `slices-refining/` nested inside `vertical-slices/` is reasonable but should be explicitly justified as a deliberate choice since it deviates from the sibling-directory pattern used by refine-architecture.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 TODO removal task is fragile
The plan says "Remove the TODO comment `<!-- TODO: When system-profile.md is implemented... -->` from audit-architecture SKILL.md (search by content marker, not line number)." This is correct practice (content-based, not line-number-based), but the exact content in audit-architecture SKILL.md is `<!-- TODO: When system-profile.md is implemented (slice-quality-and-health quest), refresh it here -->`. The plan's shortened version might cause a search miss if the implementer uses exact string matching. The plan should quote the full marker text.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 skill discoverability task is a no-op
The task "Confirm skill discoverability" says "Confirm `~/.claude/skills/refine-slices/SKILL.md` exists and is discoverable by Claude Code (no central registry needed)." Claude Code discovers skills by scanning `~/.claude/skills/*/SKILL.md` -- if the file exists at that path, it's discoverable. This task is essentially "confirm the file you just created exists." It adds no value as a plan task and could be folded into verification.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 system-profile.md format file location is in `_shared/references/` but only two skills use it
The plan creates `_shared/references/system-profile-format.md` as a shared reference. With only two consumers (complete-slice and audit-architecture), the "shared" placement is reasonable but the plan should note that if the format evolves, both skills need to be tested. This is minor -- the shared location is the right call for a canonical format definition.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan demonstrates strong understanding of the existing skill infrastructure (iteration loop, reviewer bootstrap, shared preamble patterns) and the skill interactions are well-thought-out. The four phases cover the stated goal comprehensively. However, several IMPORTANT issues relate to under-specification of how the new `/refine-slices` skill maps onto the existing iteration loop infrastructure, particularly around multi-file editing (which is novel -- no existing skill does this). The missing frontmatter specification and the signal tracking data source gap could lead to implementation ambiguity. To reach 9+: specify the multi-file mapping onto existing templates, add frontmatter text, clarify signal tracking data source, and ensure SKILL.md step descriptions use progressive disclosure.

## Summary
- Critical: 0
- Important: 5
- Minor: 4
