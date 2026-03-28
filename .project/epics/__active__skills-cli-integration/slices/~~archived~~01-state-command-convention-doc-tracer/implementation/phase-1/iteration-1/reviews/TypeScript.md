# TypeScript Review: Phase 1 — State Command & Version

## Issues

**[IMPORTANT]** Exit code logic duplicated between `state.ts` and `exitCodeForError()`
The state command at lines 100-104 manually maps error codes to exit codes using `error.code.startsWith("VALIDATION_") ? 2 : error.code.startsWith("STATE_") ? 3 : 1`. This is an exact duplication of `exitCodeForError()` in `src/util/output.ts` (lines 93-100). If the exit code mapping ever changes, these will drift apart. The state command should call `exitCodeForError(error)` instead of reimplementing the logic.
File: src/commands/global/state.ts:100
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `parseNonNegativeInt` rejects valid integer inputs with leading zeros or whitespace via `String(parsed) !== value` check
The validation `String(parsed) !== value` is stricter than necessary — it rejects inputs like `"02"` or `"  5  "` (though citty likely trims). More importantly, `parseInt("10abc", 10)` returns `10` and `String(10) === "10"` is false because `"10abc" !== "10"`, so this actually works correctly for trailing garbage. However, the `String(parsed) !== value` check also rejects `"+5"` which `parseInt` would accept as `5`. This is actually fine for CLI flags — being strict is good. The real concern is: `parseInt("0", 10)` returns `0`, `String(0) === "0"` passes, so zero is accepted. This is correct per "non-negative". No actual bug, downgrading concern. Retracted — no issue after analysis.

**[MINOR]** `as const` on string type literals in args is unnecessary
In `state.ts` lines 30, 37, 43, the arg definitions use `type: "string" as const`. The `globalArgs` in `global-args.ts` already uses `as const` on the entire object. When spreading `globalArgs` and adding new properties inline, `as const` on individual `type` fields is harmless but unnecessary noise if the whole args object isn't frozen with `as const`. This is consistent with the existing `status.ts` pattern though, which doesn't use `as const` on individual fields either — `status.ts` just uses plain strings. The `as const` here doesn't hurt and may help citty's type inference, so this is purely cosmetic.
File: src/commands/global/state.ts:30
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Inline arg empty-string handling may mask citty behavior changes
In `state.ts` line 52, `args.inline === "" ? undefined : args.inline` handles citty's behavior of delivering `""` for absent optional string flags. This is documented in a comment, which is good. However, if citty's behavior changes, this could silently break. Consider adding a brief unit test that exercises the state command with `inline: ""` to document this assumption.
File: src/commands/global/state.ts:52
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Import reordering in `schema.ts` is cosmetic churn
The diff for `schema.ts` includes significant reformatting (import reordering, line-wrapping of `registerCommand` calls) alongside the actual state command registration. While the formatting is correct and likely from a formatter, it inflates the diff and makes the actual change (the `registerCommand("state", ...)` block at lines 117-131) harder to spot in review. Not an issue per se — just noting for awareness.
File: src/commands/global/schema.ts
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is well-structured, follows existing patterns closely, and handles edge cases thoughtfully. Type safety is good — `import type` is used correctly for type-only imports in `serialize.ts`, the exhaustive switch with `never` is idiomatic, and the `Record<string, unknown>` return type contract is properly documented. The main deduction is for the duplicated exit code logic (IMPORTANT) which creates a maintenance risk. Fixing that single issue would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
