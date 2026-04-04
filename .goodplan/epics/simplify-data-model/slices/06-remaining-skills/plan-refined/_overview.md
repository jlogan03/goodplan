# Plan: Remaining Skills + Cleanup

Status: COMPLETE
Completed: 2026-04-03

## Overview

Complete the 19-to-12 skill consolidation by building the remaining new skills, renaming three existing skills, adding all reviewer agents, and cleaning up old skill directories with build pipeline updates.

Six skills need to be created or consolidated:
- **create-side-quest**: new pipeline skill (4 phases) using the proven orchestrator pattern from slices 02-05. Prerequisite: extend quest state machine with `exploring`/`explored` statuses and add `--quest` flag to `start-explore`. Then reuses existing `explore-phase.md` and `plan-phase.md` agents via quest-specific task prompts.
- **audit**: lightweight orchestrator dispatching to three mode-specific agents (architecture, docs, tests). Replaces three separate audit skills.
- **init**: lightweight orchestrator auto-detecting mode (onboard existing repo vs new empty project). Spawns `onboard-phase.md` agent for the heavy lifting. Handles re-entry for already-initialized projects.
- **task** (rename of capture), **upgrade** (rename of migrate), **status** (rename of project-status): fresh skill directories with updated frontmatter, descriptions, and trigger phrases. All 12 skills get `user-invocable: true` (including existing skills that lack it).

Fourteen new reviewer agent definitions complete the reviewer infrastructure (6 existing + 14 new = 20 total, matching the architecture spec). All follow the established pattern: ~45-line agent `.md` referencing shared preamble + domain-specific criteria.

Cleanup deletes 15 old skill directories, removes `install-skills.sh` (superseded by plugin distribution), and adds exact count + name assertions to `build-plugin.sh`.

**Slug**: `remaining-skills`

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | create-side-quest-pipeline | Extend quest state machine (exploring/explored), then build 4-phase orchestrator skill + test harness script |
| 02 | audit-skill | Build audit orchestrator + 3 mode agents + test harness script |
| 03 | init-skill | Build init orchestrator + onboard-phase agent + test harness script |
| 04 | renames | Create task, upgrade, status skills from capture, migrate, project-status + ensure all 12 skills have user-invocable: true |
| 05 | reviewer-agents | Add 14 remaining reviewer agent definitions + domain criteria files (6 existing + 14 new = 20 total) |
| 06 | cleanup-and-build | Delete 15 old skills, remove install-skills.sh, update build assertions, final verification |
