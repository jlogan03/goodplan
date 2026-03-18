# Phase 4: Update Skills — Expertise Awareness

Add a distinct expertise calibration step to `/start-project` and a formal expertise check step at the end of all interactive skills.

### Tasks

#### Start-project: expertise calibration step

- [x] Update `start-project/SKILL.md` — add a new step after idea capture (before flow-log/state write-back):
  1. Read `~/.claude/skills/_shared/references/expertise-tracking.md`
  2. Check existing `## Expertise` section in `~/.claude/CLAUDE.md` (may not exist yet)
  3. Identify domains the project idea touches that aren't already covered in the expertise section
  4. For uncovered domains, use AskUserQuestion: "This project involves [X] and [Y] — how familiar are you with those areas?"
  5. Write/update `## Expertise` section in `~/.claude/CLAUDE.md`
  6. Write/update auto memory files (`expertise_<domain>.md`) with detailed observations
  7. If expertise section already covers all relevant domains, skip silently — don't re-ask

#### All interactive skills: formal expertise check step

For each skill below, add a step after the main interactive work completes, before state write-back (each skill places it where natural):
1. Reflect on the conversation: did it reveal new information about the user's expertise? (CLAUDE.md `## Expertise` section is already in context)
2. If yes: Read `~/.claude/skills/_shared/references/expertise-tracking.md` for the recording protocol, then update `## Expertise` section in `~/.claude/CLAUDE.md` + write/update relevant `expertise_<domain>.md` memory file
3. If no: skip silently (no Read, no output, no AskUserQuestion)

Skills to update:
- [x] `explore/SKILL.md` — add expertise check step
- [x] `define-architecture/SKILL.md` — add expertise check step
- [x] `define-slices/SKILL.md` — add expertise check step
- [x] `create-plan/SKILL.md` — add expertise check step
- [x] `complete-slice/SKILL.md` — add expertise check step

#### Project-status: expertise summary

- [x] Update `project-status/SKILL.md` — include a brief expertise summary from CLAUDE.md `## Expertise` section in the status report (so users can verify their expertise profile is correct)

#### Calibration depth guidance

- [x] Add a note to each skill's interactive section (or guidance reference file): "Follow calibration depth guidance in `~/.claude/skills/_shared/references/expertise-tracking.md`."

Skills to add calibration note:
- [x] `explore/SKILL.md`
- [x] `define-architecture/SKILL.md`
- [x] `define-slices/SKILL.md`
- [x] `create-plan/SKILL.md`
- [x] `complete-slice/SKILL.md`
- [x] `start-project/SKILL.md`

### Verification

- Read `start-project/SKILL.md` — confirm expertise calibration step exists after idea capture, references expertise-tracking.md, handles existing vs new expertise
- Read `explore/SKILL.md` — confirm expertise check step exists before state write-back, handles both "new info" and "no new info" cases
- `grep -l "expertise-tracking.md" ~/.claude/skills/*/SKILL.md` returns all 6 interactive skills
- `grep -l "calibration depth" ~/.claude/skills/*/SKILL.md` (or similar phrasing) returns all 6 skills — each referencing `expertise-tracking.md` rather than inlining the guidance
