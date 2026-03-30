# Software Architecture Review: Phase 2 — Schemas & Minimal Data Layer (Iteration 2)

## Iteration 1 Fix Verification

**I1 — GoodplanErrorCode constrained union**: Fixed correctly. `errors.ts` defines three private union types (`DataErrorCode`, `StateErrorCode`, `ValidationErrorCode`) and exports `GoodplanErrorCode` as their union. The `GoodplanError` constructor and `readonly code` field are both typed to `GoodplanErrorCode`. Typos in error codes now produce compile errors.

**I2 — GOODPLAN_DIR validation**: Fixed correctly. `project.ts` lines 23–30 call `fs.existsSync(envDir)` and `fs.statSync(envDir).isDirectory()` before returning, throwing `DATA_NO_PROJECT` with a message mentioning the env var on failure. The asymmetry between env var and walk-up paths is closed.

**I4 — localeCompare replaced**: Fixed correctly. `sortKeys` in `json.ts` line 22 uses plain lexicographic comparison (`a < b ? -1 : a > b ? 1 : 0`). No `localeCompare` present.

**I3 (MINOR) — writeEntity normalization comment**: A JSDoc comment was added at `json.ts:64–76` documenting that `result.data` is the serialized value and noting that schemas should avoid `.default()` / `.transform()` unless normalization is intentional. The `_expected` parameter is similarly documented as a reserved stub.

**I5 (MINOR) — GOODPLAN_DIR priority test**: Added at `project.test.ts:27` — creates a walk-up `.project/` and a separate `customDir`, sets `GOODPLAN_DIR` to `customDir`, and asserts env var wins.

**I6 (MINOR) — `delete process.env.GOODPLAN_DIR`**: Fixed. Both `beforeEach` (line 13) and `afterEach` (line 21) use `delete process.env.GOODPLAN_DIR` with a `biome-ignore` comment explaining why `= undefined` is incorrect. The `originalEnv` save-and-restore pattern in `afterEach` is also correct.

All six issues from iteration 1 are resolved.

## Issues

**[MINOR]** `writeEntity`'s `_expected` stub creates a latent caller-friction concern

The `_expected` parameter is prefixed `_expected` (suppressing unused-variable warnings) and the JSDoc documents it as "reserved." This is a reasonable stub, but the API surface now commits to a specific signature (`(path, data, schema, expected?)`) before the concurrent modification detection contract is fully specified. The architecture doc (`data-layer-api.md`) says `writeEntity` only does concurrent modification detection *when `expected` is provided*. The current stub silently accepts and ignores any value passed as the fourth argument, which means callers that pass `expected` will not get the protection they expect — the call succeeds even when the on-disk state has diverged. This is acceptable for slice 01 (detection is explicitly deferred), but warrants a `// TODO:` comment that says the stub does NOT currently perform the check, so future callers are not confused when they see the parameter in the signature.

File: src/core/data/json.ts:77
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `errorSchema.code` is typed as `z.string()`, disconnected from `GoodplanErrorCode`

`error-output.ts` defines `errorSchema.code` as `z.string()` (line 4), while `errors.ts` defines `GoodplanErrorCode` as a constrained string literal union. These are the same semantic concept (an error code), but the schema doesn't reference the union. This means the JSON output shape is not type-checked against the actual error code domain. A caller constructing an error response object could pass any string as `code` and it would pass schema validation. Connecting them — e.g., `z.string()` replaced with `z.nativeEnum` or a union from `GoodplanErrorCode` — would close this gap and provide compile-time assurance that output `code` values are always valid error codes.

There is a valid argument for keeping `errorSchema.code` as `z.string()` if the schema is intended to validate incoming JSON (where the set of valid codes could expand in future versions). However, for a closed system where the CLI is the only producer, tying the schema to `GoodplanErrorCode` is the safer default and aligns with INV-007's intent.

File: src/schemas/error-output.ts:4
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `statusResultSchema` uses `z.string()` for `version` and `status` fields — not normalized to shared schemas

`status.ts` line 23 defines `project.version` as `z.string()` rather than importing `versionSchema` from `shared.ts`. The `activeEntityProjection` status field (line 14) is also `z.string()`. While `statusResultSchema` is a read-side projection (not stored on disk), using the same shared schemas for common fields like version maintains consistency and inherits any future validation changes automatically. This is low-risk but goes against the "use generics to make types as concrete and specific as possible" team default.

File: src/schemas/commands/status.ts:14,23
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No test coverage for `writeEntity` with the `_expected` parameter

`json.test.ts` covers write success, validation failure, and round-trip determinism, but has no test for the `_expected` parameter path — not even a test confirming the current behavior (that the param is accepted and ignored). When concurrent modification detection is eventually implemented, having a test for the ignored-param behavior will make the behavioral change explicit. A test that calls `writeEntity(path, data, schema, someExpectedValue)` and asserts it succeeds (today) would document current behavior and serve as a regression anchor when the feature is added.

File: tests/unit/data/json.test.ts:84
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All iteration 1 issues are correctly resolved. The implementation satisfies INV-002 (deterministic key ordering), INV-005 (schema validation on every read/write), and INV-007 (structured errors with typed codes). Module boundaries are clean and dependency direction is correct. The four remaining items are all MINOR — three are small precision improvements to the schema layer, and one is a test gap for deferred functionality. None affect correctness or the invariant surface.

To reach 10/10: connect `errorSchema.code` to `GoodplanErrorCode` for closed-system type safety, add a `// TODO:` to the `_expected` stub, and import `versionSchema` in `statusResultSchema`.

## Summary
- Critical: 0
- Important: 0
- Minor: 4
