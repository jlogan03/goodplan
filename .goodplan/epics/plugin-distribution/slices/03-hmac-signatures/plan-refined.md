# Plan: HMAC Signatures

Status: COMPLETE
Completed: 2026-03-30

## Overview

Implement embedded HMAC-SHA256 state integrity for the goodplan CLI. After this slice, every Data Layer write computes a signature over all JSON/JSONL state files and embeds it in `goodplan.json`. Every read verifies it — mismatch produces a hard error directing the user to `gp verify --fix`. Two new commands (`gp verify`, `gp verify --fix`) provide standalone verification and repair.

The serialization approach: walk the in-memory `ProjectState` tree, exclude markdown entries and the `stateSignature` field itself, produce a structured JSON object, then run through `deterministicStringify()` for canonical ordering. This reuses the existing deterministic serialization infrastructure (`src/util/json.ts`) and tree-walking patterns.

The HMAC key (`__GP_HMAC_KEY__`) is injected at compile time via `--define`, following the same pattern as `__GOODPLAN_VERSION__` in `src/version.ts`. Dev/test builds use a well-known dev key; CI injects a production secret.

## Phase 1: HMAC Core Module

Create the HMAC signing and verification functions with deterministic serialization, build-time key injection, and schema changes. Unit tests prove the core works before integration.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `ls src/core/data/hmac.ts` — fails: file doesn't exist
- [x] `grep 'stateSignature' src/schemas/entities/project.ts` — no output (field doesn't exist)
- [x] `bun run test -- tests/unit/data/hmac.test.ts` — fails: test file doesn't exist

**After implementation** (should pass / show presence):
- [x] `ls src/core/data/hmac.ts` — file exists
- [x] `grep 'stateSignature' src/schemas/entities/project.ts` — shows the optional field definition
- [x] `bun run test -- tests/unit/data/hmac.test.ts` — all tests pass: serialization excludes markdown and stateSignature, signing produces consistent output, verification detects tampering, dev key fallback works

### Tasks

- [x] Create `src/core/data/hmac.ts` (use `import type { ProjectState }` from `src/core/tree.ts` — `verbatimModuleSyntax` requires type-only imports for type annotations):
  1. `declare const __GP_HMAC_KEY__: string | undefined` — build-time injection, same pattern as `version.ts`
  2. `getHmacKey(): string` — uses `typeof __GP_HMAC_KEY__ !== "undefined" ? __GP_HMAC_KEY__ : DEV_KEY` (matching the exact pattern from `src/version.ts` — `typeof` guard is required because `--define` replaces the identifier textually and `=== undefined` may behave differently). Dev key constant: `"goodplan-dev-hmac-key"`
  3. `serializeForHmac(state: ProjectState): string` — calls `serializeStateTree(state, { inline: false })` (which replaces markdown with `true`), then strips `stateSignature` from the correct location: the serialized tree has a `"project.json"` node — destructure out `stateSignature` from that node and reconstruct without it (stripping at the wrong level produces a different HMAC). Then runs through `deterministicStringify()`. Canonical ordering comes from the recursive alphabetical key sorting in `deterministicStringify()`. (Note: after `serializeStateTree()` runs, the result is a plain `Record<string, unknown>` — no `StateEntry` types remain, so no exhaustive switch is needed here; that already happens inside `serializeStateTree()`.) **Add a comment on this function noting structural coupling:** the `"project.json"` key destructure assumes a stable tree layout — if the project node is relocated (e.g., entity-restructuring epic), the stripping silently stops working. Recursive stripping would be more resilient but is low priority for current Developing maturity.
  4. `signStateTree(state: ProjectState): string` — calls `serializeForHmac()`, computes HMAC-SHA256 using `new Bun.CryptoHasher("sha256", getHmacKey())`, returns hex digest
  5. `verifyStateTree(state: ProjectState, expectedSignature: string): boolean` — computes signature via `signStateTree()`, converts both hex digest strings to `Buffer` instances, then compares with `timingSafeEqual` (requires equal-length Buffer inputs). Import via `import { timingSafeEqual } from "node:crypto"` (`verbatimModuleSyntax` requires explicit named import). Note: `Bun.CryptoHasher("sha256", key)` two-arg HMAC constructor requires Bun 1.3+ — verify against `bun-types: ^1.3.11` in package.json; fallback is `import { createHmac } from "node:crypto"` with `createHmac("sha256", getHmacKey())` if the Bun API is unavailable.
- [x] Add `stateSignature: z.string().optional()` to `projectSchema` in `src/schemas/entities/project.ts` (use the `exactOptionalPropertyTypes`-safe pattern from the codebase). Use conditional spread `...(signature !== undefined ? { stateSignature: signature } : {})` when setting this field in Phase 2 and Phase 4.
- [x] Create `tests/unit/data/hmac.test.ts`:
  1. `serializeForHmac` excludes markdown entries from output
  2. `serializeForHmac` excludes `stateSignature` from project node
  3. `serializeForHmac` includes JSON and JSONL entries
  4. `serializeForHmac` produces identical output for same state (deterministic)
  5. `signStateTree` produces consistent signature for same state
  6. `signStateTree` produces different signature for different state
  7. `verifyStateTree` returns true for matching signature
  8. `verifyStateTree` returns false for tampered state
  9. `getHmacKey` returns `"goodplan-dev-hmac-key"` (after Phase 3 adds the vitest.config.ts define, the key comes from the define rather than the fallback — test the return value, not the code path)

### Verification

Run `bun run test -- tests/unit/data/hmac.test.ts` — all tests pass. Run `bun run test` — full suite still passes (no regressions from schema change). Run `bun run check` on changed files.

## Phase 2: Write Path Integration

Hook `signStateTree()` into `commitState()` so every state write computes and embeds the HMAC signature atomically.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Create a temp project (`gp init` in `/tmp/test-hmac`), run `gp status --json`, then `jq .stateSignature /tmp/test-hmac/.goodplan/goodplan.json` — field is absent or null

**After implementation** (should pass / show presence):
- [ ] Create a temp project (`gp init` in `/tmp/test-hmac`), then `jq .stateSignature /tmp/test-hmac/.goodplan/goodplan.json` — returns a 64-character hex string
- [ ] Run `gp epic:create` in the temp project, then `jq .stateSignature /tmp/test-hmac/.goodplan/goodplan.json` — signature changes (different hex string than after init)
- [ ] `bun run test -- tests/unit/data/commit.test.ts` — existing tests pass plus new signature tests

### Tasks

- [x] Modify `commitState()` in `src/core/data/commit.ts`:
  1. After `diffTree()` collects `jsonWrites`/`jsonlWrites` but *before* flushing them, compute the signature from `newState` using `signStateTree(newState)` (which calls `serializeForHmac(state: ProjectState)` as defined in Phase 1). This keeps a single serialization API — `serializeForHmac` always accepts `ProjectState`. In practice `newState` content is already post-Zod and the state machine is pure (INV-003), so round-trip discrepancies do not occur.
  2. Do NOT mutate `newState` — create a shallow clone of the project node with `stateSignature` injected using the conditional spread pattern: `{ ...projectNode, ...(signature !== undefined ? { stateSignature: signature } : {}) }`
  3. Run `projectSchema.parse(cloneWithSignature)` on the clone before serializing — this preserves INV-005 (Zod validation on all write paths). Serialize the validated result using `${deterministicStringify(parsed)}\n` (trailing newline matching `processJsonEntry` output format).
  4. Find the existing `jsonWrites` entry for `goodplan.json` by `relativePath`. If it exists, update its `content` with the validated/serialized clone. If it does NOT exist (e.g., `diffTree` skipped `goodplan.json` because only child entities changed), create a new entry with `relativePath` and the validated/serialized clone as `content`. Both sub-cases go through `projectSchema.parse()` — no INV-005 bypass. This ensures the signature is always written.
  5. Flush all writes (JSON atomic writes + JSONL appends) — `goodplan.json` is written once, with the signature already embedded
  6. Then write state cache last (existing behavior)
  This ensures one write, no crash window, and no concurrent modification issues.
- [x] Add tests to `tests/unit/data/commit.test.ts`:
  1. After `commitState`, the written `goodplan.json` contains a `stateSignature` field
  2. The embedded signature verifies against the committed state
  3. Signature changes when state changes (different mutations produce different signatures)
  4. Write-read equivalence: commit state via `commitState()`, read it back via `assembleState()` on the same `projectDir`, extract `stateSignature` from the project node of the reassembled state, call `signStateTree()` on the reassembled state, assert the extracted signature equals the recomputed signature. This proves write-time and read-time serialization paths produce identical canonical strings (not just that the field round-trips trivially).
- [x] Add `--define __GP_HMAC_KEY__` to `tests/global-setup.ts`: add two consecutive array elements matching the existing `__GOODPLAN_VERSION__` pattern: `"--define"`, `"__GP_HMAC_KEY__=\"goodplan-dev-hmac-key\""`. Incorrect quoting causes Bun to treat the value as an identifier, silently falling back to the dev key — integration tests would pass but never test the injected-key path.
  **Why both `global-setup.ts` AND `vitest.config.ts` need defines:** `global-setup.ts` compiles a test binary used by integration/fitness tests (the binary must have the key baked in). `vitest.config.ts` configures Vitest's module transform for unit tests that import source files directly (without it, the `typeof __GP_HMAC_KEY__` guard in `getHmacKey()` would fall through to the dev-key fallback silently). Both produce the string `"goodplan-dev-hmac-key"` at runtime but via different quoting mechanisms — `global-setup.ts` uses escaped quotes in a string array element, `vitest.config.ts` uses `JSON.stringify()`. Confirm parity if either is changed. If one is omitted, the dev-key fallback in `getHmacKey()` silently masks the missing define.

### Verification

Run the temp-project test above manually. Run `bun run test` — full suite passes. Verify that the `.state-cache.json` is written after the signature-embedded `goodplan.json`.

## Phase 3: Read Path Integration

Hook `verifyStateTree()` into the read path. Verify on every load, hard error on mismatch, bootstrap exception for repos without signatures.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] In the temp project from Phase 2, manually edit `.goodplan/goodplan.json` to change a non-signature field (e.g., `"name": "tampered"`), then run `gp status --json` — succeeds (no verification yet on read)

**After implementation** (should pass / show presence):
- [ ] In a temp project, manually edit `.goodplan/goodplan.json` to change `"name"` to `"tampered"`, then run `gp status --json` — hard error (exit 1) with message containing `gp verify --fix`
- [ ] In a temp project with NO `stateSignature` field (pre-HMAC repo), run `gp status --json` — succeeds (bootstrap: missing signature is skipped, not verified). Run any mutation (e.g., `gp epic:create`), then `jq .stateSignature .goodplan/goodplan.json` returns a hex string (embedded by `commitState()`)
- [ ] `bun run test -- tests/unit/data/load.test.ts` — existing tests pass plus new verification tests

### Tasks

- [x] Modify `loadState()` in `src/core/data/load.ts`:
  1. Verify HMAC on any non-cache-hit return path — both the `assembleState()` full-rebuild path AND the `incrementalUpdate()` path. `loadState()` has three paths: (a) cache hit with matching mtimes — trusted, no verification needed; (b) `incrementalUpdate()` — triggered when some directory mtimes changed, re-reads files from disk and patches cached state; (c) full `assembleState()` fallback. Paths (b) and (c) both perform file I/O and are the exact tampering vectors HMAC is designed to catch. An attacker modifying a single JSON file would trigger the incremental path. Verify after `incrementalUpdate()` returns and after `assembleState()` returns, before returning state to the caller. The incremental path already does file I/O, so HMAC computation is marginal additional cost.
  2. On verified paths: check if `stateSignature` exists in the project node. If present: verify via `verifyStateTree()`. On mismatch: throw a `DATA_INTEGRITY_CHECK_FAILED` error (see error code task below) with message `"State integrity check failed. Run 'gp verify --fix' to repair."` (exit code 1 via `DATA_*` prefix)
  3. If absent (bootstrap): skip verification — return state normally. The next `commitState()` call (any mutation) will compute and embed the signature via the Phase 2 write-path integration. For manual repair, `gp verify --fix` provides the explicit path.
  4. Leave existing mtime-based cache invalidation unchanged
- [x] Switch `status.ts` from calling `assembleState()` directly to calling `loadState()` — this ensures HMAC verification runs on that command. `loadState()` already handles zero-state/missing-dir cases (returns `ZERO_STATE` for missing/empty project dirs — see `load.ts` lines 46–53), so the switch is safe. **Update the architectural comment at `status.ts` lines 22–25** (which currently reads "Uses assembleState() (not loadState) — deliberately chosen because it handles fresh/zero-state projects gracefully") to note that `loadState()` now provides the same zero-state behavior and adds HMAC verification. Keep `state.ts` on `assembleState()` with explicit HMAC verification — `state` is a debugging/introspection tool that should always show ground-truth data, and `loadState()` can return cached state on mtime match which could miss same-second writes. Add HMAC verification inline in `state.ts` (check signature if present, throw `DATA_INTEGRITY_CHECK_FAILED` on mismatch). `init.ts` is moot (creates a new project, no existing signature to verify). `gp verify` is the exception — it calls `assembleState()` directly to bypass verification (see Phase 4).
- [x] Add `DATA_INTEGRITY_CHECK_FAILED` to the `DataErrorCode` union and `ALL_ERROR_CODES` array in `src/util/errors.ts`
- [x] Add tests to `tests/unit/data/load.test.ts`:
  1. Load with valid signature — succeeds
  2. Load with tampered state — throws `DATA_INTEGRITY_CHECK_FAILED` error with `gp verify --fix` message
  3. Load with missing signature (bootstrap) — succeeds without error, state returned normally (signature not yet embedded — next mutation embeds it)
- [x] Add `__GP_HMAC_KEY__: JSON.stringify("goodplan-dev-hmac-key")` to `vitest.config.ts`'s `define` map (unit tests import source files through Vitest's module transform, not the compiled binary) — already done in Phase 2

### Verification

Run the tampering test above manually in a temp project. Run `bun run test` — full suite passes (1475+ tests). Verify bootstrap by running `gp init` in a fresh dir (signature appears via `commitState()`), then confirm that a pre-HMAC repo (manually remove `stateSignature`) loads without error. Test that editing a `.goodplan/*.md` file does NOT trigger a signature error (markdown excluded).

## Phase 4: Verify Commands & Build Defines

Add `gp verify` (read-only check) and `gp verify --fix` (recompute) commands. Update build scripts to inject `__GP_HMAC_KEY__`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `gp verify --json` — fails: unknown command
- [x] `grep GP_HMAC_KEY package.json` — no output (define not in build script)
- [x] `grep GP_HMAC_KEY scripts/build-plugin.sh` — no output

**After implementation** (should pass / show presence):
- [x] `gp verify --json` in a valid project — returns `{ "status": "pass" }` with exit 0
- [x] Tamper with `.goodplan/goodplan.json`, then `gp verify --json` — throws `DATA_INTEGRITY_CHECK_FAILED` via `GoodplanError`, formatted per INV-007 as `{ "error": { "code": "DATA_INTEGRITY_CHECK_FAILED", "message": "..." } }` with exit 1
- [x] `gp verify --fix --json` after tampering — returns `{ "status": "fixed" }` with exit 0, subsequent `gp verify` passes
- [x] `grep GP_HMAC_KEY package.json` — shows the define in the build command
- [x] `grep GP_HMAC_KEY scripts/build-plugin.sh` — shows the define in the plugin build command
- [x] `gp schema --json --query '.commands[] | select(.name == "verify")'` — returns an object with `name: "verify"` and an `args` property containing the `--fix` flag definition (type boolean, default false). If the query returns `null` or empty, the command registration or arg key structure is wrong.

### Tasks

- [x] Create `src/commands/global/verify.ts` with citty args definition:
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
  This ensures citty recognizes `--fix` and `gp schema --json` surfaces it to LLM consumers (INV-006).
  1. `gp verify` (no `--fix`): calls `assembleState()` directly (bypassing `loadState()` and its HMAC verification — this is the escape hatch for broken signatures), computes HMAC, compares to embedded signature. **Error handling pattern: catches its own errors (like `state.ts`), not delegating to the top-level handler.** This makes JSON/human output symmetry explicit and keeps the command self-contained — important because `--json` mode requires `{ "error": { "code": "...", "message": "..." } }` on stdout (INV-007), `verify --fix` has both success and failure paths, and the error message must include the fix hint. On pass: uses `output()` with `{ "status": "pass" }` (stdout, exit 0). Human output: green "State integrity: pass (sig: a1b2c3d4)" showing first 8 hex chars of signature (mirrors git short-hash UX; aids debugging). On fail: catches the error and uses `outputError` to format per INV-007 as `{ "error": { "code": "DATA_INTEGRITY_CHECK_FAILED", "message": "State integrity check failed. Run 'gp verify --fix' to repair." } }` (stderr, exit 1). Human output: red error via `outputError()` (stderr). This gets `--quiet` and `--query` handling for free.
  2. `gp verify --fix`: calls `assembleState()` directly, recomputes signature, embeds in `goodplan.json`, validates through `projectSchema.parse()` before writing (preserves INV-005 compliance since this path bypasses `commitState()` and `processJsonEntry`), then writes atomically via exported `atomicWrite()` (export it from `commit.ts` — it's currently module-private; pass `"goodplan.json"` as the `relativePath` parameter for meaningful error messages). Writes ONLY `goodplan.json`, does NOT use `commitState()` (overkill for a single-field metadata update), and does NOT update the state cache. Cache staleness is intentional and resolved on next `loadState()` via mtime invalidation (mtime changes because `goodplan.json` was rewritten) — note that the next command after `--fix` will be slightly slower due to cache miss; this is expected. This is an INV-001 exception (like version-stamp and migrate): signature repair is infrastructure metadata maintenance, not a workflow state transition. `--json` output: `{ "status": "fixed" }` (exit 0). Human output: "State signature recomputed." (stdout via `output()`).
  3. Export `atomicWrite()` from `src/core/data/commit.ts` (currently module-private) so `verify --fix` can use it. **Add a JSDoc comment on the export:** `atomicWrite` is an internal utility — callers outside `commit.ts` should be limited to `verify --fix`; general writes must go through `commitState()`. This prevents future misuse while the Data Layer API surface is still being shaped (Developing maturity). In `verify --fix`, derive the absolute path via `path.join(resolveProjectDir(), "goodplan.json")`, matching the pattern in `status.ts`.
  4. Register command in `src/commands/main.ts` with key `verify: verifyCommand` (un-namespaced global command)
- [x] Document `gp verify --fix` as a third INV-001 exception in `architecture/invariants.md` with rationale: "signature repair is infrastructure metadata maintenance, not a workflow state transition"
- [x] Add `verify` command to `.goodplan/architecture/commands-api.md`: add to the "Global Commands" section (alongside `status`, `state`, `init`, `migrate`, `schema`), documenting both the read-only `gp verify` form (exits 0 on pass, 1 on fail) and the `gp verify --fix` variant (recomputes and re-embeds signature)
- [x] Update `.goodplan/architecture/data-layer-api.md`: add an "HMAC State Integrity" subsection under Contracts describing sign-on-write / verify-on-read behavior and the bootstrap exception (INV-001 carve-out for `verify --fix`). Reflect `commitState()` behavioral change (HMAC computation/embedding) and `loadState()` behavioral change (HMAC verification on non-cache-hit paths)
- [x] Add `--define __GP_HMAC_KEY__` to `package.json` build script. Match the existing `__GOODPLAN_VERSION__` quoting pattern in `package.json` (which uses `'\"'...'\"'`): `--define __GP_HMAC_KEY__='\"'${GP_HMAC_KEY:-goodplan-dev-hmac-key}'\"'`
- [x] Add `--define __GP_HMAC_KEY__` to `scripts/build-plugin.sh`. Match the existing `__GOODPLAN_VERSION__` quoting pattern in that file (which uses `\"...\"`): `--define "__GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-hmac-key}\""`
- [x] Create `tests/unit/commands/verify.test.ts` (or add to existing global command tests):
  1. `gp verify` on valid project returns pass (both JSON and human-readable output)
  2. `gp verify` on tampered project throws `DATA_INTEGRITY_CHECK_FAILED` with exit 1 (JSON: INV-007 error shape; human-readable: red error on stderr)
  3. `gp verify --fix` on tampered project returns fixed (both JSON and human-readable "State signature recomputed." output), subsequent verify passes
- [x] Create `tests/fitness/state-integrity.test.ts`:
  1. `commitState()` always embeds a valid signature (unit-level — the core invariant)
  2. Signature changes when state changes (different mutations produce different signatures)
  3. One representative end-to-end command (e.g., `gp epic:create`) produces a valid signature (integration-level — depends on Phase 2's `global-setup.ts` define change; validates the injected-key path via the compiled binary). **Note:** this test has an implicit dependency on the compiled binary having the `__GP_HMAC_KEY__` define from `global-setup.ts`. If the define is missing, the dev-key fallback makes the test pass vacuously. Verify the test binary was compiled with the define.
  4. Tampering with any schema-registered `.json` file is detected on next read
  5. Editing a `.md` file does NOT invalidate signature

### Verification

Run `gp verify --json` in a temp project — passes. Tamper with a JSON file, verify it fails, fix it, verify it passes again. Edit a markdown file, verify it still passes (markdown excluded). Run `bun run build` and `bun run build:plugin` — both succeed with the new define. Verify `gp schema --json --query '.commands[] | select(.name == "verify")'` returns an object with `name: "verify"` and `args` containing the `--fix` flag definition (citty auto-registers from `main.ts`). Run the full test suite — all tests pass.
