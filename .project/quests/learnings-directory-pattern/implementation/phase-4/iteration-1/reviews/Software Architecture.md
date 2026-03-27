## Issues

**[IMPORTANT]** LearningSummary.file should be tightened to required now that legacy entries are gone
The `LearningSummary` interface in `src/core/context/types.ts` still has `file?: string` (optional) with a JSDoc comment referencing "legacy entries (inline detail)." Now that Phase 4 has tightened `learningEntrySchema` to always require `file`, no legacy entries can exist in the system. The optional field and its legacy-referencing comment are stale. Making `file` required on `LearningSummary` would:
1. Eliminate the need for `"file" in learning` checks by consumers (simpler API).
2. Keep the context types consistent with the underlying schema.
3. Remove the conditional spread pattern that was only needed for `exactOptionalPropertyTypes` compatibility with the union type.
The `collectLearnings` projection in `src/core/context/learnings.ts` already unconditionally assigns `file: entry.file` (line 68), confirming it always has a value.
File: src/core/context/types.ts:35
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Migration JSONL writes bypass deterministic key ordering (INV-002)
In `migrateLearnings`, JSONL entries are written via `JSON.stringify(e)` (lines ~900-901 of migrate.ts) rather than through `commitState()` or `deterministicStringify()`. INV-002 requires all JSON/JSONL writes to use deterministic key ordering for git merge friendliness. While migration output is typically a one-time artifact, the JSONL could later be read and diffed. The `deterministicStringify` utility is already imported in the file.
File: src/core/rpc/migrate.ts:900
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `convertInlineDetailEntries` uses `unknown[]` input/output — loses type safety
The function `convertInlineDetailEntries` accepts and returns `unknown[]`, relying on duck-typing (`"detail" in entry`, `"file" in entry`) to distinguish formats. Now that the legacy schema is removed, this function only needs to handle pre-migration data during the migration itself. The loose typing is acceptable for a migration-only code path, but the `as Record<string, unknown>` cast and string field checks could be replaced with a local migration-only interface for clarity.
File: src/core/rpc/migrate.ts:740
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
Clean implementation that completes the migration story well. The schema tightening, legacy code removal, and new migration logic all align with the plan. The one IMPORTANT issue (stale optional `file` on `LearningSummary`) is a straightforward follow-through from tightening the underlying schema. Module boundaries are respected: migration logic stays in `migrate.ts`, schema changes in `learning.ts`, and the RPC/context layers are updated consistently. The test fixture is well-constructed with realistic data, and the integration tests cover the key scenarios (first migration, re-migration idempotency, `completion/learnings.md` preservation). All 1074 tests pass including all fitness functions.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
