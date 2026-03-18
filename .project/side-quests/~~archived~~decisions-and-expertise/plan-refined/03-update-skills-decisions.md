# Phase 3: Update Skills — Decisions Loading & Writing

Add `.project/decisions/` context loading to all interactive skills. Add decision writing (with user confirmation) to the 5 writer skills.

### Context

All skills already have a context-loading step where they read `.project/` files. Decisions loading slots in alongside architecture files. Decision writing happens during the interactive portion — when a durable choice is made, the agent proposes decision text and confirms before writing.

### Tasks

#### Readers (load decisions as context) — 9 skills

For each skill below, update the context-loading step in SKILL.md to also read `.project/decisions/`:
- Add a Read instruction referencing `~/.claude/skills/_shared/references/decisions-format.md` — this contains the Loading Protocol (glob, skip superseded, flag revisiting). Each SKILL.md should reference the Loading Protocol rather than duplicating the algorithm inline.

Skills to update:
- [x] `start-project/SKILL.md` — add decisions/ loading to context step (relevant for re-runs on existing projects)
- [x] `explore/SKILL.md` — add decisions/ loading to context step
- [x] `define-architecture/SKILL.md` — add decisions/ loading to context step
- [x] `define-slices/SKILL.md` — add decisions/ loading to context step
- [x] `create-plan/SKILL.md` — add a Read instruction for `decisions-format.md` only (decisions context loading goes in the guidance file, not here)
- [x] `complete-slice/SKILL.md` — add decisions/ loading to context step
- [x] `project-status/SKILL.md` — add decisions/ loading; include decision count and any `revisiting` decisions in the status report
- [x] `refine-plan/SKILL.md` — add decisions/ loading to context step. Note: sub-agents load decisions themselves via codebase exploration (decisions/ is a project directory accessible to all agents), so decisions don't need to be passed in bootstrap prompts.
- [x] `implement-plan/SKILL.md` — add decisions/ loading to context step. Same sub-agent note as refine-plan.

#### Writers (also write decisions) — 5 skills

For each writer skill, add guidance to the interactive portion of SKILL.md:
- When a durable choice is made (see threshold in `decisions-format.md`), propose the decision text
- Use AskUserQuestion to confirm before writing
- `mkdir -p .project/decisions/` before first write
- Write in the format specified by `decisions-format.md`
- Summarize all decisions written at the end of the skill run

Skills to update:
- [x] `explore/SKILL.md` — add decision writing guidance to the brainstorming/research steps
- [x] `define-architecture/SKILL.md` — add decision writing guidance to the architecture definition steps
- [x] `define-slices/SKILL.md` — add decision writing guidance to the slice definition steps
- [x] `create-plan/SKILL.md` — add decision writing guidance to the interactive planning steps (Step 4). Note: the decisions context loading change goes in `guidance.md` (below), not in SKILL.md.
- [x] `complete-slice/SKILL.md` — add decision writing guidance referencing `decisions-format.md`
- [x] `complete-slice/references/guidance.md` — replace the inline "Decision File Format" section with a reference to `~/.claude/skills/_shared/references/decisions-format.md`. Map the existing `Source:` metadata to the `Context:` field. Remove inline format duplication. Keep only the `Source: complete-slice for <scope>` convention as a skill-specific note.

#### Update create-plan context loading reference

- [x] Update `create-plan/references/guidance.md` — add `.project/decisions/` to the Context Loading list

### Verification

- `grep -l "decisions" ~/.claude/skills/*/SKILL.md` returns all 9 skills listed above
- `grep -l "decisions-format.md" ~/.claude/skills/*/SKILL.md` returns all 9 skills (confirming they reference the shared format)
- Read `explore/SKILL.md` end-to-end — confirm decisions loading in context step AND decision writing guidance in interactive step
- Read `project-status/SKILL.md` — confirm decisions are included in the status report
- Read `create-plan/references/guidance.md` — confirm `.project/decisions/` in context loading list
- Grep all skill reference files (`~/.claude/skills/*/references/*.md`) for context loading lists and confirm `.project/decisions/` is present wherever architecture files are referenced
