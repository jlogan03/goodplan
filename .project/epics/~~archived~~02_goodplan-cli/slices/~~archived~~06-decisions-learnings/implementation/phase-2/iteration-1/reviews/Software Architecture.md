# Software Architecture Review — Phase 2: Decision & Learnings CLI

## Issues

**[IMPORTANT]** `learning:rollup` uses a fake decision target, violating target semantics

The `learning:rollup` command passes `{ type: "decision", id: "rollup" }` as the target to `begin()`. This is semantically wrong — rollup is not a decision operation. The `buildBeginResult` function will then search `decisions.jsonl` for a decision with `id: "rollup"`, find nothing, and return `previousStatus: "none"`, `newStatus: "unknown"` — which is meaningless. The `Target` type was designed to identify the entity being acted upon; abusing it with a fake decision breaks that contract.

The root cause is that `ROLLUP_LEARNINGS` is a cross-cutting operation that doesn't map cleanly to a single entity target. A better approach: either (a) add a `{ type: "rollup" }` variant to `Target` (extending the union), or (b) have `buildBeginResult` detect the `rollup` phase and return a rollup-specific result (count of entries moved, source, target). For now the result is misleading but functionally harmless since the command overrides the JSON output with `{ ...result, rolledUp: eligibleCount }`.

File: src/commands/learning/rollup.ts:52
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `learning:rollup` does a redundant `loadState` for pre-rollup count

The command calls `loadState(projectDir)` to count eligible learnings *before* calling `begin()`, which also calls `loadState(projectDir)`. This is two full state tree loads for a single operation. The learning count should come from the result, not from a pre-read. The RPC `begin()` has access to both old and new state — the rollup count could be returned through `BeginResult` (or a specialized result type), or the command could read state *after* the rollup and compute the delta.

File: src/commands/learning/rollup.ts:41
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `rpc-layer-api.md` not updated for `create-decision` phase

The rpc-layer-api.md still says `begin('create', {type:'decision'}) -> CREATE_DECISION` (line 84) and the routing table (line 105) groups `decision:create` with other entity creation commands under `begin('create', ...)`. The implementation correctly uses a dedicated `create-decision` phase (as the plan specified), but the architecture doc was not updated to reflect this. This creates a conflict between the documented API and the actual implementation — future developers (or LLMs) consulting the architecture doc will call the wrong API.

File: .project/epics/__active__goodplan-cli/architecture/rpc-layer-api.md:84
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `update-decision` payload carries redundant `id`

`BeginPayloadMap["update-decision"]` includes `{ id: string; changes: UpdateDecisionChanges }`, and the target is `{ type: "decision"; id: string }`. The `id` appears in both the target and the payload. In `buildBeginEvent`, the handler uses `target.id` (not `udp.id`) for the event, meaning the payload `id` is ignored. Meanwhile `decision:update` command passes `input.id` in both places. This dual-source for the same identity creates a disagreement risk. The payload `id` should be removed from `BeginPayloadMap["update-decision"]`, or the command should assert they match.

File: src/core/rpc/types.ts:96
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `learning:show` command defined in `commands-api.md` but not implemented

The architecture doc at `commands-api.md` line 119 specifies `goodplan learning:show --id <id>`, but Phase 2 only implements `learning:list` and `learning:rollup`. The plan scope explicitly lists 6 commands (4 decision + 2 learning), so this appears intentional for this phase. However, the API surface is now partially implemented — `learning:show` is documented but missing.

File: .project/epics/__active__goodplan-cli/architecture/commands-api.md:119
Resolution: USER_INPUT

---

**[MINOR]** Empty `setup()` methods on all commands

All 6 new commands include `setup() {}` as an empty no-op. This is likely a citty framework convention, but if it's not required, it adds noise. If it is required, it's consistent with existing commands (confirmed `epic:list` also has it), so this is stylistic only.

File: src/commands/decision/create.ts:27
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The implementation is well-structured and follows existing patterns closely. Module boundaries are clean — commands are thin, read-only commands bypass RPC, mutations go through `begin()`. The `create-decision` phase separation is a sound architectural choice given the payload incompatibility with the generic `create` phase. However, the fake decision target for rollup is a meaningful abstraction leak, the redundant `loadState` adds unnecessary I/O, and the rpc-layer-api.md divergence creates a documentation-implementation gap that will mislead future work. Fixing the three IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 2
