# State & Flow Log Formats

## state.md Format

```markdown
# State

## Current Phase
<phase> <status> — <brief context>

## Active Slice
<slice path | "none (working at project level)">

## Work Stack
<LIFO entries or "(empty)">
Example: - side-quests/<name> (interrupted vertical-slices/<name> at <phase>)

## Next Step
<Actionable one-sentence instruction>
```

All four sections required. `phase` is kebab-case (e.g. `explore`). State.md `status` values: `complete`, `started`, or `in-progress`. Active scope resolution: Work Stack top > Active Slice > project level.

## flow-log.jsonl Entry Format

One JSON object per line. Required fields:

| Field | Description |
|---|---|
| `ts` | UTC timestamp: `YYYY-MM-DDTHH:mm:ssZ` (generate with `date -u +%Y-%m-%dT%H:%M:%SZ`) |
| `phase` | Kebab-case phase name (e.g. `explore`) |
| `scope` | `project` or path like `vertical-slices/03-explore` |
| `status` | Flow-log values: `complete`, `started`, `failed`, or `abandoned` |
| `summary` | One sentence describing what happened |

Optional: `detail` — path to file in `.project/flow-log/` for notable events. Naming: `flow-log/<phase>-<scope-slug>-<YYYYMMDDTHHmmss>.md`. Routine completions need no detail file.

Example:

```json
{"ts":"2026-03-15T14:19:12Z","phase":"explore","scope":"project","status":"complete","summary":"Explored auth options: researched 3 providers, brainstormed API design"}
```

Scope values: use `project` for project-level operations; use `vertical-slices/<name>` or `side-quests/<name>` for slice/quest scope.
