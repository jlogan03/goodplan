# TUI and CLI Review — HMAC Signatures Plan

## Issues

**[CRITICAL]** `gp verify` error on tampering should use exit code 1, but the plan's error for read-path tampering (Phase 3) uses a `GoodplanError` with no specified error code — this needs a new error code in the `DATA_*` namespace

The plan says Phase 3's read-path mismatch throws "a structured error with message ... and exit code 1." But per INV-007 and `exitCodeForError()` in `src/util/errors.ts`, exit codes are derived from the error code prefix: `DATA_*` -> 1, `VALIDATION_*` -> 2, `STATE_*` -> 3. The plan needs to specify the exact `GoodplanErrorCode` (e.g., `DATA_INTEGRITY_CHECK_FAILED`) and add it to both the `DataErrorCode` union and `ALL_ERROR_CODES` array in `src/util/errors.ts`. Without this, the implementation will either use an existing wrong code or introduce a code that isn't in the canonical list, breaking the fitness test for error code completeness.

Phase 4's `gp verify` command also outputs `{ "status": "fail" }` with exit 1 on tampering. This is a different output shape from the standard `{ error: { code, message } }` pattern (INV-007). The plan should clarify whether `gp verify` uses the standard error output shape or a custom status shape — and if custom, justify the deviation. Using the standard error shape for failures would be more consistent and wouldn't require special handling by callers.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `gp verify` command naming is inconsistent with codebase convention — all global commands are top-level verbs, but `--fix` is a behavioral flag that changes the command from read-only to mutation

The plan registers `verify` as a global command with a `--fix` flag that switches behavior from read-only (assemble + check) to a mutation (recompute + write). This is acceptable CLI design, but the plan should note that `verify --fix` is a mutation that writes `goodplan.json` without going through the RPC layer or state machine. This is a documented exception similar to how `migrate` bypasses `reduce()` (see INV-001 known exceptions). The plan should explicitly call out this exception and note it needs to be added to the invariants doc.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing `--json` and `--quiet` flag handling details for `gp verify`

Phase 4 specifies `--json` output shapes (`{ "status": "pass" }`, `{ "status": "fail", "message": "..." }`, `{ "status": "fixed" }`), but doesn't mention the `--quiet` or `--query` flags. All commands inherit `globalArgs` which includes `--json`, `--quiet`, `--query`, `--verbose`, and `--force`. The plan should specify:
1. `--quiet`: suppress all output, rely on exit code only (standard behavior)
2. `--query`: apply jq filter to the status object (standard behavior via `output()`)
3. `--force`: not applicable (no concurrent modification risk for verify)

Using the shared `output()` function handles these automatically, but the plan should confirm that's the intent (rather than custom stdout writes like `gp state` does).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 verification steps don't actually run `gp verify` — they grep for the command and check JSON output, but never test human-readable output

The plan's Phase 4 Expected Behavior and Verification sections test `gp verify --json` output, but the human-readable output (`green "pass"` or `red "fail"`) is only described in the Tasks section, never verified. Add verification steps for:
- `gp verify` (no `--json`) in a valid project — shows green "pass" text on stdout
- `gp verify` (no `--json`) in a tampered project — shows red "fail" text on stderr (per convention: errors to stderr in human mode)
- `gp verify --fix` (no `--json`) — shows "State signature recomputed." on stdout

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 bootstrap auto-write during read path needs the `--force` global flag consideration

Phase 3 says: "If absent (bootstrap): compute signature via `signStateTree()`, embed in project node, write `goodplan.json` with signature." This write happens inside `loadState()` / `assembleState()`, which is the read path. Writing during reads is architecturally unusual. The plan should address:
1. How does this interact with concurrent modification detection? If another process is mid-write, the bootstrap write to `goodplan.json` could conflict.
2. Should bootstrap use `commitState()` for the write (which handles atomic writes and cache updates) or do a raw atomic write? Using `commitState()` would require both old and new state, which complicates the read path.
3. Consider making bootstrap a separate explicit step in `gp verify --fix` rather than implicit on read, to avoid surprising side effects during read-only operations.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 build define pattern doesn't match the existing `package.json` quoting convention

The existing build command uses:
```
--define __GOODPLAN_VERSION__='"'$(node -p 'require("./package.json").version')'"'
```
The plan proposes:
```
--define "__GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-hmac-key}\""
```
These use different shell quoting strategies. While both work, they should use a consistent pattern for maintainability. The plan should align with the existing quoting convention or note why a different approach is needed.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `build-plugin.sh` already has the `--define` for `__GOODPLAN_VERSION__` but the plan doesn't mention adding `__GP_HMAC_KEY__` to the same `bun build` invocation — it says "same pattern" but the script's `bun build` call (line 23-26) would need a second `--define` flag appended

The plan says to add `--define __GP_HMAC_KEY__` to `scripts/build-plugin.sh` but doesn't specify where in the existing multi-line `bun build` command it goes. This is minor but worth noting for implementation clarity — it should be appended as another `--define` argument on the same `bun build` invocation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 task to "Update `tests/global-setup.ts` to include `--define __GP_HMAC_KEY__`" — this needs the dev key value explicitly

The plan says to add `--define __GP_HMAC_KEY__` to `tests/global-setup.ts` but doesn't specify the value. Looking at the current `global-setup.ts`, it passes `--define` as a separate array element. The dev key constant (`"goodplan-dev-hmac-key"`) should be explicitly stated here, and the format should match: `"--define"`, `'__GP_HMAC_KEY__="goodplan-dev-hmac-key"'` as separate array elements.

However, there may be a subtlety: if `getHmacKey()` already falls back to the dev key when `__GP_HMAC_KEY__` is undefined (as described in Phase 1), then the test binary doesn't strictly need the `--define`. The plan should clarify whether the test binary should use the injected key or the fallback — and if the fallback is sufficient, this task can be removed.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has solid core design — the HMAC module structure, serialization approach, and phased rollout are well thought out. The critical gap is the error code and output shape inconsistency with INV-007 (the standard error response convention). The bootstrap-during-read concern in Phase 3 is architecturally significant — writing during reads is unusual in this codebase and deserves explicit justification or an alternative approach. To reach 9+: specify the exact `GoodplanErrorCode`, resolve whether `gp verify` uses standard or custom error shapes, address the bootstrap write-during-read concern, and add human-readable output verification steps.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
