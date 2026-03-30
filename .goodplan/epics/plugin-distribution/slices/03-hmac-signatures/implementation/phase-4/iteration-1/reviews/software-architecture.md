# Software Architecture Review — Phase 4: Verify Commands & Build Defines

## Issues

**[MINOR]** `verify` classified as READ_ONLY_COMMANDS in stateless-commands fitness test
The `READ_ONLY_COMMANDS` set in `tests/fitness/stateless-commands.test.ts` is named to imply read-only semantics, but `verify --fix` mutates `project.json`. The test logic is correct (the set really means "commands exempt from entity-identifying flags"), but the name is misleading. `migrate` — which also mutates without entity flags — lives in a separate `ENTITY_EXEMPT_COMMANDS` set. Either rename the set to `ENTITY_EXEMPT_OR_READONLY_COMMANDS`, or move `verify` to `ENTITY_EXEMPT_COMMANDS`. Low priority since the test behavior is correct.
File: tests/fitness/stateless-commands.test.ts:16
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `verify.ts` imports `getJson` from `../../core/data/tree.js` instead of `../../core/tree.js`
All other commands in `src/commands/` import tree helpers from `../../core/tree.js` directly (e.g., `status.ts`, `epic/show.ts`, `quest/list.ts`). `verify.ts` routes through the re-export barrel at `../../core/data/tree.js`. Both resolve to the same symbols, but the inconsistency breaks the convention established by every other command file. Use `../../core/tree.js` for `getJson` and the type import for `Project`, matching `status.ts`.
File: src/commands/global/verify.ts:24
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Clean implementation that follows established architectural patterns well. The verify command correctly uses `assembleState()` directly (bypassing `loadState()` HMAC verification) as the escape hatch for broken signatures. The `--fix` path validates through `projectSchema.parse()` before writing, preserving INV-005. The INV-001 exception is documented in all three relevant locations (system invariants, epic invariants, data-layer API). The `atomicWrite()` export has appropriate JSDoc warning about limited use. Error handling matches the `state.ts` pattern. Build defines follow the existing `__GOODPLAN_VERSION__` quoting conventions in both `package.json` and `build-plugin.sh`. Tests cover pass, fail, fix, bootstrap, tamper detection, markdown exclusion, and end-to-end signature validation. The two minor issues are convention consistency, not correctness.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
