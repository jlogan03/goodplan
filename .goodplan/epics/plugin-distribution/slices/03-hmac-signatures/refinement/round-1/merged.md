# Merged Feedback — HMAC Signatures Plan (Round 1)

### CRITICAL Issues

**C1. Phase 2: Double-write of `goodplan.json` breaks atomicity, concurrent modification detection, and the clean write model**
_Flagged by: holistic, software-architecture, typescript, repo-tooling-docs_

The plan writes `goodplan.json` once via the normal `diffTree` path (without signature), then writes it again to embed the signature. This has three problems: (1) the second write bypasses `checkConcurrentModification` since the on-disk content no longer matches `oldState`; (2) a crash between the two writes leaves `goodplan.json` without a valid signature; (3) it breaks the clean architectural model of `commitState()` (diff old/new tree, write differences).

**Fix:** Compute the HMAC *before* the first `goodplan.json` write. After `diffTree` collects `PendingWrite[]` but before flushing them, compute the signature over `newState` (excluding `stateSignature`), inject `stateSignature` into the `goodplan.json` entry in `newState`, and update the corresponding `PendingWrite` with the signed content. One write, no crash window, no concurrent modification issue.

Resolution: DIRECTLY_ACTIONABLE

---

**C2. Phase 1: `crypto.createHmac` is Node.js API — use Bun-native or Web Crypto, and `timingSafeEqual` needs Buffer inputs of equal length**
_Flagged by: typescript_

The plan calls for `crypto.createHmac('sha256', key)` and `crypto.timingSafeEqual`. While Bun has Node.js `crypto` compatibility, the idiomatic approach is `Bun.CryptoHasher` or Web Crypto. More critically, `crypto.timingSafeEqual` requires Buffer inputs of equal length — comparing hex digest strings directly will throw.

**Fix:** Either (a) use `new Bun.CryptoHasher("sha256", key)` (Bun-native, synchronous) and compare hex strings with a manual constant-time comparison, or (b) use Node.js `crypto` but explicitly convert both hex digest strings to Buffers before calling `timingSafeEqual`. The plan must specify which approach and include the conversion step.

Resolution: DIRECTLY_ACTIONABLE

---

**C3. Phase 3: Read-path verification placement is ambiguous — `status` uses `assembleState()` directly, not `loadState()`**
_Flagged by: software-architecture, typescript, holistic_

The plan says "likely `loadState()` or `assembleState()`" but the codebase has a split: mutation commands use `loadState()` (RPC layer), while `status` calls `assembleState()` directly. If verification is only in `loadState()`, `gp status` bypasses it. If only in `assembleState()`, cache hits in `loadState()` bypass it.

**Fix:** Verification goes in `loadState()` after obtaining the state (from either cache or assembly). Commands that call `assembleState()` directly (like `status`) should either be switched to use `loadState()` or have verification added separately. The plan must be definitive, not use "likely."

Resolution: DIRECTLY_ACTIONABLE

---

**C4. Phase 3: Error code for HMAC verification failure is unspecified — breaks INV-007 and error code fitness test**
_Flagged by: tui-cli, typescript_

The plan says to throw "a structured error" on signature mismatch but does not specify a `GoodplanErrorCode`. Per INV-007 and `exitCodeForError()`, exit codes derive from the error code prefix (`DATA_*` -> 1). The plan needs a new error code (e.g., `DATA_INTEGRITY_CHECK_FAILED`) added to the `DataErrorCode` union and `ALL_ERROR_CODES` array in `src/util/errors.ts`. Additionally, Phase 4's `gp verify` output shape (`{ "status": "fail" }`) differs from the standard `{ error: { code, message } }` pattern — clarify whether standard or custom and justify any deviation.

Resolution: DIRECTLY_ACTIONABLE

---

### IMPORTANT Issues

**I1. Phase 3: Bootstrap auto-sign on read violates the read-only contract of `assembleState()`/`loadState()` and INV-001**
_Flagged by: holistic, software-architecture, tui-cli, repo-tooling-docs_

The plan makes a read operation (`loadState`/`assembleState`) perform a filesystem write (computing and embedding a missing signature). This violates the read-only contract and INV-001 (every state mutation through the state machine).

**Fix:** On bootstrap (missing signature), skip verification and return state normally. The next `commitState()` call (any mutation) will compute and embed the signature via the Phase 2 write-path integration. For manual repair, `gp verify --fix` provides the path. If auto-bootstrap is strongly desired, extract it into a separate `ensureSignature()` function called from the RPC layer, not hidden inside the Data Layer's read functions.

Resolution: DIRECTLY_ACTIONABLE

---

**I2. Phase 1: `serializeForHmac` duplicates tree-walking logic from `serializeStateTree` — fragile to new entry types**
_Flagged by: holistic, software-architecture, typescript_

`serializeStateTree()` already walks the state tree and produces a serializable object. Building a second tree walker is a maintenance and correctness risk. If a new entry type is added, the HMAC function would silently exclude it.

**Fix:** Call `serializeStateTree(state, { inline: false })` (which replaces markdown with `true`), then strip `stateSignature` from the result, then run through `deterministicStringify()`. Use an exhaustive switch on `entry.type` for any entry-type filtering to fail on unknown types.

Resolution: DIRECTLY_ACTIONABLE

---

**I3. Phase 3: Cache invalidation based on `stateSignature` comparison is redundant and defeats caching purpose**
_Flagged by: holistic, software-architecture, typescript, repo-tooling-docs_

The plan proposes reading and parsing `goodplan.json` on every `loadState()` call to compare signatures, which defeats the cache (the cache exists to avoid filesystem reads). The existing mtime-based invalidation already detects external modifications. HMAC verification should happen *after* state is loaded (from cache or assembly), not as a cache invalidation trigger.

**Fix:** Leave existing mtime-based cache invalidation unchanged. Run HMAC verification after state is loaded, regardless of source (cache or fresh assembly).

Resolution: DIRECTLY_ACTIONABLE

---

**I4. Phase 4: `gp verify --fix` needs to bypass read-path HMAC check, and this INV-001 exception must be documented**
_Flagged by: holistic, software-architecture, tui-cli, typescript_

Phase 3 makes reads hard-fail on HMAC mismatch. `gp verify --fix` needs to load state to recompute the signature, but the hard-fail prevents this. Additionally, `verify --fix` writes `goodplan.json` without going through the state machine, which is an INV-001 exception that needs to be documented (like version-stamp and migrate).

**Fix:** (a) `gp verify` calls `assembleState()` directly (bypassing `loadState()` verification) and performs its own HMAC check. (b) Document `verify --fix` as a third INV-001 exception with rationale: "signature repair is infrastructure metadata maintenance, not a workflow state transition." (c) Update `architecture/invariants.md`.

Resolution: DIRECTLY_ACTIONABLE

---

**I5. Phase 3: `__GP_HMAC_KEY__` define must be added to `vitest.config.ts` as well as `global-setup.ts`**
_Flagged by: typescript_

Unit tests import source files through Vitest's module transform — they never touch the compiled binary. The existing `__GOODPLAN_VERSION__` define works in unit tests because it is in `vitest.config.ts` under the `define` key. Without adding `__GP_HMAC_KEY__` there, unit tests rely on the dev-key fallback, masking potential bugs in the injection mechanism.

**Fix:** Add `__GP_HMAC_KEY__: JSON.stringify("goodplan-dev-hmac-key")` to `vitest.config.ts`'s `define` map. Also add the `global-setup.ts` define for integration tests (with correct array element syntax matching `__GOODPLAN_VERSION__`).

Resolution: DIRECTLY_ACTIONABLE

---

**I6. Phase 1: `stateSignature` schema addition needs `exactOptionalPropertyTypes`-safe pattern specified**
_Flagged by: typescript_

Under `exactOptionalPropertyTypes: true`, the plan must specify the conditional spread pattern when setting `stateSignature` in Phase 2's `commitState` and Phase 3's bootstrap path: `...(signature !== undefined ? { stateSignature: signature } : {})`.

Resolution: DIRECTLY_ACTIONABLE

---

**I7. Phase 1: Missing `import type` for `ProjectState` in new `hmac.ts` module**
_Flagged by: typescript_

Under `verbatimModuleSyntax: true`, the import must use `import type { ProjectState }` since it is only used as a type annotation. The plan should specify import paths and the type-only import requirement.

Resolution: DIRECTLY_ACTIONABLE

---

**I8. Missing `--json`/`--quiet`/`--query` flag handling details for `gp verify`**
_Flagged by: tui-cli_

The plan specifies `--json` output shapes but doesn't mention `--quiet` or `--query`. All commands inherit `globalArgs`. The plan should confirm that `gp verify` uses the shared `output()` function (which handles these automatically) and specify behavior: `--quiet` suppresses output (exit code only), `--query` applies jq filter.

Resolution: DIRECTLY_ACTIONABLE

---

**I9. Phase 4 verification steps don't test human-readable output**
_Flagged by: tui-cli_

The plan's verification tests `gp verify --json` but never verifies human-readable output (green "pass", red "fail", "State signature recomputed"). Add verification steps for non-JSON output.

Resolution: DIRECTLY_ACTIONABLE

---

**I10. Build script define patterns are inconsistent across `package.json`, `build-plugin.sh`, and `global-setup.ts`**
_Flagged by: holistic, tui-cli, repo-tooling-docs_

Three different quoting strategies exist for `--define` across build artifacts. The plan should pick one consistent pattern. The `build-plugin.sh` pattern (`"__KEY__=\"$VALUE\""`) is cleanest.

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR Issues

**M1. Phase 1: "Lexicographic path sorting" terminology is incorrect — it is hierarchical alphabetical sorting via sorted keys at every nesting level**
_Flagged by: holistic_

Resolution: DIRECTLY_ACTIONABLE

---

**M2. Phase 4: `gp verify` naming — `--fix` flag is unusual for this codebase (no other global command uses mode-switching flags)**
_Flagged by: holistic_

Minor design choice. Consider whether `gp verify` + `gp verify --fix` is the right UX vs. `gp verify` + `gp repair`.

Resolution: DIRECTLY_ACTIONABLE

---

**M3. Phase 4: Fitness test scope may be too broad — test `commitState()` invariant rather than every mutation command**
_Flagged by: software-architecture, repo-tooling-docs_

A better fitness function: verify that `commitState()` always embeds a valid signature (unit-level) plus one representative end-to-end command (integration-level). Exhaustively testing every mutation command is expensive and duplicates integration test coverage.

Resolution: DIRECTLY_ACTIONABLE

---

**M4. Phase 3: `global-setup.ts` update should be Phase 2 (when integration tests for `commitState` are added), not Phase 3**
_Flagged by: software-architecture_

Phase 1 unit tests use Vitest (dev-key fallback works). But integration tests starting in Phase 2 use the compiled binary and need the define.

Resolution: DIRECTLY_ACTIONABLE

---

**M5. Phase 4: `build-plugin.sh` needs `__GP_HMAC_KEY__` appended to the existing multi-line `bun build` invocation — plan says "same pattern" but should be explicit**
_Flagged by: tui-cli_

Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE (for loop exit)

All issues above are DIRECTLY_ACTIONABLE. Count: 19 (4 critical, 10 important, 5 minor).

### RESEARCH_NEEDED

None.

### Contradictions Resolved

1. **Verification placement (assembleState vs loadState):** The holistic reviewer suggested verification in `loadState()` only; software-architecture suggested both `loadState()` and `assembleState()`; typescript suggested `loadState()` only. Resolved in favor of the holistic/typescript position: verification in `loadState()` after obtaining state, with `gp verify` using `assembleState()` directly as a bypass. Commands currently calling `assembleState()` directly (like `status`) should be addressed explicitly (either switched to `loadState()` or have verification added).

2. **Bootstrap approach:** All four reviewers who flagged this issue agreed that read-path writes are wrong. The software-architecture reviewer (domain specialist) proposed the cleanest alternative: skip verification on missing signature, let the next `commitState()` embed it naturally. Merged issue I1 uses this approach.

3. **Fitness test scope:** software-architecture and repo-tooling-docs both flagged scope concerns but from slightly different angles (too broad vs. unclear scope). Merged as M3 with the software-architecture recommendation (unit-level `commitState` + one e2e command).

### Unresolved (USER_INPUT required)

None. All issues have clear, directly actionable resolutions.
