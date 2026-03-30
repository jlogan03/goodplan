# TUI and CLI Review (Round 2) — HMAC Signatures Plan

## Issues

**[IMPORTANT]** `gp verify` output shape deviates from INV-007 without sufficient justification

The plan specifies custom status shapes for `gp verify`: `{ "status": "pass" }`, `{ "status": "fail", "message": "..." }`, and `{ "status": "fixed" }`. This deviates from the standard error response shape `{ error: { code, message, detail? } }` mandated by INV-007. The round-1 review raised this but the plan still uses the custom shape without justifying the deviation.

The `pass` and `fixed` cases are successes, so a custom shape is reasonable. But the `fail` case (exit 1) should use the standard error shape — `{ error: { code: "DATA_INTEGRITY_CHECK_FAILED", message: "State integrity check failed. Run 'gp verify --fix' to repair." } }` — to maintain consistency with every other error path in the CLI. Callers (skills, LLM agents) parse errors using the `{ error: { code, message } }` shape; a custom `{ "status": "fail" }` requires special handling.

Suggested fix: success cases use `{ "status": "pass" }` / `{ "status": "fixed" }` (these are normal command output, not errors). Failure case exits with the standard GoodplanError path (throw `DATA_INTEGRITY_CHECK_FAILED`, let `outputError` format it). This also means the shared `output()` function handles `--quiet` and `--query` for the error path automatically.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 read-path verification bypasses the state cache in a confusing way

The plan says `loadState()` should verify the HMAC after obtaining state "from either cache hit or `assembleState()` fallback." But the cache stores `ProjectState` (the typed tree), not raw file bytes. Verifying the HMAC requires serializing the state back through `serializeForHmac()` and comparing. This means every cache hit now pays the cost of a full tree serialization + HMAC computation, which defeats much of the cache's performance benefit.

The plan explicitly says "Leave existing mtime-based cache invalidation unchanged — do NOT add signature-based cache invalidation" and notes "reading `goodplan.json` on every load defeats the cache's purpose." But the plan then adds HMAC verification on every load, which is even more expensive than reading one file — it serializes the entire tree and computes HMAC. This is contradictory.

Consider: HMAC verification at cache write time (already done in Phase 2 — `commitState` embeds the signature), and HMAC verification only on `assembleState()` fallback path (not on cache hits). The cache is trusted because it was written by `commitState()` with a valid signature. External modification is already detected by mtime changes, which triggers `assembleState()`, where HMAC verification would then run. This preserves cache performance while still catching tampering.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `gp verify --fix` as an INV-001 exception needs more precise scoping in Phase 4

The plan says to document `gp verify --fix` as a third INV-001 exception with rationale "signature repair is infrastructure metadata maintenance." This is correct, but the plan should specify exactly what `verify --fix` does and does not write. Currently Phase 4 says it "recomputes signature, embeds in `goodplan.json`, writes atomically." The task should clarify:

1. It writes ONLY `goodplan.json` (not the full state tree, not the cache).
2. It does NOT go through `commitState()` — it does a direct atomic write of `goodplan.json` with the new signature. Using `commitState()` would require old/new state diffs and would trigger a full state write, which is overkill for a single-field metadata update.
3. It should still update the state cache after writing, since the cache now has a stale `stateSignature` value.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 human-readable output conventions not fully specified

The plan says human output for `gp verify` is: green "State integrity: pass" or red "State integrity: fail — run `gp verify --fix` to repair." Per codebase convention (`src/util/output.ts`), errors in human mode go to stderr (via `outputError`), success output goes to stdout (via `output`). The plan should confirm:
- Pass: stdout, green text via picocolors
- Fail: stderr, red text via picocolors (consistent with other error paths)
- Fixed: stdout, plain text

The round-1 review asked about this and the plan now mentions colors, but doesn't specify stdout vs stderr routing for each case.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 `__GP_HMAC_KEY__` define in `tests/global-setup.ts` — value format needs clarification

The plan (Phase 2 task) says to add `--define __GP_HMAC_KEY__` to `tests/global-setup.ts` but the format is ambiguous. Looking at the existing pattern in global-setup.ts (line 27): `` `__GOODPLAN_VERSION__="${pkg.version}"` `` — the value is a quoted string embedded in the define. The HMAC key define should follow the same pattern: `'__GP_HMAC_KEY__="goodplan-dev-hmac-key"'` as a separate array element after `"--define"`.

However, Phase 1 says `getHmacKey()` falls back to the dev key when `__GP_HMAC_KEY__` is undefined. So the global-setup define is technically redundant for unit tests (which go through Vitest transforms, not the compiled binary). It is needed for integration tests that run the compiled binary. The plan should clarify this distinction: Phase 2's global-setup.ts change is for the compiled binary used by integration tests, while Phase 3's vitest.config.ts change is for unit tests that import source files.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `gp verify` should appear in the `schema` command output

The plan doesn't mention updating the `schema` command (INV-006). Since `verify` is registered as a subcommand in `main.ts`, citty's introspection should pick it up automatically via the existing schema generation logic. But the plan should note this as a verification step: after Phase 4, `gp schema --json | jq '.commands[] | select(.name == "verify")'` should return the command's flags and description.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 2 shows significant improvement from round 1 — the error code (`DATA_INTEGRITY_CHECK_FAILED`), INV-001 exception documentation, and bootstrap handling are now addressed. The main remaining concerns are: (1) the `gp verify` failure output shape should use standard error conventions rather than a custom `{ "status": "fail" }` shape, (2) HMAC verification on every cache hit is performance-contradictory — verify on the `assembleState()` path only, and (3) `verify --fix` write scope needs precise specification. To reach 9+: align the verify failure path with INV-007's standard error shape, limit HMAC verification to the non-cached path, and specify exactly what `verify --fix` writes.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
