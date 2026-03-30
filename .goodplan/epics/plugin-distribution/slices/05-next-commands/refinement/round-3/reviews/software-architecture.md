# Software Architecture Review — Round 3

## Issues

**[IMPORTANT] `resolveEntityName` already exists in `src/core/rpc/types.ts` -- plan proposes re-exporting it from `next-commands.ts`**
The plan's Phase 1 task 4 says to "Export a `resolveEntityName(target: Target): string` helper" from `next-commands.ts`. This function already exists in `src/core/rpc/types.ts` (line 206) and is already imported by `begin.ts`, `submit.ts`, and `complete.ts`. The plan should import the existing function rather than creating a new one. The existing implementation already handles all Target variants including `decision` (returns `target.id`) and `rollup` (returns a formatted string). The plan's description of `resolveEntityName` throwing for `rollup`/`project` is inconsistent with the existing implementation which handles all variants.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1 proposes pulling descriptions from `commandRegistry` at module init -- this creates a circular dependency risk**
The plan says to "Pull `description` from the existing `commandRegistry` (in `src/commands/global/schema.ts`) at module init." The `commandRegistry` lives in the Commands layer (`src/commands/`). The new module lives in the RPC layer (`src/core/rpc/`). The architecture enforces Commands -> RPC dependency direction, not the reverse. Having `src/core/rpc/next-commands.ts` import from `src/commands/global/schema.ts` violates the layering invariant (RPC Layer depends on Commands Layer). Either: (a) inline the descriptions in `commandToEvent` (small duplication, correct layering), or (b) move `commandRegistry` to a shared location accessible to both layers. Option (a) is simpler and the descriptions are stable enough that the fitness test's forward/reverse check will catch drift.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `decisionTransitions` prerequisite task underspecifies the shape -- decision has no status-based `from` field like other entities**
The plan's prerequisite says to export `decisionTransitions` derived from `VALID_DECISION_TRANSITIONS`. Looking at `decision.ts`, decisions are JSONL records (not entities with a `.status` JSON field like epics/slices/quests). The `VALID_DECISION_TRANSITIONS` record maps `active -> {active, revisiting, superseded}` etc., but there's no `from`/`event`/`to` shape -- it uses `UPDATE_DECISION` for all transitions and `CREATE_DECISION` for initial creation. The plan correctly identifies the events but should note that the exported array will have entries like `{ from: "active", event: "UPDATE_DECISION", to: "active" }`, `{ from: "active", event: "UPDATE_DECISION", to: "revisiting" }` etc., which is different from entity transitions where `from` is an entity status. The derivation logic must handle this consistently with how it handles other entity types (keying on `to` status). The plan's description is close but should explicitly list the full set of derived entries to avoid ambiguity during implementation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `taskLifecycleTransitions` prerequisite -- `task:convert` produces a _new_ entity, `commandMappings` derivation needs to handle this**
The plan correctly identifies the `task:convert` edge case in Phase 2 but the prerequisite export doesn't account for this complexity. `CONVERT_TASK` transitions the task from `open` to `converted` (terminal), but it also creates a new quest or epic in `created` status. The `commandToEvent` mapping needs to decide: does `task:convert` appear as a command available when a task is in `open` status? Yes -- that's where it makes sense. But the plan should clarify that the `taskLifecycleTransitions` array entry `{ from: "open", event: "CONVERT_TASK", to: "converted" }` is what drives this, and the "resulting entity" concern in Phase 2's edge case section is about what the RPC layer's target is (the task), not about `commandMappings` derivation. This is implicitly correct but could confuse the implementer.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No discussion of module depth for `next-commands.ts` -- risk of becoming a shallow module**
The plan puts types, the `commandToEvent` mapping, the `commandMappings` derivation, `resolveEntityName`, and `computeNextCommands` all in one file. This is a reasonable starting point, but the module's public API surface (3 types + 1 function + `commandToEvent` mapping for fitness tests) is broad relative to the complexity it hides. The derivation logic (wildcard expansion, status-preserving events, cross-entity "other" section) is the deep part. Consider whether the `commandToEvent` array should be exported only for test access (via a `_testing` export convention or by having the fitness test import it through a test-specific path) to keep the public API narrow.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is architecturally sound overall. The core design -- deriving `commandMappings` from transition tables rather than maintaining a parallel definition -- is the right approach and aligns well with INV-003 (state machine purity) by keeping CLI command knowledge out of the state machine. The 3-point RPC integration (begin/submit/complete) is clean and matches the existing orchestration pattern.

The two IMPORTANT issues need resolution: the circular dependency from importing `commandRegistry` into the RPC layer is a layering violation that should be caught before implementation, and the `resolveEntityName` duplication should be avoided. Neither requires fundamental redesign -- they are targeted fixes. Addressing these plus the minor clarifications would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
