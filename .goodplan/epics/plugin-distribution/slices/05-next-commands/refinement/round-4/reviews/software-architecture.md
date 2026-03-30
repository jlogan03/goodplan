# Software Architecture Review — Round 4

Plan: nextCommands (slice 05)
Reviewer: software-architecture
Iteration: 4

## Issues

**[IMPORTANT]** `computeNextCommands` receives `newStatus: string` but the RPC layer already has the full `Target` and both old/new states — passing only a string loses information needed for correct `(same)` wildcard resolution

Phase 1 task 4 defines `computeNextCommands(target: Target, newStatus: string): NextCommands`. The `newStatus` parameter is a plain string, which is correct for the `commandMappings` lookup. However, looking at the actual RPC integration points (`begin.ts` lines 82-86, `submit.ts` lines 64-68, `complete.ts` lines 78-81), the result-building functions already extract `newStatus` from the state tree. The plan doesn't specify *where* in the RPC functions to call `computeNextCommands` or how to extract `newStatus`.

In `begin.ts`, `buildBeginResult()` already extracts `newStatus` from the new state. The cleanest integration would call `computeNextCommands(target, beginResult.newStatus)` after `buildBeginResult()` returns. Same for `submit.ts` (`buildSubmitResult()` already returns `newStatus`) and `complete.ts` (`buildCompleteResult()` returns `newStatus`). The plan's Phase 2 tasks say "after computing the result, call `computeNextCommands()`" which is correct but could be more precise: call it with the `newStatus` from the already-built result object, not by re-extracting status from state.

This is minor ambiguity, not a structural problem. The integration pattern is clear enough for an implementer who reads the existing code.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Fitness test description drift check (Phase 1 task 5.5) creates a compile-time dependency from test code on `commandRegistry` — acceptable for tests but the plan should acknowledge this

Phase 1 task 5.5 says: "import `commandRegistry` from `src/commands/global/schema.ts` and verify that every `commandToEvent` entry has a description that is non-empty and differs from the `commandRegistry` help text." Importing `commandRegistry` in test code pulls in the full command schema registration graph (all Zod schemas, all command definitions) because `schema.ts` has side-effect `registerCommand()` calls. This is acceptable in test code (tests already import broadly), but the plan should note that this import is test-only and must never migrate to production code. The test file is in `tests/fitness/` which is a safe location.

Also, `commandRegistry` is populated via `registerCommand()` side-effect calls scattered across `schema.ts`. If the test imports `commandRegistry` before `schema.ts` runs its module-level code, the map could be empty. In practice, Vitest runs module-level code on import, so this works — but the test should assert `commandRegistry.size > 0` as a sanity check before running the drift comparison.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `decisionTransitions` and `taskLifecycleTransitions` prerequisite exports use a different `from` type than other transition arrays

Looking at the existing transition arrays, they use `EpicStatus`, `SliceStatus`, etc. for the `from` field (or special values like `"*(non-terminal)"`, `"*(pre-activated)"`, `"(none)"`). The plan correctly identifies the full entry set for `decisionTransitions`, but the `from` value for `CREATE_DECISION` is `undefined` (to represent "no prior status"). All other creation events use `"(none)"` as the string sentinel (see `createTaskTransitions` line 90 of `task-create.ts`: `from: "(none)"`). The plan says `from: undefined` — this would require a different type signature (`from: string | undefined`) vs the existing `from: string` pattern.

Fix: Use `"(none)"` as the `from` sentinel for `CREATE_DECISION` (matching `createTaskTransitions`, `createEpicTransitions`, etc.), not `undefined`. Update the plan's explicit entry list to show `{ from: "(none)", event: "CREATE_DECISION", to: "active" }`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Wildcard expansion logic needs access to the full status enum for each entity type — plan doesn't specify where these come from

The plan describes expanding `*(non-terminal)` to all non-terminal statuses and `*(pre-activated)` to pre-activation statuses. The derivation code in `next-commands.ts` needs to know the full set of statuses for each entity type to perform this expansion. The existing transition tables don't export the full status set — they export individual transition arrays. The status types (`EpicStatus`, `SliceStatus`, etc.) are defined in the schema files (`src/schemas/entities/epic.ts`, etc.) but as TypeScript types, not runtime arrays.

The implementation will need either: (a) import the Zod schemas and extract `.options` from the status enum schemas, (b) derive the status set from the union of all `from`/`to` values in the transition arrays, or (c) hardcode the expansion sets. Option (b) is most aligned with the derivation constraint — the status set is itself derived from the transition tables. The plan should specify which approach to use. Option (a) creates a dependency on schemas (acceptable for RPC layer), option (b) may miss statuses that only appear as `from` in error rows (those marked `to: "(error)"`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `(same)` and `(error)` sentinel values in transition tables need filtering during derivation

Several transition arrays include `to: "(same)"` (e.g., `epicVerifyTransitions`) and `to: "(error)"` (e.g., `epicLifecycleTransitions` line 175). The derivation logic must skip `(error)` rows entirely (they represent guard failures, not valid transitions) and expand `(same)` to mean `to === from` for each expanded status. The plan mentions `(same)` expansion for `epicVerifyTransitions` but doesn't explicitly state that `(error)` rows must be filtered out. An implementer reading only the plan might include error transitions in the registry.

Fix: Add an explicit note in Phase 1 task 3: "Skip transition entries where `to` is `(error)` — these represent guard failures, not valid state transitions."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** The `other` section's cross-entity creation commands are hardcoded — plan should make this explicit as a maintenance point

The plan says the "other" section is "a pragmatic exception to the derivation constraint." This is architecturally sound — cross-entity creation commands genuinely can't be derived from transition tables. However, the plan doesn't specify exactly where this list lives or how it's maintained. It should be a small constant array in `next-commands.ts` (e.g., `const OTHER_CREATION_COMMANDS = [...]`) that the fitness test can verify against the actual creation command files. The fitness test (Phase 1 task 5) should include a check that every entry in this array corresponds to an actual creation command.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Module depth assessment: `next-commands.ts` is appropriately deep

The proposed module has a small public API (3 types + 1 function + 1 `_testing` export) hiding significant internal complexity (transition table import, wildcard expansion, `commandToEvent` mapping, `commandMappings` derivation, entity/other section assembly, template interpolation). This is a well-designed deep module. The `_testing` export for fitness tests is a reasonable pattern that keeps the production API narrow while enabling verification. No issue here — noting for completeness.

## Score: 9/10

The plan is architecturally sound after the round 3 fixes. The registry derivation from existing transition tables maintains the "single source of truth" principle. Module boundaries are clean (RPC layer only, no Commands layer dependency). The 3-point RPC integration (begin/submit/complete) is the right abstraction level — command files need zero changes. The remaining issues are specification precision (sentinel value handling, wildcard expansion sources, `(error)` filtering) rather than structural problems. Addressing the 2 IMPORTANT and 4 MINOR issues above would bring this to 10/10.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
