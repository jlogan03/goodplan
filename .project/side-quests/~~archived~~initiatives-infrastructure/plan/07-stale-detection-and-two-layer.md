# Phase 7: Stale Assumption Detection + Two-Layer Architecture

Add stale assumption detection to `/create-plan` and `/refine-plan`. Update side quest planning to read both architecture layers.

### Tasks

**Stale assumption detection:**

- [ ] **Update `/create-plan` SKILL.md**: In Step 3 (Load Context), after loading architecture files, add a check:
  ```
  Compare last-modified dates:
  - git log -1 --format="%ai" -- .project/architecture/
  - git log -1 --format="%ai" -- <scope>/goal.md
  If architecture is newer than goal.md, warn: "The top-level architecture has
  changed since this slice's goal was written. Review whether the goal or approach
  needs updating." Present the changes and ask user to confirm or update.
  ```

- [ ] **Update `/refine-plan` SKILL.md**: In Step 2b (Codebase Context Discovery), add the same stale assumption check. If detected, include it in the codebase context summary so reviewers are aware.

- [ ] **Update `/create-plan` references/guidance.md**: Add "Stale Assumption Detection" section explaining what it checks, why, and what to do when detected.

**Two-layer architecture for side quests:**

- [ ] **Update `/create-plan` context loading**: When planning a side quest (not an initiative slice), load BOTH:
  - Top-level `.project/architecture/` (current reality — plan against this)
  - Active initiative's `architecture/` if one exists (target — check compatibility)
  - Present a note: "Planning against current architecture. Active initiative [name] is targeting [brief summary] — check for compatibility."

- [ ] **Update `/refine-plan` shared preamble** (`~/.claude/skills/refine-plan/references/shared-preamble.md`): In Codebase Exploration section, add: "If `initiatives/__active__*/architecture/` exists, read it alongside top-level architecture. Flag any conflicts between the plan and the active initiative's target architecture."

- [ ] **Update `/create-plan` references/guidance.md**: Add "Two-Layer Architecture" section explaining which layer to plan against (top-level for side quests, initiative architecture for initiative slices) and how to check compatibility.

### Verification

- Read updated `/create-plan` SKILL.md and guidance.md. Confirm stale check is present and two-layer loading is implemented.
- Read updated `/refine-plan` SKILL.md or shared-preamble. Confirm initiative architecture is loaded alongside top-level.
- Verify the stale check uses git dates, not file modification times.
