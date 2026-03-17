# Phase 3: Update Skills — Decisions Loading & Writing

Add `.project/decisions/` context loading to all interactive skills. Add decision writing (with user confirmation) to the 5 writer skills.

### Context

All skills already have a context-loading step where they read `.project/` files. Decisions loading slots in alongside architecture files. Decision writing happens during the interactive portion — when a durable choice is made, the agent proposes decision text and confirms before writing.

### Tasks

#### Readers (load decisions as context) — 7 skills

For each skill below, update the context-loading step in SKILL.md to also read `.project/decisions/`:
- Load all `.md` files from `.project/decisions/`
- Skip files where Status is `superseded` (agent follows the link instead)
- Flag files where Status is `revisiting` — mention to user that this decision is under reconsideration
- Add a Read instruction referencing `~/.claude/skills/_shared/references/decisions-format.md` so the agent knows the format

Skills to update:
- [ ] `start-project/SKILL.md` — add decisions/ loading to context step (relevant for re-runs on existing projects)
- [ ] `explore/SKILL.md` — add decisions/ loading to context step
- [ ] `define-architecture/SKILL.md` — add decisions/ loading to context step
- [ ] `define-slices/SKILL.md` — add decisions/ loading to context step
- [ ] `create-plan/SKILL.md` — add decisions/ loading to context step
- [ ] `complete-slice/SKILL.md` — add decisions/ loading to context step
- [ ] `project-status/SKILL.md` — add decisions/ loading; include decision count and any `revisiting` decisions in the status report

#### Writers (also write decisions) — 5 skills

For each writer skill, add guidance to the interactive portion of SKILL.md:
- When a durable choice is made (see threshold in `decisions-format.md`), propose the decision text
- Use AskUserQuestion to confirm before writing
- `mkdir -p .project/decisions/` before first write
- Write in the format specified by `decisions-format.md`
- Summarize all decisions written at the end of the skill run

Skills to update:
- [ ] `explore/SKILL.md` — add decision writing guidance to the brainstorming/research steps
- [ ] `define-architecture/SKILL.md` — add decision writing guidance to the architecture definition steps
- [ ] `define-slices/SKILL.md` — add decision writing guidance to the slice definition steps
- [ ] `create-plan/SKILL.md` — add decision writing guidance to the interactive planning steps (Step 4)
- [ ] `complete-slice/SKILL.md` — add decision writing guidance to the architecture update step

#### Update create-plan context loading reference

- [ ] Update `create-plan/references/guidance.md` — add `.project/decisions/` to the Context Loading list

### Verification

- `grep -l "decisions" ~/.claude/skills/*/SKILL.md` returns all 7 skills listed above
- `grep -l "decisions-format.md" ~/.claude/skills/*/SKILL.md` returns all 7 skills (confirming they reference the shared format)
- Read `explore/SKILL.md` end-to-end — confirm decisions loading in context step AND decision writing guidance in interactive step
- Read `project-status/SKILL.md` — confirm decisions are included in the status report
- Read `create-plan/references/guidance.md` — confirm `.project/decisions/` in context loading list
