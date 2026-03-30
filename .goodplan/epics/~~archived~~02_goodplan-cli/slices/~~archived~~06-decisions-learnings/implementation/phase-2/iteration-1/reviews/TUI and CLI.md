# TUI and CLI Review — Phase 02: Decision & Learnings CLI

## Issues

**[IMPORTANT]** `learning:rollup` uses fake decision target `{ type: "decision", id: "rollup" }`
The rollup command passes `{ type: "decision", id: "rollup" }` as the target to `begin()`. This is semantically wrong — rollup is not a decision operation. It causes `buildBeginResult` to search `decisions.jsonl` for a decision with id `"rollup"`, which will never exist, resulting in `previousStatus: "none"` and `newStatus: "unknown"` in the result. The human-readable output does not use `result.previousStatus`/`result.newStatus` (it shows its own message), and `--json` mode returns these misleading values. The `Target` type needs a variant for rollup (e.g., `{ type: "rollup" }`) or the `begin()` function needs a path that does not require a meaningful target for target-less operations. Since `Target` is defined in the architecture spec and adding a new variant has broader implications, the pragmatic fix is to have `buildBeginResult` handle the rollup phase specially (return meaningful values like `rolledUp: N` or at minimum not pretend it found a decision status).
File: src/commands/learning/rollup.ts:52
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `learning:rollup` performs double `loadState` — pre-reads state to count eligible learnings
The command calls `loadState()` once to count eligible learnings (lines 41-47), then `begin()` calls `loadState()` again internally. This is a full filesystem read of the entire project state tree done twice. For the count to be accurate, it must match the state that `begin()` will operate on, but between the two loads a concurrent process could modify state. The count could be stale. Consider either: (a) extending `BeginResult` to include a `rolledUp` count (set by the reducer or `buildBeginResult`), or (b) reading the count from the state after `begin()` returns by comparing old/new state (which `begin()` already has internally).
File: src/commands/learning/rollup.ts:41
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Command registration ordering breaks alphabetical namespace grouping
In `main.ts`, the `decision:*` and `learning:*` commands are inserted between `slice:*` and `quest:*` (lines 93-98). The existing pattern groups by namespace alphabetically: `epic:*`, then `slice:*`, then `quest:*`. The new commands should follow alphabetical namespace ordering: `decision:*` before `epic:*`, or at minimum `learning:*` before `quest:*`. Currently: epic, slice, **decision, learning**, quest. Correct alphabetical: **decision**, epic, **learning**, quest, slice. This affects `--help` output ordering since citty lists subcommands in registration order.
File: src/commands/main.ts:93
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `decision:update` duplicates `id` in both `--id` flag and stdin payload
The `updateDecisionInputSchema` requires `id` in the stdin JSON, and `--id` is a required flag. The command uses `validateInput()` which merges flags and stdin, so the flag `id` will override stdin `id`. The JSDoc says "The --id flag overrides stdin id if both provided." This is fine functionally, but the schema requiring `id` in stdin is misleading — if `--id` is always required, the stdin `id` is redundant. Consider making `id` optional in the schema since the flag is `required: true`, or document that stdin `id` is ignored when `--id` is provided.
File: src/commands/decision/update.ts:16
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `decision:show` human-readable output checks `supersededBy !== null` but schema allows `null | undefined`
The `DecisionEntry` schema has `supersededBy` as nullable. If the field is absent (undefined due to optional), the `!== null` check would be true and print "Superseded by: undefined". This depends on whether `DecisionEntry` makes `supersededBy` required-but-nullable or optional. If it's always present (required, nullable), this is fine. Worth verifying against the schema.
File: src/commands/decision/show.ts:54
Resolution: CODEBASE_EXPLORATION

**[MINOR]** `learning:rollup` `--json` output shape diverges from other mutation commands
Other mutation commands (decision:create, decision:update) return the standard `BeginResult` shape `{ entity, phase, previousStatus, newStatus }` in JSON mode. The rollup command spreads the result and adds `rolledUp` (`{ ...result, rolledUp: eligibleCount }`). This inconsistency means consumers cannot rely on a uniform mutation response shape. If `rolledUp` is important (it is), it should be part of the formal `BeginResult` or a `RollupResult` type, not ad-hoc spreading.
File: src/commands/learning/rollup.ts:60
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The commands follow existing patterns well for the decision namespace (create, list, show, update). The `learning:rollup` command has multiple issues: fake target, double state load, and non-standard JSON output shape. The command registration ordering breaks the existing pattern. To reach 9+: fix the rollup target semantics, eliminate the double load, standardize the JSON output shape, and fix the registration ordering.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
