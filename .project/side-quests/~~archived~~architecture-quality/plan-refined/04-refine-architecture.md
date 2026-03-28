# Phase 4: Refine-Architecture Skill

Create a new `/refine-architecture` skill that iteratively reviews architecture files using the reviewer infrastructure, with the enhanced deep module criteria from Phase 1.

### Context

After `/define-architecture` writes architecture files, they may need refinement — just as plans need refinement before implementation. `/refine-architecture` applies the same review-iterate loop as `/refine-plan` but with fewer reviewers and architecture-specific evaluation criteria.

**Reviewer selection**: Software Architecture (always, now with deep module criteria) + Holistic (always) + domain specialists when the architecture covers their domain (e.g., Data Layer if there's a database, Backend if there's an API, Frontend if there's a UI).

**Separate skill**: Own SKILL.md + references. Can diverge from plan refinement over time as architecture review needs differ from plan review.

**Shared vs skill-specific**: The iteration loop structure (spawn reviewers → synthesize → edit → check exit) is shared with refine-plan via a shared reference file at `~/.claude/skills/_shared/references/iteration-loop.md`. Skill-specific elements that live in refine-architecture's own references: editor prompt (operates on architecture .md files, not plan files), exit criteria, reviewer weighting (deep module criteria weighted more heavily), and scope constraints. The shared file defines the orchestration skeleton; each skill fills in its own parameters.

### Tasks

- [x] Create `~/.claude/skills/refine-architecture/SKILL.md` with:
  1. **Usage**: `/refine-architecture` (no arguments — always operates on `.project/architecture/`)
  2. **Step 0 — Load and prepare**: Read `.project/architecture/` files. Review artifacts (round directories, merged.md, flow-log) go in `.project/architecture-refining/`. This is distinct from the backup directory (which is for rollback only). **Working copy strategy**: edits happen in-place on `.project/architecture/` (no separate working copy directory for the architecture files themselves). Rationale: architecture files are referenced by CLAUDE.md, decisions, and in-progress plans — a separate working copy would create ambiguity about which version is canonical. Instead:
     - Create a backup at `.project/architecture-backup-<timestamp>/` before the first edit iteration
     - All edits modify `architecture/` directly so other skills always see the current state
     - If refinement is abandoned, inform the user of the backup path and suggest: `mv .project/architecture-backup-<ts>/ .project/architecture/`
     - CLAUDE.md continues pointing to `architecture/` throughout (no pointer swaps needed)
     - Concurrent skill invocations that read architecture files mid-refinement see the latest edits, which is the correct behavior (they should evaluate against the evolving target)
     - If `architecture-backup-*` exists and no refinement is in flow-log as complete, this is a resume — present iteration history from flow-log
     Read `.project/decisions/` for context. **Prerequisite check**: Verify that the shared `_shared/references/reviewers-cross-cutting.md` contains criteria 8-11 (deep module criteria from Phase 1) and that include instructions in each skill's reviewer-registry resolve correctly to the shared file content. If criteria are missing or resolution fails, warn user and stop.
  3. **Step 1 — Verify goal**: State what "good architecture" means for this project (derived from idea.md + conventions.md). Confirm with user.
  4. **Step 2 — Refinement loop** (same structure as refine-plan):
     - Spawn Software Architecture + Holistic + relevant domain specialists in parallel
     - Reviewers evaluate against: deep module principle, subsystem boundary quality, API surface area, separation of concerns, alignment with decisions, completeness (gaps between idea.md and architecture coverage)
     - Synthesize feedback, present iteration summary
     - Handle USER_INPUT and RESEARCH_NEEDED
     - Spawn architecture-editor sub-agent to apply fixes. Editor guardrails and the reviewer weighting preamble are specified in `references/sub-agent-prompts.md` (not inline here — keeps SKILL.md under 500 lines).
     - Iterate until all scores ≥ 9 (max 8 iterations, early exit at 8+ after 4 iterations — architecture files are shorter/simpler than plans, so fewer iterations are needed)
  5. **Step 3 — Final verification**: Compare refined architecture against the backup to check for goal drift. Mechanism: present a summary of what changed (added/removed/modified subsystems, boundary shifts, new patterns) and ask the user to confirm the changes align with the original intent.
  6. **Step 4 — Finalize**: Delete the backup directory (`architecture-backup-<timestamp>/`). Write back state.

- [x] Create or extend `~/.claude/skills/_shared/references/iteration-loop.md` — extract the shared iteration loop skeleton from refine-plan into a shared reference file. This is a structural reference document (like decisions-format.md) that skills read for the orchestration pattern; each skill's SKILL.md specifies its own concrete parameter values in a "Loop Parameters" section listing: reviewer list, exit criteria, editor prompt path, score thresholds, max iterations, scope constraints, and working directory path. The shared file covers:
  - **Run directory structure**: naming convention (`<thing>-refining/`), resume detection, flow-log location
  - **Reviewer spawn pattern**: parallel sub-agent spawn, model selection, how to pass context to reviewers, how to collect results
  - **Synthesis prompt skeleton**: how to merge multiple reviewer outputs into a single prioritized feedback list, handling USER_INPUT and RESEARCH_NEEDED tags
  - **Editor sub-agent pattern**: spawning the editor, passing synthesized feedback, collecting edits
  - **Exit criteria evaluation**: score threshold check, iteration count check, early exit logic
  - **Graceful stop**: state write-back at any interruption point, resume protocol

  What remains **skill-specific** (defined in each skill's SKILL.md, not in this file):
  - Editor prompt and guardrails (what to edit, what to preserve)
  - Reviewer selection and weighting
  - Score thresholds and max iteration count
  - Scope constraints (what files/directories the skill operates on)
  - Working directory path

  Both refine-plan and refine-architecture reference this file for the orchestration structure, filling in their own skill-specific parameters. Note: refine-plan's SKILL.md should be refactored to reference this shared file in a follow-up task (out of scope for this plan — propose as a new side quest in `.project/side-quests/refine-plan-shared-loop/goal.md` during Phase 4 verification).

- [x] Create `~/.claude/skills/refine-architecture/references/` with:
  - `guidance.md` — architecture-specific evaluation priorities, how to handle conflicting reviewer feedback on architecture (trust Software Architecture reviewer on boundary/depth issues).
  - `sub-agent-prompts.md` — three sections:
    1. **Reviewer weighting preamble**: "When reviewing architecture files, weight deep module criteria (8-11) at 2x relative to other criteria." This is injected into the Software Architecture reviewer's bootstrap context.
    2. **Architecture editor prompt**: reads synthesized feedback, edits architecture files (similar to plan editor but operates on architecture markdown).
    3. **Editor guardrails specification**: the editor can modify architectural descriptions, module boundaries, data flow, and patterns. It must preserve: subsystem API contracts that downstream plans or decisions depend on. Decision lookup mechanism: string-match on subsystem/module names in `.project/decisions/`; if a match is found, flag the change for user review rather than applying silently. If a change would invalidate an existing plan or decision, the editor must flag it for user approval.

- [x] Create the skill's frontmatter with draft description and trigger phrases:
  - Name: `refine-architecture`
  - Description: "Iteratively review and improve architecture files using the reviewer infrastructure. Evaluates module depth, subsystem boundaries, API surfaces, and alignment with decisions."
  - Triggers: "refine my architecture", "review the architecture", "improve the architecture", "the architecture needs work", "architecture review", "refine architecture", "make the architecture better", "architecture could be improved"

- [x] Add decisions/ loading and expertise check steps (same pattern as other skills from decisions-and-expertise quest)

- [x] Update `decisions-format.md` Writer and Reader lists to include refine-architecture as both a Writer (writes decisions when architecture changes) and Reader (reads decisions for context)

- [x] Create `~/.claude/skills/refine-architecture/references/reviewer-registry.md` listing the reviewers this skill uses (Software Architecture — always, Holistic — always, domain specialists — conditionally) with architecture-specific notes: Software Architecture reviewer weights deep module criteria (8-11) more heavily when reviewing architecture files vs plans (mechanism: weighting preamble in `sub-agent-prompts.md` injected into reviewer bootstrap context). Include the `{review_context}` value for this skill and the path to the shared `reviewers-cross-cutting.md`.

### Verification

- `ls ~/.claude/skills/refine-architecture/` shows SKILL.md and references/
- `ls ~/.claude/skills/_shared/references/iteration-loop.md` — shared iteration loop file exists
- Read SKILL.md — confirm it references the shared iteration loop and fills in architecture-specific parameters
- SKILL.md frontmatter has description and 8+ trigger phrases
- Step 0 includes prerequisite check for Phase 1 criteria (8-11)
- Step 0 specifies in-place editing with backup (`architecture-backup-<timestamp>/`) and resume behavior
- Reviewer selection includes Software Architecture + Holistic always, domain specialists conditionally, referencing `reviewer-registry.md`
- Decisions loading and expertise check present
- Architecture editor sub-agent prompt exists, operates on architecture .md files, and includes guardrails (what to preserve, when to flag)
- `decisions-format.md` lists refine-architecture in Writer and Reader sections
- Graceful stop handling covers all states (no files changed, mid-iteration, complete)
- Note: refine-plan SKILL.md refactoring to reference the shared iteration-loop.md is out of scope — verify that `.project/side-quests/refine-plan-shared-loop/goal.md` was created to track this
