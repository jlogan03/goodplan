# Phase 4: Update Skills — Expertise Awareness

Add a distinct expertise calibration step to `/start-project` and a formal expertise check step at the end of all interactive skills.

### Tasks

#### Start-project: expertise calibration step

- [ ] Update `start-project/SKILL.md` — add a new step after idea capture (before flow-log/state write-back):
  1. Read `~/.claude/skills/_shared/references/expertise-tracking.md`
  2. Check existing `## Expertise` section in `~/.claude/CLAUDE.md` (may not exist yet)
  3. Identify domains the project idea touches that aren't already covered in the expertise section
  4. For uncovered domains, use AskUserQuestion: "This project involves [X] and [Y] — how familiar are you with those areas?"
  5. Write/update `## Expertise` section in `~/.claude/CLAUDE.md`
  6. Write/update auto memory files (`expertise_<domain>.md`) with detailed observations
  7. If expertise section already covers all relevant domains, skip silently — don't re-ask

#### All interactive skills: formal expertise check step

For each skill below, add a final step before the state write-back step:
1. Read `~/.claude/skills/_shared/references/expertise-tracking.md`
2. Reflect on the conversation: did it reveal new information about the user's expertise?
3. If yes: update `## Expertise` section in `~/.claude/CLAUDE.md` + write/update relevant `expertise_<domain>.md` memory file
4. If no: skip silently (no output, no AskUserQuestion)

Skills to update:
- [ ] `explore/SKILL.md` — add expertise check step
- [ ] `define-architecture/SKILL.md` — add expertise check step
- [ ] `define-slices/SKILL.md` — add expertise check step
- [ ] `create-plan/SKILL.md` — add expertise check step
- [ ] `complete-slice/SKILL.md` — add expertise check step

#### Calibration depth guidance

- [ ] Add a note to each skill's interactive section (or guidance reference file): "Calibrate explanation depth to user expertise — check `## Expertise` in `~/.claude/CLAUDE.md`. Comfortable topics: terse. Less familiar: more context. Actively learning: thorough."

Skills to add calibration note:
- [ ] `explore/SKILL.md`
- [ ] `define-architecture/SKILL.md`
- [ ] `define-slices/SKILL.md`
- [ ] `create-plan/SKILL.md`
- [ ] `complete-slice/SKILL.md`
- [ ] `start-project/SKILL.md`

### Verification

- Read `start-project/SKILL.md` — confirm expertise calibration step exists after idea capture, references expertise-tracking.md, handles existing vs new expertise
- Read `explore/SKILL.md` — confirm expertise check step exists before state write-back, handles both "new info" and "no new info" cases
- `grep -l "expertise-tracking.md" ~/.claude/skills/*/SKILL.md` returns all 6 interactive skills
- `grep -l "Calibrate explanation depth" ~/.claude/skills/*/SKILL.md` (or similar phrasing) returns all 6 skills
