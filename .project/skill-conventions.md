# Skill Conventions

> Intermediate artifact for building skills. Authoritative runtime formats live in each skill's `references/formats.md`.

## Timestamp Format

`YYYY-MM-DDTHH:mm:ssZ` — UTC, seconds precision, Z suffix. Generate: `date -u +%Y-%m-%dT%H:%M:%SZ`

## state.md Format

```markdown
# State

## Current Phase
<phase> <status> — <brief context>

## Active Slice
<slice path | "none (working at project level)">

## Work Stack
<LIFO entries or "(empty)">
- side-quest/<name> (interrupted slices/<name> at <phase>)

## Next Step
<Actionable one-sentence instruction>
```

All four sections required. Active scope: Work Stack top → Active Slice → project level.

## activity-log.jsonl Format

One JSON object per line. Required fields: `ts` (timestamp), `phase` (e.g. `capture-idea`), `scope` (`project` or path like `slices/01-start-project`), `status` (`complete`|`started`|`failed`|`abandoned`), `summary` (one sentence).

Optional: `detail` — path to file in `activity-log/` for notable events (retries, failures). Naming: `activity-log/<phase>-<scope-slug>-<YYYYMMDDTHHmmss>.md`. Routine completions need no detail file.

Example:
```json
{"ts":"2026-03-15T14:19:12Z","phase":"capture-idea","scope":"project","status":"complete","summary":"Captured project idea: suite of Claude Code skills"}
```

## Scope Resolution

Read `state.md` to find active scope: (1) Work Stack top entry, (2) Active Slice if not "none", (3) project level.
