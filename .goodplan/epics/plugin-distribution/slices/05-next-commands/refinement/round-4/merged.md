# Merged Review — Round 4

## Scores

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| holistic | 8/10 | 0 | 2 | 5 |
| software-architecture | 9/10 | 0 | 2 | 4 |
| typescript | 9/10 | 0 | 1 | 4 |
| tui-cli (carried from R3) | 8/10 | 0 | 0 | 0 |
| api-contract (carried from R3) | 8/10 | 0 | 0 | 0 |

**Composite: 8.6/10 — Critical: 0, Important: 3 (deduplicated), Minor: 6 (deduplicated)**

---

## IMPORTANT Issues

### I1. `(error)` transition rows must be filtered during derivation

Raised by: holistic, software-architecture, typescript (all three independently)

The transition arrays include `to: "(error)"` rows representing guard failures (e.g., `epicLifecycleTransitions`, `beginPlanTransitions`, `sliceSubmitTransitions`). These are not valid target statuses. If the derivation in Phase 1 task 3 does not explicitly skip them, `commandMappings` will contain an `"(error)"` key with commands mapped to it — entries that are unreachable at runtime but pollute the Map and would break the fitness test's transition reachability check.

Fix: Add an explicit step in Phase 1 task 3: "Filter out transition entries where `to === "(error)"` before matching — these represent guard failure paths, not reachable target statuses." Update the fitness test (task 4/5.4) to assert that `commandMappings` contains no `"(error)"` key.

---

### I2. `(same)` expansion must be generic, not epicVerify-specific

Raised by: holistic; corroborated by software-architecture and typescript

The plan treats `(same)` expansion as specific to `epicVerifyTransitions`. However, `epicPhaseTransitions` also includes `to: "(same)"` in its type union. The derivation should handle `(same)` generically: for any transition where `to === "(same)"`, set `to = from` before inserting into `commandMappings`. Restricting the expansion to a specific table is fragile and will silently drop commands if other tables use the same sentinel.

Fix (requires codebase confirmation): Read `epicPhaseTransitions` in `src/core/state/transitions/epic-phase.ts` to confirm whether any rows actually use `to: "(same)"`. If confirmed, change Phase 1 task 3 documentation from epicVerify-specific to a generic rule: "For any transition entry where `to === '(same)'`, set `to = from` before building `commandMappings`."

---

### I3. `decisionTransitions` must use `"(none)"` not `undefined` for the creation `from` value

Raised by: software-architecture and typescript (same issue, slightly different framing)

The plan proposes `decisionTransitions` with `from: undefined` for `CREATE_DECISION`. All existing creation transition tables use the string sentinel `"(none)"` (e.g., `createTaskTransitions`, `createEpicTransitions`, `createSliceTransitions`, `createQuestTransitions`). Using `undefined` creates a type mismatch — the derivation code would need `string | undefined` union handling — and breaks consistency with the established pattern.

Fix: Change the proposed explicit entry to `{ from: "(none)", event: "CREATE_DECISION", to: "active" }`. Update any derivation notes that reference `undefined` for creation `from` values.

---

## MINOR Issues

### M1. Wildcard spacing inconsistency — `*(non-terminal)` vs `* (non-terminal)`

Raised by: holistic

Transition arrays use inconsistent spacing in wildcard patterns: `epicLifecycleTransitions` uses `"*(non-terminal)"` (no space), while `abandonSliceTransitions` and `abandonQuestTransitions` use `"* (non-terminal)"` (with space). The derivation logic must normalize or match both variants or it will silently miss wildcards from some tables.

Fix: Add a note in Phase 1 task 3: "Wildcard patterns may appear with or without a space (e.g., `*(non-terminal)` and `* (non-terminal)`). Normalize before matching — strip internal spaces or match both variants."

---

### M2. `* (terminal)` wildcard rows are already covered by `(error)` filtering — note the relationship

Raised by: holistic

`abandonSliceTransitions` and `abandonQuestTransitions` include `{ from: "* (terminal)", ..., to: "(error)" }` entries. The plan's wildcard expansion section mentions `*(non-terminal)` and `*(pre-activated)` but not `* (terminal)`. These are already handled implicitly by I1's `(error)` filtering (all `* (terminal)` rows have `to: "(error)"`), but the plan should make this explicit so implementers don't attempt to expand the terminal wildcard.

Fix: Add a brief note: "`* (terminal)` wildcards are always paired with `to: '(error)'` and are eliminated by the `(error)` exclusion rule. No separate handling needed."

---

### M3. Wildcard expansion needs access to the full status enum — plan doesn't specify the source

Raised by: software-architecture

Expanding `*(non-terminal)` and `*(pre-activated)` requires knowing the full set of statuses per entity type at runtime. Status types are TypeScript types, not runtime arrays. Three options: (a) extract `.options` from Zod status enum schemas, (b) derive the status set from the union of all `from`/`to` values in transition arrays (excluding sentinels), (c) hardcode the expansion sets. Option (b) is most aligned with the derivation-from-transition-tables principle but may miss statuses that only appear as `from` in filtered `(error)` rows.

Fix: Add a note in Phase 1 task 3 specifying which approach to use for runtime status enumeration during wildcard expansion.

---

### M4. `event` field in `commandToEvent` should be typed as `StateEvent["type"]`, not bare `string`

Raised by: typescript

The `satisfies` constraint in `as const satisfies ReadonlyArray<...>` should type the `event` field as `StateEvent["type"]` rather than `string`. This gives compile-time validation that every event string in `commandToEvent` is a real state event — belt-and-suspenders alongside the runtime fitness test's event-validity assertion.

Fix: Update the `satisfies` type in Phase 1 task 2 to use `StateEvent["type"]` for the `event` field.

---

### M5. `_testing` export convention is new to this codebase — be deliberate

Raised by: typescript

The plan proposes `export const _testing = { commandToEvent }` to keep the public API narrow. A codebase search shows zero existing uses of `_testing`. This is a new convention. The alternative — exporting `commandToEvent` directly — is simpler and consistent with how transition arrays are already exported. Since `commandToEvent` is `ReadonlyArray` with `as const`, consumers can't mutate it.

Fix: Either acknowledge this is a new convention and commit to it consistently, or export `commandToEvent` directly to match existing patterns. Either choice is fine; just be deliberate and note the decision in the plan.

---

### M6. Fitness test `commandRegistry` import: registry may be empty without a trigger import — add a size assertion

Raised by: software-architecture and typescript (same issue)

Phase 1 task 5.5 imports `commandRegistry` from `src/commands/global/schema.ts` to verify descriptions differ. `commandRegistry` is populated via side-effect `registerCommand()` calls at module-level evaluation time. If the test imports `commandRegistry` without triggering those calls, the map could be empty and the drift check would trivially pass. The existing fitness tests that use `commandRegistry` handle this somehow — the plan should specify the same approach.

Fix: Add a `expect(commandRegistry.size).toBeGreaterThan(0)` assertion before the drift comparison loop. Also specify which import chain populates the registry (match whatever `schema-output-accuracy.test.ts` does).

---

## Carried-Forward Issues (R3, resolved in R4)

The following R3 IMPORTANT issues were confirmed resolved by round-4 reviewers and do not appear as active issues:

- **R3-I1 (tui-cli / api-contract):** Duplicate `resolveEntityName` — confirmed resolved; plan now reuses from `types.ts`.
- **R3-I2 (tui-cli / api-contract):** `commandRegistry` description source pulling into RPC layer — confirmed resolved; descriptions are now manually maintained in `commandToEvent` with a fitness test drift check.

---

## No-Action Notes

- **`computeNextCommands` call site precision (software-architecture IMPORTANT #1):** The reviewer noted that Phase 2 task integration could be more precise about calling `computeNextCommands` with `newStatus` from the already-built result object rather than re-extracting from state. The plan's current language ("after computing the result, call `computeNextCommands()`") is sufficient for an implementer reading the existing code. No plan change required.
- **Description drift fitness test creates a Commands-layer import in tests (holistic, software-architecture):** This is acceptable in test code. The note about side-effect dependency is captured in M6 above.
- **Phase 3 E2E as a shell script (holistic MINOR #5):** Style suggestion. The current sequential-step approach works. No change required.
- **`nextCommands` with `--quiet` mode (tui-cli R3 MINOR):** Existing `output()` precedence rules handle this correctly without any changes. Confirmed no-op.
- **Module depth assessment (software-architecture):** `next-commands.ts` is appropriately deep — noted as positive, no action.
