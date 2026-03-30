# TypeScript and JavaScript Review — HMAC Signatures

## Issues

**[CRITICAL]** Phase 1: `crypto.createHmac` is Node.js API — use Bun-native or Web Crypto

The plan calls for `crypto.createHmac('sha256', key)` and `crypto.timingSafeEqual`. This project runs on Bun 1.3.x. While Bun does provide Node.js `crypto` compatibility, the idiomatic approach is `Bun.CryptoHasher` or the Web Crypto API (`crypto.subtle.sign` with HMAC). More importantly, `crypto.timingSafeEqual` requires Buffer inputs of equal length, and the plan does not mention this constraint — comparing a hex digest string directly will throw.

Recommended fix: Either (a) use `new Bun.CryptoHasher("sha256", key)` for HMAC (Bun-native, synchronous, no import needed) and compare hex strings with a manual constant-time comparison over equal-length hex strings, or (b) use Node.js `crypto` but explicitly convert both hex digest strings to Buffers before calling `timingSafeEqual`. The plan should specify which approach and include the Buffer conversion or manual constant-time comparison.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Phase 1: `serializeForHmac` reuse of `deterministicStringify` creates a subtle correctness risk with nested state trees

The plan says `serializeForHmac` will "walk the state tree, include only `JsonEntry` and `JsonlEntry` nodes (skips `MarkdownEntry` and `DirectoryEntry` that only contain markdown), strip `stateSignature` from the project.json node, produce a plain object, runs through `deterministicStringify()`." This is essentially reimplementing what `serializeStateTree()` in `src/core/data/serialize.ts` already does (walk tree, unwrap entries), but with different inclusion rules.

The existing `serializeStateTree` unwraps JSON, JSONL, and markdown entries. The plan's `serializeForHmac` needs to produce a *structurally equivalent tree* minus markdown entries and minus `stateSignature`. The plan should explicitly reuse `serializeStateTree` (or a parameterized variant) rather than hand-rolling a new tree walker. A second independent tree-walking implementation is a maintenance and correctness risk — if the tree structure evolves, both walkers must be updated.

Concrete fix: Add an options parameter to `serializeStateTree` (e.g., `{ excludeMarkdown: boolean, excludeKeys?: Record<string, Set<string>> }`) or create `serializeForHmac` as a thin wrapper that calls `serializeStateTree({ inline: false })` and then strips the `stateSignature` key from the `"project.json"` node of the result. The `inline: false` mode already represents markdown as `true` (a constant), which could be included or excluded from the HMAC — but the plan should be explicit about this choice and why.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2: Double-write of `goodplan.json` is inefficient and creates a race window

The plan says: "After all file writes complete, compute signature via `signStateTree(newState)`, embed `stateSignature` in the `goodplan.json` node of the new state, write `goodplan.json` again with the embedded signature." This means `goodplan.json` is written twice per commit — once by the normal `diffTree` path, and once more to add the signature. Between these two writes, the on-disk state has no valid signature.

Better approach: Compute the signature *before* the first `goodplan.json` write. In `commitState`, after `diffTree` collects `jsonWrites` but before flushing them, compute the HMAC over the new state (excluding `stateSignature`), inject `stateSignature` into the `goodplan.json` entry in `newState`, and update the corresponding `PendingWrite` in `jsonWrites` with the signed content. This way `goodplan.json` is written exactly once with the signature already embedded.

This is feasible because `diffTree` already collects writes as `PendingWrite[]` and flushes them afterward. The plan should modify the approach to intercept between collection and flush.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3: `__GP_HMAC_KEY__` define must be added to `vitest.config.ts`, not `global-setup.ts`

The plan says "Update `tests/global-setup.ts` to include `--define __GP_HMAC_KEY__` in the test binary compilation." The global-setup compiles the *binary* for integration tests. But unit tests (Phase 1's `tests/unit/data/hmac.test.ts`) import source files directly through Vitest's module transform — they never touch the compiled binary. The `__GOODPLAN_VERSION__` define works in unit tests because it is declared in `vitest.config.ts` under the `define` key. The plan must add `__GP_HMAC_KEY__` to `vitest.config.ts`'s `define` map *as well as* to `global-setup.ts`.

Current `vitest.config.ts`:
```ts
define: {
  __GOODPLAN_VERSION__: JSON.stringify(pkg.version),
},
```

Must become:
```ts
define: {
  __GOODPLAN_VERSION__: JSON.stringify(pkg.version),
  __GP_HMAC_KEY__: JSON.stringify("goodplan-dev-hmac-key"),
},
```

Without this, `typeof __GP_HMAC_KEY__` will be `"undefined"` in unit test context, which triggers the dev-key fallback — so tests will *pass* but only because of the fallback, not because the define works. This masks a real bug: if the fallback logic has an error, unit tests won't catch it.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1: Missing `import type` for `ProjectState` in new `hmac.ts` module

The plan says `serializeForHmac(state: ProjectState)` takes a `ProjectState` parameter. Under `verbatimModuleSyntax: true`, the import must use `import type { ProjectState }` since it is only used as a type in the function signature (the runtime doesn't need the value — the tree is a plain object). The plan doesn't mention import paths or the type-only import requirement. This should be explicit given the strict tsconfig.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3: Read path verification location needs clarity — `assembleState` vs `loadState`

The plan says "Modify the read path (likely `loadState()` or `assembleState()` in `src/core/data/`)". Looking at the codebase, `loadState()` is the public entry point that returns cached or freshly assembled state. `assembleState()` is the lower-level filesystem walker. The verification must happen in `loadState()` (after the state is fully assembled or retrieved from cache) because:

1. `assembleState` returns a `ProjectState` without knowledge of the signature — it just reads files
2. The cache path in `loadState` returns state directly without going through `assembleState`

The plan should be definitive: verify in `loadState` after obtaining the state (from either cache or assembly), not in `assembleState`. The "likely" qualifier is insufficient for implementation.

Additionally, the bootstrap path (no signature, auto-compute) requires a filesystem write from within `loadState`, which currently performs zero writes. This introduces a side effect into a function that was pure-read. The plan should acknowledge this architectural change and consider whether bootstrap should instead be handled by `commitState` (i.e., if no signature exists, the next mutation adds it) or by a dedicated `ensureSignature()` call at the top-level command runner.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4: New error code needed for HMAC verification failure

The plan's Phase 3 says to throw "a structured error" on signature mismatch. Looking at `src/util/errors.ts`, all error codes must be registered in the `DataErrorCode` union and the `ALL_ERROR_CODES` array. The plan does not specify a new error code. This should be something like `DATA_INTEGRITY_CHECK_FAILED` — added to the `DataErrorCode` type, the `ALL_ERROR_CODES` array, and the fitness test will enforce this.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1: `stateSignature` schema addition needs `exactOptionalPropertyTypes`-safe pattern

The plan says "Add `stateSignature: z.string().optional()` to `projectSchema`" and mentions using "the `exactOptionalPropertyTypes`-safe pattern from the codebase." Looking at existing usage (e.g., `task.ts`, `slice.ts`), the codebase uses plain `z.string().optional()` and then uses conditional spread when constructing objects to avoid `key: undefined`. This is fine for the schema definition itself, but the plan should also specify the conditional spread pattern when setting `stateSignature` in Phase 2's `commitState` and Phase 3's bootstrap path. For example:
```ts
...(signature !== undefined ? { stateSignature: signature } : {}),
```

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4: Build script define pattern should match the `__GOODPLAN_VERSION__` quoting exactly

The plan proposes `--define "__GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-hmac-key}\""`. But the existing `__GOODPLAN_VERSION__` in `package.json` uses a different quoting pattern: `--define __GOODPLAN_VERSION__='\"'$(...)'\\"'`. Meanwhile `build-plugin.sh` uses yet another: `--define "__GOODPLAN_VERSION__=\"$VERSION\""`. The plan should pick one consistent quoting approach and specify it for both `package.json` and `build-plugin.sh`. The `build-plugin.sh` pattern (`"__KEY__=\"$VALUE\""`) is cleaner and works for both.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3: Cache invalidation based on `stateSignature` comparison is redundant with the HMAC verify step

The plan proposes: "When reading from cache, compare the cached `stateSignature` against the `goodplan.json` on disk. If they differ, invalidate cache and re-assemble." But the HMAC verification step already runs after loading state (from cache or assembly). If someone tampered with `goodplan.json` on disk, the HMAC verification will catch it regardless. The signature comparison in cache invalidation adds a disk read (`goodplan.json`) on every cached load just to detect a case that the subsequent HMAC verify would catch anyway. Consider whether this is worth the complexity, or if the existing mtime-based cache invalidation plus the HMAC verify is sufficient.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4: `gp verify` command should use `loadState` (not `assembleState`) to match the real read path

Phase 4 says "assemble state tree, compute HMAC, compare to embedded signature." If the verify command uses `assembleState` directly, it bypasses the cache layer and any bootstrap logic in `loadState`. The verify command should mirror the actual read path as closely as possible — otherwise it could report "pass" while the real read path (through `loadState`) would fail, or vice versa. However, if `loadState` itself hard-errors on mismatch (Phase 3), then `verify` cannot call it without getting the error. The plan needs to clarify: either (a) `loadState` returns a result type instead of throwing, (b) `verify` catches the error, or (c) there's a lower-level `verifyState` function that both `loadState` and `gp verify` call.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan demonstrates solid understanding of the project's architecture and correctly identifies the integration points (`commitState`, `loadState`, schema registry). However, it has two critical issues (crypto API usage, tree serialization duplication) and several important gaps around type safety, error codes, the double-write problem, and the test define configuration. The read-path integration (Phase 3) is under-specified for the most architecturally sensitive changes. To reach 9+: resolve the crypto API choice, reuse `serializeStateTree`, eliminate the double-write, specify the exact `loadState` modification (not "likely"), add the error code, add the vitest define, and clarify the verify command's relationship to `loadState`.

## Summary
- Critical: 2
- Important: 6
- Minor: 3
