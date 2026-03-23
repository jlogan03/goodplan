# Phase 2 Merged Review: Decision & Learnings CLI

**Reviewers:** Generalist (8/10), Software Architecture (7/10), TypeScript (8/10), TUI and CLI (6/10)
**Composite score:** 7.25/10
**Deduplicated findings:** Critical: 1, Important: 5, Minor: 5

---

## Critical

### C1. `learning:rollup` uses fake decision target, producing misleading structured output
**Raised by:** Generalist (critical), Software Architecture (important), TypeScript (important), TUI/CLI (important)
**Files:** `src/commands/learning/rollup.ts:52`

The rollup command passes `{ type: "decision", id: "rollup" }` as the target to `begin()`. Rollup is not a decision operation and no decision with id `"rollup"` exists, so `buildBeginResult` always returns `previousStatus: "none"`, `newStatus: "unknown"` -- meaningless values that appear in `--json` output. This is a semantic violation of the `Target` type contract and produces incorrect structured data for LLM consumers.

**Resolution options (consensus across reviewers):**
- (a) Add a `{ type: "rollup" }` (or `{ type: "operation" }`) variant to `Target` and handle it in `buildBeginResult` with rollup-specific return values.
- (b) Have `buildBeginResult` detect `phase === "rollup"` and skip entity status lookup, returning rollup-specific data instead.
- (c) Skip `begin()` result entirely for rollup and construct the result directly in the command (TypeScript reviewer).

Elevated to critical because all four reviewers flagged it and Generalist rated it critical.

---

## Important

### I1. `learning:rollup` loads state twice (TOCTOU risk)
**Raised by:** Generalist, Software Architecture, TypeScript, TUI/CLI
**Files:** `src/commands/learning/rollup.ts:41-56`

The command calls `loadState()` to count eligible learnings, then `begin()` calls `loadState()` again internally. This is wasteful (two full state tree reads) and creates a TOCTOU window -- the reported `eligibleCount` may not match reality if state changes between loads. The command layer is also doing data interpretation that belongs in the RPC layer.

**Resolution:** Return the rolled-up count from the RPC result (via `BeginResult` or a dedicated `RollupResult` type) instead of pre-computing it in the command.

### I2. `rpc-layer-api.md` not updated for `create-decision` phase
**Raised by:** Software Architecture
**Files:** `.project/epics/__active__goodplan-cli/architecture/rpc-layer-api.md:84, :105`

The architecture doc still says `begin('create', {type:'decision'})` routes to `CREATE_DECISION`, but the implementation uses a dedicated `create-decision` phase. The routing table at line 105 also groups `decision:create` under the generic `create` phase. This documentation-implementation gap will mislead future developers and LLM agents.

**Resolution:** Update `rpc-layer-api.md` to reflect the actual `create-decision` and `update-decision` phases.

### I3. Redundant `id` in `update-decision` payload (ignored silently)
**Raised by:** Software Architecture, TypeScript, TUI/CLI (minor)
**Files:** `src/core/rpc/types.ts:96`, `src/core/rpc/begin.ts:112`

`BeginPayloadMap["update-decision"]` includes `{ id: string; changes: ... }`, but `buildBeginEvent` uses `target.id` and ignores `payload.id`. If they diverge, the mismatch is silent. TUI/CLI reviewer also noted the `--id` flag / stdin `id` duplication at the command layer.

**Resolution:** Remove `id` from the `update-decision` payload type (use only `target.id`). At the command layer, make `id` optional in the stdin schema since `--id` flag is always required.

### I4. Command registration ordering breaks alphabetical namespace grouping
**Raised by:** TUI/CLI
**Files:** `src/commands/main.ts:93`

Current registration order: epic, slice, **decision, learning**, quest. The existing convention is alphabetical by namespace, which should be: **decision**, epic, **learning**, quest, slice. This affects `--help` output.

**Resolution:** Reorder command registrations alphabetically.

---

## Minor

### M1. `learning:show` command not implemented (spec/implementation gap)
**Raised by:** Generalist, Software Architecture
**Files:** `.project/epics/__active__goodplan-cli/architecture/commands-api.md:119`

The architecture doc specifies `learning:show --id <id>` but it was not implemented. This is intentional per the plan scope (6 commands), but the spec and implementation are out of sync. Either defer explicitly or add it.

### M2. Empty `setup()` methods on all 6 commands
**Raised by:** Generalist, Software Architecture
**Files:** `src/commands/decision/create.ts:27` (and all new commands)

Every command includes `setup() {}`. This is consistent with existing commands but is dead code if citty doesn't require it. Stylistic only.

### M3. `learning:rollup` `--json` output shape diverges from other mutation commands
**Raised by:** TUI/CLI
**Files:** `src/commands/learning/rollup.ts:60`

Other mutation commands return standard `BeginResult` shape. Rollup spreads it and adds `rolledUp` ad-hoc. Consumers cannot rely on a uniform mutation response shape. This is related to C1 -- fixing the rollup target semantics should also formalize the output type.

### M4. `updateDecisionInputSchema` status enum duplicates `decisionEntrySchema` status enum
**Raised by:** TypeScript
**Files:** `src/schemas/commands/decision.ts:21`

The update schema hardcodes `z.enum(["active", "superseded", "revisiting"])` separately from the entry schema. If valid statuses change, both need updating. Consider extracting a shared constant.

### M5. `decision:show` may print "Superseded by: undefined" for missing field
**Raised by:** TUI/CLI
**Files:** `src/commands/decision/show.ts:54`

The `supersededBy !== null` check would be true if the field is `undefined` (absent), printing "Superseded by: undefined". Depends on whether the schema makes the field required-but-nullable vs optional. Needs verification.

---

## Confirmed Correct (no action needed)

- `decision:create` correctly uses dedicated `create-decision` phase; `buildCreateEvent` guard prevents misuse.
- `decision:update` conditional-spread pattern for `exactOptionalPropertyTypes` is correct and well-commented.
- Read-only commands (`decision:list`, `decision:show`, `learning:list`) correctly bypass RPC and use `loadState` + `getJsonl` directly.
- `learning:list` correctly resolves path based on `--source` flag.
- `BeginPhase` / `BeginPayloadMap` extensions and exhaustive switch coverage are correct.
- Zod schemas match `commands-api.md` spec.
- Tests: 20/20 pass, good coverage including lifecycle walkthrough, JSON/human/quiet modes, error cases.
- `commands-api.md` updated with correct `decision:create` stdin shape.
- Build passes, 662 total tests pass.

---

## Suggested fix order

1. **C1 + M3** — Fix rollup target semantics and formalize output type (these are coupled)
2. **I1** — Eliminate double `loadState` by returning count from RPC result (naturally follows C1)
3. **I3** — Remove redundant `id` from update-decision payload
4. **I2** — Update `rpc-layer-api.md` for new phases
5. **I4** — Reorder command registrations alphabetically
6. **M4, M5** — Extract shared status enum; verify `supersededBy` nullability
