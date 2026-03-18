# Plan: Decisions & Expertise Infrastructure

Status: COMPLETE
Completed: 2026-03-17

## Overview

Adds durable decision tracking (`.project/decisions/`) and progressive expertise tracking (`~/.claude/CLAUDE.md` expertise section + auto memory) to the skill suite. Also consolidates duplicated reference files into `~/.claude/skills/_shared/references/` as a prerequisite, and updates `workflow.md` to reflect the new conventions.

**Approach**: First consolidate shared references (Phase 0) to establish the `_shared/` directory, then define the two new conventions as shared reference files (Phases 1-2), then update all existing skills to consume and produce them (Phases 3-4), and finally update workflow.md (Phase 5).

**Key decisions**:
- Shared references live at `~/.claude/skills/_shared/references/` using absolute paths — consolidation criterion is "will these stay unified long-term?" not just "are they the same now". Project-level skill installs are not supported for shared references.
- Decisions always require user confirmation before writing to `.project/decisions/`
- Expertise uses structured categories: comfortable with / less familiar with / actively learning
- All interactive skills get a conditional expertise check step (only reads the reference file when new expertise was observed)
- `workflow.md` only documents implemented features, not planned ones
- "Cross-cutting guidance" (referenced by downstream quests as a dependency) is satisfied by decisions loading (Phase 3) + expertise calibration (Phase 4) — no additional artifact needed
- Decision writers: `/explore`, `/define-architecture`, `/define-slices`, `/create-plan`, `/complete-slice`
- Decision readers: all interactive skills (the 5 writers + `/project-status`, `/start-project`, `/refine-plan`, `/implement-plan`)

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 00 | Shared references consolidation | Create `_shared/references/`, move 4 duplicated files, update all skill Read paths |
| 01 | Decisions convention | Create `decisions-format.md` in `_shared/references/` |
| 02 | Expertise tracking convention | Create `expertise-tracking.md` in `_shared/references/` |
| 03 | Update skills — decisions | Add decisions/ loading to all interactive skills, decision writing to 5 skills |
| 04 | Update skills — expertise | Add calibration step to start-project, formal expertise check to all interactive skills |
| 05 | Update workflow.md | Add decisions/ and expertise tracking to the canonical workflow document |
