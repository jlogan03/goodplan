# TypeScript Review — Phase 5: Refactor Init & Wire Full Stack

## Issues

**[IMPORTANT]** Unsafe `as GoodplanErrorCode` cast on StateError.code in rpc/init.ts
`result.code` is typed as `string` (from `StateError.code`), and it is cast to `GoodplanErrorCode` with `as`. If the state machine ever returns an error code that is not a member of `GoodplanErrorCode`, this cast silently narrows, and the error object will carry an invalid code at runtime. The state machine currently only returns `STATE_ALREADY_INITIALIZED` and `STATE_INVALID_TRANSITION`, which are valid, but this is a type-safety hole that will grow as more transitions are added.
Fix: Either (1) type `StateError.code` as `GoodplanErrorCode` in `state-events.ts` (tight coupling but safe), or (2) validate the code at runtime before constructing `GoodplanError` (e.g., check against a Set of valid codes, throw `INTERNAL_ERROR` if unknown). Option 1 is simpler and appropriate since both types live in this repo.
File: src/core/rpc/init.ts:38
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Fallback values in rpcInit mask potential bugs
`project?.name ?? name` and `project?.version ?? "1.0.0"` on lines 50-51 silently hide cases where the state machine produced a tree without `project.json`. After `commitState` succeeds, `getJson<Project>(result, "project.json")` returning `undefined` would indicate a genuine bug in the transition handler. An assertion or throw would surface the problem earlier.
File: src/core/rpc/init.ts:50
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test file name `json.test.ts` no longer matches its contents
After removing `readEntity`/`writeEntity` tests, `tests/unit/data/json.test.ts` only tests `deterministicStringify` which lives in `src/util/json.ts`. The test file should be moved or renamed to `tests/unit/util/json.test.ts` to match the source location. This avoids confusion about what module the test covers and whether `src/core/data/json.ts` still exists.
File: tests/unit/data/json.test.ts:1
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Clean, well-structured refactor. Type check passes, removed functions have no remaining callers, invariants are respected (mutations go through the state machine, schema validation on read/write via assembleState/commitState, deterministic JSON). The `as GoodplanErrorCode` cast is the only substantive type-safety concern; the remaining items are minor hygiene. Fixing the cast brings this to 10.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
