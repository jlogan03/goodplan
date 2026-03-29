# Software Architecture Review: Phase 1 — State Command & Version

## Issues

**[IMPORTANT]** Exit code logic in `state.ts` duplicates `exitCodeForError()` and may diverge

The state command manually computes exit codes at lines 100-104 of `src/commands/global/state.ts` using `error.code.startsWith("VALIDATION_")` and `error.code.startsWith("STATE_")` logic. This duplicates the existing `exitCodeForError()` function in `src/util/output.ts:93-100`, which is the canonical mapper used by the top-level error handler in `src/index.ts:133`. If exit code mappings change (e.g., adding a new namespace), these two locations could diverge silently.

The state command should import and use `exitCodeForError(error)` instead of re-implementing the mapping. The function already handles GoodplanError correctly and returns the right exit codes.

File: src/commands/global/state.ts:100
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Error handling in `state.ts` duplicates the `outputError()` pattern

The error formatting logic at lines 91-106 of `state.ts` reconstructs the structured error JSON object inline, duplicating the pattern in `outputError()` from `src/util/output.ts:46-63`. While the state command has a valid reason for bypassing `output()` (always-JSON semantics), the error formatting should still reuse `outputError()` — that function already writes structured JSON to stdout when `args.json` is true. Since the state command always behaves as-if JSON mode, it can call `outputError(error, { json: true })` followed by `process.exitCode = exitCodeForError(error)`.

This matters because the error output shape (`{ error: { code, message, detail? } }`) is documented in INV-007 and must stay consistent. Duplicating the construction means two places to update if the shape changes.

File: src/commands/global/state.ts:91
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `serialize.ts` placed in Data Layer despite being a pure transformation

The plan noted that `src/core/data/serialize.ts` is a pure transformation with no I/O, and that placing it outside the Data Layer (`src/core/serialize.ts`) would keep the Data Layer focused on entity CRUD and filesystem I/O. The implementation placed it in `src/core/data/`. This is acceptable (the plan called it "either location works without circular dependencies"), but it blurs the Data Layer's responsibility boundary slightly. The Data Layer architecture description says it handles "Entity CRUD and all filesystem I/O" -- a pure serialization function does neither.

Not blocking since the plan approved either location, but worth noting for future subsystem boundary tightening.

File: src/core/data/serialize.ts:1
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `as const` on citty arg type literals is redundant noise

In `state.ts` lines 32-44, all arg type declarations use `type: "string" as const`. The existing `status.ts` command does not use `as const` for its arg type declarations. This is inconsistent with the codebase pattern. The `as const` is not needed here -- citty accepts string literals without it, and `globalArgs` (which is spread into the same object) does not use `as const` either.

File: src/commands/global/state.ts:32
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Formatting-only changes in `schema.ts` add review noise

The diff to `src/commands/global/schema.ts` contains substantial formatting-only changes (import reordering, line-breaking of function arguments and `registerCommand` calls) alongside the actual feature change (registering the `state` command). This is fine -- likely from a formatter run -- but worth noting that the actual behavioral change is just the `registerCommand("state", ...)` block (lines 117-131 in the new file). All other changes are whitespace/formatting only.

File: src/commands/global/schema.ts
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is architecturally sound. The state command correctly implements the read-only data access pattern (Commands -> Data Layer, bypassing RPC and State Machine). The serialization function is clean with exhaustive pattern matching and proper type narrowing. The command correctly bypasses `output()` for always-JSON semantics and handles `--query`/`--offset`/`--limit` pagination correctly by calling `applyQuery()` manually as the research recommended.

To reach 9+: fix the exit code and error formatting duplication (the two IMPORTANT issues). These are not just cosmetic -- they create a maintenance risk for INV-007 compliance since the error output shape and exit code mapping are now defined in two places.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
