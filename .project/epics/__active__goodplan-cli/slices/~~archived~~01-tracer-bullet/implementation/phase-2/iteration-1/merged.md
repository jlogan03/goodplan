# Phase 2 Merged Review: Schemas & Minimal Data Layer

**Reviewers:** Generalist (8/10), Software Architecture (8/10), TypeScript (6/10)
**Merged Score:** 7/10
**Counts:** Critical: 1, Important: 4, Minor: 5

---

## Critical

### C-1: `process.env.GOODPLAN_DIR = undefined` assigns the string `"undefined"`

**File:** `tests/unit/data/project.test.ts` lines 12, 18-21
**Flagged by:** All three reviewers (TypeScript as Critical, others as Important/Minor)
**Resolution:** DIRECTLY_ACTIONABLE

In Node.js/Bun, `process.env.GOODPLAN_DIR = undefined` coerces to the string `"undefined"` (env vars are always strings). Both `beforeEach` and `afterEach` have this bug. The TypeScript reviewer confirms 3 tests fail as a result. Fix: use `delete process.env.GOODPLAN_DIR` when clearing, and in `afterEach`, restore with assignment only if `originalEnv` was defined, otherwise `delete`.

---

## Important

### I-1: `writeEntity` signature omits `expected?` parameter from architecture spec

**File:** `src/core/data/json.ts` line 69
**Flagged by:** Generalist, TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

The `data-layer-api.md` specifies `writeEntity<T>(path, data, schema, expected?)` for concurrent modification detection. Adding the parameter as optional with a no-op when absent is zero-cost and avoids a breaking signature change later. If concurrent modification detection is explicitly deferred to a later slice, document that in a code comment.

### I-2: `resolveProjectDir` naming ambiguity and `GOODPLAN_DIR` not validated

**File:** `src/core/data/project.ts` lines 19-20, 28-29
**Flagged by:** All three reviewers
**Resolution:** DIRECTLY_ACTIONABLE

Three related issues collapsed into one:
1. **Naming:** Function returns the `.project/` path, not the project root. Name is misleading. (TypeScript)
2. **No validation of `GOODPLAN_DIR`:** Walk-up path validates with `existsSync`/`statSync`, but env var path is returned blindly. A typo produces a confusing `DATA_FILE_NOT_FOUND` instead of `DATA_NO_PROJECT`. (Architecture)
3. **Semantic mismatch:** Walk-up returns `.project/` dir; `GOODPLAN_DIR` returns whatever the user set. No normalization or documentation of expected value. (Generalist)

Fix: validate that `GOODPLAN_DIR` path exists and is a directory (throw `DATA_NO_PROJECT` if not). Rename function to `resolveProjectMetaDir()` or add clear doc comment. Document that `GOODPLAN_DIR` must point to the `.project/` directory.

### I-3: `GoodplanError.code` should be a constrained union type

**File:** `src/util/errors.ts` line 2
**Flagged by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

Per INV-007, error codes are namespaced (DATA_*, STATE_*, VALIDATION_*) and map to exit codes. A bare `string` type means typos like `DATA_FILENOT_FOUND` won't be caught at compile time, and Phase 3's exit code mapping will rely on fragile string prefix matching. Define a `GoodplanErrorCode` string literal union starting with the DATA_* codes used in this phase, expand as new namespaces are added.

### I-4: `writeEntity` uses `result.data` (Zod output) instead of original `data` -- normalization risk

**File:** `src/core/data/json.ts` line 79
**Flagged by:** Software Architecture
**Resolution:** MINOR CODE CHANGE (add comment)

Writing `result.data` means Zod `.default()` or `.transform()` could silently alter what's written. This is correct Zod behavior and consistent with the read path, but undocumented. Establish convention: schemas used with `readEntity`/`writeEntity` should avoid `.default()` and `.transform()`, or document that normalization is intentional. A code comment suffices for now.

---

## Minor

### M-1: `GoodplanError` does not set `Error.cause` for wrapped errors

**File:** `src/util/errors.ts` line 5
**Flagged by:** TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

When catching and re-throwing as `GoodplanError` (json.ts lines 43, 93), the original error is stringified into `detail`, losing the error chain. Accept optional `cause` and pass to `super(message, { cause })`.

### M-2: `deterministicStringify` uses `localeCompare` -- locale-sensitive sort breaks determinism guarantee

**File:** `src/core/data/json.ts` line 22
**Flagged by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

`localeCompare` without an explicit locale can vary across machines. For a function guaranteeing INV-002 determinism, use `a < b ? -1 : a > b ? 1 : 0` or `a.localeCompare(b, 'en')`.

### M-3: `versionSchema` regex allows leading zeros

**File:** `src/schemas/shared.ts` line 8
**Flagged by:** Generalist
**Resolution:** DIRECTLY_ACTIONABLE

`/^\d+\.\d+\.\d+$/` accepts `01.02.03`. Stricter: `/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/`.

### M-4: `errorSchema` `.optional()` vs `exactOptionalPropertyTypes`

**File:** `src/schemas/error-output.ts` line 6
**Flagged by:** TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

With `exactOptionalPropertyTypes: true`, Zod's `.optional()` infers `detail?: string | undefined` which differs from the class's `detail: string | undefined` (always present). Align the schema to match the class shape.

### M-5: Test for `GOODPLAN_DIR` priority is weak

**File:** `tests/unit/data/project.test.ts` line 25
**Flagged by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

Test sets `GOODPLAN_DIR` but no `.project/` exists in tmpDir. A stronger test creates both, verifying env var wins over walk-up.

---

## Noted (no action needed)

- **Tab indentation in JSON output** (Generalist, TypeScript): `deterministicStringify` uses `"\t"`. Two reviewers flagged for awareness. Matches existing `.project/` conventions per the Generalist. No change needed unless project convention changes.
- **No test for atomic write behavior** (Generalist): Architecture lists "atomic writes survive interruption" as a fitness function candidate. Not required for this slice.

---

## Conflict Resolutions

| Topic | Conflict | Resolution |
|---|---|---|
| `process.env = undefined` severity | TypeScript: Critical (causes test failures). Others: Important/Minor. | **Critical.** TypeScript reviewer confirmed 3 tests actually fail -- domain-specific expertise wins. |
| `writeEntity` `expected?` param | Generalist: add now. TypeScript: acceptable to defer. | **Important.** Add the optional param with no-op now (zero-cost), or explicitly document deferral. |
| `writeEntity` `result.data` normalization | Architecture: Important. | **Downgraded to Minor** (code comment only). Behavior is correct; just needs convention documentation. |
