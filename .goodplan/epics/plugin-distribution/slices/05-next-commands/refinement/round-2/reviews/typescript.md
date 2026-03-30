## Issues

**[IMPORTANT]** Mutation file inventory contains 4 phantom commands and omits 6 real ones

The plan's "Mutation File Inventory" in Phase 2 lists commands that do not exist in the codebase and omits commands that do. Specifically:

- **Phantom (listed but nonexistent):** `epic/refine-implementation.ts`, `slice/refine-implementation.ts`, `quest/explore.ts`, `decision/supersede.ts` -- none of these files exist in `src/commands/`.
- **Omitted (exist but unlisted):** `epic/activate.ts`, `epic/define-slices.ts`, `epic/refine-slices.ts`, `epic/refine-architecture.ts`, `epic/abandon.ts`, `quest/abandon.ts`, `slice/abandon.ts`.

Actual counts from the codebase: 26 begin (including rollup) + 8 submit + 3 complete = 37 total. Minus rollup exclusion = 36 wired. The plan claims "36 total, 35 wired" -- the total is correct but the enumerated list is wrong. Since the RPC-layer integration approach means command files need zero changes, this inventory is primarily documentation and fitness test input. But if the fitness test's forward/reverse check uses this list as ground truth, phantom entries will cause false failures and omitted entries will cause missed coverage.

Fix: Replace the enumerated list with the actual command files. Use the programmatic approach already described in the fitness test (scan `src/commands/` for files importing `begin`/`submit`/`complete`) rather than a hand-maintained list.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `commandToEvent` mapping type uses `string` for `entityType` -- should use `Target["type"]`

Phase 1 Task 1.2 defines the `commandToEvent` mapping array with `entityType` as an implicit string. Given `noUncheckedIndexedAccess: true` and `exactOptionalPropertyTypes: true` in this project's tsconfig.json, using `string` where `Target["type"]` (which is `"project" | "epic" | "slice" | "quest" | "task" | "decision" | "rollup"`) is available loses compile-time safety. The `computeNextCommands` signature already takes `target: { type: Target["type"]; name: string }` which is good, but the `commandToEvent` array entries should constrain `entityType` to the same union (minus `"project"` and `"rollup"` which are excluded from nextCommands).

Fix: Define `type NextCommandsEntityType = Exclude<Target["type"], "project" | "rollup">` and use it for the `entityType` field in `commandToEvent` entries. This catches typos at compile time.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `computeNextCommands` return type for the `other` section lacks type narrowing for terminal statuses

Phase 1 Task 1.4 says terminal statuses return empty `other` array. But the return type is always `NextCommands { entity: CommandEntry[]; other: CommandEntry[] }` regardless. For consumers using `noUncheckedIndexedAccess`, they cannot distinguish "empty because terminal" from "empty because unknown status" at the type level. This is acceptable for the initial implementation, but the plan should explicitly note this is a deliberate simplification and not accidentally leave room for a discriminated union (e.g., `{ entity: [], other: [], terminal: true }`) that would complicate the type without clear benefit.

More concretely: the plan says "Omit other-section for terminal statuses" -- does "omit" mean the field is absent (`other?: CommandEntry[]`) or present but empty (`other: []`)? With `exactOptionalPropertyTypes: true`, these are different. The plan should specify: always return both fields, use empty arrays for terminals. This avoids the `undefined` vs missing distinction that `exactOptionalPropertyTypes` enforces.

Fix: Clarify that `NextCommands` always has both `entity` and `other` as non-optional `CommandEntry[]`. Terminal statuses return `{ entity: [showCommand], other: [] }`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `commandMappings` Map key type should be constrained

Phase 1 Task 1.3 builds `commandMappings: Map<string, Map<string, CommandMetadataEntry[]>>`. The outer key is `entityType` and the inner key is `status`. Both are `string`, which means consumers must handle `undefined` returns from `.get()` due to `noUncheckedIndexedAccess`. The plan already acknowledges this ("safe with `noUncheckedIndexedAccess`") which is correct. However, the outer Map could be typed as `Map<NextCommandsEntityType, ...>` to prevent inserting entries for `"project"` or `"rollup"` during the derivation step.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Missing `.js` extension in planned import path

Phase 2 Task 1 says: `Import NextCommands from ./next-commands.js`. This is correct for the ESM + `verbatimModuleSyntax` setup (tsconfig confirms `"module": "ESNext"` and `"verbatimModuleSyntax": true`). Just confirming this is right -- the plan correctly uses `.js` extensions throughout, consistent with existing imports in `src/core/rpc/types.ts` (e.g., `import type { Verification } from "../../schemas/entities/epic.js"`).

No action needed -- this is a positive observation, not an issue.

Resolution: N/A

---

**[MINOR]** Fitness test should validate `commandToEvent` entries at the type level, not just runtime

Phase 1 Task 3 describes runtime checks (forward/reverse/reachability). The `commandToEvent` array is the only manually-maintained data structure. A `satisfies` assertion on the array literal would catch typos in event names at compile time:

```typescript
const commandToEvent = [
  { command: "epic:create", event: "CREATE_EPIC", entityType: "epic" as const, ... },
  // ...
] as const satisfies ReadonlyArray<{ command: string; event: StateEvent["type"]; entityType: NextCommandsEntityType; ... }>;
```

This ensures every `event` value is a valid `StateEvent["type"]` discriminant and every `entityType` is a valid entity type -- at compile time, before any tests run. The fitness test then handles the dynamic concerns (file existence, transition reachability).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Decision entity uses `id` not `name` -- template interpolation needs `{id}` placeholder

Phase 1 Task 1.4 describes interpolating `{name}` in templates. But the `Target` type for decisions uses `id`, not `name` (see `{ type: "decision"; id: string }` in `src/core/rpc/types.ts`). The `computeNextCommands` signature takes `target: { type: Target["type"]; name: string }` but decision targets would need to pass `id` as the name-equivalent. The plan mentions this edge case in Phase 2 ("decision/create.ts and decision/update.ts -- entityType is 'decision', entity identifier is id not name") but does not address it in the Phase 1 function signature or template interpolation logic.

Fix: Either (a) accept a `Target` directly (callers already have one) and use `resolveEntityName(target)` for interpolation, which already handles the decision `id` case, or (b) document that `name` parameter is the entity identifier regardless of field name.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `quest/submit-explore.ts` and `quest/submit-plan.ts` do not exist -- submit commands are in `subagent/`

Phase 2's inventory says `quest/submit-{explore,plan}.ts (or equivalent)`. The actual submit commands are in `src/commands/subagent/submit-*.ts` (shared between entity types). The plan acknowledges this with "(or equivalent -- derive exact list programmatically)" but this imprecision could mislead the implementer. The submit commands are: `submit-explore.ts`, `submit-architecture.ts`, `submit-plan.ts`, `submit-refinement.ts`, `submit-implementation.ts`, `submit-slices.ts`, `submit-refine-architecture.ts`, `submit-refine-slices.ts` -- all in `src/commands/subagent/`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured and addresses all round-1 critical issues (derived registry, RPC-layer integration). TypeScript-specific concerns are mostly handled correctly: proper ESM imports with `.js` extensions, awareness of `noUncheckedIndexedAccess` for Map access, `exactOptionalPropertyTypes` handling via conditional spreads. The main gaps are: (1) the mutation file inventory is materially wrong with 4 phantom commands and 6 omissions, which could cause fitness test failures; (2) type narrowing opportunities are missed for `entityType` and Map keys given this project's strict tsconfig; (3) the decision entity's `id` vs `name` distinction needs explicit handling in the function signature. Fixing the IMPORTANT issues (inventory accuracy, entityType typing, optional vs empty array semantics) would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 5
