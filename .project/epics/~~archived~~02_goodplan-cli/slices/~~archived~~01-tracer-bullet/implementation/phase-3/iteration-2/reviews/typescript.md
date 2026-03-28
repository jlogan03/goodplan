# TypeScript Reviewer — Phase 3: Command Framework (Iteration 2)

## Round 1 Verification

Two items were flagged in round 1 and reportedly fixed:

1. **`validateInput` global flag leak** — Fixed. `GLOBAL_FLAG_KEYS` now strips `json`, `quiet`, `verbose`, `help`, `version` from args before schema validation. The fix is correct and the test at validate.test.ts:52 confirms it with a strict schema.

2. **`detail` type too narrow** — Partially fixed. `GoodplanError.detail` and `errorSchema.detail` now accept `string | Record<string, unknown>`. However, two follow-on issues were introduced (see Issues below).

---

## Issues

**[CRITICAL]** Unknown commands silently exit 0 — INV-007 violated

citty's `runCommand` only throws `E_UNKNOWN_COMMAND` when `subCommands` is non-empty (`Object.keys(subCommands).length > 0`). Because `mainCommand` declares `subCommands: {}`, the check is bypassed entirely: any positional argument is ignored, no error is thrown, and `main()` exits with code 0 and no output.

Confirmed by running `bun src/index.ts badcommand` — produces no stdout, no stderr, exit 0. The catch block in `main()` that handles `E_UNKNOWN_COMMAND` is dead code for the current `subCommands: {}` registration. INV-007 mandates: "Every error must be surfaced with a namespaced error code…and the correct exit code so callers can reliably detect and handle failures."

Fix: Detect unrecognized positional args manually before dispatching to `runCommand`. After `parseGlobalFlags`, find the first non-flag arg and check it against the known subcommand keys (an empty set for now). If it exists and is not in the known set, construct a `VALIDATION_UNKNOWN_COMMAND` GoodplanError directly and output it. This is also consistent with the existing `parseGlobalFlags` pattern of pre-dispatch inspection.

File: src/index.ts:37-61
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Stale and incorrect comment in `error-output.ts`

The comment added in this iteration says:

```
The inferred type has `detail?: string | undefined`,
which means callers may pass `detail: undefined` explicitly.
```

Both claims are wrong after the round 2 fix:

1. The inferred type is now `detail?: string | Record<string, unknown>` — not `string | undefined`.
2. With `exactOptionalPropertyTypes: true`, `detail?: T` means the property may be absent but if present must be T. Passing `detail: undefined` explicitly is a type error under this setting — the comment claims the opposite.

The comment should be removed or replaced with an accurate note about the union type if warranted.

File: src/schemas/error-output.ts:9-14
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No test for `Record<string, unknown>` detail in `GoodplanError` or `outputError`

The round 1 fix broadened `detail` to accept structured objects. `errors.test.ts` only tests string detail. `output.test.ts` does not test the JSON serialization path when `error.detail` is a `Record`. This leaves the key use-case of the broadened type — machine-readable structured detail — unverified by tests. A single test in `output.test.ts` passing a `GoodplanError` with `detail: { field: "name", issue: "required" }` in JSON mode would be sufficient.

File: tests/unit/util/errors.test.ts, tests/unit/util/output.test.ts
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `validateInput` error detail is a plain Zod message string, losing structure

`validateInput` constructs the `GoodplanError` detail as `result.error.message` — a flattened string. Now that `detail` accepts `Record<string, unknown>`, this could instead pass `result.error.flatten()` (a structured object with `fieldErrors` and `formErrors`). This would allow JSON consumers to parse individual field failures without string-parsing. This is not a correctness issue — the current approach is valid — but a missed opportunity given the type was just broadened.

File: src/util/validate.ts:31-36
Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

The round 1 issues were addressed: global flag stripping works and the `detail` type was broadened. However, a CRITICAL behavioral regression exists: `badcommand` exits 0 with no output, violating INV-007 and breaking the error contract the architecture depends on. The stale comment in `error-output.ts` is a correctness issue (incorrect claim about `exactOptionalPropertyTypes` behavior). Fixing the CRITICAL item and the comment would bring this to 9/10; adding the `Record` detail test would reach 9+.

## Summary
- Critical: 1
- Important: 1
- Minor: 2
