# TypeScript and JavaScript Review — Phase 02: Decision & Learnings CLI

## Issues

**[IMPORTANT]** `learning:rollup` uses fake decision target, producing misleading JSON output

The rollup command passes `{ type: "decision", id: "rollup" }` as the target to `begin()`. This is semantically wrong — rollup is not a decision operation. In `buildBeginResult`, the code searches for a decision with `id === "rollup"` in `decisions.jsonl`, which will never exist, so `previousStatus` is always `"none"` and `newStatus` is always `"unknown"`. In `--json` mode, the result object includes these meaningless values (`{ entity: "rollup", phase: "rollup", previousStatus: "none", newStatus: "unknown", rolledUp: N }`), which is confusing for LLM consumers.

Consider adding a `{ type: "rollup" }` variant to `Target` (or a more general `{ type: "operation" }` variant), and handling it in `buildBeginResult` to return a meaningful result. Alternatively, skip the `begin()` result entirely and construct the rollup result directly in the command, since the `BeginResult` shape (entity/phase/previousStatus/newStatus) doesn't fit non-entity operations.

File: src/commands/learning/rollup.ts:52
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Redundant `id` in `update-decision` payload unused in event building

`BeginPayloadMap["update-decision"]` includes `{ id: string; changes: ... }`, but `buildBeginEvent` for the `update-decision` case uses `target.id` (not `udp.id`) to construct the `UPDATE_DECISION` event. The payload `id` is validated by the schema and passed in, but never read. If `target.id` and `payload.id` ever diverge, the payload `id` is silently ignored.

Either: (a) remove `id` from the `update-decision` payload type (use only `target.id`), or (b) assert they match, or (c) use the payload `id` instead of `target.id`. Option (a) is simplest.

File: src/core/rpc/begin.ts:112
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `learning:rollup` loads state twice — once before `begin()` and once inside `begin()`

The command calls `loadState()` to count eligible learnings, then `begin()` calls `loadState()` again internally. For a CLI tool this is unlikely to cause issues, but it's wasteful and creates a TOCTOU window — if state changes between the two loads, the reported `eligibleCount` won't match reality.

Consider computing the count from the `begin()` result instead. Since `ROLLUP_LEARNINGS` already tracks matching count in the activity log, the RPC layer could return it (e.g., as part of a richer `BeginResult` or via an extended result type for rollup). Alternatively, accept the minor inefficiency — this is a low-frequency operation.

File: src/commands/learning/rollup.ts:41-47
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `decision:create` output pattern differs from plan spec

The plan says human-readable output should be `{id}: none -> active`, but the implementation outputs `result.entity` (which is the id) followed by `result.previousStatus -> result.newStatus`. The format matches — except the plan uses a colon separator while the implementation uses a space (following `epic:create` pattern). This is fine and consistent with existing commands, but noting the plan/implementation delta.

File: src/commands/decision/create.ts:49
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `updateDecisionInputSchema` status enum duplicates `decisionEntrySchema` status enum

The update schema hardcodes `z.enum(["active", "superseded", "revisiting"])` separately from the `decisionEntrySchema` which has the same enum. If the valid statuses change, both need updating. Consider extracting the status enum into a shared constant.

File: src/schemas/commands/decision.ts:21
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is solid: type-checked clean, tests pass (20/20), follows existing command patterns consistently, handles `exactOptionalPropertyTypes` correctly with the conditional spread pattern in `decision:update`, and properly uses Zod for input validation at the CLI boundary. The `buildBeginResult` decision branch correctly handles JSONL lookup. The two IMPORTANT issues prevent a 9 — the fake target in `learning:rollup` is a genuine semantic problem that will produce confusing `--json` output for LLM consumers, and the redundant `id` in the update payload is a type design inconsistency that could lead to silent bugs.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
