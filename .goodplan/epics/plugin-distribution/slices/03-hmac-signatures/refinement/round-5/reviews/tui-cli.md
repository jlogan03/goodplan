# TUI and CLI Review (Round 5) — HMAC Signatures Plan

## Issues

**[MINOR]** `gp verify --fix` human output lacks confirmation of what changed

Phase 4 task 1.2 specifies human output for `--fix` as `"State signature recomputed."`. This is adequate but does not give the user confidence about the repair. For parity with the pass case (which now shows `(sig: a1b2c3d4)` per round 4 feedback), the `--fix` success message should also include the first 8 hex chars of the new signature. E.g., `"State signature recomputed (sig: f9e8d7c6)."` This lets the user confirm the fix took effect and provides a value they can compare against subsequent `gp verify` output. Trivial to add since `signStateTree()` already returns the full hex string.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `gp verify` missing `--help` description for state preconditions

The commands-api.md contract (Help Text Quality section) states: "help text should include: the expected stdin payload shape (if any), the state preconditions for the command, and the resulting state transition." The citty `meta.description` for the `verify` command is not specified in the plan. Looking at how `state.ts` sets its description (`"Expose the full .goodplan/ state tree as JSON..."`), the `verify` command should have a description noting it is read-only, works on any initialized project, and that `--fix` recomputes the embedded signature. The plan specifies the `args` definition (with `--fix` having a description) but omits the top-level `meta.description`. This is easy to infer from context but worth making explicit since INV-006 means the description propagates to `gp schema` output consumed by LLMs.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 5 plan is in strong shape for CLI/TUI concerns. All prior IMPORTANT and CRITICAL issues have been resolved. The error handling pattern for `verify` is now explicitly stated (catches its own errors like `state.ts`). The human-readable success output includes the short signature hash. The `status.ts` comment update is called out. The `gp schema` expected behavior includes the expected return shape. The `--fix` flag has a proper citty args definition. The two remaining MINOR items are polish: adding the signature hash to `--fix` output for consistency, and ensuring the command's `meta.description` is specified. Neither blocks implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
