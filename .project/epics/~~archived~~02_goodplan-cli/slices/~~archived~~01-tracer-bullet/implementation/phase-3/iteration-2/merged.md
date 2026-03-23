# Merged Review — Phase 3: Command Framework (Iteration 2)

Reviewers: Software Architecture (9/10), TypeScript (8/10)

## Iteration 1 Fix Verification

All iteration 1 fixes verified as correct by both reviewers:
- **IMP-1** (quiet flag): Fixed. `output()` checks `args.quiet`, tests added.
- **IMP-2** (cross-layer import): Fixed. `deterministicStringify` moved to `src/util/json.ts`.
- **IMP-3** (global flag stripping): Fixed. `GLOBAL_FLAG_KEYS` strips flags before validation. Tested with strict schema.
- **IMP-4** (alias-unaware pre-dispatch): Fixed. Removed `getKnownSubcommands()`; relies on citty's error handling.
- **MIN-1** (INTERNAL_ERROR code): Fixed.
- **MIN-2** (detail type): Fixed — now `string | Record<string, unknown> | undefined`.
- **MIN-4** (isCLIError comment): Fixed with JSDoc.
- **MIN-6** (--version): Added.
- **MIN-3** (--query deferred): Confirmed as expected deferral.
- **MIN-5** (untested paths): Not addressed — carried forward below.

---

## Issues

### CRITICAL

**C-1: Unknown commands silently exit 0 — INV-007 violated** (TypeScript)

citty's `runCommand` only throws `E_UNKNOWN_COMMAND` when `subCommands` is non-empty. With `subCommands: {}`, any positional argument is silently ignored — `bun src/index.ts badcommand` exits 0 with no output. The catch block handling `E_UNKNOWN_COMMAND` is dead code. INV-007 requires every error to surface with a namespaced code and correct exit code.

Fix: After `parseGlobalFlags`, detect the first non-flag arg and check it against known subcommand keys (empty set for now). If unrecognized, construct a `VALIDATION_UNKNOWN_COMMAND` GoodplanError directly.

File: `src/index.ts:37-61`
Resolution: DIRECTLY_ACTIONABLE

---

### IMPORTANT

**I-1: `-v` flag shadows `--verbose` convention** (Architecture)

`src/index.ts` line 44 checks `rawArgs.includes("-v")` for version output. CLI convention reserves `-v` for `--verbose`. Pre-dispatch interception will capture `-v` before citty can route it to any command's verbose flag. Additionally, `--version` is not in the architecture spec's supported flags.

Fix: Remove `-v` as a version alias; keep only `--version`. Leave `-v` available for `--verbose`.

File: `src/index.ts:44`
Resolution: DIRECTLY_ACTIONABLE

---

**I-2: Stale and incorrect comment in `error-output.ts`** (TypeScript)

Comment claims `detail` type is `string | undefined` and that passing `detail: undefined` is allowed. Both are wrong post-fix: type is `string | Record<string, unknown>`, and `exactOptionalPropertyTypes: true` makes explicit `undefined` a type error. Remove or correct the comment.

File: `src/schemas/error-output.ts:9-14`
Resolution: DIRECTLY_ACTIONABLE

---

### MINOR

**M-1: `src/core/data/json.ts` re-exports `deterministicStringify`** (Architecture)

The re-export preserves backward compatibility but no current callers exist. It broadens the Data Layer's API surface beyond its contract and invites future cross-layer violations. Remove the re-export.

File: `src/core/data/json.ts:6`
Resolution: DIRECTLY_ACTIONABLE

---

**M-2: Human-mode `output()` uses non-deterministic `JSON.stringify`** (Architecture)

Non-string data in human mode uses `JSON.stringify(data, null, 2)` (insertion-order keys) while JSON mode uses `deterministicStringify` (alphabetical). As commands grow, objects passed in human mode will have inconsistent key ordering. Use `deterministicStringify` in the human fallback path or document that commands must pre-format human output as strings.

File: `src/util/output.ts:24`
Resolution: DIRECTLY_ACTIONABLE

---

**M-3: `outputUnexpectedError` human-mode path untested** (Architecture — carried from iteration 1)

JSON path is tested; human-mode `stderr` path is not. Ongoing regression risk.

File: `tests/unit/util/output.test.ts:84`
Resolution: DIRECTLY_ACTIONABLE

---

**M-4: `src/index.ts` orchestration logic untested** (Architecture — carried from iteration 1)

`main()` contains global flag pre-parsing, version handling, help routing, citty error translation, and unexpected error fallback — none tested. The citty error code handling and `isCLIError` type guard are untested.

File: `src/index.ts:36`
Resolution: DIRECTLY_ACTIONABLE

---

**M-5: No test for `Record<string, unknown>` detail** (TypeScript)

`detail` was broadened to accept structured objects but tests only cover string detail. A single test with `detail: { field: "name", issue: "required" }` in JSON mode would verify the key use-case.

File: `tests/unit/util/errors.test.ts`, `tests/unit/util/output.test.ts`
Resolution: DIRECTLY_ACTIONABLE

---

**M-6: `validateInput` error detail loses Zod structure** (TypeScript)

`validateInput` passes `result.error.message` (flattened string) as detail. Now that `detail` accepts `Record<string, unknown>`, it could pass `result.error.flatten()` for machine-readable field errors. Not a correctness issue — an improvement opportunity.

File: `src/util/validate.ts:31-36`
Resolution: DIRECTLY_ACTIONABLE

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 1 | C-1 |
| Important | 2 | I-1, I-2 |
| Minor | 6 | M-1 through M-6 |
