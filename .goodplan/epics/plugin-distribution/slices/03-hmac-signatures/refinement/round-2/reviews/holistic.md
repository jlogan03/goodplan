# Holistic Review -- HMAC Signatures Plan (Round 2)

## Issues

**[IMPORTANT] Phase 2: `commitState()` signature injection point needs more specificity on how to update the PendingWrite for goodplan.json**
The plan correctly says to compute the signature after `diffTree()` collects `PendingWrite[]` but before flushing. However, the plan says to "Update the corresponding PendingWrite for `goodplan.json` with the signed content (re-serialize with the embedded signature)." This is correct in intent but underspecified: `diffTree` only adds a `PendingWrite` for `goodplan.json` when the content has actually changed (the `processJsonEntry` function returns early with `debug("unchanged json")` if old and new JSON are identical). If the only change to `goodplan.json` is the new `stateSignature` (e.g., a mutation that only touches a child entity's JSON), `diffTree` may not have produced a `PendingWrite` for `goodplan.json` at all.

The plan should specify: after computing the signature, inject `stateSignature` into `newState`'s project node, then *always* ensure a `PendingWrite` for `goodplan.json` exists in the `jsonWrites` array -- either by updating an existing entry or creating a new one if `diffTree` skipped it. Alternatively, the signature injection could happen *before* `diffTree` is called, so `diffTree` naturally picks up the change.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3: `gp status` and `gp state` use `assembleState()` directly -- plan task is vague on resolution**
The plan says "Ensure commands that call `assembleState()` directly (like `status`) are addressed: either switch them to use `loadState()` or add verification separately." This leaves the implementer to make a design decision mid-implementation. Codebase exploration confirms both `status` (line 29 of `src/commands/global/status.ts`) and `state` (line 62 of `src/commands/global/state.ts`) call `assembleState()` directly. The `status` command has an explicit comment explaining why it uses `assembleState()` ("handles fresh/zero-state projects gracefully").

The plan should make a definitive choice. The most consistent option: add HMAC verification to `loadState()` only, and accept that `status`/`state` bypass it. These are read-only diagnostic commands, and `gp verify` exists as the explicit integrity check tool. Alternatively, if verification on read-only commands is required, add a shared `verifyIfSigned(state)` helper called after both `loadState()` and `assembleState()` in those commands. Either way, the plan must be explicit.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2: `__GP_HMAC_KEY__` define in `tests/global-setup.ts` needs correct quoting to match existing pattern**
The plan says to add `--define __GP_HMAC_KEY__` to `tests/global-setup.ts`'s `execFileSync` args array. The existing version define passes the key and value as a single `--define` arg element followed by the value as the next element: `"--define"` then `` `__GOODPLAN_VERSION__="${pkg.version}"` ``. But looking at the actual code (line 27), the define is passed as a *single combined argument*: `__GOODPLAN_VERSION__="${pkg.version}"` (key=value in one string after `--define`). The HMAC key define must follow this exact same array element pattern. The plan should specify the exact array element to add, e.g.: `"--define"`, `"__GP_HMAC_KEY__=\"goodplan-dev-hmac-key\""` as two consecutive elements in the args array.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1: `serializeForHmac` description says "strips `stateSignature` from the result" but does not specify how**
After calling `serializeStateTree(state, { inline: false })`, the result is a nested `Record<string, unknown>`. The `stateSignature` field lives inside the `project.json` node, which after serialization is at `result["project.json"].stateSignature` (since `serializeStateTree` unwraps `JsonEntry` to just `T`). The plan should specify whether to: (a) delete the property from the serialized result before stringify, or (b) deep-clone then delete, or (c) pass the original state with `stateSignature` removed and then serialize. Option (a) is simplest -- mutate the serialized result in-place since it is a freshly created object from `serializeStateTree`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3: The vitest.config.ts `define` task is correctly identified but the value format should be explicit**
The plan says to add `__GP_HMAC_KEY__: JSON.stringify("goodplan-dev-hmac-key")` to `vitest.config.ts`. This is the correct pattern -- it matches the existing `__GOODPLAN_VERSION__: JSON.stringify(pkg.version)` format. Good. No issue here, just confirming this is well-specified.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: Fitness test item 3 says "one representative end-to-end command" but should specify which and how**
The plan says to test "one representative end-to-end command (e.g., `gp epic:create`) produces a valid signature (integration-level)." This is appropriate scope. The existing fitness tests (e.g., `mutation-through-state-machine.test.ts`) use the compiled binary against temp project directories. The plan should specify that this test uses the compiled binary path from `global-setup.ts` and creates its own fixture, consistent with existing fitness test patterns.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: `gp verify` human output mentions colors but does not specify how**
The plan says: "green 'State integrity: pass' or red 'State integrity: fail'." The codebase uses `picocolors` (`pc.green()`, `pc.red()`, etc.) for terminal colors. The plan should reference `pc.green` and `pc.red` for clarity, though an implementer would likely discover this from context.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is dramatically improved from round 1. All six IMPORTANT issues from the previous round have been addressed: the double-write is now a single-write with pre-flush signature injection; read-path verification is placed in `loadState()` with bootstrap skip; `gp verify` uses `assembleState()` directly to bypass verification; `serializeForHmac` reuses `serializeStateTree`; cache invalidation is left to existing mtime-based detection; and `DATA_INTEGRITY_CHECK_FAILED` is specified as the error code.

The remaining issues are about implementation specificity rather than architectural correctness. The `PendingWrite` update mechanism in Phase 2 needs more detail to handle the case where `diffTree` did not produce a write for `goodplan.json`. The `status`/`state` command handling in Phase 3 needs a definitive decision rather than "either...or." These are solvable with a sentence or two of additional specification.

To reach 9+: (1) Specify exact mechanism for ensuring `goodplan.json` PendingWrite exists after signature computation; (2) Make a definitive choice on whether `status`/`state` verify signatures or not, with rationale.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
