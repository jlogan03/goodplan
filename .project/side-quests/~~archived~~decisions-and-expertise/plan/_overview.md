# Plan: Decisions & Expertise Infrastructure

## Overview

Adds durable decision tracking (`.project/decisions/`) and progressive expertise tracking (`~/.claude/CLAUDE.md` expertise section + auto memory) to the skill suite. Also consolidates duplicated reference files into `~/.claude/skills/_shared/references/` as a prerequisite, and updates `workflow.md` to reflect the new conventions.

**Approach**: First consolidate shared references (Phase 0) to establish the `_shared/` directory, then define the two new conventions as shared reference files (Phases 1-2), then update all existing skills to consume and produce them (Phases 3-4), and finally update workflow.md (Phase 5).

**Key decisions**:
- Shared references live at `~/.claude/skills/_shared/references/` — consolidation criterion is "will these stay unified long-term?" not just "are they the same now"
- Decisions always require user confirmation before writing to `.project/decisions/`
- Expertise uses structured categories: comfortable with / less familiar with / actively learning
- All interactive skills get a formal expertise check step at the end of each run
- `workflow.md` only documents implemented features, not planned ones
- Decision writers: `/explore`, `/define-architecture`, `/define-slices`, `/create-plan`, `/complete-slice`
- Decision readers: all interactive skills (the 5 writers + `/project-status`, `/start-project`)

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 00 | Shared references consolidation | Create `_shared/references/`, move 3 duplicated files, update all skill Read paths |
| 01 | Decisions convention | Create `decisions-format.md` in `_shared/references/` |
| 02 | Expertise tracking convention | Create `expertise-tracking.md` in `_shared/references/` |
| 03 | Update skills — decisions | Add decisions/ loading to all interactive skills, decision writing to 5 skills |
| 04 | Update skills — expertise | Add calibration step to start-project, formal expertise check to all interactive skills |
| 05 | Update workflow.md | Add decisions/ and expertise tracking to the canonical workflow document |
