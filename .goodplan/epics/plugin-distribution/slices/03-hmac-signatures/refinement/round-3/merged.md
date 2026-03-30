# Merged Feedback -- HMAC Signatures Plan (Round 3)

Reviewers: holistic (9/10), software-architecture (8/10), typescript (8/10), tui-cli (8/10), repo-tooling-docs (9/10)

## IMPORTANT Issues

### I-1. `serializeForHmac` API contradiction between Phase 1 and Phase 2
Sources: holistic, software-architecture, typescript, tui-cli

Phase 1 defines `serializeForHmac(state: ProjectState): string` which calls `serializeStateTree()`. Phase 2 says to compute the signature from `PendingWrite` content strings and "adapt" `serializeForHmac()` to accept them. These are incompatible inputs -- one is a typed tree, the other is pre-serialized strings.

Two viable resolutions were proposed across reviewers:

- **Option A (typescript, simplest):** Keep `serializeForHmac(state: ProjectState)` as defined in Phase 1. Use it on the write path too (call it on `newState` after `diffTree()`). Accept the theoretical Zod round-trip risk -- in practice `newState` content is already post-Zod and the state machine is pure (INV-003).
- **Option B (holistic, software-architecture):** Extract a shared lower-level helper (e.g., `signContent(contentMap: Record<string, string>): string`) that both the write path (from `PendingWrite` strings) and read/verify path (from `serializeStateTree()` output) call. Add a cross-path equivalence test proving write-time and read-time produce identical canonical strings.

Either way, the plan must: (1) define the final function signature(s) in Phase 1, (2) write Phase 1 tests against the final API, and (3) include an explicit equivalence test (write via `commitState`, read via `assembleState`, verify signatures match).

Resolution: DIRECTLY_ACTIONABLE

### I-2. `loadState()` incremental update path bypasses HMAC verification
Sources: holistic, software-architecture, typescript

The plan says to verify HMAC "only on the `assembleState()` fallback path, NOT on cache hits." But `loadState()` has a third path: `incrementalUpdate()` (line ~85 of `load.ts`), triggered when directory mtimes changed but no full reassembly is needed. This path re-reads files from disk and patches cached state -- exactly the tampering vector HMAC is designed to catch. An attacker modifying a single JSON file would trigger the incremental path and succeed without verification.

Fix: verify HMAC after `incrementalUpdate()` returns, before returning state to the caller. The incremental path already does file I/O, so HMAC computation is marginal additional cost. Apply verification on any non-cache-hit return (both `assembleState()` and `incrementalUpdate()` paths).

Resolution: DIRECTLY_ACTIONABLE

### I-3. `gp verify --fix` flag not declared in citty args
Source: tui-cli

Phase 4 describes `--fix` behavior but does not include the citty `args` block definition. Without it, citty won't recognize the flag. The plan should include:

```typescript
args: {
  ...globalArgs,
  fix: {
    type: "boolean",
    description: "Recompute and re-embed the state signature",
    default: false,
  },
}
```

This also affects INV-006 (`gp schema --json` surfacing the flag to LLM consumers).

Resolution: DIRECTLY_ACTIONABLE

### I-4. Dual `--define` locations need explanatory note
Source: repo-tooling-docs

Phase 2 adds `__GP_HMAC_KEY__` to `global-setup.ts` (compiled binary for integration tests) and Phase 3 adds it to `vitest.config.ts` (Vitest module transforms for unit tests). Both are required, but the plan doesn't explain why. An implementer may skip one, and the dev-key fallback in `getHmacKey()` would silently mask the missing define. Add a brief note clarifying both are required and what breaks if one is omitted.

Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

### M-1. Phase 1: `getHmacKey()` should use `typeof` guard, not `!== undefined`
Source: typescript

The existing `version.ts` pattern uses `typeof __GOODPLAN_VERSION__ !== "undefined"`. The plan should match this for `__GP_HMAC_KEY__` since `--define` replaces the identifier textually and `=== undefined` may behave differently from `typeof`.

Resolution: DIRECTLY_ACTIONABLE

### M-2. Phase 1: Test case 9 (`getHmacKey` when `__GP_HMAC_KEY__` is undefined) interaction with vitest.config.ts define
Source: holistic

Phase 3 adds `__GP_HMAC_KEY__` to `vitest.config.ts`, making it always defined during unit tests. Phase 1 test case 9 asserts behavior when undefined. After Phase 3 is applied, this test would need adjustment. Simplest: test that `getHmacKey()` returns `"goodplan-dev-hmac-key"` without caring whether it came from the define or the fallback.

Resolution: DIRECTLY_ACTIONABLE

### M-3. Phase 1: Remove "exhaustive switch on `entry.type`" from `serializeForHmac` description
Source: software-architecture

After `serializeStateTree()` runs, the result is a plain `Record<string, unknown>` -- no `StateEntry` types remain to switch on. The exhaustive switch already happens inside `serializeStateTree()`. Remove this requirement from `serializeForHmac`.

Resolution: DIRECTLY_ACTIONABLE

### M-4. Phase 3: `state.ts` switch from `assembleState()` to `loadState()` may return stale data
Source: software-architecture

The `state` command is a debugging/introspection tool. `loadState()` can return cached state on mtime match, which could miss same-second writes. For a ground-truth command, consider keeping `state.ts` on `assembleState()` with explicit HMAC verification, while `status.ts` uses `loadState()`.

Resolution: DIRECTLY_ACTIONABLE

### M-5. Phase 4: Missing documentation updates for `commands-api.md` and `data-layer-api.md`
Source: holistic

The new `verify` command should be added to `.goodplan/architecture/commands-api.md`. The `commitState()` and `loadState()` behavioral changes (HMAC computation/verification) should be reflected in `.goodplan/architecture/data-layer-api.md`.

Resolution: DIRECTLY_ACTIONABLE

### M-6. Phase 4: `verify --fix` should validate through Zod before writing
Source: typescript

Since `verify --fix` bypasses `commitState()` (and `processJsonEntry`), the newly injected `stateSignature` field is not Zod-validated. Add `projectSchema.parse()` before the `atomicWrite()` call to preserve INV-005 compliance.

Resolution: DIRECTLY_ACTIONABLE

### M-7. Phase 4: Specify `verify` command registration key and `atomicWrite` relativePath arg
Sources: repo-tooling-docs, tui-cli

The plan should state the registration key is `verify: verifyCommand` (un-namespaced global command). When calling `atomicWrite()`, pass `"goodplan.json"` as the `relativePath` parameter for meaningful error messages.

Resolution: DIRECTLY_ACTIONABLE

### M-8. Phase 4: `gp schema --json | jq` verification step should use built-in jq or be added to Expected Behavior checklist
Sources: repo-tooling-docs, tui-cli

The verification step relies on external `jq`. Consider using `@michaelhomer/jqjs` via `--query`. Also add this check as a machine-checkable Expected Behavior item, not just verification prose.

Resolution: DIRECTLY_ACTIONABLE

### M-9. Phase 4: `verify --fix` cache staleness UX note
Source: tui-cli

After `gp verify --fix`, the next command triggers a cache miss (slower). This is expected behavior but the plan should note it in the `--fix` help text or output so users aren't surprised.

Resolution: DIRECTLY_ACTIONABLE

### M-10. Phase 3: Add parity note for define quoting between vitest.config.ts and global-setup.ts
Source: typescript

Both produce the string `goodplan-dev-hmac-key` at runtime but via different quoting mechanisms. A brief note confirming parity prevents future confusion.

Resolution: DIRECTLY_ACTIONABLE (subsumed by I-4)

### M-11. Phase 4: Fitness test 3 has implicit dependency on compiled binary with HMAC define
Source: repo-tooling-docs

Test 3 runs the compiled binary and depends on `global-setup.ts` having the `__GP_HMAC_KEY__` define from Phase 2. Note this dependency explicitly so the test doesn't pass vacuously via dev-key fallback.

Resolution: DIRECTLY_ACTIONABLE
