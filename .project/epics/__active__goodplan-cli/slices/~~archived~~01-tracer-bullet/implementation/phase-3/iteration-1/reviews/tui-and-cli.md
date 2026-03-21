# TUI and CLI Review: Phase 3 — Command Framework

Reviewer: TUI and CLI
Phase: Phase 3: Command Framework
Iteration: 1

## Issues

**[IMPORTANT]** `--quiet` flag is defined but has no effect

The `--quiet` flag is registered in `globalArgs` (main.ts:12-16) and accepted in the `OutputArgs` interface (output.ts:8), but the `output()` function never checks it. The architecture spec says `--quiet` should produce "minimal output (e.g., just the entity name or status)." While no commands use `output()` yet in this slice, establishing the pattern now prevents every future command from having to remember to implement quiet mode individually. At minimum, `output()` should have a branch for `args.quiet` — even if the behavior for this slice is just suppressing output entirely.

File: src/util/output.ts:16
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Custom unknown-command detection may conflict with citty's own subcommand routing as commands are added

The pre-dispatch check in `index.ts:71-83` does `getKnownSubcommands()` and manually validates the first non-flag token. This works today with zero subcommands. However, once real subcommands are registered, there is a subtlety: citty resolves subcommands by both key name and `meta.alias`. The custom check only looks at `Object.keys(subCommands)`, so any command registered with an alias (e.g., `meta: { alias: ["s"] }` for `status`) would fail the pre-dispatch check when invoked by alias. The custom check would fire `VALIDATION_UNKNOWN_COMMAND` before citty gets a chance to resolve the alias.

Recommendation: either (a) also check aliases in the pre-dispatch validation, or (b) remove the pre-dispatch check entirely and rely solely on catching citty's `E_UNKNOWN_COMMAND` error in the try/catch, which already handles this case correctly (index.ts:89-100). The pre-dispatch check is defensive but redundant given the try/catch.

File: src/index.ts:71
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `--version` flag not handled — citty's `runCommand` won't auto-handle it

The plan mentions using `runCommand` instead of `runMain` to avoid the `-v`/`--version` conflict. This is correct, but it also means `--version` won't work at all since `runCommand` doesn't handle it. The `package.json` has `"version": "0.0.1"` but running `goodplan --version` produces no output and exits 0 silently. Consider adding explicit `--version` handling in the custom runner, or document this as intentionally deferred.

File: src/index.ts:47
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Error detail field on `outputError` uses conditional spread but `ErrorOutput` schema allows `detail: undefined`

In `output.ts:35`, the error object conditionally includes `detail` only when `error.detail !== undefined`. This is correct behavior for JSON serialization (avoids `"detail": null` in output). However, the `errorSchema` in `error-output.ts` uses `z.string().optional()`, meaning validation would accept `detail: undefined`. Under `exactOptionalPropertyTypes`, this distinction matters. The implementation is correct as-is — just noting the schema could be tightened with `.optional()` only (which in Zod 4 with exactOptionalPropertyTypes means the key can be absent but not `undefined`). This is cosmetic given the conditional spread already handles it.

File: src/util/output.ts:35
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No test for `output()` in quiet mode

The `output.test.ts` tests JSON mode and human mode but not quiet mode. Even though quiet has no behavior yet (see first issue), adding a placeholder test now sets the expectation for the pattern.

File: tests/unit/util/output.test.ts:35
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid implementation of the command framework. The citty integration is well-done: using `runCommand` instead of `runMain` for error control, pre-parsing global flags for structured JSON errors on unknown commands, and proper exit code mapping. The stdin handling is thorough with good edge case coverage (TTY detection, size limits, non-object JSON rejection). The `validateInput` merge semantics (stdin base, flags override, undefined filtered) are clean.

To reach 9+: fix the alias-incompatible pre-dispatch check (either consolidate into the try/catch or add alias support), and wire up the `--quiet` flag so the pattern is established before commands start using `output()`.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
