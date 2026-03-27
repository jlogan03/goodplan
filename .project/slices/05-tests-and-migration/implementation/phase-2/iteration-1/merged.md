# Merged Review — Phase 2: Migration Code Updates

**Composite Score: 5/10** (blocked by TypeScript compilation errors; resolving critical issues would bring to 9+)

## Summary

Core plan tasks are correctly implemented: STATE_ALREADY_INITIALIZED guard removal, `isReMigration` boolean check, `epicJsonContent` typed as `Epic`, `sliceSequence` removed from `buildMigrationState` output, timestamped backup naming, `warning` field on `questions` variant, and test updates. Cross-file integration is clean and all 1040 tests pass at runtime. However, two TypeScript compilation errors prevent `tsc --noEmit` from passing, making this a blocking failure.

---

## Critical Issues

### [CRITICAL] TypeScript compilation errors in `src/core/rpc/migrate.ts`

Two type errors prevent compilation:

**1. Line 253** — `epicJsonContent` is typed as `Epic`, but `epic.status` comes from `MigrationEpic` where it is declared as `string`, not `EpicStatus`. `Epic.status` expects the `EpicStatus` union.

Fix options (in order of preference):
- Type `MigrationEpic.status` as `EpicStatus` at the interface definition
- Cast `epic.status as EpicStatus` (safe — value has already been validated through `epicStatusSchema`)
- Use a Zod parse to narrow

**2. Line 1021** — The spread `{ ...result, warning: "..." }` produces a type where `warning` could land on the `"complete"` variant, which does not have `warning` in its schema. TypeScript cannot narrow through the spread even though `result` is always a `"questions"` variant at runtime.

Fix: narrow `result` first (`result.status === "questions"` check or assertion), then construct the return value explicitly, or use a type assertion.

File: `src/core/rpc/migrate.ts` lines 253, 1021

---

## Important Issues

### [IMPORTANT] Hardcoded `.project-old/` in error message (line 635)

The error recovery message on line 635 reads `"...renaming .project/ to .project-old/."` with a hardcoded `.project-old/` string. The plan requires all error recovery messages in `executeMigration` to use the runtime `projectOldDir` variable. Line 636 already interpolates `${projectOldDir}` correctly; line 635 does not.

Fix: `` `...renaming ${projectDir} to ${projectOldDir}.` ``

File: `src/core/rpc/migrate.ts:635`

### [IMPORTANT] `sliceSequence` in `epicDetailResponseSchema` is now a dead field

`epicDetailResponseSchema` (`schemas.ts` line 76) still requires `sliceSequence`, but `buildMigrationState` no longer uses it. The field is also referenced in the Q&A hint text (`migrate.ts` line 728) and in test fixtures. Collecting it is pointless overhead.

Resolution options:
- Remove `sliceSequence` from `epicDetailResponseSchema` and update all test fixtures and hints
- Document explicitly why it is intentionally retained (e.g., future use)

Note: both reviewers flagged this — the generalist noted it as minor/intentional per the build report; the TS reviewer flagged it as important. Given the anti-pattern of silently discarding collected input, this should be resolved or documented.

File: `src/commands/global/migrate/schemas.ts:76`, `src/core/rpc/migrate.ts:728`

### [IMPORTANT] `isReMigration` check scoped misleadingly

`isReMigration` is computed unconditionally at line 1004 but only used inside the `stdin === null` branch. On rounds where stdin is provided, the flag is ignored, which is correct behavior for the Q&A protocol (first call is always no-stdin), but the unconditional computation is misleading.

Fix: move the `isReMigration` check inside the `stdin === null` block to make the scope clear.

File: `src/core/rpc/migrate.ts:1003`

---

## Minor Issues

### [MINOR] `renameProjectDir` timestamp uses local time methods

`new Date()` with `getHours()`, `getMonth()`, etc. produces timezone-dependent backup directory names. Not a correctness bug (the timestamp is for uniqueness and human reference), but inconsistent with the ISO 8601 / UTC timestamps used elsewhere in the codebase.

Fix: use UTC methods (`getUTCHours`, `getUTCMonth`, etc.).

File: `src/core/rpc/migrate.ts:431`

### [MINOR] Empty catch block in migration state file cleanup (line 658)

The catch block when cleaning up `.migration-in-progress.json` is empty (comment only). Per project anti-patterns, empty catch blocks must log or rethrow. A `process.stderr.write` warning (consistent with artifact copy failure handling) would suffice.

File: `src/core/rpc/migrate.ts:658`

---

## Verification Checklist (from generalist, confirmed passing)

- [x] STATE_ALREADY_INITIALIZED guard removed — replaced with `isReMigration` boolean check
- [x] `epicJsonContent` typed as `Epic` — import added, 8 fields match `epicSchema`
- [x] `sliceSequence` removed from `buildMigrationState` output
- [x] Timestamped backup naming uses `getMonth() + 1` — correct 0-index adjustment
- [x] `warning` field added to `questions` variant only
- [x] Warning emitted only on fresh start when `isReMigration` is true
- [x] Command description, JSDoc, and preconditions updated
- [x] Integration test: `STATE_ALREADY_INITIALIZED` test converted to warning assertion
- [x] Integration test: `.project-old` backup assertions updated to `.project-old-` prefix filter
- [x] Unit test: backup dir assertion updated to `.project-old-` prefix filter
- [x] `sliceSequence` removed from `buildMigrationState` output assertions
- [x] `sliceSequence` retained in Q&A input fixtures (EpicDetailResponse)
- [x] All 1040 tests pass

---

## Contradictions Resolved

- The generalist listed `sliceSequence` in hint text as a minor/intentional note; the TS reviewer flagged it as IMPORTANT cleanup. Merged as IMPORTANT given the project anti-pattern of silently discarding collected user input — requires resolution or explicit documentation.
- The generalist gave 9/10 based on runtime correctness; the TS reviewer gave 5/10 due to compilation failures. The composite score is 5/10 since `tsc --noEmit` failures are blocking regardless of runtime behavior.
