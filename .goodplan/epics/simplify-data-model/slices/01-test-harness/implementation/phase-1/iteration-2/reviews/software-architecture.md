# Software Architecture Review — Phase 1: Shared Utilities Foundation (Iteration 2)

## Previous Issues Status

All 3 IMPORTANT and 4 MINOR issues from iteration 1 have been addressed:

1. **[FIXED]** Module-level transcript state — `resetTranscriptState()` now exported (line 267), used in tests for isolation between describe blocks.
2. **[FIXED]** `createAskUserHandler` re-instantiation — hoisted outside per-tool-call path in `runSkillSession` (lines 397-400).
3. **[FIXED]** Cost tracker not exposed — `runSkillSession` now returns `SkillSessionResult` with `totalCost` field (line 380), cost tracker accumulates correctly via `costTracker.total()` (line 460).
4. **[FIXED]** Hardcoded binary path — `resolveDefaultGpBin()` (lines 25-57) dynamically scans plugin cache, detects arch/platform, falls back gracefully.
5. **[FIXED]** `createMinimalFixture` bypassing `gp()` — now uses `gp()` helper with `stdin` option for `epic:create` (line 539) and `slice:create` (line 550).
6. **[ACKNOWLEDGED]** `.project/` legacy path — intentionally excluded from `checkViolation`, test explicitly asserts this. Noted as a Phase 4 concern.
7. **[ACKNOWLEDGED]** `verifyEntityStatus` flag pattern — low risk at Experimental maturity.

## Issues

**[MINOR]** `resetTranscriptState` sets `exitHandlerRegistered = false` but does not remove the registered `process.on("exit")` handler

`resetTranscriptState()` (line 267-269) clears the buffer and resets the flag, but the original exit handler remains registered on `process`. Calling `resetTranscriptState()` followed by new `writeTranscriptEntry()` calls will register a second exit handler. In practice this is harmless for test scenarios (the old handler flushes an empty map, the new handler flushes the new entries), but it does leak handlers. Acceptable at Experimental maturity — not blocking.

File: tools/dogfood/utils.ts:268
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `resolveDefaultGpBin` uses `require("node:fs")` instead of the already-imported `fs` functions

Line 34 uses `require("node:fs")` to get `readdirSync` and `statSync`, but the file already imports `mkdirSync`, `writeFileSync`, `appendFileSync` from `"node:fs"` at line 11. The dynamic require is presumably to isolate the resolution logic, but since the module already depends on `node:fs`, adding `readdirSync` and `statSync` to the top-level import would be cleaner and avoid the runtime `require()` call.

File: tools/dogfood/utils.ts:34
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All iteration 1 issues have been correctly resolved. The module boundaries remain clean — CLI helpers, violation detection, transcript management, session runner, and fixture creation each serve a single purpose with narrow public APIs. The `SkillSessionResult` return type properly surfaces accumulated cost. The dynamic binary resolution is a meaningful improvement over the hardcoded path. The two remaining MINOR items are cosmetic and do not affect correctness or architectural quality.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
