# TUI and CLI Review (Round 4) — HMAC Signatures Plan

## Issues

**[IMPORTANT]** `gp verify` error output asymmetry between JSON and human modes

Phase 4 task 1 says: "On fail: throws `DATA_INTEGRITY_CHECK_FAILED` via `GoodplanError`, which `outputError` formats per INV-007." Throwing a `GoodplanError` in a command's `run()` function means the error propagates to the top-level handler in the CLI entry point. Looking at the existing command patterns (`init.ts`, `status.ts`), some commands throw and let the top-level handler catch, while `state.ts` catches explicitly because it always outputs JSON. The `verify` command should catch its own errors like `state.ts` does, because:

1. In `--json` mode, INV-007 requires `{ "error": { "code": "DATA_INTEGRITY_CHECK_FAILED", "message": "..." } }` on stdout. The top-level handler may route JSON errors to stdout, but this is implicit and depends on how the entry point inspects `--json`.
2. In human mode, the error message should include the actionable fix (`gp verify --fix`). The top-level handler's generic `outputError` will print the message but the plan should confirm the thrown `GoodplanError`'s message string contains the fix hint.

The plan specifies the message string (`"State integrity check failed. Run 'gp verify --fix' to repair."`) and the error flow (throw -> `outputError`), which is sufficient. However, the plan should explicitly note whether `verify` catches its own errors (like `state.ts`) or delegates to the top-level handler (like `init.ts`). Both patterns exist in the codebase. Given that `verify --fix` has a success path that uses `output()` and a fail path on the read-only check, explicit catch-and-format within the command would be more consistent and testable.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `gp verify` human-readable output on success could include the signature for debugging

Phase 4 specifies human output on pass as: `green "State integrity: pass"`. For a verification/debugging command, including the first 8 characters of the signature hex (like git short hashes) would help users confirm which state was verified, especially when troubleshooting. E.g., `"State integrity: pass (sig: a1b2c3d4)"`. This is optional but aligns with the `--verbose` global flag — the full signature could be shown when `--verbose` is passed. Not blocking, just a UX consideration.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 `status.ts` switch from `assembleState()` to `loadState()` — help text unchanged

Phase 3 task 2 switches `status.ts` to call `loadState()` instead of `assembleState()`. The current `status.ts` JSDoc comment (line 22-25) says "Uses assembleState() (not loadState) — deliberately chosen because it handles fresh/zero-state projects gracefully." This comment would become stale after the switch. The plan should include updating this comment to explain the new behavior and why the switch is safe (loadState handles zero-state via ZERO_STATE return). Minor, but stale architectural comments in a codebase that relies on inline rationale can mislead future implementers.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Expected Behavior for `gp schema` verification uses `--query` flag syntax

Phase 4 Expected Behavior includes: `gp schema --json --query '.commands[] | select(.name == "verify")'`. This is good for INV-006 verification. However, the `--query` flag uses jqjs internally, and the `.commands[]` path depends on the actual schema output structure. If the schema output uses a different key (e.g., `subCommands`), this assertion would silently return null (exit 0, prints `null`) rather than failing. The plan should note what the expected return shape is (e.g., an object with `name: "verify"` and an `args` property containing the `--fix` flag definition) so the implementer can write a meaningful assertion, not just "shows the verify command."

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 4 addresses all IMPORTANT issues from round 3. The `--fix` flag now has an explicit citty args definition with proper type, description, and default. The `serializeForHmac` API is consistent across Phase 1 and Phase 2 (always accepts `ProjectState`). The `gp schema` verification is now in the Expected Behavior checklist. The `atomicWrite` export specifies the `relativePath` parameter value. The cache staleness note is clear. The one remaining IMPORTANT item (error handling pattern choice) is about explicitness rather than correctness — the plan works either way but should state which pattern it follows. To reach 10: resolve the error handling pattern choice explicitly.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
