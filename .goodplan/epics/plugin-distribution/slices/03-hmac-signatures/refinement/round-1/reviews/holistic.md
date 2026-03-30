# Holistic Review — HMAC Signatures Plan

## Issues

**[IMPORTANT] Phase 2: Double-write of goodplan.json creates a race window and breaks concurrent modification detection**
Phase 2 Task 1 says: "Write `goodplan.json` again with the embedded signature (atomic temp+rename, same pattern as existing writes)." This means `commitState()` would write `goodplan.json` once via `diffTree` (without signature), then write it a second time (with signature). This has two problems:
1. The concurrent modification check in `processJsonEntry` compares on-disk content against `oldState`. After the first write, the on-disk content no longer matches `oldState` — a second write path would need to bypass or redo this check.
2. Between the two writes, any crash leaves `goodplan.json` on disk without a valid signature, which Phase 3's read path would reject as tampering.

The correct approach is to compute the signature *before* the first write of `goodplan.json`, so it is embedded in the single atomic write that `diffTree` already performs. This means: after `diffTree` collects pending writes but before flushing them, compute the HMAC over the *intended* new state, patch `stateSignature` into the `goodplan.json` pending write's content, then flush. This keeps the single-write atomic guarantee.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3: Read-path verification location is underspecified — "loadState() or assembleState()" is ambiguous**
The plan says "Modify the read path (likely `loadState()` or `assembleState()`)." Codebase exploration shows these serve different roles: `assembleState()` reads raw files with schema validation; `loadState()` adds caching on top. Some commands use `assembleState()` directly (e.g., `status`, `state`), while most use `loadState()`. The plan must specify exactly where verification goes:
- If in `loadState()`: commands that call `assembleState()` directly (like `gp status`) would bypass verification entirely.
- If in `assembleState()`: cache hits in `loadState()` would bypass verification.
- The bootstrap auto-fix (compute + write signature when absent) involves filesystem I/O, which is inappropriate inside `assembleState()` (a read-only function that never writes).

The plan should specify: verification in `loadState()` after cache resolution (covers both cache hits and misses), with the bootstrap write using the same atomic write pattern from `commitState`. Commands that bypass `loadState()` (like `status` and `state`) should also be addressed — either switched to use `loadState()` or have verification added separately.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2: `serializeForHmac` design conflates tree walking with serialization — existing `serializeStateTree` already does this**
`src/core/data/serialize.ts` already has `serializeStateTree()` which walks the `ProjectState` tree and produces a plain JSON-serializable object, handling all entry types (directory, json, jsonl, markdown). The plan proposes building a new tree-walking function `serializeForHmac()` that duplicates this logic but with different exclusions (skip markdown, skip `stateSignature`).

Instead, the plan should compose with the existing infrastructure: call `serializeStateTree(state, { inline: false })` (which replaces markdown with `true`), then strip markdown entries and `stateSignature` from the result, then run through `deterministicStringify()`. This avoids duplicating the tree-walking logic and reduces maintenance surface. If `inline: false` markdown representation (`true`) is stable enough to include in the HMAC (it contains no content, just a presence marker), it could even be left in — markdown file additions/removals would then be detected.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3: Bootstrap auto-sign on read violates INV-001 (every state mutation goes through the state machine)**
The plan proposes that when `stateSignature` is absent, the read path should "compute signature, embed in project node, write `goodplan.json` with signature." This is a filesystem write triggered by a read operation, which bypasses the state machine. INV-001 requires all state mutations to go through the state machine, with documented exceptions (version stamp, migration).

The bootstrap case needs to be documented as a third INV-001 exception (like version stamping), or it should be handled differently — e.g., `gp verify --fix` is the only path that computes and writes a missing signature, and the read path merely warns/skips when no signature exists. The epic architecture (INV-009) explicitly defines a "bootstrap exception" so the intent is there, but the plan should include a task to update `architecture/invariants.md` with this exception.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3: Cache invalidation approach conflicts with existing cache architecture**
The plan says: "When reading from cache, compare the cached `stateSignature` against the `goodplan.json` on disk. If they differ, invalidate cache and re-assemble." This means reading `goodplan.json` from disk on every `loadState()` call, which defeats the purpose of caching (the cache exists to avoid filesystem reads). The current cache uses directory mtime comparison — a cheap `stat()` call — to detect changes.

The existing mtime-based invalidation already handles this case: if `goodplan.json` is modified externally (manual edit, bad merge), the parent directory's mtime changes, triggering cache invalidation and a full re-assembly. The HMAC verification should happen *after* the state is loaded (from cache or fresh assembly), not as a cache invalidation signal. This is simpler and consistent with the existing architecture.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 4: `gp verify --fix` needs to bypass the read-path HMAC check**
Phase 3 makes every read hard-fail on HMAC mismatch. Phase 4 adds `gp verify --fix` which recomputes the signature. But `gp verify --fix` needs to load state to compute a new signature — if the read path throws on mismatch, the fix command can't run. The plan needs to specify that `gp verify` (and `gp verify --fix`) load state without HMAC verification, or use `assembleState()` directly to bypass the `loadState()` verification layer.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1: `serializeForHmac` task description mentions "Lexicographic path sorting comes from the object key sorting in `deterministicStringify()`" but this only applies to keys within a single object**
The tree structure means file paths are encoded as nested object keys (e.g., `epics` > `my-epic` > `epic.json`), and `deterministicStringify` sorts keys at each nesting level. This does produce a deterministic ordering, but it is not "lexicographic path sorting" — it is hierarchical alphabetical sorting. This is a minor terminology issue but could confuse the implementer into thinking flat path sorting is happening. Clarify that determinism comes from sorted keys at every nesting level.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: `gp verify` is registered as a global command but the namespace is inconsistent**
Existing global commands are: `init`, `migrate`, `schema`, `state`, `status`. These are all single words. `verify` fits this pattern. However, the `--fix` flag is unusual — no other global command uses a mode-switching flag like this. Consider whether `gp verify` (check) and `gp verify --fix` (repair) is the right UX, vs. something like `gp verify` and `gp repair`. This is a minor design choice that doesn't affect correctness.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: Fitness test scope is ambitious but appropriate — note test data requirements**
The fitness test `tests/fitness/state-integrity.test.ts` proposes testing "every mutation command" produces a valid signature. This requires running the compiled binary for each command. The existing fitness tests (e.g., `mutation-through-state-machine.test.ts`) follow this pattern, so it is feasible. Just ensure the test creates its own temp project directory (not the repo's `.goodplan/`).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: Build define pattern for `GP_HMAC_KEY` in `package.json` has quoting complexity**
The proposed pattern `--define "__GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-hmac-key}\""` involves nested shell quoting and `bun build --define` string escaping. The existing `__GOODPLAN_VERSION__` define in `package.json` uses a different quoting approach: `--define __GOODPLAN_VERSION__='\"'$(...)'\\"'`. The HMAC key define should follow the exact same quoting pattern for consistency. The `build-plugin.sh` script uses yet another pattern. Standardize.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan correctly identifies the right components and follows the codebase patterns (build-time defines, atomic writes, Data Layer responsibility). However, there are significant design issues that would cause implementation failures: the double-write of `goodplan.json` in Phase 2 breaks atomicity guarantees, the read-path integration in Phase 3 is underspecified in ways that would lead to incorrect verification coverage or broken commands, and the `verify --fix` command can't function given the Phase 3 hard-fail behavior. The `serializeForHmac` function also unnecessarily duplicates existing tree-walking infrastructure.

To reach 9+: (1) Restructure Phase 2 to compute the signature before the single `goodplan.json` write in `commitState`; (2) Specify exact verification placement in `loadState()` with explicit handling for commands that bypass it; (3) Add a bypass mechanism so `gp verify` can load state despite HMAC failure; (4) Reuse `serializeStateTree` instead of building a parallel walker; (5) Drop the cache invalidation change in favor of post-load verification.

## Summary
- Critical: 0
- Important: 6
- Minor: 4
