# TypeScript Review — Round 5

## Issues

**[MINOR]** `decision.ts` has no exported transition array — plan's prerequisite task must add one from scratch

The plan's Phase 1 prerequisite task says to "export `decisionTransitions` derived from the internal `VALID_DECISION_TRANSITIONS` record." Reading `src/core/state/transitions/decision.ts` confirms there is currently no exported array at all — only two handler functions and an internal `VALID_DECISION_TRANSITIONS` Record. The plan already accounts for this (it says "export ... derived from"), but there is a subtle type-level wrinkle: the existing `VALID_DECISION_TRANSITIONS` record does not distinguish the "same-status update" case (`active → active`) — it merely allows `active` in the set for `active`. The implementer will need to explicitly add the `{ from: "active", event: "UPDATE_DECISION", to: "active" }` row (the plan does include it) rather than mechanically iterating the Record entries, because iterating would produce duplicate entries for `active → active`, `active → revisiting`, and `active → superseded` from the same key. The plan's explicit list handles this correctly, but only if it is treated as a literal specification, not a derivation. Worth calling out so the implementer does not write a generic loop over `VALID_DECISION_TRANSITIONS` and end up with duplicate entries or a missing self-transition row.

Resolution: DIRECTLY_ACTIONABLE — add a note in Phase 1 task 1 clarifying that `decisionTransitions` must be written as an explicit literal array (not auto-derived from `VALID_DECISION_TRANSITIONS`) because the self-transition row (`active → active`) cannot be inferred from the set-membership entries alone.

---

**[MINOR]** `NextCommandsEntityType` excludes `"project"` and `"rollup"` — but `"task"` is also an unusual participant

The plan defines `type NextCommandsEntityType = Exclude<Target["type"], "project" | "rollup">`, leaving `"task"` and `"decision"` included. Tasks only have three statuses (`open`, `converted`, `dropped`) and decisions use JSONL identity (`id`) rather than `name`. Both are already handled by `resolveEntityName(target)`. The issue is on the type narrowing path in `computeNextCommands`: the function receives a `Target` but must narrow to `NextCommandsEntityType` before the `commandMappings` lookup. The plan says to call `commandMappings.get(target.type)` — if `target` is typed as `Target` (not `NextCommandsEntityType`), calling `.get(target.type)` with `target.type = "project"` or `"rollup"` would be a type error after the `Exclude`. The plan implies a guard but does not spell it out. The implementer needs to either narrow `target.type` to `NextCommandsEntityType` before the lookup (e.g., a type guard function `isNextCommandsTarget(t): t is Extract<Target, { type: NextCommandsEntityType }>`) or accept `Target` and use a conditional that returns `{ entity: [], other: [] }` for excluded types. With `noUncheckedIndexedAccess` in play, the safe fallback is the `?.get()` chain the plan mentions — but be explicit about the type narrowing approach, since the `Exclude` type won't prevent calling the function with a `project` target at the call sites if the signature accepts `Target`.

Resolution: DIRECTLY_ACTIONABLE — add a note in Phase 1 task 4 specifying how `target.type` exclusion is enforced: either a type guard at the function body entry point, or documenting that the `?.get()` chain gracefully returns `undefined` for unmapped types, producing `{ entity: [], other: [] }`.

---

**[MINOR]** `as const satisfies ReadonlyArray<...>` on `commandToEvent` — the `template` field uses a template literal type that `as const` alone cannot narrow

The plan uses `as const satisfies ReadonlyArray<{ ...; template: \`gp ${string}\`; ... }>`. The `satisfies` check will verify each `template` value matches `` `gp ${string}` `` at compile time. However, `as const` applied before `satisfies` makes each `template` value a specific string literal type (e.g., `` "gp epic:explore --epic {name}" ``), which satisfies `` `gp ${string}` `` trivially. This is the correct and intended pattern — no issue with the approach. The one wrinkle: the `event` field typed as `StateEvent["type"]` in the `satisfies` constraint (per M4, which was already resolved in R4 and is reflected in the plan) needs the import of `StateEvent` from `../../schemas/state-events.js`. The plan correctly calls this out. Confirmed: `StateEvent` is already imported in `begin.ts` from `../../schemas/state-events.js` — same relative path works from `next-commands.ts` if it lives in `src/core/rpc/`. No issue, just confirming this import is correct.

Resolution: No action needed — confirming the import path is valid.

---

**[MINOR]** Fitness test's "forward check" relies on static file scanning — spec is vague about how it identifies mutation commands

Phase 1 task 5.2 says: "For every user-facing command in `src/commands/` that calls `begin()`, `complete()`, or `submit()`." The existing fitness tests use `collectTsFiles()` from `tests/fitness/helpers.ts` and source-level grep for specific patterns. The existing `mutation-through-state-machine.test.ts` uses regex scanning. The new fitness test's forward check needs to scan command files for `begin(`, `complete(`, or `submit(` call patterns, then match the command's template to a `commandToEvent` entry. However, deriving the `template` for a command file from a source scan is nontrivial — the command name must be extracted from the file, and the `commandToEvent` `template` includes argument patterns. The plan does not specify how the forward check derives the "template" to match against `commandToEvent` — it says "verify there exists a `commandToEvent` entry with a matching template" without explaining the matching heuristic.

A simpler and more robust alternative: match on `command` (the citty command name, e.g., `epic:create`) rather than on `template`. The `command` field in `commandToEvent` is the citty name, which can be extracted from the file path (e.g., `src/commands/epic/create.ts` → `epic:create`). This is deterministic and avoids parsing template strings.

Resolution: DIRECTLY_ACTIONABLE — add a note in Phase 1 task 5.2 clarifying that the "matching" is done by deriving the command name from the file path (e.g., `epic/create.ts` → `epic:create`) and checking for a `commandToEvent` entry with that `command` value, not by matching template strings.

---

**[MINOR]** `computeNextCommands` result for `"(none)"` creation transitions — the plan should clarify what happens when `newStatus` is `"(none)"`

The `decisionTransitions` array includes `{ from: "(none)", event: "CREATE_DECISION", to: "active" }`. After `decision:create`, the RPC result has `newStatus: "active"`, not `"(none)"` — so `computeNextCommands` receives `"active"` and the lookup works correctly. The `"(none)"` value only appears as a `from` in transition tables, never as a `to`, so it will never be passed as `newStatus` to `computeNextCommands`. This is fine. However, the fitness test's "transition reachability check" (task 5.3) should not attempt to look up `commandMappings[entityType]["(none)"]` as if it were a reachable target status. The derivation logic already skips `"(none)"` `to` values (there are none — all creation transitions have concrete status as `to`), but the fitness test needs to be careful not to iterate over `from: "(none)"` entries and treat them as target statuses.

Resolution: DIRECTLY_ACTIONABLE — add a note in Phase 1 task 5.3: the transition reachability check iterates over `commandMappings` keys (target statuses), not over transition `from` values. Since `"(none)"` only appears as `from`, it will never be a `commandMappings` key and needs no special handling in the reachability check.

## Score: 9/10

The plan is strongly typed, correctly leverages `noUncheckedIndexedAccess` patterns (safe `?.get()` chains), uses `satisfies` for compile-time event validation, and the `Exclude<Target["type"], ...>` approach for `NextCommandsEntityType` is clean. R4's IMPORTANT issues (I1 `(error)` filtering, I2 `(same)` generic expansion, I3 `"(none)"` sentinel) are all resolved in the plan. The remaining issues are minor clarifications about implementation precision. The plan would reach a 10 if it spelled out the type narrowing approach in `computeNextCommands` and the fitness test's command-matching heuristic.

## Summary

- Critical: 0
- Important: 0
- Minor: 4
