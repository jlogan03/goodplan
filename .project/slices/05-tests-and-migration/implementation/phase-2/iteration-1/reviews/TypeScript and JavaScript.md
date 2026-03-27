## Issues

**[CRITICAL]** TypeScript compilation errors: `epicJsonContent` type annotation and `warning` spread on `MigrationResult`

There are two TypeScript compilation errors in `src/core/rpc/migrate.ts`:

1. **Line 253** — `epicJsonContent` is typed as `Epic`, but `epic.status` is `string` (from the `MigrationEpic` interface), not `EpicStatus`. The `MigrationEpic.status` field is declared as `string`, so assigning it to `Epic.status` (which expects the `EpicStatus` union) fails. Fix: either type `MigrationEpic.status` as `EpicStatus`, or cast with `as EpicStatus` (the value has already been validated through the inventory schema which uses `epicStatusSchema`, so the cast is safe), or use a Zod parse to narrow.

2. **Line 1021** — The spread `{ ...result, warning: "..." }` produces a union where `warning` could land on the `"complete"` variant, which does not have `warning` in its schema. The `migrationResultSchema` adds `warning` only to the `"questions"` variant, so this is correct at runtime (since `result` is always a `"questions"` variant at that point), but TypeScript cannot narrow through the spread. Fix: narrow `result` first (assert or check `result.status === "questions"`) and then construct the return value explicitly, or use a type assertion.

File: src/core/rpc/migrate.ts:253
File: src/core/rpc/migrate.ts:1021
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `epicDetailResponseSchema` still collects `sliceSequence` from user — dead field

The `epicDetailResponseSchema` in `schemas.ts` (line 76) still requires `sliceSequence` as a field in the response. Since `buildMigrationState` no longer uses `sliceSequence` (it was removed in this phase), collecting it from the user is pointless overhead. The schema, question hint text (line 728 in migrate.ts: "sliceSequence is the ordered list of slice names"), and all test fixture data still reference it. This should be cleaned up: either remove `sliceSequence` from `epicDetailResponseSchema` and update all test fixtures/hints, or document why it is intentionally retained.

File: src/commands/global/migrate/schemas.ts:76
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `isReMigration` is checked but not used in later rounds

In `rpcMigrate`, `isReMigration` is computed at the top (line 1004) but only used in the `stdin === null` fresh-start path. When stdin IS provided for round 1 (or subsequent rounds), the re-migration flag is ignored. This means the warning is only emitted when no stdin is provided (the "get questions" call), but if someone directly submits round 1 answers without first calling for questions, they get no warning. This is likely acceptable for the Q&A protocol (first call is always no-stdin), but the `isReMigration` variable is computed on every call regardless, which is misleading. Consider moving the `isReMigration` check inside the `stdin === null` block to make the scope clear.

File: src/core/rpc/migrate.ts:1003
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `renameProjectDir` timestamp format is not timezone-aware

The `renameProjectDir` function uses `new Date()` with local time methods (`getHours`, etc.) to generate the timestamp suffix. This means the same migration run at the same UTC second but in different timezones produces different backup directory names. While not a bug (the timestamp is just for uniqueness/human reference), using UTC methods (`getUTCHours`, etc.) would be more predictable and consistent with the ISO 8601 timestamps used throughout the rest of the codebase.

File: src/core/rpc/migrate.ts:431
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Empty catch block in migration state file cleanup

Line 658 has an empty catch block when cleaning up `.migration-in-progress.json`. Per the project's CLAUDE.md anti-patterns, empty catch blocks should log or rethrow. This particular case has a comment explaining the intent, but it still swallows errors silently. A `process.stderr.write` warning (like the one used for artifact copy failures) would be more consistent.

File: src/core/rpc/migrate.ts:658
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

Two TypeScript compilation errors make this a blocking failure — the code will not pass `tsc --noEmit`. Beyond that, there is a meaningful cleanup opportunity with the now-dead `sliceSequence` field in the schema. Fixing the two CRITICAL type errors and removing or documenting the dead `sliceSequence` schema field would bring the score to 9+.

## Summary
- Critical: 1
- Important: 2
- Minor: 2
