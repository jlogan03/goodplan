# Holistic Review -- HMAC Signatures Plan (Round 3)

## Issues

**[IMPORTANT] Phase 2: `serializeForHmac` adaptation for PendingWrite content is described but the function signature change is unspecified**
Phase 2 task 1 says to compute the signature "from the actual serialized content that will be written to disk (the `PendingWrite` content strings), not from the in-memory `newState`" and mentions `serializeForHmac()` being "adapted to accept this content." However, `serializeForHmac` was defined in Phase 1 as taking `ProjectState` and calling `serializeStateTree()`. Now Phase 2 says to "adapt" it to accept `PendingWrite` content strings instead. This is a contradictory API: either `serializeForHmac` takes a `ProjectState` (Phase 1 definition) or it takes raw content strings (Phase 2 usage). The plan needs to reconcile this. The simplest approach consistent with the plan's goals: keep `serializeForHmac(state: ProjectState)` as defined in Phase 1 (for use in `gp verify` in Phase 4), and in `commitState()` compute the HMAC by reconstructing the same canonical string that `serializeForHmac` would produce -- gather the `PendingWrite` content for `goodplan.json` (minus `stateSignature`), plus all other JSON/JSONL `PendingWrite` content, run through `deterministicStringify()`, and HMAC that. Alternatively, define a second lower-level function (e.g., `signContent(contentMap: Record<string, string>): string`) used by both `commitState` and `serializeForHmac`. Either way, the two signing paths (write-time via PendingWrite content, verify-time via state tree) must produce identical output for the same data, and the plan must specify how that equivalence is guaranteed.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3: Incremental update path in `loadState()` is not addressed -- only `assembleState()` fallback mentioned**
The plan says to verify HMAC "only on the `assembleState()` fallback path, NOT on cache hits." This is correct for direct cache hits and for the `assembleState()` call. But `loadState()` has a third path: `incrementalUpdate()` (line 85 of `load.ts`), which is triggered when some directories have changed mtimes but the update is handled incrementally without a full `assembleState()`. This path produces a new `ProjectState` from a mix of cached and freshly-read data, and currently does not go through HMAC verification. An attacker modifying a single JSON file would trigger the incremental path (mtime change in that directory), which would succeed without HMAC verification. The plan should specify: verify HMAC on the `incrementalUpdate()` path as well (same logic as the `assembleState()` fallback), or document why incremental updates are trusted (the `incrementalUpdate` function falls back to `assembleState()` on any error, but a successfully-tampered file would not cause an error).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1: Test case 9 (`getHmacKey` returns dev key when `__GP_HMAC_KEY__` is undefined) may not be testable in Vitest**
The plan adds `__GP_HMAC_KEY__: JSON.stringify("goodplan-dev-hmac-key")` to `vitest.config.ts` in Phase 3, which means `__GP_HMAC_KEY__` is always defined during unit tests. Test case 9 in Phase 1 asserts behavior "when `__GP_HMAC_KEY__` is undefined" but the Vitest `define` makes it always defined. The test would need to either: (a) be written before Phase 3's vitest.config change (relying on ordering), (b) mock the `__GP_HMAC_KEY__` global, or (c) test `getHmacKey` indirectly by verifying it returns the expected dev key value regardless. Since Phase 1 runs before Phase 3, the test will work at first but break after Phase 3's vitest.config change if the define replaces the declared global. The plan should note this interaction and specify the test strategy (likely option c: test that `getHmacKey()` returns `"goodplan-dev-hmac-key"` without caring whether it came from the define or the fallback).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: `gp verify --fix` is documented as an INV-001 exception but `gp verify` (read-only) calls `assembleState()` directly -- no INV-001 concern**
The plan correctly identifies `verify --fix` as an INV-001 exception because it writes `goodplan.json` outside `commitState()`. However, the plan task says to "document `gp verify --fix` as a third INV-001 exception" -- the read-only `gp verify` does not need an exception because it only reads (calls `assembleState()` directly, which is standard for read-only commands per the architecture). The task wording is correct but the implementer might be confused about whether `gp verify` (without `--fix`) also needs an exception entry. A clarifying note would help: only `--fix` is an INV-001 exception; plain `gp verify` is a standard read-only command.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: Missing documentation update task for `commands-api.md`**
The plan adds a new `verify` command but does not include a task to update `.goodplan/architecture/commands-api.md` (the CLI command surface documentation). The plan does include updating `invariants.md` for the INV-001 exception, which is good, but the commands API surface doc should also reflect the new command. This is criterion 7 (documentation).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2: No explicit task to update the `data-layer-api.md` architecture doc**
`commitState()` is gaining significant new behavior (HMAC computation, signature embedding, PendingWrite manipulation). The Data Layer API documentation at `.goodplan/architecture/data-layer-api.md` should be updated to reflect that `commitState()` now computes and embeds state signatures. Similarly, `loadState()` gains verification behavior in Phase 3. These are public API changes to documented subsystems.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

This is a thorough, well-structured plan. All round-2 IMPORTANT issues have been resolved with specific, concrete guidance. The phase ordering is logical (core module, write integration, read integration, commands/build). Success criteria are clear and falsifiable with proper before/after checks. Verification steps are runnable. The plan correctly handles the INV-001 exception, uses the conditional spread pattern for `exactOptionalPropertyTypes`, includes fitness tests, and addresses build defines for all three compilation contexts (package.json, build-plugin.sh, global-setup.ts, vitest.config.ts).

The one substantive issue is the `serializeForHmac` API mismatch between Phase 1 (takes `ProjectState`) and Phase 2 (needs to work with `PendingWrite` content strings). The incremental update path gap is also worth addressing. Both are solvable with a few sentences of clarification. The remaining minors are documentation completeness items.

To reach 10: resolve the `serializeForHmac` dual-use API question and address the incremental update verification gap.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
