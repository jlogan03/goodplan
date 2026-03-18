# Learnings

Accumulated across all completed slices. Each entry traces back to the slice that surfaced it.

## Pointer stubs preserve navigability when extracting shared content
_Source: refine-plan-shared-loop_

When refactoring a skill to reference shared infrastructure, keep removed sub-steps as 1-sentence pointer stubs rather than deleting them entirely. This preserves lettering continuity (a-m) and top-to-bottom scannability. Fully removing steps creates confusing gaps that break the reader's mental model.

## Multi-file review skills need explicit file-matching protocols
_Source: slice-quality-and-health_

When a review skill operates on scattered files across directories (not a single file/directory), define a file-matching protocol: filename prefixes on reviewer issues, editor inference fallback for missing prefixes, and a manifest listing all working copy paths. The iteration loop's single-file/directory convention doesn't cover this natively.

## Signal tracking algorithms need precise trigger conditions
_Source: slice-quality-and-health_

Trend detection language like "trending upward" is ambiguous for agents. Specify exact conditions (e.g., "strictly increasing across all 3 data points: a < b < c") with explicit non-triggers. Without precision, different agent runs will interpret the same instruction differently.

## Skill-file-only quests need manual scope for complete-slice
_Source: slice-quality-and-health_

Quests that modify only skill files (outside the repo, in ~/.claude/skills/) don't produce standard implementation/ artifacts. The auto-detect heuristic won't find them. Pass the scope explicitly when running /complete-slice for such quests.

## Shared reference files with placeholders enable partial consolidation
_Source: architecture-quality_

When files differ only in framing (e.g., "reviewing a plan" vs "reviewing code"), use a shared file with a `{placeholder}` that each consumer fills in. This keeps the substantive content (evaluation criteria, protocols) in one place while preserving context-specific framing. Better than full duplication or forced uniformity.

## Shared orchestration skeletons need explicit parameter interfaces
_Source: architecture-quality_

When extracting a shared pattern (like an iteration loop), define how consumers plug in their specifics: a "Loop Parameters" section listing reviewer list, exit criteria, editor prompt path, etc. Without a concrete interface contract, "use the shared loop" is too vague for implementing agents.

## In-place editing with backup beats working copies for referenced files
_Source: architecture-quality_

Files referenced by other artifacts (CLAUDE.md, decisions, plans) should be edited in-place with a timestamped backup, not copied to a working directory. Working copies create ambiguity about which version is canonical. Plans are different — nothing references them mid-refinement, so `-refining` copies are safe.

## Shared references need a consolidation criterion and extension policies
_Source: decisions-and-expertise_

When moving duplicated files to a shared location, use "will these stay unified long-term?" as the criterion — not just current similarity. Each shared reference consumed by multiple skills needs an extension policy (additive fields safe, format changes require updating all consumers). This prevents breaking downstream consumers when conventions evolve.

## Loading protocols belong in the convention file, not in each consumer
_Source: decisions-and-expertise_

When multiple skills need to load the same data (e.g., decisions/), define the loading algorithm once in the convention file and have each skill reference it. The original plan duplicated the algorithm across 9 skills; reviewers caught this and proposed the Loading Protocol abstraction.

## Downstream consumer goals should inform upstream planning
_Source: decisions-and-expertise_

When work has known downstream consumers, read their goal files during planning and refinement. This caught missing decision readers, absent extension policies, and unclear dependency terms that would have required rework later.

## Auto-detect conditions must account for optional workflow files
_Source: 07-complete-slice_

Don't require optional files (like after-implementation-fixes-and-polish.md) in auto-detect logic. Use the minimal definitive set (plan-refined + implementation/ content). Clean implementations won't produce every optional artifact.

## Cross-project tool learnings should persist in user memory
_Source: 07-complete-slice_

When learnings are about general-purpose tools (not project-specific), save them to the user's auto memory system. The agent gets smarter across projects over time.

## Research and review artifacts belong in the slice directory, not /tmp/
_Source: 06-create-plan_

Moving research from /tmp/plan-research/ to the slice's research/ directory and review iterations to refinement/ and implementation/ means artifacts persist across sessions. The check-before-research pattern (project + scope level) prevents duplicate work. Required updating 10 files across refine-plan and implement-plan.

## Interactive Q&A produces better plans than draft-then-present
_Source: 06-create-plan_

Conversation-driven planning (restate goal → propose phases → per-phase deep dive → readiness gate) with AskUserQuestion gates between stages prevents the agent from charging ahead with assumptions.

## Plan format convention should be documented explicitly
_Source: 06-create-plan_

Having plan-format.md as a shared reference means the format is explicit. Both the author (create-plan) and consumers (refine-plan, implement-plan) reference the same convention.

## End-to-end verification is the defining trait of a vertical slice
_Source: 05-define-slices_

Each slice must deliver a complete flow verifiable by actually running the code. The goal.md template includes a Verification section for live end-to-end testing — what a human would do to convince themselves it works. Slices that can't be verified this way should be merged or redefined.

## Cross-skill reference file dependencies work but are fragile
_Source: 05-define-slices_

Referencing another skill's reference files (e.g., define-architecture's guidance.md for CLAUDE.md format) saves size but requires SKILL.md to explicitly instruct reading both files. Consider a shared reference file for formats used by multiple skills.

## Skills that propose tools/libraries need a research step
_Source: 04-define-architecture_

When a skill drafts content with specific tool names, library versions, or framework recommendations, the model defaults to training data which may be stale. Spawn a sub-agent to WebSearch current versions and alternatives before drafting. Applies to any skill that proposes a tech stack or version-pinned configuration.

## Reference file splitting keeps skills maintainable
_Source: 04-define-architecture_

Split reference material into focused, purpose-specific files rather than one large reference. SKILL.md loads only what it needs at each step. This also enables lazy loading (e.g., formats.md deferred to the state write-back step).

## Re-load reference files before point of use in long sessions
_Source: 04-define-architecture_

After a long interactive session, reference files loaded early may have been pushed out of effective context. Re-load key references at the step that uses them (e.g., guidance.md before CLAUDE.md update).

## Graceful stop needs case-by-case state handling
_Source: 04-define-architecture_

Each graceful stop scenario needs its own state.md string and flow-log behavior. "No files written" should not touch state at all; partial work should list exactly what was written.
