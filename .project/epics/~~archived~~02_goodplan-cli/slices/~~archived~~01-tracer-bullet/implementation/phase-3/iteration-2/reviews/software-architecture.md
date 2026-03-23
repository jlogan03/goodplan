# Software Architecture Review: Phase 3 — Command Framework (Iteration 2)

## Iteration 1 Fix Verification

**IMP-1 (quiet flag unimplemented)**: Fixed correctly. `output()` line 18 checks `args.quiet` and returns immediately, suppressing all output. Tests added for both plain and JSON modes.

**IMP-2 (cross-layer import)**: Fixed correctly. `deterministicStringify` moved to `src/util/json.ts`. `src/util/output.ts` now imports from `./json.js`. `src/core/data/json.ts` imports from `../../util/json.js` and re-exports the function. No Commands-layer code imports from `src/core/data/` — verified by grep.

**IMP-3 (global flag stripping)**: Fixed correctly. `validate.ts` defines `GLOBAL_FLAG_KEYS = new Set(["json", "quiet", "verbose", "help", "version"])` and strips them before merging. Test added (`strips global flags before validation` with a `.strict()` schema) — passes.

**IMP-4 (alias-unaware pre-dispatch check)**: Fixed correctly. `getKnownSubcommands()` is gone entirely. `src/index.ts` relies solely on the try/catch handling of citty's `E_UNKNOWN_COMMAND`, which is alias-compatible. No regression.

**MIN-1 (INTERNAL_ERROR code)**: Fixed. `InternalErrorCode = "INTERNAL_ERROR"` added to the union in `errors.ts`.

**MIN-2 (detail type)**: Fixed. `GoodplanError.detail` is now `string | Record<string, unknown> | undefined`. `errorSchema.detail` updated to match: `z.union([z.string(), z.record(z.string(), z.unknown())]).optional()`.

**MIN-4 (isCLIError comment)**: Fixed. JSDoc explains the duck-type approach and why it is acceptable.

**MIN-6 (--version handling)**: Added. `--version` and `-v` now print `"goodplan 0.0.1\n"` and return.

**MIN-3 (--query flag deferred)**: Still absent from `globalArgs` and `OutputArgs`. Per merged.md, this was `USER_INPUT` — deferral was expected. No `--query` implementation or mention in the codebase.

**MIN-5 (no tests for index.ts and outputUnexpectedError human mode)**: Still unaddressed. `src/index.ts` has no tests; `outputUnexpectedError` human-mode path has no test.

---

## Issues

**[IMPORTANT]** `-v` flag ambiguously handles `--version`, shadowing convention for `--verbose`

`src/index.ts` line 44 checks `rawArgs.includes("-v")` for version output. The global `verbose` flag (defined in `globalArgs`) typically uses `-v` as its short form across CLI conventions. If citty or any command eventually defines `verbose: { type: "boolean", alias: "v" }`, running `goodplan status -v` would print the version string rather than verbose status output. There is no `-v` alias registered in `globalArgs` today, but the pre-dispatch handling will intercept it before citty can route it. Additionally, `--version` is not in the architecture spec as a supported flag — the spec only lists `--json`, `--quiet`, `--query`, `--verbose`, and `--inline`. This is a new surface not covered by the architecture. Consider removing `-v` as a version alias (keep only `--version`) to leave `-v` available for `--verbose` per CLI convention.

File: src/index.ts:44
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `src/core/data/json.ts` re-exports `deterministicStringify`, broadening its apparent API surface

`src/core/data/json.ts` imports `deterministicStringify` from `../../util/json.js` and re-exports it with `export { deterministicStringify }`. This was done to preserve backward compatibility for any existing callers of `deterministicStringify` from the Data Layer module. However, the Data Layer's public API is `readEntity`, `writeEntity`, and JSONL operations — `deterministicStringify` is a general utility that has no business being a Data Layer export. Any caller that later imports `deterministicStringify` from `src/core/data/json.ts` would create the same cross-layer violation that was just fixed. The re-export should be removed. There are no current callers of `deterministicStringify` from `core/data/json.ts` (verified by grep), so removal is safe.

File: src/core/data/json.ts:6
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Human-mode `output()` uses non-deterministic `JSON.stringify` for non-string data

`output()` line 24: when not in JSON mode, non-string data falls back to `JSON.stringify(data, null, 2)`. This uses JavaScript's default key ordering, which is insertion-order for string keys. JSON mode uses `deterministicStringify` (alphabetical). For the current tracer bullet, commands format output as pre-built strings before calling `output()`, so this path is not exercised. But as commands grow, a command may pass a structured object in human mode (e.g., for debug display) and get inconsistent key ordering versus `--json` mode. Consider using `deterministicStringify` in the human fallback path as well, or documenting that commands must pre-format all human-mode output as strings.

File: src/util/output.ts:24
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `outputUnexpectedError` human-mode path still untested

`outputUnexpectedError` in JSON mode writes to `stdout`; in human mode, writes to `stderr`. The test at line 84 only covers the JSON path. The human-mode path (the `else` branch) remains untested. This is the same gap flagged as MIN-5 in iteration 1 and was DIRECTLY_ACTIONABLE — it was not addressed.

File: tests/unit/util/output.test.ts:84
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `src/index.ts` orchestration logic remains untested

`main()` in `src/index.ts` contains: global flag pre-parsing, version handling, help routing, citty CLIError translation, GoodplanError routing, and unexpected error fallback. None of this is tested. The citty error code handling (`E_UNKNOWN_COMMAND`, `EARG`, `E_NO_COMMAND`) and the `isCLIError` type guard are entirely untested. This was MIN-5 in iteration 1 (DIRECTLY_ACTIONABLE) and was not addressed.

File: src/index.ts:36
Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

All three IMPORTANT items from iteration 1 are correctly fixed with no regressions. The cross-layer import is properly resolved: `deterministicStringify` lives in `src/util/json.ts`, and the Data Layer re-imports from there. The global flag stripping is clean and tested. The pre-dispatch alias issue is fixed by removing the check entirely. The detail type widening and `INTERNAL_ERROR` code are properly addressed.

The one remaining structural concern is the IMPORTANT `-v` version flag, which pre-empts the established `-v`=`--verbose` convention before any command can register it. The MINOR items are low-urgency but represent deferred cleanup: the Data Layer re-export of `deterministicStringify` should be removed, the human-mode output fallback should use deterministic stringify, and the two untested paths (outputUnexpectedError human mode, index.ts runner) carry ongoing regression risk. Addressing the IMPORTANT and two leftover MINORs from iteration 1 would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 4
