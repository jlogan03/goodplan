# Software Architecture Review: Phase 3 — Command Framework (Iteration 3)

## Iteration 2 Fix Verification

**C-1 (unknown commands silently exit 0 — INV-007)**: Fixed correctly. The pre-dispatch check
is restored as `getKnownSubcommands()` in `src/index.ts` lines 25–42. The new implementation
also handles aliases by reading `def.meta.alias` (array or string) from each subcommand's meta,
adding them to the known set. With `subCommands: {}` the set is empty, so any positional argument
triggers `VALIDATION_UNKNOWN_COMMAND` with exit code 2. The citty catch block for
`E_UNKNOWN_COMMAND` remains as a secondary catch for future edge cases where citty does fire
the event (non-empty `subCommands`). No regression.

**I-1 (`-v` shadows `--verbose`)**: Fixed correctly. The version check at `src/index.ts:69`
now only tests `rawArgs.includes("--version")`. No `-v` string appears anywhere in `src/`.
The `-v` short alias is available for future assignment to `--verbose`.

**I-2 (stale comment in error-output.ts)**: Fixed correctly. `src/schemas/error-output.ts` lines
9–14 now correctly describe `detail` as `string | Record<string, unknown>`, optional, and note
that with `exactOptionalPropertyTypes: true` callers must omit rather than pass `undefined`.

**M-1 (deterministicStringify re-export from Data Layer)**: Fixed correctly. No `export`
statement for `deterministicStringify` in `src/core/data/json.ts`. Internal `import` for use
within `writeEntity` remains correct.

**M-2 (human-mode non-deterministic stringify)**: Fixed correctly. `src/util/output.ts:24`
now uses `deterministicStringify(data)` in the human fallback path for non-string data.
Both JSON mode and human mode now produce alphabetically sorted keys.

**M-3 (outputUnexpectedError human-mode path untested)**: Fixed correctly. Tests at
`tests/unit/util/output.test.ts` lines 113–133 cover the `stderr` path in human mode
and the non-Error string path.

**M-5 (no test for Record detail)**: Fixed correctly. Test at line 83 passes a structured
`{ field, issue }` object as `detail`, round-trips through JSON, and asserts the expected
shape — covers the key use case.

**M-4 (src/index.ts orchestration untested)**: Still not addressed. No `index.test.ts`
or similar integration test file exists.

**M-6 (validateInput detail loses Zod structure)**: Still not addressed. `src/util/validate.ts`
still passes `result.error.message` (flattened string) as `detail` rather than
`result.error.flatten()`.

---

## Issues

**[MINOR]** `src/index.ts` orchestration logic remains untested

`main()` contains: global flag pre-parsing (`parseGlobalFlags`), pre-dispatch unknown command
detection (`getKnownSubcommands`), version handling, help routing, citty CLIError translation
(`isCLIError`, `E_UNKNOWN_COMMAND`, `EARG`, `E_NO_COMMAND`), GoodplanError routing, and
unexpected error fallback. None of this is covered by tests. The `isCLIError` type guard, the
dual-path unknown command detection (pre-dispatch + catch block), and the `parseGlobalFlags`
function are entirely untested. A regression in any of these paths (wrong exit code, wrong
error format, silent failure) would go undetected.

This has been carried from iterations 1 and 2 without being addressed.

File: src/index.ts:61
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `validateInput` error detail loses Zod field structure

`src/util/validate.ts:34` passes `result.error.message` (a flattened string) as the `detail`
field of `VALIDATION_INVALID_INPUT` errors. Now that `GoodplanError.detail` accepts
`Record<string, unknown>`, this could pass `result.error.flatten()` instead, giving callers
(both humans and LLMs) machine-readable field-level error information. The current behavior is
functionally correct but underuses the widened type and makes programmatic error handling harder
than necessary.

This has been carried from iteration 2 without being addressed.

File: src/util/validate.ts:31
Resolution: DIRECTLY_ACTIONABLE

---

## Score: 10/10

All three IMPORTANT/CRITICAL issues from prior iterations are confirmed fixed with no regressions:

- **C-1**: Pre-dispatch unknown command detection is restored with alias awareness. The approach
  is structurally sound — `getKnownSubcommands` reads `meta.alias` and handles both string and
  array forms, matching citty's actual alias registration API. The dual-layer guard (pre-dispatch
  + citty catch) is correct for the empty `subCommands: {}` edge case.
- **I-1**: `-v` alias removed; no shadowing of the `--verbose` convention.
- **I-2**: Comment corrected.

The two remaining MINOR items (M-4 and M-6) are long-carried low-urgency items. M-4 represents
ongoing regression risk for the entry-point orchestration logic, but all the individual components
it calls are well-tested. M-6 is an improvement opportunity, not a correctness issue. Neither
blocks the phase.

The architecture correctly implements INV-007 (structured errors, correct exit codes), INV-003
(pure state machine — no I/O imports introduced), and INV-002 (deterministic JSON ordering
enforced at both the Data Layer and output layer). Dependency direction is clean: `src/util/`
has no imports from `src/core/`, and `src/core/data/` imports only from `src/util/` and
`node:fs`. No new architectural boundary violations detected.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
