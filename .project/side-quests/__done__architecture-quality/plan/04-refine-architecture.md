# Phase 4: Refine-Architecture Skill

Create a new `/refine-architecture` skill that iteratively reviews architecture files using the reviewer infrastructure, with the enhanced deep module criteria from Phase 1.

### Context

After `/define-architecture` writes architecture files, they may need refinement — just as plans need refinement before implementation. `/refine-architecture` applies the same review-iterate loop as `/refine-plan` but with fewer reviewers and architecture-specific evaluation criteria.

**Reviewer selection**: Software Architecture (always, now with deep module criteria) + Holistic (always) + domain specialists when the architecture covers their domain (e.g., Data Layer if there's a database, Backend if there's an API, Frontend if there's a UI).

**Separate skill**: Own SKILL.md + references. Can diverge from plan refinement over time as architecture review needs differ from plan review.

### Tasks

- [ ] Create `~/.claude/skills/refine-architecture/SKILL.md` with:
  1. **Usage**: `/refine-architecture` (no arguments — always operates on `.project/architecture/`)
  2. **Step 0 — Load and prepare**: Read `.project/architecture/` files. Create a working copy directory (`architecture-refining/`). Read `.project/decisions/` for context.
  3. **Step 1 — Verify goal**: State what "good architecture" means for this project (derived from idea.md + conventions.md). Confirm with user.
  4. **Step 2 — Refinement loop** (same structure as refine-plan):
     - Spawn Software Architecture + Holistic + relevant domain specialists in parallel
     - Reviewers evaluate against: deep module principle, subsystem boundary quality, API surface area, separation of concerns, alignment with decisions, completeness (gaps between idea.md and architecture coverage)
     - Synthesize feedback, present iteration summary
     - Handle USER_INPUT and RESEARCH_NEEDED
     - Spawn architecture-editor sub-agent to apply fixes
     - Iterate until all scores ≥ 9 (max 12 iterations, early exit at 8+ after 5 iterations)
  5. **Step 3 — Final verification**: Compare refined architecture against original to check for goal drift
  6. **Step 4 — Finalize**: Rename `architecture-refining/` to updated `architecture/` files. Write back state.

- [ ] Create `~/.claude/skills/refine-architecture/references/` with:
  - `guidance.md` — architecture-specific evaluation priorities, how to handle conflicting reviewer feedback on architecture (trust Software Architecture reviewer on boundary/depth issues)
  - `sub-agent-prompts.md` — architecture editor prompt (reads feedback, edits architecture files — similar to plan editor but operates on architecture markdown)

- [ ] Create the skill's frontmatter (name, description, common triggers like "refine my architecture", "review the architecture")

- [ ] Add decisions/ loading and expertise check steps (same pattern as other skills from decisions-and-expertise quest)

- [ ] Add to the reviewer registry any architecture-specific notes (Software Architecture reviewer should weight deep module criteria more heavily when reviewing architecture files vs plans)

### Verification

- `ls ~/.claude/skills/refine-architecture/` shows SKILL.md and references/
- Read SKILL.md — confirm it follows the same iteration loop structure as refine-plan
- Reviewer selection includes Software Architecture + Holistic always, domain specialists conditionally
- Decisions loading and expertise check present
- Architecture editor sub-agent prompt exists and operates on architecture .md files
- Graceful stop handling covers all states (no files changed, mid-iteration, complete)
