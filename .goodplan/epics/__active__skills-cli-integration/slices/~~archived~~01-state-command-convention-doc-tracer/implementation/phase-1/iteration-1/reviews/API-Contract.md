## Issues

**[IMPORTANT]** Version string hardcoded instead of using single source of truth
The plan explicitly states: "Version must come from a single source of truth: import from `package.json` or define a `const VERSION` that both plain-text and JSON paths use -- never hardcode `"0.0.1"` in two places." The implementation hardcodes `const version = "0.0.1"` in `src/index.ts` line 65, while `package.json` also contains `"version": "0.0.1"`. These are two independent sources that can drift. Import from `package.json` or use a build-time constant.
File: src/index.ts:65
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Error exit code logic duplicated between state command and `exitCodeForError`
The state command (lines 100-104) duplicates the exit code mapping logic that already exists in `exitCodeForError()` in `src/util/output.ts`. The state command's inline logic (`error.code.startsWith("VALIDATION_") ? 2 : error.code.startsWith("STATE_") ? 3 : 1`) matches `exitCodeForError` exactly. If the exit code mapping ever changes (e.g., new error prefixes), the state command's copy will drift. Import and call `exitCodeForError(error)` instead.
File: src/commands/global/state.ts:100
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `--query` description inconsistent between state and status commands
In the schema registry (`schema.ts`), the `state` command inherits `globalArgDefs` which defines `query` as "jq expression to filter JSON output (implies --json)". The "(implies --json)" qualifier is misleading for `state` since state always outputs JSON. This is inherited from globalArgDefs so it applies to all commands equally, but since state is an explicit exception to the --json convention, the description could confuse consumers reading `schema --json` output. Consider whether this is worth addressing (the convention doc could clarify).
File: src/commands/global/schema.ts:114
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `parseNonNegativeInt` rejects leading-zero values unnecessarily
The check `String(parsed) !== value` rejects inputs like `"01"` or `"007"`. While this is technically strict, it could surprise users. The behavior is not documented in the schema description or help text. This is a minor ergonomics concern -- the current strict behavior is defensible but consider documenting it in the flag description.
File: src/commands/global/state.ts:121
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Integration test fixture assumption: activity-log.jsonl must have 3+ entries
The integration test at line 38-48 assumes the `slice-in-progress` fixture has at least 3 entries in `activity-log.jsonl` (to test `--limit 2` returning exactly 2). If the fixture is modified to have fewer entries, this test would silently pass with wrong semantics. The test should assert the total count first or use a fixture known to have sufficient entries.
File: tests/integration/state.test.ts:38
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
The implementation is well-structured and faithfully follows the plan. The API contract design is sound: always-JSON output, proper error shapes with correct exit codes, sensible pagination semantics, and good documentation in comments and commands-api.md. The two IMPORTANT issues (version source of truth and exit code duplication) are real maintainability risks that should be fixed before merging. Fixing those plus the minor items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
