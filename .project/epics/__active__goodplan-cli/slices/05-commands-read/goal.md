# Commands: Read Surface

## What We're Building
All read-only CLI commands: entity list/show commands for every namespace (epic, slice, quest, decision, learning, activity), plus deepened status and schema commands. Deepens the jqjs integration from the tracer bullet smoke test to full `--query` support. Completes the human-facing read surface.

**Routing:** List/show commands read directly from the Data Layer (no RPC). The `status` command routes through RPC (`status()` function from slice 04). This distinction is explicit — most of this slice can be built after slice 02; only `status` requires slice 04.

## Behavior
1. `epic:list`, `epic:show --epic <name>` — reads directly from data layer, formats as human-readable or --json.
2. Same pattern for slice, quest, decision, learning, activity namespaces (all read directly from data layer).
3. `status` deepened: routes through RPC `status()`, reports active epic/slice/quest, artifact counts, recommendations.
4. `schema --json` returns full command hierarchy with flags and input schemas. `schema --command epic:create --json` returns single command schema.
5. `--query` applies jqjs filter to any JSON output. Invalid expression → exit 2, `VALIDATION_INVALID_QUERY`. Empty result → `null`.
6. `--quiet` mode: minimal output (entity name/status only).
7. Human-readable output uses picocolors for headers, status badges, and emphasis. Respects NO_COLOR.
8. `activity:list --scope slices/01-auth` filters activity log by scope.

## Success Criteria
- [ ] `goodplan epic:list --json` returns JSON array of epics with metadata
- [ ] `goodplan epic:show --epic goodplan-cli --json` returns full epic metadata
- [ ] `goodplan slice:list --json` returns slices with sequencing order
- [ ] `goodplan decision:list --json` returns active decisions
- [ ] `goodplan learning:list --json` returns learnings from project-level JSONL
- [ ] `goodplan activity:list --scope slices/01-auth --json` returns filtered activity entries
- [ ] `goodplan status --json` returns full StatusResult with active pointers, artifacts, recommendations (requires 04)
- [ ] `goodplan status` (human-readable) shows colored output with status badges (requires 04)
- [ ] `goodplan schema --json` returns complete command hierarchy
- [ ] `goodplan schema --command epic:create --json` returns single command schema
- [ ] `goodplan epic:list --json --query '.[0].name'` returns first epic name (jqjs in binary works)
- [ ] `goodplan epic:list --json --query 'invalid['` returns exit 2, VALIDATION_INVALID_QUERY
- [ ] `goodplan epic:list --quiet` returns one line per epic with name and status only — no headers, no formatting
- [ ] NO_COLOR=1 suppresses all color output

## Verification
1. Set up a fixture .project/ via `goodplan init` + direct file creation (not mutation commands, which are slice 06).
2. Run each list/show command with --json and verify output matches expected schema.
3. Run status with and without --json, verify both formats.
4. Run schema, verify command hierarchy is complete.
5. Test --query with valid and invalid expressions.
6. Test NO_COLOR=1 — pipe output through `cat -v`, verify no ANSI escape codes.
7. Test --quiet — verify minimal output.

## Scope Boundaries
**In scope:** All list/show commands for every entity namespace, status (deepened, routes through RPC), schema (deepened), --query via jqjs (full query support, deepening tracer bullet's smoke test), --quiet mode, human-readable colored output, NO_COLOR support. Fixtures created via init + direct file creation.
**Out of scope:** Mutation commands (slice 06), sub-agent commands (slice 06).
