# Software Architecture Review (Round 2): Improve Test Coverage and Quality

## Issues

**[MINOR]** Phase 4 structured-errors fitness function conflates binary-testable and import-testable approaches

The structured-errors fitness function task asks to "spawn the compiled binary with inputs that trigger each error and verify: (a) correct exit code, (b) stdout contains valid JSON with `{ error: { code, message } }` shape." This is appropriate for an integration-style fitness function. However, the task also says to "read `src/util/errors.ts` to enumerate all GoodplanError codes" and "test that each error code maps to a documented exit code (1, 2, or 3)." The static enumeration check and the binary-spawning check are two different testing strategies mixed in one task. The static enumeration part (verifying all error codes have a documented exit code mapping) could be done via import analysis without spawning the binary. This is not a blocking issue -- the implementer can resolve the mix -- but the task would be clearer if it distinguished: (1) static verification that all error codes map to exit codes, and (2) dynamic verification that representative errors produce correct exit codes and JSON shapes when the binary runs.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 and Phase 3 have overlapping root causes but no explicit dependency note

Phase 1 diagnoses integration test failures, and the Phase 1 task now correctly notes that fixture schema drift (e.g., missing `tasks/` directory) may be the root cause, which Phase 3 also addresses. However, there is no explicit guidance on what to do if Phase 1 discovers the root cause IS the missing `tasks/overview.json` in fixtures. Should the implementer fix it in Phase 1 (making Phase 3's fixture task partially redundant) or note it and defer to Phase 3? A brief sentence like "If fixture drift is the root cause, fix minimally in Phase 1 (enough to pass tests) and let Phase 3 do the comprehensive fixture update" would prevent confusion.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All 5 issues from round 1 have been addressed correctly. The version-stamp exception was removed from the INV-001 fitness function scope. The `_overview.md` update task was added to Phase 4. The helpers.test.ts scope now explicitly documents what is and isn't covered. The event count fix now uses a dynamic derivation approach. The Phase 1 diagnosis guidance correctly defers to `global-setup.ts` and points toward fixture drift. The two remaining MINOR issues are clarity improvements, not correctness problems. The plan is architecturally sound: test boundaries align with module boundaries, the fitness functions guard the correct invariants with correct exception lists, and no production code is modified.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
