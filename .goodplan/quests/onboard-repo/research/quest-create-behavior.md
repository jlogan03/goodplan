# Quest Create Behavior

**Version**: goodplan 1.0.0 | **Fetched**: 2026-03-28

## Can multiple quests be created?
Yes. `quest:create` only guards on name uniqueness (no duplicate names). No limit on quest count.

## Does creation auto-activate?
No. Creates quest in `created` status. Does NOT set `activeQuest` in `project.json`.

## Single-active-quest constraint
Enforced at `BEGIN_QUEST_PLAN` (quest-plan.ts), not at creation. If `project.activeQuest !== null`, planning is blocked with `STATE_QUEST_ALREADY_ACTIVE`.

## Implication for onboard-repo
The skill can create multiple quests via `quest:create` without issues. They'll all be in `created` status. Only one can be planned/implemented at a time.
