# Repo, Tooling, & Docs Review: HMAC Signatures Plan (Round 3)

## Issues

**[IMPORTANT] `--define` quoting in `global-setup.ts` is inconsistent with the plan's description for Phase 2 vs Phase 3**
Phase 2 says to add `"--define"` and `"__GP_HMAC_KEY__=\"goodplan-dev-hmac-key\""` as two consecutive array elements to `global-setup.ts` (correct — this is for the compiled binary used by integration tests). Phase 3 says to add `__GP_HMAC_KEY__: JSON.stringify("goodplan-dev-hmac-key")` to `vitest.config.ts`'s `define` map (correct — this is for Vitest's module transform used by unit tests). Both are needed but the plan does not explain why both are required or what breaks if one is omitted. An implementer may assume one covers both, skip one, and have tests pass for the wrong reason (the dev-key fallback in `getHmacKey()` masks the missing define). Add a brief note in Phase 2 or Phase 3 clarifying: `global-setup.ts` define covers the compiled binary (integration tests), `vitest.config.ts` define covers Vitest module transforms (unit tests), and both are required because the dev-key fallback would silently mask a missing define.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `verify` command not namespaced — breaks CLI naming convention**
All existing entity commands use colon-namespaced keys (e.g., `epic:create`, `slice:list`). Global commands are un-namespaced (`init`, `migrate`, `schema`, `state`, `status`). The plan places `verify` as an un-namespaced global command, which is appropriate since it is a global infrastructure concern like `migrate`. However, the plan should explicitly note this is a global command (alongside `init`, `schema`, etc.) to avoid confusion during implementation. The plan says "Register command in `src/commands/main.ts`" but does not show the key name — it should state `verify: verifyCommand` to match the other global command registration pattern.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `build-plugin.sh` define pattern differs from `package.json` pattern — plan correctly addresses this but explanation could be clearer**
The plan correctly identifies that `package.json` uses `'\"'...'\"'` quoting while `build-plugin.sh` uses `\"...\"` quoting, and provides the correct pattern for each. This is good. No issue here, just confirming the plan handles this correctly.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Fitness test file `tests/fitness/state-integrity.test.ts` — test 3 depends on compiled binary but no setup dependency is documented**
Test 3 in Phase 4 ("One representative end-to-end command produces a valid signature") runs the compiled binary. This depends on `global-setup.ts` having already compiled the binary with the `__GP_HMAC_KEY__` define from Phase 2. The dependency is implicit. Add a note that this test depends on the Phase 2 `global-setup.ts` change being in place, and that the binary must be compiled with the HMAC key define for this test to be meaningful (otherwise it falls back to the dev key and the test passes vacuously).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 verification step mentions `gp schema --json | jq` — relies on `jq` being installed**
The verification step says: "Verify `gp schema --json | jq '.commands[] | select(.name == "verify")'` shows the verify command." This relies on `jq` being installed on the developer's machine, which is not a documented project dependency. The plan could use `gp schema --json --query '.commands[] | select(.name == "verify")'` instead, using the built-in jq support via `@michaelhomer/jqjs`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is well-structured from a repo, tooling, and docs perspective. Build script changes correctly match existing patterns, the test infrastructure changes are appropriate (both `global-setup.ts` for integration and `vitest.config.ts` for unit tests), and the INV-001 exception is properly documented. The two IMPORTANT issues are about documentation clarity rather than correctness — the plan does the right things but could be more explicit about why both define locations are needed, and should specify the exact command registration key. To reach 10: resolve the dual-define documentation gap and add the explicit registration key.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
