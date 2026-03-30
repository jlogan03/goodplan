# Software Architecture Review — HMAC Signatures Plan

## Issues

**[CRITICAL]** Phase 2 double-write of goodplan.json breaks concurrent modification detection and atomicity model

The plan says: after all file writes, compute signature, embed in goodplan.json, then "write goodplan.json again with the embedded signature." This means `commitState()` would write `goodplan.json` once via its normal diff-driven path (without signature), then immediately re-read/modify/write it a second time to embed the signature. This has three problems:

1. The second write bypasses the `diffTree` → `processJsonEntry` → `checkConcurrentModification` pipeline, so INV-005 (schema validation on every write) requires explicit handling.
2. After the first write, the on-disk `goodplan.json` has no signature. If the process crashes between the two writes, the file is in a state that will fail verification on next read — but the plan says missing signatures should bootstrap, which conflicts because the signature field would exist (as the schema now includes it optionally) but its value would be whatever the state machine produced (likely undefined/missing after strip). This is a confusing partial state.
3. `commitState()` currently has a clean architectural model: diff old/new tree, write differences. Injecting a post-write mutation to re-write one specific file breaks this model and makes the function harder to reason about.

**Better approach:** Compute the HMAC *before* the diff-driven writes. After `diffTree` collects pending writes but before flushing them, compute the signature over the `newState` (excluding `stateSignature`), then mutate the `newState`'s `project.json` node to include `stateSignature`. This way the diff-driven write of `goodplan.json` already contains the signature. One write, no re-read, no crash window. The signature computation needs to work on the *about-to-be-written* state, not the post-write state, so compute it from `newState` with `stateSignature` stripped.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Read-path verification placement is ambiguous — `status` uses `assembleState()` directly, not `loadState()`

The plan says to hook verification into "the read path (likely `loadState()` or `assembleState()`)" but the codebase shows a split: mutation commands use `loadState()` (RPC layer), while some read-only commands like `status` call `assembleState()` directly (bypassing `loadState()`). If verification is added only to `loadState()`, then `gp status` — the most common command — would not verify integrity. If added only to `assembleState()`, it gets called redundantly (once in `assembleState()` via `loadState()` fallback).

The plan must explicitly specify: verification goes into both `loadState()` and `assembleState()`, with `assembleState()` being the canonical location (since `loadState()` falls back to it). When `loadState()` returns from cache, it must independently verify the cached `stateSignature` against disk. The plan currently conflates these two code paths.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Bootstrap auto-write during read violates the read-only contract of `assembleState()`/`loadState()`

Phase 3 says: "If absent (bootstrap): compute signature via `signStateTree()`, embed in project node, write `goodplan.json` with signature." This makes a read operation (`loadState`/`assembleState`) perform a filesystem write. This violates the clean read/write boundary that is a core architectural property of the Data Layer. `assembleState()` and `loadState()` are documented as read-only functions — no callers expect them to modify the filesystem.

**Better approach:** On bootstrap (missing signature), skip verification and return the state normally. Let the next `commitState()` call (which happens on any mutation) compute and embed the signature. For read-only commands that never go through `commitState()`, the `gp verify --fix` command provides the manual repair path. Alternatively, if auto-bootstrap is strongly desired, make it a separate function (`ensureSignature(projectDir, state)`) called explicitly from the RPC layer's read paths, not hidden inside the Data Layer's read functions.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `serializeForHmac` conflates tree walking with entry-type filtering — fragile to new entry types

The plan describes `serializeForHmac` as walking the state tree and including only `JsonEntry` and `JsonlEntry` nodes while skipping `MarkdownEntry` and `DirectoryEntry`. But `StateEntry` is a discriminated union (`json | jsonl | markdown | directory`). If a new entry type is added in the future, the function would silently exclude it from the HMAC, creating a gap. The function should use an exhaustive switch/match on `entry.type` and fail on unknown types rather than a whitelist approach. This is a small implementation detail but architecturally important for a security-adjacent feature.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 cache invalidation proposal replaces mtime-based check without justification

The plan says to "compare the cached `stateSignature` against the `goodplan.json` on disk" and that this "replaces or augments the current mtime-based check." The current mtime check is cheap (stat calls only) and covers all file types. Replacing it with a signature comparison for `goodplan.json` specifically would require reading and parsing `goodplan.json` on every `loadState()` call, which defeats the purpose of the cache (avoiding file reads). The plan should leave the existing mtime-based cache invalidation unchanged. The HMAC verification happens after state is loaded (whether from cache or from assembly), not as a cache invalidation trigger.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `gp verify --fix` circumvents INV-001 (every state mutation through the state machine)

The `verify --fix` command recomputes and writes the signature to `goodplan.json` without going through the state machine's `reduce()` → `commitState()` pipeline. This is similar to the `version-stamp.ts` exception and the `migrate` exception documented in INV-001, but the plan doesn't acknowledge this as an invariant exception or document it. The plan should explicitly note this as a known INV-001 exception (like the existing two) with rationale: "signature repair is infrastructure metadata maintenance, not a workflow state transition."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 fitness test scope may be too broad for a fitness function

The `tests/fitness/state-integrity.test.ts` proposes testing "Every mutation command (`init`, `epic:create`, `slice:create`, etc.) produces a valid signature." This would require spawning the compiled binary for each mutation command, which is expensive and duplicates the integration test suite's coverage. Fitness functions should test architectural invariants at the boundary, not exhaustively across all commands. A better fitness function: verify that `commitState()` always embeds a valid signature (unit-level) and that one representative end-to-end command produces a verifiable signature (integration-level, already covered by the verify command tests).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Missing `__GP_HMAC_KEY__` define in `global-setup.ts` should be a Phase 1 task, not Phase 3

The plan puts the `global-setup.ts` update (adding `--define __GP_HMAC_KEY__` to the test binary compilation) in Phase 3. But Phase 1 creates unit tests for `hmac.ts` that depend on `getHmacKey()` returning a value. In unit tests run via Vitest (not the compiled binary), `__GP_HMAC_KEY__` will be `undefined` and the dev key fallback will work. But in integration tests that use the compiled binary (Phase 2 and later), the define is needed. The `global-setup.ts` update should be moved to Phase 2 at the latest, when integration tests for `commitState` are added.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan correctly identifies the key architectural decisions (where to compute, where to verify, how to inject the key) and follows existing patterns (version.ts for build-time injection, commit.ts for write path). However, the double-write approach in Phase 2 breaks the clean write model, the read-path verification placement is ambiguous across two different code paths, and the bootstrap auto-write violates the read-only contract of the Data Layer's read functions. These are structural issues that would create technical debt or bugs if implemented as written. Fixing the two CRITICAL and four IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 2
- Important: 4
- Minor: 2
