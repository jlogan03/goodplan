# Software Architecture Review — Phase 4: Semver Compatibility (Iteration 1)

## Issues

**[MINOR]** `checkCompatibility` same-minor patch comparison returns "compatible" without comment
The `checkCompatibility` function treats `cli=1.0.0 / data=1.0.5` as "compatible" (same major, CLI minor not less than data minor). This is correct per the spec (patches are bug fixes only), but it means a CLI with an older patch than the data sees no signal at all. This is fine for now since patches carry no data model changes, but worth noting that if patch-level data changes ever become relevant, this logic would need revision. No action needed — just documenting the design choice.
File: src/util/semver.ts:67
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `VERSION` import in RPC layer creates a coupling to application-level module
The `begin.ts`, `submit.ts`, and `complete.ts` files now import `VERSION` from `../../version.js`. The `version.ts` module has I/O (reads `package.json` as fallback) which technically means the RPC layer now transitively depends on filesystem reads for version resolution. In practice this is benign — the fallback is only active in dev/test mode, and in compiled builds `VERSION` is a literal string constant. The plan explicitly called for this pattern. However, an alternative would be to pass `cliVersion` as a parameter to the RPC functions rather than importing `VERSION` directly — this would keep the RPC layer pure of application-level concerns and improve testability (no need to mock `VERSION`). This is a minor observation, not blocking.
File: src/core/rpc/begin.ts:24
Resolution: DIRECTLY_ACTIONABLE

No other issues found.

## Score: 9/10

Strong implementation that follows the plan precisely. Module boundaries are well-maintained: `semver.ts` in `util/` is pure logic with no I/O, `version-stamp.ts` lives correctly in the RPC layer where version stamping is a policy decision, and the INV-001 exception is thoroughly documented in both code comments and the module docstring. The `checkVersionCompatibility` function in `src/index.ts` correctly uses the try-catch on `DATA_NO_PROJECT` pattern rather than a fragile skip-list, which is architecturally sound. The error code placement under `VALIDATION_*` is correct — it maps to exit code 2 automatically. The `bumpDataVersionIfNeeded` helper avoids triple-implementing version stamp logic across begin/submit/complete. Test boundaries align with module boundaries (unit tests for semver logic, unit tests for version-stamp logic, integration tests for the full compat check path). The one point deducted is for the direct `VERSION` import coupling in the RPC layer — passing it as a parameter would be cleaner, but this is a minor concern that the plan explicitly chose.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
