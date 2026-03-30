# Merged Feedback — HMAC Signatures Plan (Round 2)

### CRITICAL Issues

None.

### IMPORTANT Issues

**IMP-1: `status`/`state` commands call `assembleState()` directly — plan defers decision to implementer**
Reviewers: holistic, software-architecture, typescript

The plan says "Ensure commands that call `assembleState()` directly (like `status`) are addressed: either switch them to use `loadState()` or add verification separately" but makes no definitive choice. Codebase shows `status.ts`, `state.ts`, and `init.ts` call `assembleState()` directly. `init.ts` is moot (creates new project). For `status` and `state`, `loadState()` already handles zero-state/missing-dir cases, so switching is safe. The plan must pick one approach. Recommended: switch `status` and `state` to `loadState()`. `gp verify` already uses `assembleState()` directly by design.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-2: `commitState()` signature injection mutates `newState` in-place — violates immutability contract**
Reviewers: software-architecture, typescript

The plan says to inject `stateSignature` "into the `goodplan.json` entry in `newState`" after `diffTree()`. This mutates the shared `newState` reference from the state machine, which could leak `stateSignature` into post-commit logic (e.g., `nextCommands` computation). The codebase uses immutable tree patterns (`setEntry()`, spread copies). Fix: create a shallow clone of the project node with `stateSignature` injected, and update the `PendingWrite` content from the clone — do not mutate `newState` itself.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-3: `PendingWrite` for `goodplan.json` may not exist after `diffTree()`**
Reviewer: holistic

`diffTree` only produces a `PendingWrite` for `goodplan.json` when its content has actually changed. If the only change is adding `stateSignature` (e.g., a mutation touching only a child entity), `diffTree` may skip `goodplan.json`. The plan must specify: after computing the signature, always ensure a `PendingWrite` for `goodplan.json` exists — either update an existing entry (found by `relativePath`) or create a new one. Alternatively, inject the signature before `diffTree` so it naturally picks up the change (but this conflicts with computing HMAC over the unsigned tree).

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-4: HMAC verification on every cache hit defeats cache performance**
Reviewer: tui-cli

The plan says to verify HMAC in `loadState()` after obtaining state "from either cache hit or `assembleState()` fallback." But HMAC verification requires full tree serialization + HMAC computation on every load, which is more expensive than reading a single file — contradicting the plan's own note that "reading `goodplan.json` on every load defeats the cache's purpose." The cache is trusted because `commitState()` wrote it with a valid signature. External modification is detected by mtime changes, which trigger `assembleState()`. Fix: verify HMAC only on the `assembleState()` fallback path, not on cache hits.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-5: Zod round-trip assumption in HMAC computation is implicit**
Reviewer: typescript

The plan computes HMAC over `newState` (pre-Zod) but `PendingWrite` content is the post-Zod `result.data`. If Zod strips unknown keys or coerces values, the HMAC won't match what's on disk. In practice this shouldn't happen for well-formed data, but the plan should be explicit. Safest approach: compute the HMAC from the actual `PendingWrite` content for `goodplan.json` (minus `stateSignature`) rather than from in-memory `newState`. This guarantees HMAC matches what's written to disk.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-6: `gp verify` failure output uses custom shape instead of INV-007 standard error shape**
Reviewer: tui-cli

The plan specifies `{ "status": "fail", "message": "..." }` for verify failure. This deviates from the standard `{ error: { code, message, detail? } }` shape mandated by INV-007. Skills and LLM agents parse errors using the standard shape. Fix: success cases use `{ "status": "pass" }` / `{ "status": "fixed" }` (normal output). Failure case should throw `DATA_INTEGRITY_CHECK_FAILED` via `GoodplanError`, letting `outputError` format it per INV-007. This also gets `--quiet` and `--query` handling for free.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-7: `gp verify --fix` write mechanism and scope unspecified**
Reviewers: typescript, tui-cli, repo-tooling-docs

The plan says `verify --fix` "recomputes signature, embeds in `goodplan.json`, writes atomically" but doesn't specify: (a) what utility writes it (`atomicWrite` in `commit.ts` is not exported), (b) whether it updates the state cache (cache will have stale `stateSignature`), (c) whether it goes through `commitState()` (overkill for a single-field update). The plan should specify: direct atomic write of just `goodplan.json` (export `atomicWrite` or inline temp+rename), document that cache staleness is handled by mtime invalidation on next `loadState()`, and confirm it writes ONLY `goodplan.json`.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-8: Build define quoting patterns differ between `package.json` and `build-plugin.sh` — plan should show concrete strings**
Reviewer: repo-tooling-docs

`package.json` uses `--define __GOODPLAN_VERSION__='\"'$(node -p ...)'\"'` while `build-plugin.sh` uses `--define "__GOODPLAN_VERSION__=\"$VERSION\""`. The plan mentions "same quoting pattern" but doesn't show concrete strings for `__GP_HMAC_KEY__` in each file. Different quoting strategies in the same build command are fragile. The plan should show the exact string for each location, matching the existing pattern in that file.

Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

**MIN-1: `serializeForHmac` stripping logic needs precise path specification**
Reviewers: holistic, software-architecture, typescript

`stateSignature` lives at `result["project.json"].stateSignature` in the serialized tree, not at the root. The plan should specify: navigate to the `project.json` node, destructure out `stateSignature`, reconstruct without it, then stringify. Stripping at the wrong level would produce a different HMAC.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-2: `tests/global-setup.ts` define syntax must match existing two-element pattern**
Reviewers: holistic, tui-cli, repo-tooling-docs

The existing `__GOODPLAN_VERSION__` define uses two consecutive array elements: `"--define"` then the key=value string. The HMAC key define must follow the same pattern: `"--define"`, `"__GP_HMAC_KEY__=\"goodplan-dev-hmac-key\""`. Incorrect quoting causes Bun to treat the value as an identifier, silently falling back to the dev key — integration tests would pass but never test the injected-key path.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-3: Fitness test "tampering with any `.json` file" should say "schema-registered"**
Reviewer: typescript

The HMAC covers only files in the schema registry. Tampering with non-registered `.json` files would not be detected. The fitness test should clarify: "Tampering with any schema-registered `.json` file is detected on next read."

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-4: `gp verify` human output should specify stdout vs stderr routing**
Reviewer: tui-cli

Pass: stdout via `output()` with `pc.green`. Fail: stderr via `outputError` with `pc.red`. Fixed: stdout via `output()`. The plan mentions colors but not the routing.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-5: Fitness test should specify it uses compiled binary from `global-setup.ts`**
Reviewers: holistic, repo-tooling-docs

The end-to-end fitness test depends on the Phase 2 `global-setup.ts` define change. The plan should note this cross-phase dependency explicitly so the implementer knows the fitness test validates the injected-key path via the compiled binary.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-6: `gp verify` should appear in `schema` command output — add verification step**
Reviewer: tui-cli

Since `verify` is registered in `main.ts`, citty should pick it up automatically. The plan should add a verification step: `gp schema --json | jq '.commands[] | select(.name == "verify")'` after Phase 4.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-7: `gp verify --fix` write utility — `atomicWrite` is not exported**
Reviewer: repo-tooling-docs

`atomicWrite()` in `commit.ts` is module-private. The implementer needs guidance: export it (cleanest, maintains crash-safety), inline temp+rename, or use `fs.writeFileSync` (non-atomic). Plan should specify.

Resolution: DIRECTLY_ACTIONABLE (subsumed by IMP-7)

### DIRECTLY_ACTIONABLE

All 8 IMPORTANT and 7 MINOR issues are directly actionable. Total: 15.

### RESEARCH_NEEDED

None.

### Contradictions Resolved

**Contradiction 1: Cache verification vs. cache performance**
- tui-cli says HMAC verification on every cache hit defeats the cache purpose and recommends verifying only on the `assembleState()` fallback path.
- holistic and software-architecture accept verification on all `loadState()` paths without flagging performance.
- **Resolution:** Trust the tui-cli reviewer (domain specialist for CLI performance patterns). The cache is written by `commitState()` with a valid signature; external modification triggers mtime-based `assembleState()` fallback where HMAC verification runs. Verify on `assembleState()` path only.

**Contradiction 2: `verify --fix` should/should not update state cache**
- tui-cli says `verify --fix` SHOULD update the state cache after writing.
- software-architecture says cache staleness after `verify --fix` is expected and handled by mtime invalidation (simpler, consistent).
- **Resolution:** Trust software-architecture (this is a data-layer concern). Mtime invalidation handles it. Document that cache staleness after `verify --fix` is intentional and resolved on next `loadState()`.

**Contradiction 3: `verify --fix` should/should not use `commitState()`**
- typescript suggests calling `commitState()` as one option (gets schema validation and cache update).
- tui-cli says it should NOT use `commitState()` (overkill for single-field metadata update).
- **Resolution:** Trust tui-cli. `verify --fix` writes only `goodplan.json` with the new signature. Using `commitState()` would require manufacturing old/new state diffs for a single-field change. Direct atomic write is the right scope.

### Unresolved (USER_INPUT required)

None. All issues are directly actionable with clear recommended resolutions.
