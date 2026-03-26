# Codebase Context: Archived Prefix Migration

## Fresh Documentation
- `workflow.md` — already updated with `~~archived~~` convention (fresh as of this session)
- `docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md` — design spec for initiatives, maturity, and prefix conventions (fresh)

## Target Files

### Directories to rename (13 total)
`.project/vertical-slices/` (7):
- `__done__01-start-project`
- `__done__02-project-status`
- `__done__03-explore`
- `__done__04-define-architecture`
- `__done__05-define-slices`
- `__done__06-create-plan`
- `__done__07-complete-slice`

`.project/side-quests/` (6):
- `__done__architecture-quality`
- `__done__decisions-and-expertise`
- `__done__onboarding-and-refactors`
- `__done__refine-plan-shared-loop`
- `__done__slice-quality-and-health`
- `__done__workflow-v2`

### Skill files with `__done__` references (3)
- `~/.claude/skills/complete-slice/SKILL.md` — 5 occurrences
- `~/.claude/skills/complete-slice/references/guidance.md` — 4 occurrences
- `~/.claude/skills/project-status/references/status-logic.md` — 5 occurrences

## Key Constraints
- Tilde `~` in directory names is safe when nested inside `.project/` — not interpreted as home directory
- Git tracks directory renames as delete + add — all contents preserved
- The design spec file intentionally references `__done__` (documenting the migration) — must be excluded from verification grep
