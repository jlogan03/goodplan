# Software Architecture Review — HMAC Signatures Plan (Round 2)

## Issues

**[IMPORTANT]** Phase 3: `status` and `state` commands call `assembleState()` directly — plan says "ensure commands that call assembleState() directly are addressed" but provides no concrete resolution

Phase 3 task list includes: "Ensure commands that call `assembleState()` directly (like `status`) are addressed: either switch them to use `loadState()` or add verification separately." This is still ambiguous. The codebase shows three commands calling `assembleState()` directly: `status.ts`, `state.ts`, and `init.ts`. The plan acknowledges the problem but defers the design decision to the implementer. For `init.ts` this is moot (init creates a new project, no signature to verify). For `status` and `state`, the choice matters:

- Switching to `loadState()` changes their behavior (they'd use cached state instead of always reading fresh). The `status` command comment explicitly says "deliberately chosen because it handles fresh/zero-state projects gracefully." `loadState()` also handles zero state (returns `ZERO_STATE` when dir missing), so the switch may be safe, but the plan should make this call.
- Adding verification separately means duplicating the verification call in each command, which is fragile.

The recommended approach: switch `status` and `state` to use `loadState()` (which now includes HMAC verification), since `loadState()` already handles missing-dir and zero-state cases. The plan should state this explicitly rather than leaving it as an open question for the implementer.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2: The plan's write-path integration modifies `newState` mid-commit, which introduces a subtle contract violation with the state cache

The plan says to compute the signature, inject `stateSignature` into `newState`, update the corresponding `PendingWrite` for `goodplan.json`, then flush all writes. After flushing, `writeStateCache(projectDir, newState)` is called with the signature-bearing `newState`. This means the state cache contains `stateSignature` in the project node. On the next `loadState()` cache hit, the state returned includes `stateSignature`. Phase 3's verification then verifies it. This all works.

However, the plan says to inject `stateSignature` "into the `goodplan.json` entry in `newState`" — this requires mutating the `newState` tree between `diffTree()` and the write flush. The `newState` passed to `commitState()` is produced by the state machine and is treated as the source of truth by the RPC layer. Mutating it in-place inside `commitState()` means the RPC layer's reference now contains `stateSignature` too, which could leak into `nextCommands` computation or other post-commit logic that inspects `newState`. The plan should clarify: either (a) `commitState()` creates a shallow clone of the project node with `stateSignature` injected (immutable approach, safer), or (b) document that this is intentional and RPC-layer code must tolerate the injected field. Given the codebase's immutable tree patterns (`setEntry()`, spread copies in `setDirRecursive()`), option (a) is the architectural fit.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1: `serializeForHmac` strips `stateSignature` from "the result" — needs precision about where and how

The plan says: call `serializeStateTree(state, { inline: false })`, strip `stateSignature` from the result, then run through `deterministicStringify()`. The `serializeStateTree` result is a `Record<string, unknown>` where the top-level key `"project.json"` maps to the project object (which contains `stateSignature`). Stripping `stateSignature` requires navigating into `result["project.json"]` (not the top level) and removing it. Additionally, the result of `serializeStateTree` is a nested directory structure — the project.json content lives under the path that corresponds to the tree structure, not at the root. The plan should specify: "from the serialized result, navigate to the project.json node and delete the `stateSignature` property before stringifying." This prevents an implementer from accidentally stripping at the wrong level.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4: `gp verify --fix` writes `goodplan.json` atomically but doesn't update the state cache

The plan says `gp verify --fix` "recomputes signature, embeds in goodplan.json, writes atomically." But after writing `goodplan.json`, the `.state-cache.json` still contains the old state (without the new signature). The next `loadState()` will detect the mtime change on the root directory and do an incremental update, which will re-read `goodplan.json`. This works but is indirect. The plan should either: (a) explicitly note that cache staleness after `verify --fix` is expected and handled by mtime invalidation (confirming this is intentional), or (b) have `verify --fix` also invalidate/delete the cache. Option (a) is simpler and consistent with how external modifications are handled generally.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has substantially improved since round 1. All CRITICAL issues from round 1 are resolved: the double-write is fixed (compute before flush), the read-path placement is definitive (`loadState()` after obtaining state), the Node.js crypto issue is fixed (Bun-native API), and the error code is specified. Most IMPORTANT issues are also resolved: bootstrap no longer writes on read, `serializeForHmac` reuses `serializeStateTree`, cache invalidation is left unchanged, and the INV-001 exception is documented. The remaining issues are about precision — the `assembleState()` direct-callers need a concrete resolution (not just "ensure they're addressed"), and the mid-commit mutation of `newState` needs an immutability clarification. Resolving these two IMPORTANT items and the two MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
