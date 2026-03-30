# Research: Activity-Log Scope Strings After Migration

## What Was Investigated

Whether historical `scope` strings in `activity-log.jsonl` (e.g., `"slices/01-auth"`) should be updated during migration or preserved as historical records.

## Key Findings

### Current scope string patterns

The state machine transitions already use the nested path format for scope strings:
- `epics/${event.epic}` -- for epic-level events (e.g., `epics/entity-restructuring`)
- `epics/${event.epic}/slices/${event.slice}` -- for slice-level events
- `quests/${quest.name}` -- for quest-level events
- `project` -- for project-level events

This is visible in `slice-implement.ts`, `slice-plan.ts`, `epic-phase.ts`, etc.

### Historical data in this repo

The actual `activity-log.jsonl` in this repo already uses the correct nested format:
- `"scope": "quests/consistent-skill-output"`
- `"scope": "epics/entity-restructuring"`
- `"scope": "project"`

There are no `"scope": "slices/..."` entries in the current log. The only `slices/` references in scope strings are in internal usage like learnings rollup commands (unrelated to activity log).

### Migration code behavior

`buildMigrationState` creates a single activity log entry with `scope: "project"` (line 192). It does not migrate or transform any historical activity log entries -- it starts fresh.

### Schema

The `activityEntrySchema` defines scope as `z.string().min(1)` -- a free-form string with no structural validation. There is no enum or pattern constraint.

## Recommendation

**No migration of historical scope strings is needed.** The migration code already starts with a clean activity log (single "project" scoped entry). The state machine transitions already produce the correct `epics/<epic>/slices/<slice>` format. There are no legacy `slices/...` scope strings to worry about in the activity log.

If a future concern arises about repos that were migrated with an older CLI version that used flat `slices/` scope strings, those entries should be preserved as historical records -- rewriting history would be incorrect since those entries accurately reflect what happened at the time.
