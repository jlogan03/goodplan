# Agent Skill Review — Architecture Quality Plan

## Issues

**[IMPORTANT]** Phase 4 does not specify SKILL.md frontmatter description with sufficient detail for triggering accuracy

Phase 4 says "Create the skill's frontmatter (name, description, common triggers)" as a task bullet but provides no draft description text. The refine-plan skill's description is 209 characters and carefully lists trigger phrases. The plan should include a draft description (or at minimum the key trigger phrases and a note about the 1024-char limit) so the implementer doesn't have to invent it. The triggers listed ("refine my architecture", "review the architecture") are too few — compare with define-architecture's description which lists 8+ trigger variants. Missing triggers like "improve the architecture", "architecture review", "the architecture needs work" will cause under-triggering.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 has the same frontmatter under-specification as Phase 4

Same issue for audit-architecture: "Create the skill's frontmatter" is a task bullet without draft content. Trigger phrases listed ("audit the architecture", "check for architecture drift", "compare architecture vs code") are better than Phase 4 but still need a full description field draft. The description must cover both functions (gap analysis AND architecture reassessment) to trigger correctly for either use case.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 refine-architecture references `architecture-refining/` as working copy but doesn't specify where it lives

Step 0 says "Create a working copy directory (`architecture-refining/`)." The refine-plan skill is explicit about working copy naming: `<plan-name>-refining.md` or `<plan-name>-refining/`. The plan should specify the full path (`.project/architecture-refining/` seems intended) and what happens if `architecture-refining/` already exists (resume vs start fresh, matching refine-plan's Step 0.2 pattern). Without this, the implementer must guess.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 design-it-twice sub-agent prompts need self-containment guidance

The plan says "Create a reference file `design-it-twice.md` containing the sub-agent prompt template." Per Agent Skill evaluation criterion 6 (prompt quality), sub-agent prompts must be self-contained — a sub-agent reading just its prompt should understand its task without reading the parent skill. The plan should explicitly state that the prompt template must include: the project context (from broad pass), the design constraint, the output format, and enough framing that the sub-agent doesn't need to read SKILL.md. The current description ("design constraint + context from broad pass + output format") is directionally right but should emphasize self-containment as a requirement.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 and 3 add substantial content to SKILL.md without addressing the 500-line progressive disclosure limit

The existing define-architecture SKILL.md is already 187 lines. Phase 2 adds Steps 5 and 7 (design tree broad + deep passes — each with 7-8 substeps). Phase 3 adds Step 6 (design-it-twice — 8 substeps). This will likely push the skill well past 500 lines. The plan should specify what content moves to reference files. Candidates: the design tree interaction pattern (substeps of Steps 5 and 7) could go to `references/design-tree.md`, keeping SKILL.md to step summaries with "Read references/design-tree.md for the interaction protocol."

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 refine-architecture duplicates reviewer infrastructure without explaining what's shared vs new

The plan says the skill uses "the same iteration loop as refine-plan" and lists sub-agent prompts in `references/sub-agent-prompts.md`. But refine-plan already has `references/sub-agent-prompts.md` with reviewer bootstrap, synthesis, and plan-editor templates. Will refine-architecture: (a) symlink to refine-plan's sub-agent-prompts.md, (b) copy it, or (c) create architecture-specific variants? The plan mentions an "architecture editor prompt" that "operates on architecture markdown" — this differs from the plan editor. The plan should clarify: reuse shared preamble + reviewer bootstrap from `_shared/` or refine-plan, and create only the architecture-editor prompt as new content. Currently, the existing shared files live in each skill's own `references/` directory (refine-plan has its own copy, implement-plan has its own copy). The plan should state whether refine-architecture follows this pattern or establishes a new sharing mechanism.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 audit-architecture exploration sub-agent has a very broad mandate

Step 2 asks a single sub-agent to: read all architecture files, systematically explore the codebase (file structure, imports, module boundaries, API surfaces, dependency graph), and compare each architecture file against actual code across 5 dimensions. For a non-trivial codebase, this is an enormous context load for one sub-agent. Consider noting that for large codebases, the exploration should be split per-architecture-file or per-subsystem. This isn't critical for an initial implementation but should be flagged as a scaling concern.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 reviewer selection criteria should reference the reviewer registry explicitly

Phase 4 says "Software Architecture (always, now with deep module criteria) + Holistic (always) + domain specialists when the architecture covers their domain." This is correct but the plan should instruct the implementer to read `references/reviewer-registry.md` for domain specialist selection, matching how refine-plan's Step 3a works. This ensures the skill stays in sync as new reviewers are added to the registry.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 verification uses `grep -c` with `\|` alternation — may not work on all platforms

The verification step uses `grep -c "Module depth\|Caller friction\|Test boundary alignment\|Deepening opportunities"`. On macOS with default grep, `\|` alternation requires `grep -E` (extended regex) or the `-c` flag with `\|` may not behave as expected depending on the grep version. Use `grep -cE` instead, or use separate greps.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 design tree tracking says "in-memory during the conversation" but doesn't specify format

The plan says the agent tracks resolved vs open branches in-memory and presents progress. But there's no specified format for the progress display. Other skills use structured formats (e.g., state.md has a defined format, flow-log has a defined format). A brief example of the progress display format ("Resolved: [subsystem boundaries, communication pattern]. Open: [data ownership, error strategy]. 4 of 8 branches resolved.") would help the implementer produce consistent output.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan covers the right scope and the phasing is well-ordered with genuine independence between phases. The two new skills (refine-architecture, audit-architecture) are architecturally sound choices. However, there are several IMPORTANT issues around progressive disclosure (SKILL.md size management), frontmatter specification, working copy conventions, and infrastructure reuse clarity. These aren't design flaws — they're specification gaps that would force the implementer to make undocumented decisions. To reach 9+: specify frontmatter descriptions for both new skills, address SKILL.md size with reference file extraction, clarify the working copy path and resume behavior for refine-architecture, explicitly state what's shared vs new in sub-agent prompts, and add self-containment requirements for design-it-twice prompts.

## Summary
- Critical: 0
- Important: 6
- Minor: 4
