# Repo, Tooling, & Docs Review — HMAC Signatures Plan

## Issues

**[IMPORTANT] Build define missing from `global-setup.ts` is listed in Phase 3 but the define pattern needs precise syntax**
Phase 3 says "Update `tests/global-setup.ts` to include `--define __GP_HMAC_KEY__` in the test binary compilation (use the dev key)." The current `global-setup.ts` compiles the binary with `execFileSync` passing args as an array (line 21-30). The task description is vague — it should specify the exact args to add: `"--define"` and `"__GP_HMAC_KEY__=\"goodplan-dev-hmac-key\""` matching the same quoting pattern used for `__GOODPLAN_VERSION__`. Without the correct quoting, the define will silently fail (Bun treats unquoted defines as identifiers, not strings), and all integration tests relying on the compiled binary will use the undefined-key fallback path rather than the injected key — which may mask bugs in the injection mechanism itself.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Build script define in Phase 4 uses shell expansion that differs from the existing `--define` pattern**
Phase 4 proposes adding `--define "__GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-hmac-key}\""` to `package.json`'s build script. The existing `build` script in `package.json` uses: `--define __GOODPLAN_VERSION__='\"'$(node -p 'require(\"./package.json\").version')'\"'` — a different quoting strategy (single-quote wrapping with embedded double-quote escapes). Having two different quoting patterns for `--define` in the same command line is fragile and confusing. The plan should specify using the same quoting pattern as the existing `__GOODPLAN_VERSION__` define for consistency. Similarly, `scripts/build-plugin.sh` currently uses `--define "__GOODPLAN_VERSION__=\"$VERSION\""` — the HMAC key define should follow that same pattern.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2 double-write of `goodplan.json` creates a concurrent modification detection issue**
Phase 2 task item 3 says: "Write `goodplan.json` again with the embedded signature (atomic temp+rename, same pattern as existing writes)." But `commitState()` has concurrent modification detection — `processJsonEntry()` compares the on-disk content against `oldState`. After the first write of `goodplan.json` (from `diffTree`), the on-disk content will differ from `oldState`, so a second write of the same file would trigger `DATA_CONCURRENT_MODIFICATION`. The plan needs to specify that the signature-embedding write happens as a separate atomic write that bypasses the `diffTree` mechanism — either by directly calling `atomicWrite()` after the main commit loop completes, or by computing the signature before the first `goodplan.json` write and embedding it in the state before `diffTree` runs. The latter approach (compute-then-embed-before-diffTree) is cleaner because it avoids writing the same file twice.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3 read-path bootstrap writes to disk during a read operation, violating the read-only contract**
Phase 3 says when `stateSignature` is absent (bootstrap), the read path should "compute signature via `signStateTree()`, embed in project node, write `goodplan.json` with signature." But `loadState()` and `assembleState()` are strictly read-only operations. Commands like `status` call `assembleState()` directly (see `src/commands/global/status.ts` line 29). Writing to disk during a read creates several problems: (1) it violates the read-only contract callers expect; (2) it mutates state outside `commitState()`, violating INV-001; (3) it can fail in read-only filesystem contexts. The plan should specify that bootstrap signing happens on the next mutation (in `commitState`), not on read. On read, if no signature exists, skip verification and log a debug message. The first subsequent `commitState` call will embed the signature naturally via the Phase 2 write-path integration.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 cache invalidation task is underspecified and potentially unnecessary**
Phase 3 proposes replacing or augmenting the mtime-based cache check with a `stateSignature` comparison. But the cache is an internal optimization written by `commitState()` and always reflects the latest committed state. If an external actor modifies `goodplan.json`, the mtime-based check already detects the directory change and triggers re-assembly, at which point the HMAC verification runs. The proposed cache change adds complexity without clear benefit. The plan should either remove this task or provide a concrete scenario where the existing mtime-based invalidation fails to detect a `stateSignature` change.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `gp verify` command uses `assembleState()` directly — plan should specify which read path**
Phase 4 says `gp verify` should "assemble state tree, compute HMAC, compare to embedded signature." This is a read-only command that should bypass the read-path verification from Phase 3 (otherwise `gp verify` itself would throw a hard error on tampered state before it could report the result). The plan should clarify that `gp verify` calls `assembleState()` directly (not `loadState()`) and performs its own HMAC check independently — never triggering the Phase 3 read-path verification. This is consistent with how `status` already uses `assembleState()` directly.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 fitness test file location and scope overlap**
Phase 4 proposes `tests/fitness/state-integrity.test.ts` with tests that "every mutation command produces a valid signature." Existing fitness tests (like `tests/fitness/mutation-through-state-machine.test.ts`) test structural properties through the compiled binary. The plan should clarify whether this fitness test runs against the compiled binary (integration-style, which is consistent with other fitness tests) or against unit-level functions. If binary-level, it needs the `__GP_HMAC_KEY__` define from global-setup (Phase 3 dependency). The task list should make this dependency explicit.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has sound high-level structure and aligns well with existing patterns (build-time defines via `version.ts`, atomic writes in `commitState`, test structure). However, four IMPORTANT issues need resolution: the double-write problem in Phase 2, the read-path bootstrap violating INV-001 in Phase 3, inconsistent build-script quoting in Phase 4, and underspecified global-setup syntax in Phase 3. The double-write and bootstrap issues are architectural — getting them wrong would require rework. Fixing all IMPORTANT issues and clarifying the MINOR items would bring the score to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
