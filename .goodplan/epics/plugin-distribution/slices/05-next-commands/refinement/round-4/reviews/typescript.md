# TypeScript and JavaScript Review — Round 4

## Issues

**[IMPORTANT]** `commandMappings` derivation must handle `(none)` and `undefined` `from` values in transition tables

The plan's Phase 1 task 3 describes wildcard expansion for `*(non-terminal)` and `*(pre-activated)`, but the transition tables also use `(none)` (e.g., `createTaskTransitions` has `from: "(none)"`, `createEpicTransitions`, `createSliceTransitions`, `createQuestTransitions`) and the proposed `decisionTransitions` uses `from: undefined` for `CREATE_DECISION`. These represent entity creation (no prior status). The derivation logic description in task 3 says "For each transition `{ from, event, to }`, find matching `commandToEvent` entries by `event` + `entityType`" and "Group by `(entityType, to)`" — which is correct for the `to` side. But the plan doesn't explicitly state how `(none)` and `undefined` `from` values are handled during derivation. Since `commandMappings` is keyed by `(entityType, toStatus)`, creation transitions naturally produce entries under the `to` status (e.g., `"created"` for epics, `"open"` for tasks, `"active"` for decisions). However, the derivation code needs to skip `(none)`/`undefined` from values when building the status-indexed lookup (they shouldn't produce a `commandMappings` entry under a `from` key of `"(none)"`). The plan should note: creation transitions contribute to `commandMappings[entityType][toStatus]` but don't create entries under their `from` value.

Additionally, the plan proposes `decisionTransitions` with `from: undefined` for `CREATE_DECISION`, but every other transition table uses string literal types for `from` (e.g., `"(none)"` in `createTaskTransitions`). Using `undefined` creates a type mismatch — the derivation code would need a union type or type guard to handle both `string | undefined`. Using `"(none)"` for consistency with existing transition tables is simpler and avoids the `undefined` special case.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `as const satisfies ReadonlyArray<...>` pattern needs the full generic type spelled out

Phase 1 task 2 says to use `as const satisfies ReadonlyArray<...>` on the `commandToEvent` array literal. The `satisfies` constraint must include the complete element type: `ReadonlyArray<{ command: string; event: string; entityType: NextCommandsEntityType; template: \`gp ${string}\`; description: string; userFacing: boolean }>`. This is the correct approach for compile-time validation (catches typos in event strings since `event` is typed as `string` but `satisfies` with `as const` preserves literal types for downstream narrowing). However, the plan should note that `event` in the `satisfies` type should be `StateEvent["type"]` (not bare `string`) to get compile-time validation that every event string in `commandToEvent` is a real state event. This gives the compile-time check that the fitness test's event-validity assertion (M11 from round 3) provides at runtime — belt and suspenders.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `(error)` and `(same)` sentinel values in transition tables must be filtered during derivation

Several transition tables include rows with `to: "(error)"` (e.g., `epicRefineTransitions`, `sliceSubmitTransitions`, `epicLifecycleTransitions`) and `to: "(same)"` (e.g., `epicVerifyTransitions`). The plan addresses `(same)` expansion for `epicVerifyTransitions` (wildcard section of task 3) but doesn't mention filtering `(error)` rows. The derivation must skip any transition where `to === "(error)"` — these represent guard failure paths, not reachable statuses. If not filtered, `commandMappings` would contain entries under the key `"(error)"`, which is not a real status and would never be looked up. This is a no-op bug (the entries would be unreachable), but it pollutes the Map and would confuse the fitness test's transition reachability check (task 5.4).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fitness test description drift check imports `commandRegistry` from Commands layer — valid only in test context

Phase 1 task 5.5 says to import `commandRegistry` from `src/commands/global/schema.ts` at test time to verify descriptions differ. This is fine for tests (test files aren't part of the production module graph), but the plan should note that `commandRegistry` is populated via side-effect imports (each command file calls `registerCommand()` when imported). In a test context, `commandRegistry` may be empty unless the test imports the main entry point or the individual command modules that trigger registration. The existing `schema-output-accuracy.test.ts` fitness test likely handles this by importing the right modules. The plan should specify: either import a module that populates the registry (e.g., import all command definition files) or use the same approach as existing fitness tests that access `commandRegistry`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `_testing` export convention is not established in this codebase

The plan proposes `export const _testing = { commandToEvent }` to keep the production API narrow. However, a grep for `_testing` across `src/` shows zero matches — this convention doesn't exist yet. This is fine to introduce (it's a reasonable pattern), but the plan should acknowledge this is a new convention. The alternative — just exporting `commandToEvent` directly — is simpler and consistent with how all transition arrays are already exported (e.g., `export const epicPhaseTransitions`). Since `commandToEvent` is a `ReadonlyArray` with `as const`, consumers can't mutate it. The "narrow public API" concern is valid but may not justify introducing a new convention for a single export. Either approach works; just be deliberate.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is TypeScript-sound. All round-3 issues (I1: resolveEntityName reuse, I2: layering violation for descriptions) are correctly resolved. The `as const satisfies` pattern is the right approach for compile-time event validation. Type definitions (`NextCommandsEntityType`, `CommandMetadataEntry` with template literal type, `CommandEntry`, `NextCommands`) are well-designed. The `noUncheckedIndexedAccess` handling is noted for Map lookups. The remaining issues are all minor: derivation edge cases around sentinel values in transition tables that need explicit handling, and a new convention (`_testing`) that should be a conscious choice.

## Summary
- Critical: 0
- Important: 1
- Minor: 4
