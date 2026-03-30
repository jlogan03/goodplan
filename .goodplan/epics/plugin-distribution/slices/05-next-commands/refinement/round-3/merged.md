# Merged Feedback — Round 3

Scores: software-architecture: 8/10, tui-cli: 8/10, api-contract: 8/10, holistic: 8/10 (carried), typescript: 8/10 (carried)

---

## CRITICAL Issues

None.

---

## IMPORTANT Issues

### I1: `resolveEntityName` already exists in `src/core/rpc/types.ts` — plan must not duplicate it
Flagged by: software-architecture, tui-cli, api-contract (all three, independently)

Phase 1 task 4 proposes exporting a new `resolveEntityName(target: Target): string` from `next-commands.ts`. This function already exists in `src/core/rpc/types.ts` (lines 206–223) and is already imported by `begin.ts`, `submit.ts`, and `complete.ts`. Creating a second copy introduces drift risk and violates DRY.

The existing function handles all Target variants including `decision`, `rollup`, and `project`. It does not throw for `rollup`/`project` — it returns a string for all variants. Since `computeNextCommands` already constrains to `NextCommandsEntityType` (excluding `project` and `rollup`), the existing function is sufficient without the throw behavior the plan describes.

Fix: Remove Phase 1 task 4. Import `resolveEntityName` from `./types.js` wherever it is needed in `next-commands.ts`. Update any references in subsequent tasks that place this function in `next-commands.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

### I2: Pulling `description` from `commandRegistry` violates layering and introduces unwanted coupling
Flagged by: software-architecture, tui-cli, api-contract (all three, with complementary angles)

Phase 1 task 2 says to "pull `description` from the existing `commandRegistry` (in `src/commands/global/schema.ts`) at module init." This creates multiple problems:

1. **Layering violation**: `src/core/rpc/` depends on `src/commands/` — the architecture mandates the opposite direction (Commands → RPC).
2. **Side-effect import graph**: `commandRegistry` is populated by `registerCommand()` side effects triggered when `schema.ts` is imported, which imports all Zod command schemas. Importing it from `next-commands.ts` drags the full command schema graph into every consumer of `begin.ts`, `submit.ts`, and `complete.ts`.
3. **Wrong description semantics** (tui-cli): `commandRegistry` descriptions like `"Create a new epic. Stdin: {name, goal}."` are schema/help descriptions with stdin format hints — inappropriate for `nextCommands` suggestions shown to users and skills. The `nextCommands` descriptions should be action-oriented and concise (e.g., "Explore this epic", "Begin planning").

Fix: Keep `description` as a manually-maintained field in the `commandToEvent` array within `next-commands.ts`. Write action-oriented, concise phrasing (not schema-level). Add a fitness test check (Phase 1 task 5.2) that verifies `commandToEvent` descriptions match `commandRegistry` descriptions at test time to catch drift without runtime coupling.

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

### M1: `decisionTransitions` export shape is underspecified
Flagged by: software-architecture

The prerequisite `decisionTransitions` export is derived from `VALID_DECISION_TRANSITIONS`, but decisions are JSONL records (not status-bearing entities). All transitions use `UPDATE_DECISION` (not status-keyed events), and creation uses `CREATE_DECISION`. The derivation must produce entries like `{ from: "active", event: "UPDATE_DECISION", to: "active" }`, `{ from: "active", event: "UPDATE_DECISION", to: "revisiting" }`, etc. This shape differs from entity transitions where `from` is an entity status and the event is status-specific. The plan should explicitly list the full derived entry set to avoid ambiguity during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

### M2: `taskLifecycleTransitions` — `task:convert` cross-entity complexity should be clarified
Flagged by: software-architecture

The plan identifies the `task:convert` edge case in Phase 2 but the prerequisite export doesn't fully explain it. `CONVERT_TASK` transitions a task from `open` to `converted` (terminal), but it also creates a new quest or epic. The `commandMappings` derivation should clarify that: the `taskLifecycleTransitions` entry `{ from: "open", event: "CONVERT_TASK", to: "converted" }` is what drives `task:convert` appearing in commands for an `open` task, and the "resulting entity" concern is about what the RPC layer's target is (the task), not about `commandMappings` derivation. The existing phase 2 edge case section is implicitly correct but could confuse the implementer.

Resolution: DIRECTLY_ACTIONABLE

---

### M3: `commandToEvent` public API surface — consider narrowing exports for fitness test access
Flagged by: software-architecture

The plan exports `commandToEvent` from the module's public API (for use in fitness tests). The module's overall public surface — 3 types + 1 function + the `commandToEvent` mapping — is broad relative to the complexity it hides. Consider whether `commandToEvent` should be exported only for test access (via a `_testing` export convention or a test-specific path) to keep the production public API narrow. The fitness test's forward/reverse check requires access to this array, but it need not be part of the general public API.

Resolution: DIRECTLY_ACTIONABLE

---

### M4: `entity` ordering within `NextCommands` is undefined
Flagged by: api-contract

The plan specifies `entity: CommandEntry[]` and `other: CommandEntry[]` but does not define ordering within each array. Without a defined order, output reflects Map insertion order of the derivation — non-obvious and could change if transition tables are reordered. Consumers (skills, LLM orchestrators) may display these as-is.

Fix: Add a note in Phase 1 task 5 specifying: `entity` commands are ordered by their position in the transition table (reflecting workflow progression); `other` commands are ordered alphabetically by command name.

Resolution: DIRECTLY_ACTIONABLE

---

### M5: `nextCommands` success-only contract is not stated explicitly
Flagged by: api-contract

The plan adds `nextCommands` to `BeginResult`, `SubmitResult`, and `CompleteResult` (success types only). Error responses retain `{ error: { code, message, detail? } }` unchanged. This is correct behavior, but should be explicitly stated so consumers know `nextCommands` is a success-only field.

Fix: Add one line in Phase 2 overview or task 1: "Error responses retain the existing `{ error: { code, message, detail? } }` shape — `nextCommands` is success-only."

Resolution: DIRECTLY_ACTIONABLE

---

### M6: E2E verification command for `--query` is missing
Flagged by: tui-cli

Phase 3 E2E validation verifies `--json` output but never tests `--query`. Since `output()` passes the full result through `applyQuery()`, and `nextCommands` is a new nested object with `entity` and `other` arrays, at least one explicit `--query` verification is needed (e.g., `gp epic:create --json --query '.nextCommands.entity | length'`). The existing `--query` machinery should handle it fine, but an explicit check for this common consumer path guards against `deterministicStringify` issues with nested arrays.

Resolution: DIRECTLY_ACTIONABLE

---

### M7: Phase 2 E2E verification command requires complete valid input
Flagged by: tui-cli

The Phase 2 Expected Behavior includes a piped `echo | $GP_BIN | jq` command. If the echo content is missing required fields (notably `goal` for `createEpicInputSchema`), the command will fail with a validation error instead of testing `nextCommands`. Use a complete valid input: `echo '{"name":"test-nc","goal":"testing nextCommands"}' | $GP_BIN epic:create --json | jq '.nextCommands'`.

Resolution: DIRECTLY_ACTIONABLE

---

### M8: `$GP_BIN` assignment syntax is fragile
Flagged by: api-contract, tui-cli (complementary angles)

Phase 3 shows `GP_BIN="$(cd "$(dirname "$0")/.." && pwd)/gp"` — a shell script idiom (`$0` refers to the executing script's path). In an interactive session or implementation plan context, `$0` is the shell binary. Simplify to `GP_BIN="$(pwd)/gp"` (assuming cwd is the repo root after `bun run build`) or document "use the absolute path to the built binary at `<repo-root>/gp`."

Resolution: DIRECTLY_ACTIONABLE

---

### M9: `--quiet` mode interaction with `nextCommands` should be noted (no action required, just document)
Flagged by: tui-cli

The plan addresses `--json`-only output for `nextCommands` but doesn't address `--quiet` mode. The existing `output()` precedence rules (`--quiet` suppresses all, `--query` overrides `--quiet`) handle `nextCommands` correctly without any changes. This is a no-op — but worth a one-line note in the plan so the implementer doesn't second-guess it.

Resolution: DIRECTLY_ACTIONABLE

---

### M10: Unit test for "unknown entityType" may not compile
Flagged by: tui-cli

Phase 1 test item 4 proposes testing "unknown entityType" returning `{ entity: [], other: [] }`. Since `computeNextCommands` accepts `Target` (a discriminated union), passing an unknown entity type requires a `as Target` type assertion — which tests TypeScript escape hatches, not runtime behavior. The correct test is an unknown *status* string with a valid entity type: `computeNextCommands({ type: "epic", name: "x" }, "nonexistent-status")`.

Fix: Update the test description to test unknown status (not unknown entity type).

Resolution: DIRECTLY_ACTIONABLE

---

### M11: Fitness test event-validity check should be explicit
Flagged by: api-contract

The forward check (Phase 1, task 5.2) verifies command files exist and the reverse check verifies `commandToEvent` coverage, but neither explicitly validates that the `event` string in each `commandToEvent` entry matches an actual `StateEvent["type"]`. The `as const satisfies` pattern (from round 2) catches this at compile time, but an explicit runtime assertion in the transition reachability check (task 5.4) adds defense-in-depth and improves diagnosability.

Fix: In task 5.4, add an assertion that every `event` in `commandToEvent` appears in at least one transition table entry.

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE

All 13 issues (I1, I2, M1–M11) are directly actionable. Count: **13**

---

## RESEARCH_NEEDED

None.

---

## Contradictions Resolved

**`resolveEntityName` throw behavior**: software-architecture and tui-cli note the existing function does NOT throw for `rollup`/`project` (returns a string for all variants), while the plan implies it throws. tui-cli's characterization — that the existing function is sufficient since `computeNextCommands` guards at the call boundary — is more precise. Resolution: use the existing function as-is; no throw behavior needed in `next-commands.ts`.

**Description source**: tui-cli adds a UX angle (wrong semantics for action-oriented suggestions) that complements software-architecture and api-contract's layering/coupling angles. All three independently converge on the same fix: manually maintain descriptions in `commandToEvent`. No contradiction.

Contradictions resolved: **1**
Contradictions unresolved: **0**

---

## Unresolved (USER_INPUT required)

None.

---

## Domains Needing Re-Review

- **software-architecture** (2 IMPORTANT addressed)
- **tui-cli** (2 IMPORTANT addressed)
- **api-contract** (2 IMPORTANT addressed)

All three domains should re-run after plan is updated to verify I1 and I2 are cleanly resolved.
