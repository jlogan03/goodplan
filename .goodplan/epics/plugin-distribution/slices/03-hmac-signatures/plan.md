# Plan: HMAC Signatures

## Overview

Implement embedded HMAC-SHA256 state integrity for the goodplan CLI. After this slice, every Data Layer write computes a signature over all JSON/JSONL state files and embeds it in `goodplan.json`. Every read verifies it — mismatch produces a hard error directing the user to `gp verify --fix`. Two new commands (`gp verify`, `gp verify --fix`) provide standalone verification and repair.

The serialization approach: walk the in-memory `ProjectState` tree, exclude markdown entries and the `stateSignature` field itself, produce a structured JSON object, then run through `deterministicStringify()` for canonical ordering. This reuses the existing deterministic serialization infrastructure (`src/util/json.ts`) and tree-walking patterns.

The HMAC key (`__GP_HMAC_KEY__`) is injected at compile time via `--define`, following the same pattern as `__GOODPLAN_VERSION__` in `src/version.ts`. Dev/test builds use a well-known dev key; CI injects a production secret.

## Phase 1: HMAC Core Module

Create the HMAC signing and verification functions with deterministic serialization, build-time key injection, and schema changes. Unit tests prove the core works before integration.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/data/hmac.ts` — fails: file doesn't exist
- [ ] `grep 'stateSignature' src/schemas/entities/project.ts` — no output (field doesn't exist)
- [ ] `bun run test -- tests/unit/data/hmac.test.ts` — fails: test file doesn't exist

**After implementation** (should pass / show presence):
- [ ] `ls src/core/data/hmac.ts` — file exists
- [ ] `grep 'stateSignature' src/schemas/entities/project.ts` — shows the optional field definition
- [ ] `bun run test -- tests/unit/data/hmac.test.ts` — all tests pass: serialization excludes markdown and stateSignature, signing produces consistent output, verification detects tampering, dev key fallback works

### Tasks

- [ ] Create `src/core/data/hmac.ts`:
  1. `declare const __GP_HMAC_KEY__: string | undefined` — build-time injection, same pattern as `version.ts`
  2. `getHmacKey(): string` — returns `__GP_HMAC_KEY__` if defined, else a well-known dev key constant (e.g., `"goodplan-dev-hmac-key"`)
  3. `serializeForHmac(state: ProjectState): string` — walks the state tree, includes only `JsonEntry` and `JsonlEntry` nodes (skips `MarkdownEntry` and `DirectoryEntry` that only contain markdown), strips `stateSignature` from the project.json node, produces a plain object, runs through `deterministicStringify()`. Lexicographic path sorting comes from the object key sorting in `deterministicStringify()`.
  4. `signStateTree(state: ProjectState): string` — calls `serializeForHmac()`, computes HMAC-SHA256 using `crypto.createHmac('sha256', getHmacKey())`, returns hex digest
  5. `verifyStateTree(state: ProjectState, expectedSignature: string): boolean` — computes signature via `signStateTree()`, compares with timing-safe equality (`crypto.timingSafeEqual`)
- [ ] Add `stateSignature: z.string().optional()` to `projectSchema` in `src/schemas/entities/project.ts` (use the `exactOptionalPropertyTypes`-safe pattern from the codebase)
- [ ] Create `tests/unit/data/hmac.test.ts`:
  1. `serializeForHmac` excludes markdown entries from output
  2. `serializeForHmac` excludes `stateSignature` from project node
  3. `serializeForHmac` includes JSON and JSONL entries
  4. `serializeForHmac` produces identical output for same state (deterministic)
  5. `signStateTree` produces consistent signature for same state
  6. `signStateTree` produces different signature for different state
  7. `verifyStateTree` returns true for matching signature
  8. `verifyStateTree` returns false for tampered state
  9. `getHmacKey` returns dev key when `__GP_HMAC_KEY__` is undefined

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

- [ ] Modify `commitState()` in `src/core/data/commit.ts`:
  1. After all file writes complete (JSON atomic writes + JSONL appends), compute signature via `signStateTree(newState)`
  2. Embed `stateSignature` in the `goodplan.json` node of the new state
  3. Write `goodplan.json` again with the embedded signature (atomic temp+rename, same pattern as existing writes)
  4. Then write state cache last (existing behavior)
- [ ] Add tests to `tests/unit/data/commit.test.ts`:
  1. After `commitState`, the written `goodplan.json` contains a `stateSignature` field
  2. The embedded signature verifies against the committed state
  3. Signature changes when state changes (different mutations produce different signatures)

### Verification

Run the temp-project test above manually. Run `bun run test` — full suite passes. Verify that the `.state-cache.json` is written after the signature-embedded `goodplan.json`.

## Phase 3: Read Path Integration

Hook `verifyStateTree()` into the read path. Verify on every load, hard error on mismatch, bootstrap exception for repos without signatures.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] In the temp project from Phase 2, manually edit `.goodplan/goodplan.json` to change a non-signature field (e.g., `"name": "tampered"`), then run `gp status --json` — succeeds (no verification yet on read)

**After implementation** (should pass / show presence):
- [ ] In a temp project, manually edit `.goodplan/goodplan.json` to change `"name"` to `"tampered"`, then run `gp status --json` — hard error (exit 1) with message containing `gp verify --fix`
- [ ] In a temp project with NO `stateSignature` field (pre-HMAC repo), run `gp status --json` — succeeds (bootstrap: computes and embeds signature automatically), then `jq .stateSignature .goodplan/goodplan.json` returns a hex string
- [ ] `bun run test -- tests/unit/data/load.test.ts` — existing tests pass plus new verification tests

### Tasks

- [ ] Modify the read path (likely `loadState()` or `assembleState()` in `src/core/data/`):
  1. After assembling state, check if `stateSignature` exists in the project node
  2. If present: verify via `verifyStateTree()`. On mismatch: throw a structured error with message `"State integrity check failed. Run 'gp verify --fix' to repair."` and exit code 1
  3. If absent (bootstrap): compute signature via `signStateTree()`, embed in project node, write `goodplan.json` with signature. Log a debug message. Continue normally.
- [ ] Update cache invalidation in `loadState()`:
  1. When reading from cache, compare the cached `stateSignature` against the `goodplan.json` on disk. If they differ, invalidate cache and re-assemble.
  2. This replaces or augments the current mtime-based check for the `goodplan.json` file specifically.
- [ ] Add tests to `tests/unit/data/load.test.ts`:
  1. Load with valid signature — succeeds
  2. Load with tampered state — throws error with `gp verify --fix` message
  3. Load with missing signature (bootstrap) — auto-computes and embeds, subsequent load succeeds
  4. Cache invalidation: modify `stateSignature` on disk, loadState detects and re-assembles
- [ ] Update `tests/global-setup.ts` to include `--define __GP_HMAC_KEY__` in the test binary compilation (use the dev key)

### Verification

Run the tampering test above manually in a temp project. Run `bun run test` — full suite passes (1475+ tests). Verify bootstrap by running `gp init` in a fresh dir and checking that `stateSignature` appears in `goodplan.json`. Test that editing a `.goodplan/*.md` file does NOT trigger a signature error (markdown excluded).

## Phase 4: Verify Commands & Build Defines

Add `gp verify` (read-only check) and `gp verify --fix` (recompute) commands. Update build scripts to inject `__GP_HMAC_KEY__`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `gp verify --json` — fails: unknown command
- [ ] `grep GP_HMAC_KEY package.json` — no output (define not in build script)
- [ ] `grep GP_HMAC_KEY scripts/build-plugin.sh` — no output

**After implementation** (should pass / show presence):
- [ ] `gp verify --json` in a valid project — returns `{ "status": "pass" }` with exit 0
- [ ] Tamper with `.goodplan/goodplan.json`, then `gp verify --json` — returns `{ "status": "fail", "message": "..." }` with exit 1
- [ ] `gp verify --fix --json` after tampering — returns `{ "status": "fixed" }` with exit 0, subsequent `gp verify` passes
- [ ] `grep GP_HMAC_KEY package.json` — shows the define in the build command
- [ ] `grep GP_HMAC_KEY scripts/build-plugin.sh` — shows the define in the plugin build command

### Tasks

- [ ] Create `src/commands/global/verify.ts`:
  1. `gp verify` (no `--fix`): assemble state tree, compute HMAC, compare to embedded signature. `--json` output: `{ "status": "pass" }` (exit 0) or `{ "status": "fail", "message": "State integrity check failed" }` (exit 1). Human output: green "pass" or red "fail" with message.
  2. `gp verify --fix`: recompute signature, embed in `goodplan.json`, write atomically. `--json` output: `{ "status": "fixed" }` (exit 0). Human output: "State signature recomputed."
  3. Register command in `src/commands/main.ts`
- [ ] Add `--define __GP_HMAC_KEY__` to `package.json` build script: `--define "__GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-hmac-key}\""` (env var with dev key default)
- [ ] Add `--define __GP_HMAC_KEY__` to `scripts/build-plugin.sh`: same pattern, reads `GP_HMAC_KEY` env var with dev key default
- [ ] Create `tests/unit/commands/verify.test.ts` (or add to existing global command tests):
  1. `gp verify` on valid project returns pass
  2. `gp verify` on tampered project returns fail with exit 1
  3. `gp verify --fix` on tampered project returns fixed, subsequent verify passes
- [ ] Create `tests/fitness/state-integrity.test.ts`:
  1. Every mutation command (`init`, `epic:create`, `slice:create`, etc.) produces a valid signature
  2. Signature changes after each mutation
  3. Tampering with any `.json` file is detected on next read
  4. Editing a `.md` file does NOT invalidate signature

### Verification

Run `gp verify --json` in a temp project — passes. Tamper with a JSON file, verify it fails, fix it, verify it passes again. Edit a markdown file, verify it still passes (markdown excluded). Run `bun run build` and `bun run build:plugin` — both succeed with the new define. Run the full test suite — all tests pass.
