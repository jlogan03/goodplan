# Phase 2 Review: Decision & Learnings CLI

**Reviewer:** Generalist
**Score:** 8/10
**Findings:** Critical: 1, Important: 1, Minor: 2

## Summary

All 10 plan tasks completed. Six CLI commands created (decision:create, decision:update, decision:list, decision:show, learning:list, learning:rollup), registered in main.ts, with RPC wiring for create-decision, update-decision, and rollup phases. Zod schemas for command input validation. Comprehensive tests covering JSON/human-readable/quiet modes and a full decision lifecycle walkthrough. Build passes, 662 tests pass. Architecture doc updated with correct decision:create stdin shape.

## Critical

1. **`learning:rollup` uses `{ type: "decision", id: "rollup" }` as Target** (`src/commands/learning/rollup.ts:52`) — The rollup command passes a fabricated decision target to `begin()`. This is semantically wrong: rollup is not a decision operation, and the `id: "rollup"` value doesn't correspond to any real decision. In `buildBeginResult`, this causes a `decisions.jsonl` lookup for `id === "rollup"`, which will always fail, returning `previousStatus: "none"` and `newStatus: "unknown"`. The result is misleading output — every rollup reports a status transition that didn't happen. The Target type needs a variant for scope-less operations (or a dedicated `{ type: "learnings" }` variant), or `buildBeginResult` needs a `phase === "rollup"` branch that skips entity status lookup and returns rollup-specific information. The implementation agent flagged this as technical debt; it should be fixed before merging because the command returns incorrect structured data to callers.

## Important

1. **`learning:rollup` loads state twice** (`src/commands/learning/rollup.ts:41-56`) — The command calls `loadState()` once to count eligible learnings for the human-readable message, then `begin()` internally calls `loadState()` again. This is a correctness concern, not just performance: between the two loads, state could change (concurrent CLI invocations), making the `eligibleCount` stale. The count reported to the user might not match what was actually rolled up. The RPC result should include the rolled-up count instead of computing it at the command layer. For now, this is tolerable because the CLI is single-user and races are unlikely, but the pattern violates the architectural boundary (command layer doing data interpretation).

## Minor

1. **`learning:show` command not implemented** — The `commands-api.md` spec lists `learning:show --id <id>` but it was not implemented. The plan explicitly scopes to 6 commands (4 decision + 2 learning), so this is intentional for now. However, the spec and implementation are out of sync. Either add it or note it as deferred.

2. **Empty `setup()` methods on all 6 commands** — Every new command defines `setup() {}`. This is harmless but unnecessary — citty doesn't require it. The existing commands in the codebase do the same, so this is consistent, but it's dead code.

## Correctness

- `decision:create`: correctly routes through `begin('create-decision', ...)` with dedicated phase, avoiding the incompatible `begin('create', {type:'decision'})` path. The `buildCreateEvent` switch has a guard that throws if someone tries the wrong path.
- `decision:update`: the conditional-spread pattern for `exactOptionalPropertyTypes` compliance is correct and well-commented. Only defined keys are spread into the changes object.
- `decision:list` / `decision:show`: read-only, bypasses RPC, uses `loadState` + `getJsonl` directly. Correct per the read/write routing contract.
- `learning:list`: correctly resolves path based on `--source` flag presence. Handles both project-level and scope-level learnings.
- `BeginPhase` and `BeginPayloadMap` extended correctly. Exhaustive switch in `buildBeginEvent` covers all new phases with proper `as` casts (safe given switch narrowing).
- `buildBeginResult` decision branch: linear scan of `decisions.jsonl` for status extraction is correct and consistent with the JSONL storage model.
- Zod schemas: `createDecisionInputSchema` and `updateDecisionInputSchema` have correct shapes matching the commands-api.md spec. Update schema uses `.optional()` on all change fields.
- Tests: good coverage including lifecycle walkthrough, JSON/human-readable/quiet modes, error cases (decision not found), and learning rollup integration test.
- `commands-api.md` updated with correct `decision:create` stdin shape.
