# Architecture Updates: 06-remaining-skills

## Changes Made

1. **State Machine**: Added `exploring`/`explored` quest statuses and `BEGIN_QUEST_EXPLORE`/`COMPLETE_QUEST_EXPLORE` events. Updated transition tables and state-machine-api.md during Phase 1 implementation. `quest:plan` now accepts dual precondition (`created` or `explored`).

2. **Context Module**: Added quest-specific explore priority table (`exploreQuestSources`) and updated `getPriorityTable()` to accept optional `Target` parameter.

3. **Conventions**: Updated `conventions.md` to reflect 12 skills + 34 agents, added `quest:explore` to command listings.

## Changes Declined

None.

## Tech Debt Flagged

None — all architecture files accurately describe the current system.

## Alignment with Epic Target Architecture

The epic's `architecture/_overview.md` specifies "19 → 12 skills" consolidation. This slice completed the remaining skills, achieving exactly 12: audit, complete-epic, create-epic, create-side-quest, explore, implement, init, plan-slice, start-epic, status, task, upgrade. The 20 reviewer agents also match the spec. The epic's skill consolidation goal is fully met.
