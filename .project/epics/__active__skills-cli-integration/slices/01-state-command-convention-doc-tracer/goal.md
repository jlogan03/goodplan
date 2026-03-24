# State Command, Convention Doc & Tracer Bullet

## What We're Building

The foundational slice for skill-CLI integration. Four deliverables: (1) the `goodplan state --json --query` command that gives skills access to the entire `.project/` state tree through a single command, (2) `--version --json` output for version compatibility checking, (3) the `_shared/references/cli-interaction.md` convention doc that defines how all skills interact with the CLI, and (4) migration of the `project-status` skill as the tracer bullet proving the end-to-end integration pattern works.

The `state` command is read-only, routing directly to Data Layer via `assembleState()`, consistent with the read-only command routing pattern. Its JSON output constitutes a public API contract — internal state tree type changes must maintain backward compatibility with the unwrapped serialization format defined in `cli-changes.md`.

The convention doc adapts the architecture's `cli-interaction-conventions.md` into a skill-consumable reference (not a copy of the architecture spec).

## Behavior

1. `goodplan state --json` returns the full `assembleState()` tree serialized as JSON (unwrapped format per `cli-changes.md` § State Tree JSON Serialization Format)
2. `goodplan state --json --query '<jq>'` applies the jq expression via jqjs and returns only the filtered result
3. `goodplan state --json --query '...' --offset N --limit N` paginates array results (applied after query evaluation)
4. `goodplan --version --json` returns `{ "version": "X.Y.Z" }` instead of the current plain-text output
5. The convention doc (`skills/_shared/references/cli-interaction.md`) adapts the architecture's `cli-interaction-conventions.md` into a skill-consumable reference file. It should note: `start-*` commands always return JSON; `submit-*` and mutation commands require `--json` for structured output. The `--inline[=<bytes>]` flag accepts an optional byte budget (convention doc should document this)
6. The `project-status` skill is rewritten to use `goodplan status --json` and `goodplan state --json --query` instead of reading state.md, activity-log.jsonl, and entity JSON files directly

## Success Criteria

- [ ] `goodplan state --json --query '.["project.json"].name'` — returns the project name as a JSON string
- [ ] `goodplan state --json --query '.["activity-log.jsonl"] | length'` — returns the activity log entry count
- [ ] `goodplan state --json --query '.["activity-log.jsonl"]' --offset 0 --limit 5` — returns first 5 activity log entries
- [ ] `goodplan state --json --query '.slices | keys'` — returns array of slice directory names
- [ ] `goodplan state --json` without `--query` — returns the complete state tree (valid JSON)
- [ ] `goodplan --version --json` — returns `{ "version": "..." }` with the current version string
- [ ] `goodplan --version` (no `--json`) — continues to print plain-text version
- [ ] `goodplan state --json --query 'invalid syntax'` — exits 2 with `VALIDATION_INVALID_QUERY` error
- [ ] Convention doc exists at `skills/_shared/references/cli-interaction.md` and covers at minimum: binary detection, invocation patterns, state orientation, error handling. Additional topics (data ownership, interaction patterns by role, deriving workflow phase, deep dives, self-discovery) may be drafted but are validated by subsequent slices
- [ ] `project-status` skill uses `goodplan status --json` for orientation instead of reading state.md
- [ ] `project-status` skill uses `goodplan state --json --query` for deep dives (activity log, learnings) instead of reading JSONL directly
- [ ] `project-status` skill contains zero direct reads of `.project/*.json` or `.project/*.jsonl` files
- [ ] Running `/project-status` on the goodplan repo produces correct output using CLI commands
- [ ] Integration tests for `state --json`, `state --json --query`, pagination, and error cases (aligned with `tests/integration/` and `tests/unit/commands/` patterns)

## Verification

Run against the goodplan repo's own `.project/` directory:

1. **State command happy path**: Run `goodplan state --json --query '.["project.json"]'` and verify it returns a valid JSON object with name, version, activeEpic fields. Run with `--query '.slices | keys'` and verify it lists slice directories.

2. **Pagination**: Run `goodplan state --json --query '.["activity-log.jsonl"]' --limit 3` and verify exactly 3 entries returned. Run with `--offset 3 --limit 3` and verify different entries.

3. **Error handling**: Run `goodplan state --json --query 'broken['` and verify exit code 2 with `VALIDATION_INVALID_QUERY` error JSON.

4. **Version**: Run `goodplan --version --json` and verify JSON output. Run `goodplan --version` and verify plain text still works.

5. **Project-status integration**: Run `/project-status` on the goodplan repo. Verify it outputs project state correctly. Check that no direct file reads of `.project/*.json` or `.project/*.jsonl` appear in the skill file (grep the skill source).

6. **jqjs performance**: Run the specific jq expressions from the success criteria against the goodplan repo's own state tree (a realistic-size tree). Confirm all return within acceptable time (< 1s).

## Scope Boundaries

**In scope:**
- `state` command implementation (commands layer + data layer routing)
- `--version --json` flag handling
- `--offset`/`--limit` pagination on state command
- Convention doc (`skills/_shared/references/cli-interaction.md`)
- `project-status` skill rewrite
- Automated tests for `state` command (integration + unit, per existing test patterns)
- `bun run install:skills` to install updated skill

**Out of scope:**
- `show --json` artifacts enrichment (slice 02)
- `status --json` file array enrichment (slice 02)
- Semantic version compatibility checking (slice 02)
- All other skill migrations (slices 03-05)

**Note:** Version compatibility checking is "convention doc only" in this slice — the protocol is documented and `--version --json` output exists, but CLI-side major/minor enforcement is deferred to slice 02.
