# Software Architecture Review — HMAC Signatures Plan (Round 3)

## Issues

**[IMPORTANT]** Phase 1 and Phase 2 have a design tension: `serializeForHmac` accepts `ProjectState` but Phase 2 needs HMAC over `PendingWrite` content strings

Phase 1 defines `serializeForHmac(state: ProjectState): string` which calls `serializeStateTree(state, { inline: false })` and strips `stateSignature`. Phase 2 then says: "compute the signature from the actual serialized content that will be written to disk (the `PendingWrite` content strings), not from the in-memory `newState`. This avoids any Zod round-trip discrepancies." It further says to "gather all `jsonWrites` content (excluding `stateSignature` from the `goodplan.json` entry if present) and all `jsonlWrites` content, run through `serializeForHmac()` (adapted to accept this content)."

The problem: Phase 1 creates a function that takes `ProjectState` and internally serializes the tree. Phase 2 then says to "adapt" it to accept already-serialized `PendingWrite` content strings instead. These are fundamentally different inputs — one is a typed tree, the other is pre-serialized JSON strings. The Phase 1 unit tests all test the `ProjectState`-accepting signature, so Phase 2's adaptation would change the function's contract after tests are already written against it.

This creates two sub-problems:
1. The Phase 1 `serializeForHmac(state: ProjectState)` function is only useful in Phase 3 (read path) and Phase 4 (`gp verify`). Phase 2 (write path) needs a different input shape. Either `serializeForHmac` should accept both shapes (overloaded), or there should be two functions: one for the write path (taking content strings) and one for the read/verify path (taking `ProjectState`).
2. Even if the function is overloaded, the two paths must produce identical output for the same logical state — otherwise a signature computed on write won't verify on read. This equivalence needs a cross-path test (write a state via `commitState`, read it back via `assembleState`, verify the read-path serialization matches what the write-path computed). Phase 2 includes a test "the embedded signature verifies against the committed state" which covers this indirectly, but the plan should make the equivalence constraint explicit.

Recommended fix: Phase 1 should define `serializeForHmac(state: ProjectState): string` as the canonical function used by the read path and `gp verify`. Phase 2 should either (a) call `serializeForHmac` on a reconstructed `ProjectState`-like object built from the `PendingWrite` content (ensuring Zod round-trip is captured since `PendingWrite` content is post-Zod), or (b) extract the serialization logic into a shared helper that both the write path and read path call with their respective inputs, with a test proving equivalence. The plan should pick one approach and describe the function signatures explicitly.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3: `loadState()` HMAC verification placement has a gap — incremental update path is unverified

Phase 3 says: "Verify HMAC only on the `assembleState()` fallback path, NOT on cache hits." The rationale is sound for pure cache hits (mtime unchanged). But `loadState()` has a third path: incremental update (`incrementalUpdate()`), triggered when directory mtimes changed but the cache exists. This path re-reads changed files and patches the cached tree — it does NOT call `assembleState()`. An attacker who modifies a JSON file (which changes the parent directory's mtime) would trigger the incremental path, which would read the tampered file and merge it into the cached state, bypassing HMAC verification entirely.

The incremental update path reads individual files and patches them into the cached tree without ever running HMAC verification. This is the exact scenario HMAC is designed to catch: a manually edited JSON file detected via mtime change.

Fix: add HMAC verification after the incremental update returns, before returning the state to the caller. The incremental path already produces a `ProjectState` — call `verifyStateTree()` on it, same as the `assembleState()` path. This covers all three code paths where untrusted filesystem data enters the system. The performance concern that motivated skipping cache hits doesn't apply here — the incremental path already does file I/O, so HMAC computation is marginal additional cost.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1: `serializeForHmac` mentions "exhaustive switch on `entry.type`" but operates on already-serialized output

The plan says `serializeForHmac` calls `serializeStateTree(state, { inline: false })` first, then strips `stateSignature`, then runs through `deterministicStringify()`. It also says "Uses an exhaustive switch on `entry.type` for any entry-type filtering to fail on unknown types." But after `serializeStateTree()`, the result is a plain `Record<string, unknown>` — there are no `StateEntry` types left to switch on. The exhaustive switch already happens inside `serializeStateTree()` (in `serialize.ts`, line 55: `const _exhaustive: never = entry`). The plan's mention of an exhaustive switch in `serializeForHmac` is either describing redundant logic or referring to something that doesn't apply at this layer. Remove the exhaustive switch requirement from `serializeForHmac` — it's already handled by `serializeStateTree()`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3: switching `state.ts` to `loadState()` changes its semantics in a way that may surprise users

The `state` command currently uses `assembleState()` which always reads the full filesystem — it shows the current ground truth. Switching to `loadState()` means it could return cached state (on cache hit with matching mtimes). The command's own comment says it exposes "the full .goodplan/ state tree" and is "LLM-facing." If an LLM-written markdown file appears but the directory mtime hasn't changed (same-second write), `loadState()` returns stale cached state missing that file. `assembleState()` would catch it. For a debugging/introspection command like `state`, returning stale data is worse than a small performance hit. Consider keeping `state.ts` on `assembleState()` with an explicit HMAC verification call instead of routing through `loadState()`. `status.ts` is fine on `loadState()` since it only reads JSON entities (not affected by same-second markdown writes).

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 3 has addressed all round 2 issues well. The `status`/`state` command decision is now explicit (switch to `loadState()`). The immutability concern is resolved (shallow clone, don't mutate `newState`). The `PendingWrite` existence gap is handled (create entry if missing). Cache-hit verification is correctly skipped. `verify --fix` uses exported `atomicWrite()` with documented cache staleness. Build define quoting is concrete per file. INV-007 error shape is correct for verify failure. All minor items from round 2 are resolved.

The two remaining IMPORTANT issues are: (1) the `serializeForHmac` function signature tension between Phase 1 and Phase 2 — the plan needs to reconcile the `ProjectState` input with the `PendingWrite` content input and ensure equivalence, and (2) the incremental update path in `loadState()` bypasses HMAC verification, which is a security gap. Resolving these two plus the two minor items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
