# TypeScript and JavaScript Review — Phase 3: Read Path Integration

## Issues

**[IMPORTANT]** Test calls `loadState()` twice on tampered state, masking assertion gaps
The tampered-state test at `tests/unit/data/load.test.ts:236-259` calls `loadState()` once inside `expect().toThrow()` (line 251) and then again inside a manual try-catch (lines 252-259). The second call is redundant and wasteful (it re-reads from disk), but more importantly: if the first `expect().toThrow()` passes but the second call somehow does NOT throw (e.g., due to a race or caching side-effect), the try-catch silently succeeds and the `expect(gpErr.code)` / `expect(gpErr.message)` assertions never run. Use Vitest's `expect().toThrowError()` with a matcher, or a single try-catch with a `fail()` fallback if the catch block isn't reached.
File: tests/unit/data/load.test.ts:251
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `serializeExcludingMarkdown` returns `undefined` for unreachable markdown case
At `hmac.ts:74`, the `"markdown"` case returns `undefined`. While the comment correctly notes this is unreachable (filtered in the directory case), returning `undefined` means a top-level markdown entry passed directly to `serializeExcludingMarkdown` would produce `undefined` which `deterministicStringify` would silently drop. Since `ProjectState` is always a `DirectoryEntry` this is purely theoretical, but throwing (consistent with the `default` case) would be more defensive.
File: src/core/data/hmac.ts:74
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Duplicated HMAC verification logic between `load.ts` and `state.ts`
The HMAC check pattern (get project, check signature presence, call `verifyStateTree`, throw `DATA_INTEGRITY_CHECK_FAILED`) is implemented twice: once as `verifyHmac()` in `load.ts` and once inline in `state.ts:68-77`. The `state.ts` version could call `verifyHmac` if it were exported, reducing duplication. However, `state.ts` intentionally uses `assembleState()` not `loadState()`, so the separation has architectural justification. Flagging as minor since it's only two occurrences and the inline version is clearly commented.
File: src/commands/global/state.ts:67
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
Strong implementation. Type safety is excellent throughout — proper use of `GoodplanError` with typed error codes, correct `exactOptionalPropertyTypes` handling (checking `!== undefined` rather than falsy), exhaustive switch with `never` guard, and proper generic usage on `getJson<Project>()`. The `serializeExcludingMarkdown` function is clean, recursive, and handles all `StateEntry` variants. The read-path integration correctly hooks verification into all non-cache-hit paths while intentionally skipping the mtime-cache-hit path (which is trusted since it was written by `commitState`). The fixture signature updates confirm the serialization change propagated correctly. The only real improvement opportunity is the test structure issue.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
