# Repo, Tooling, & Docs Review -- HMAC Signatures Plan (Round 2)

## Issues

**[IMPORTANT] Phase 2: `global-setup.ts` define addition is listed in Phase 2 but syntax is unspecified**

Phase 2 says "Add `--define __GP_HMAC_KEY__` to `tests/global-setup.ts`: add to the define array with correct element syntax matching `__GOODPLAN_VERSION__`." The current `global-setup.ts` passes args as an array to `execFileSync` (line 18-31). The existing `__GOODPLAN_VERSION__` define is passed as a single array element: `"__GOODPLAN_VERSION__=\"${pkg.version}\""` — but actually it uses two elements: `"--define"` then the value string. The plan should show the exact two array elements to add: `"--define"` and `"__GP_HMAC_KEY__=\"goodplan-dev-hmac-key\""`. Incorrect quoting causes Bun to treat the value as an identifier rather than a string literal, silently falling back to the dev key via `getHmacKey()` — which means integration tests would pass but never actually test the injected-key path.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 4: Build define quoting patterns differ between `package.json` and `build-plugin.sh` -- plan should specify which pattern to follow**

The plan proposes adding `--define "__GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-hmac-key}\""` to `package.json`'s build script. But the existing `build` script in `package.json` uses a completely different quoting strategy: `--define __GOODPLAN_VERSION__='\"'$(node -p 'require(\"./package.json\").version')'\"'`. Meanwhile `build-plugin.sh` uses: `--define "__GOODPLAN_VERSION__=\"$VERSION\""`. Having two different `--define` quoting strategies in the same `package.json` build command is confusing and fragile. The plan should specify following the existing pattern in each file: for `package.json`, match the single-quote-wrapping style used by `__GOODPLAN_VERSION__`; for `build-plugin.sh`, match the double-quote style already used there. The task descriptions mention "same quoting pattern" but don't show the concrete strings.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: Fitness test `tests/fitness/state-integrity.test.ts` needs explicit dependency on `global-setup.ts` define**

The plan lists fitness test items including "One representative end-to-end command (e.g., `gp epic:create`) produces a valid signature (integration-level)." Integration-level fitness tests run against the compiled binary (same as other fitness tests like `mutation-through-state-machine.test.ts`). The compiled binary gets `__GP_HMAC_KEY__` from the `global-setup.ts` define added in Phase 2. The plan should note this cross-phase dependency explicitly so the implementer knows these fitness tests depend on the Phase 2 global-setup change. Without it, the compiled binary uses the undefined fallback, and the test passes but validates the wrong key path.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2: `commitState` modification description could be clearer about where signature injection happens relative to `diffTree`**

The Phase 2 tasks say: "After `diffTree()` collects `PendingWrite[]` but *before* flushing them, compute the signature." Then task 2 says "Inject `stateSignature` into the `goodplan.json` entry in `newState`." And task 3 says "Update the corresponding `PendingWrite` for `goodplan.json` with the signed content (re-serialize with the embedded signature)." This is correct but the sequencing is subtle. After `diffTree` runs, `jsonWrites` contains a `PendingWrite` for `goodplan.json` with the unsigned content. The implementer must: (a) compute signature over `newState` (without `stateSignature`), (b) mutate `newState` to add `stateSignature`, (c) find the `goodplan.json` entry in `jsonWrites` and replace its `content` with re-serialized signed content. The plan could add a single-sentence note: "The `goodplan.json` PendingWrite must be located by its `relativePath` (e.g., `'goodplan.json'`) and its `content` field replaced." This prevents the implementer from accidentally adding a second PendingWrite entry.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: `gp verify --fix` writes `goodplan.json` directly but the plan doesn't specify which write utility to use**

Phase 4 says `gp verify --fix` "embeds in `goodplan.json`, writes atomically." The codebase has `atomicWrite()` in `commit.ts` but it is a module-private function (not exported). The implementer will need to either: (a) export `atomicWrite` from `commit.ts`, (b) inline atomic write logic (temp+rename) in the verify command, or (c) use `fs.writeFileSync` (non-atomic). The plan should specify the approach. Option (a) is cleanest and maintains the crash-safe write contract, but changes the `commit.ts` public API surface. Option (b) duplicates code. A brief note on which approach to use would prevent implementer guesswork.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan addresses all round-1 issues cleanly. The Phase 2 double-write problem is resolved (compute before flush, update PendingWrite in place). The bootstrap read-path write is gone (skip verification if signature absent, let next commitState embed it). The `gp verify` command correctly uses `assembleState()` directly to bypass read-path verification. Build defines are mentioned for all three locations (package.json, build-plugin.sh, global-setup.ts). The INV-001 exception documentation for `verify --fix` is included. The vitest.config.ts define addition is specified with the correct value.

The remaining issues are about precision in build-script quoting patterns, the exact global-setup.ts array syntax, and minor implementation guidance gaps. None are architectural -- they are all about reducing ambiguity for the implementer. Fixing the two IMPORTANT items (explicit quoting patterns) would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
