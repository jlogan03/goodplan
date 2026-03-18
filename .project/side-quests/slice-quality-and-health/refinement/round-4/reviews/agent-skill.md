# Agent Skill Review — Round 4

## Issues

**[IMPORTANT]** refine-slices SKILL.md description may under-trigger due to missing natural language cues

The `description` field in the Phase 2 SKILL.md frontmatter is reasonably specific but misses several natural prompts users would give. It includes "review slices" and "refine slices" but lacks triggers like "are my slices well-ordered", "check slice dependencies", "slice ordering review", or "improve slice sequencing". The description field is the primary trigger mechanism and Claude tends to under-trigger — the description should be "pushy" enough to capture adjacent intent. Additionally, the description should be written in third person per the agentskills.io spec ("Refines vertical slice definitions..." not "Refine vertical slice definitions...").

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** refine-slices sub-agent-prompts.md reuse pattern is underspecified

The plan says "Reuse refine-plan's reviewer bootstrap and synthesis prompt templates by path" for the bootstrap and synthesis prompts, then create only the editor section. However, the SKILL.md orchestrator needs to know *how* to reference these — does it read refine-plan's sub-agent-prompts.md directly and extract the bootstrap/synthesis sections? Or does refine-slices' own sub-agent-prompts.md contain a pointer? The plan should specify the exact mechanism: either (a) the SKILL.md instructs the orchestrator to read `~/.claude/skills/refine-plan/references/sub-agent-prompts.md` for bootstrap and synthesis templates, and `references/sub-agent-prompts.md` (local) for the editor template only, or (b) the local sub-agent-prompts.md includes cross-references with explicit `Read path` instructions. Without this, the implementing agent will have to guess.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `plan_type` value "multi-file-scattered" is novel and undocumented

The plan introduces a new `{plan_type}` value of `"multi-file-scattered"` for the bootstrap prompt. The shared preamble's Plan Location section handles `single-file` and directory-based plans but has no handling for `multi-file-scattered`. The shared preamble says: "For single-file plans: Plan file: {path}" and "For directory-based plans: Overview: {path}, Phase files: {list}". A `multi-file-scattered` type would need its own handling block in the preamble — either a third case or documentation that the orchestrator should fill the Plan Location differently. The plan should either (a) add a note that the shared preamble needs a third case for scattered files and specify its format, or (b) use the existing directory-based format with sequencing-refining.md as the "overview" and goal-refining.md files as the "phase files", avoiding a new plan_type value entirely.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Reviewer filename-prefix instruction injection is fragile

The plan specifies injecting a supplementary instruction block for all 4 reviewers: "Prefix each issue with the filename it applies to." For the Software Architecture reviewer (shared prompt), this is injected as an appended block after the bootstrap prompt. For the 3 slice-specific reviewers, it's embedded directly in their prompts. This creates two different injection mechanisms for the same instruction. If the Software Architecture reviewer's appended block gets lost (e.g., prompt truncation), issues won't have filename prefixes and the editor won't know which file to modify. The plan should specify what happens when an issue lacks the filename prefix — does the editor skip it, apply it to all files, or try to infer from context? A fallback strategy is needed.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** refine-slices working copy cleanup on interruption has an edge case

The plan says: "If interrupted before completing any iteration (no `round-1/` directory exists), delete all working copies." But what if the working copies were created but the run directory setup failed? The manifest wouldn't exist yet. The cleanup logic should be: if the manifest exists, use it; if not, glob for `*-refining.md` in the expected locations. This is a minor robustness concern.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Signal tracking in Phase 3 Step 6d conflates two different round-counting sources

For vertical slices, refinement rounds are counted under `<scope>/refinement/` (per-slice plan refinement). For slices that went through refine-slices, the plan says to count under `.project/vertical-slices/slices-refining/` (shared across all slices). These measure different things — plan refinement quality vs slice definition quality — and mixing them in one "refinement effort" metric could produce misleading signals. The plan should clarify that these are separate metrics or explicitly state that only plan-refinement rounds (per-slice `refinement/`) are counted for the trend signal.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 audit-architecture Step 5b lacks section-level update granularity

The plan says `/audit-architecture` should "update relevant sections" of system-profile.md, and the shared format has `<!-- Last updated by: ... -->` markers for recency. But the plan for Step 5b doesn't mention reading or writing these markers. Phase 3 defines the convention (both skills must write this marker), but Phase 4's task description for Step 5b omits it. The implementing agent may miss this requirement.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 SKILL.md scope exclusion for side quests could be more explicit

The plan states "Side quest `goal.md` files (`.project/side-quests/*/goal.md`) are explicitly excluded." This is clear in the plan, but the SKILL.md itself should include this in a prominent location (e.g., a Scope section at the top of the workflow, not buried in a paragraph). The implementing agent should place this near the glob pattern that discovers files.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan demonstrates solid understanding of the existing skill infrastructure — it correctly references the shared iteration loop, follows the working-copy naming convention, and properly structures the reviewer registry. The four phases are well-scoped with clear verification sections. However, the `multi-file-scattered` plan type introduces a compatibility concern with the shared preamble that could cause reviewer bootstrap failures, the sub-agent prompt reuse mechanism needs explicit specification, and the trigger description needs work. These are all fixable without structural changes. To reach 9+: resolve the plan_type compatibility with the shared preamble, specify the exact sub-agent prompt reuse mechanism, add a fallback for missing filename prefixes, and improve the trigger description.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
