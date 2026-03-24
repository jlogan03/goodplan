# State & Activity Log Formats

> **Deprecated — do not follow.** The `state.md` format documented below is obsolete and retained only as a migration reference. It will be removed in a future slice. Skills MUST use CLI commands instead of reading or writing `state.md`. See `skills/_shared/references/cli-interaction.md` for the new conventions — particularly section 6 (State Orientation) which provides the migration reference from `state.md` fields to CLI equivalents.

## state.md Format

```markdown
# State

## Current Phase
<phase> <status> — <brief context>

## Active Slice
<slice path | "none (working at project level)">

## Work Stack
<LIFO entries or "(empty)">
Example: - side-quests/<name> (interrupted slices/<name> at <phase>)

## Next Step
<Actionable one-sentence instruction>
```

All four sections required. `phase` is kebab-case (e.g. `explore`). State.md `status` values: `complete`, `started`, or `in-progress`. Active scope resolution: Work Stack top > Active Slice > project level.

## activity-log.jsonl Entry Format

One JSON object per line. Required fields:

| Field | Description |
|---|---|
| `ts` | UTC timestamp: `YYYY-MM-DDTHH:mm:ssZ` (generate with `date -u +%Y-%m-%dT%H:%M:%SZ`) |
| `phase` | Kebab-case phase name (e.g. `explore`) |
| `scope` | `project` or path like `slices/03-explore` |
| `status` | Activity-log values: `complete`, `started`, `failed`, or `abandoned` |
| `summary` | One sentence describing what happened |

Optional: `detail` — path to file in `.project/activity-log/` for notable events. Naming: `activity-log/<phase>-<scope-slug>-<YYYYMMDDTHHmmss>.md`. Routine completions need no detail file.

Example:

```json
{"ts":"2026-03-15T14:19:12Z","phase":"explore","scope":"project","status":"complete","summary":"Explored auth options: researched 3 providers, brainstormed API design"}
```

Scope values:
- `project` — project-level operations
- `slices/<name>` or `side-quests/<name>` — slice/quest scope (pre-epic or single-epic projects)
- `epics/<name>` — epic-level events (e.g., epic approval, epic completion)
- `epics/<name>/slices/<name>` — epic-scoped slice operations

For `state.md`, the Active Slice field uses the same path format: `epics/<name>/slices/<name>` for epic-scoped slices.
