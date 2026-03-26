# TypeScript and JavaScript Review (Round 3)

## Issues

**[IMPORTANT] `serializeStateTree` exhaustive switch on `StateEntry.type` should use `never` check**
The plan describes `serializeStateTree` with four branches for `DirectoryEntry`, `JsonEntry`, `JsonlEntry`, and `MarkdownEntry`. Given `noUncheckedIndexedAccess: true` and `strict: true` in `tsconfig.json`, the implementation should include an exhaustive switch on `entry.type` with a `default: never` case (e.g., `const _exhaustive: never = entry;`). This ensures that if a new `StateEntry` variant is added to `src/core/tree.ts` in the future, `serializeStateTree` will produce a compile-time error rather than silently returning `undefined`. The plan's task description should mention this pattern.

Suggested fix: Add to the `serializeStateTree` task: "Use a `switch` on `entry.type` with an exhaustive `default` case (`const _exhaustive: never = entry; throw new Error(...)`) to catch new entry types at compile time."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `--quiet` flag behavior unspecified for the state command**
The plan explicitly says the state command never calls `output()` and writes JSON directly via `deterministicStringify()` + `process.stdout.write()`. However, it does not specify how `--quiet` is handled. The `output()` function normally handles `--quiet` by suppressing output (lines 30-31 of `output.ts`). Since the state command bypasses `output()`, the implementer must explicitly check `args.quiet` and suppress output. The plan mentions `--json` has no effect, but does not address `--quiet`. Without this, `goodplan state --quiet` would still emit the full state tree, violating the `--quiet` contract that exists across all other commands.

Suggested fix: Add to the state command task's consolidated description: "Check `args.quiet` before writing -- if true, return without output. The `--quiet` flag suppresses output as in all other commands."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `serializeStateTree` return type `Record<string, unknown>` only covers root call -- recursive calls return mixed types**
The plan specifies `serializeStateTree(state: ProjectState, options: { inline: boolean }): Record<string, unknown>`. The return type `Record<string, unknown>` is correct for the public API since the root is always a `DirectoryEntry`. However, internally the function must recurse, and the recursive helper will return `unknown` (since `JsonEntry<T>` serializes to `T`, `MarkdownEntry` to `true | string`, etc.). The plan should clarify that the public function signature uses `Record<string, unknown>` but the internal recursive helper returns `unknown`, to prevent the implementer from trying to force all branches to return `Record<string, unknown>`.

Suggested fix: Add a note: "Internal recursive helper returns `unknown`; the outer function casts the root result to `Record<string, unknown>` since `ProjectState` is always a `DirectoryEntry`."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `Number()` vs `parseInt()` for offset/limit parsing -- `Number("")` returns 0 which may be unexpected**
The plan specifies parsing offset/limit via `Number()`. Note that `Number("")` returns `0`, meaning `--offset ""` (which citty could deliver for `--offset=`) would be parsed as 0 rather than flagged as invalid. `parseInt("", 10)` returns `NaN` for empty strings, which would hit the validation path. Since citty delivers flag values as strings and an empty string for `--offset=` without a value is plausible, `parseInt(value, 10)` with explicit `NaN` check would be safer. Alternatively, the plan could add an explicit empty-string guard before `Number()`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Error handling for `assembleState` failure in state command not specified**
The state command calls `assembleState(dir)` which can throw `DATA_VALIDATION_ERROR` if JSON/JSONL validation fails (see `src/core/data/assemble.ts` lines 43-52). The plan does not specify how this error propagates. Looking at `src/index.ts`, the top-level error handler catches `GoodplanError` and maps it to exit codes. Since the state command bypasses `output()`, if `assembleState` throws, the error would bubble to the top-level handler which calls `outputError()` -- this is fine since `outputError()` handles JSON/human formatting. However, the state command always outputs JSON, so the error should also be JSON. The top-level handler uses `globalFlags.json` to decide format, but `--json` is not required for `state`. If a user runs `goodplan state` (no `--json`), an assembleState error would be formatted as human-readable on stderr -- inconsistent with the state command's always-JSON contract. The plan should note that the state command should catch assembleState errors and format them as JSON directly, or document that error formatting is delegated to the top-level handler (accepting the format inconsistency for errors).

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-2 issues have been cleanly addressed. The plan now clearly specifies: output() bypass, offset/limit flag descriptions with --query requirement, parseInlineBudget coercion comment, manual vs automated verification distinction, offset/limit validation, test naming convention, and version placeholder. The remaining issues are refinements: exhaustive type switching for future-proofing, --quiet handling in the output-bypass path, and minor edge cases in number parsing and error formatting. None are blockers. To reach 10: add the exhaustive switch pattern and --quiet handling to the state command task.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
