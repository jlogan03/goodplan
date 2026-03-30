# Merged Feedback — Round 2

### CRITICAL Issues

None.

### IMPORTANT Issues

**I1. Mutation file inventory is inaccurate — phantom commands and missing real ones**
Flagged by: holistic, software-architecture, typescript, tui-cli, api-contract (all 5 reviewers)

The plan's "Mutation File Inventory" lists 4 phantom commands that don't exist (`epic/refine-implementation.ts`, `slice/refine-implementation.ts`, `quest/explore.ts`, `decision/supersede.ts`) and omits 7+ real commands (`epic/activate.ts`, `epic/define-slices.ts`, `epic/refine-slices.ts`, `epic/refine-architecture.ts`, `epic/abandon.ts`, `slice/abandon.ts`, `quest/abandon.ts`). Submit inventory also references nonexistent files (`submit-verification.ts`, `quest/submit-explore.ts`) and omits real ones (`submit-slices.ts`, `submit-refine-architecture.ts`, `submit-refine-slices.ts`).

Correct inventory:
- **begin (25 wired)**: epic/{create, explore, define-architecture, refine-architecture, define-slices, refine-slices, activate, abandon, add-verification, update-verification}, slice/{create, plan, refine-plan, implement, abandon}, quest/{create, plan, refine-plan, implement, abandon}, task/{create, convert, drop}, decision/{create, update}
- **submit (8)**: subagent/{submit-explore, submit-architecture, submit-slices, submit-refine-architecture, submit-refine-slices, submit-plan, submit-refinement, submit-implementation}
- **complete (3)**: epic/complete, slice/complete, quest/complete
- **Excluded (1)**: learning/rollup
- **Total wired: 36** (not 35). Update confirmed goal count from 35 to 36.

Resolution: DIRECTLY_ACTIONABLE

---

**I2. `computeNextCommands` should accept `Target` directly, not `{ type: Target["type"]; name: string }`**
Flagged by: holistic, software-architecture, typescript, tui-cli, api-contract (all 5 reviewers)

The custom `{ type, name }` shape doesn't align with the `Target` discriminated union: decisions use `id` (not `name`), slices carry `epic` (not `parentEpic`). The RPC functions already have the full `Target` object. Accepting `Target` directly eliminates the `parentEpic` parameter, handles decision `id` via `resolveEntityName(target)`, and avoids mapping errors at each of the 3 call sites.

Change signature to: `computeNextCommands(target: Target, newStatus: string)`.

Resolution: DIRECTLY_ACTIONABLE

---

**I3. `nextCommands` should be required (non-optional) on result types**
Flagged by: api-contract

`nextCommands` is brand new — no existing consumers need backward compatibility. Every `BeginResult`/`SubmitResult`/`CompleteResult` will populate this field. `RollupResult` is a separate type that already excludes it. Making it optional forces every consumer to guard against `undefined` unnecessarily.

Make `nextCommands: NextCommands` required (non-optional) on all three result types.

Resolution: DIRECTLY_ACTIONABLE

---

**I4. `epicVerifyTransitions` wildcard `from: "*(pre-activated)"` complicates derivation logic**
Flagged by: software-architecture

The derivation assumes straightforward `(entityType, toStatus) -> commands[]` mapping, but `epicVerifyTransitions` uses `from: "*(pre-activated)"` and `to: "(same)"`. The derivation must expand this wildcard to all actual pre-activation epic statuses so that `add-verification`/`update-verification` appear as available commands for each of those statuses.

Add explicit handling in the derivation logic for wildcard `from` values. Document which wildcards exist and how they expand.

Resolution: DIRECTLY_ACTIONABLE

---

**I5. Decision entity has no exported transition table for derivation**
Flagged by: software-architecture

Other entity types export `*Transitions` arrays with `{from, event, to}` shape. `src/core/state/transitions/decision.ts` only exports handler functions; `DECISION_VALID_TRANSITIONS` is not exported. The derivation logic needs access to this data.

Resolution: RESEARCH_NEEDED — Read `decision.ts` fully to understand the shape. Determine whether to export the existing constant or add a `decisionTransitions` array matching the standard pattern.

---

**I6. `commandToEvent` mapping uses `string` for `entityType` — should use constrained union type**
Flagged by: typescript

Define `type NextCommandsEntityType = Exclude<Target["type"], "project" | "rollup">` and use it for the `entityType` field in `commandToEvent` entries. This catches typos at compile time given `noUncheckedIndexedAccess`.

Resolution: DIRECTLY_ACTIONABLE

---

**I7. Phase 3 E2E test uses `./gp` which won't resolve correctly in temp directory**
Flagged by: tui-cli

Phase 3 creates a temp project at `/tmp/gp-e2e-test` but calls `./gp` — which resolves relative to the temp directory, not the repo. The implementer needs an absolute path to the built binary or must copy it.

Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

**M1. Edge case list references nonexistent `decision/supersede` — supersession handled by `decision/update.ts`**
Flagged by: holistic. Subsumed by I1 but affects edge case documentation specifically.
Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 3 E2E lifecycle references `epic:refine-implementation` which doesn't exist**
Flagged by: holistic. The real epic lifecycle after exploration is define-architecture → submit-architecture → define-slices → submit-slices → activate.
Resolution: DIRECTLY_ACTIONABLE

**M3. No explicit mention of `abandon` commands in nextCommands design**
Flagged by: holistic. Abandon commands are valid transitions from most non-terminal statuses. The `commandToEvent` mapping needs entries for them and the derivation will naturally include them, but this should be explicitly noted.
Resolution: DIRECTLY_ACTIONABLE

**M4. `commandMappings` Map keys should use constrained types (`NextCommandsEntityType`) instead of `string`**
Flagged by: typescript. Prevents inserting entries for excluded entity types during derivation.
Resolution: DIRECTLY_ACTIONABLE

**M5. Fitness test should validate `commandToEvent` entries at compile time via `satisfies`**
Flagged by: typescript. Use `as const satisfies ReadonlyArray<{ command: string; event: StateEvent["type"]; entityType: NextCommandsEntityType; ... }>` on the array literal.
Resolution: DIRECTLY_ACTIONABLE

**M6. Fitness test needs to handle non-standard transition table shapes (wildcards, missing tables)**
Flagged by: software-architecture. Related to I4 and I5.
Resolution: DIRECTLY_ACTIONABLE

**M7. `commandToEvent` conflates derivation data, display metadata, and visibility — document what `command` field represents**
Flagged by: api-contract. Recommend using citty command name (e.g., `epic:create`) and adding JSDoc.
Resolution: DIRECTLY_ACTIONABLE

**M8. Phase 2 E2E verification uses fragile Python one-liner with `2>/dev/null`**
Flagged by: api-contract. Replace with `jq` or `bun -e` with clear error messages.
Resolution: DIRECTLY_ACTIONABLE

**M9. Plan doesn't specify human-readable output behavior for `nextCommands`**
Flagged by: tui-cli. Should clarify that `nextCommands` appears in `--json` output only; human-readable formatters ignore it.
Resolution: DIRECTLY_ACTIONABLE

**M10. Subagent submit commands should be explicitly noted as `userFacing: false`**
Flagged by: tui-cli. Implied but never stated. Fitness test needs to know whether to include them.
Resolution: DIRECTLY_ACTIONABLE

**M11. `NextCommands` return type should clarify empty arrays for terminal statuses (not omitted fields)**
Flagged by: typescript. With `exactOptionalPropertyTypes: true`, `other?: CommandEntry[]` vs `other: []` are different. Always return both fields, use empty arrays for terminals.
Resolution: DIRECTLY_ACTIONABLE — Partially addressed by I3 (making fields required). Add explicit note that terminal statuses return `{ entity: [showCommand], other: [] }`.

**M12. `epic/activate.ts` edge case not discussed — nextCommands after activation should be verified in unit tests**
Flagged by: software-architecture. The derivation handles it automatically but it's worth an explicit test.
Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE

I1, I2, I3, I4, I6, I7, M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M12

Count: 18

### RESEARCH_NEEDED

I5 — Decision entity transition table export. Read `src/core/state/transitions/decision.ts` to determine whether to export `DECISION_VALID_TRANSITIONS` or add a standard `decisionTransitions` array.

Count: 1

### Contradictions Resolved

**Inventory count discrepancy**: Reviewers disagreed on exact counts (holistic: 37 total/36 wired; software-architecture: 36 total/35 wired; tui-cli: 37 total/36 wired; api-contract: 37 total/36 wired). The discrepancy is whether `learning/rollup.ts` is counted in the "begin" total before exclusion. Resolved: 26 begin files exist (including rollup), 25 are wired. Total wired = 25 + 8 + 3 = 36. Software-architecture's count of "35 wired" appears to be an arithmetic error in their summary (their own enumeration lists 25+8+3=36). **Final answer: 36 wired.**

**I7 classification**: tui-cli flagged `./gp` path resolution as IMPORTANT. Other reviewers mentioned `./gp` usage but didn't flag it as a standalone issue. Kept as IMPORTANT per tui-cli (CLI domain specialist).

### Unresolved (USER_INPUT required)

None.
