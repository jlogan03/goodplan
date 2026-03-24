# API Contract Review

Reviewer: API Contract Reviewer
Architecture: skills-cli-integration

## Issues

### 1. CRITICAL: `cli-interaction-conventions.md` uses `--name` flag for `show` commands but implementation and `commands-api.md` use entity-specific flags

**File:** `cli-interaction-conventions.md` line 66, `commands-api.md` lines 64-103
**Resolution:** Fix `cli-interaction-conventions.md`

The conventions doc shows:
```bash
goodplan slice:show --name my-slice --json
goodplan epic:show --name X --json
```

But the actual implementation (`src/commands/slice/show.ts`, `src/commands/epic/show.ts`) and `commands-api.md` use entity-specific flags:
```bash
goodplan slice:show --slice <name>
goodplan epic:show --epic <name>
```

This directly contradicts INV-004 (target flags required) and the entity-namespaced-commands decision. Skills following the conventions doc will produce validation errors. Since this is the primary document skills will reference, this is a high-severity contract error.

---

### 2. CRITICAL: `COMPLETE_QUEST` event uses `Learning[]` and `ArchitectureDelta[]` types while `COMPLETE_SLICE` uses `LearningInput[]` and `ArchitectureDeltaInput[]`

**File:** `state-machine-api.md` lines 70-71 vs lines 60
**Resolution:** Fix `state-machine-api.md` to use `LearningInput[]` and `ArchitectureDeltaInput[]` consistently

In the `StateEvent` union in `state-machine-api.md`, `COMPLETE_QUEST` references `Learning[]` and `ArchitectureDelta[]` while `COMPLETE_SLICE` correctly uses `LearningInput[]` and `ArchitectureDeltaInput[]`. The actual implementation (`src/schemas/state-events.ts` lines 91-98) correctly uses `LearningInput[]` and `ArchitectureDeltaInput[]` for both. The architecture doc has a type name inconsistency that could mislead implementers into using the wrong types, which have different shapes (stored types include `source` and `rollup` fields; input types omit them).

---

### 3. IMPORTANT: `goodplan state` command is not registered in `commands-api.md` Global Commands section or `main.ts`

**File:** `cli-changes.md` section 1, `commands-api.md` lines 222-227
**Resolution:** Add `state` to `commands-api.md` Global Commands and document its flags

`cli-changes.md` introduces the keystone `goodplan state --json --query` command with `--offset`/`--limit` pagination, but `commands-api.md` (the authoritative command surface spec) does not list it in Global Commands. The `main.ts` subCommands map also lacks a `state` entry. The `state` command needs to be explicitly documented in `commands-api.md` with its flags (`--json`, `--query`, `--offset`, `--limit`) and routing (read-only, Data Layer direct).

---

### 4. IMPORTANT: `--offset`/`--limit` flags on `state` command are not documented in Global Flags or Common Workflow Flags tables

**File:** `commands-api.md` lines 279-297, `cli-changes.md` section 1
**Resolution:** Add `--offset` and `--limit` to the appropriate flags table in `commands-api.md`

The `state` command introduces `--offset` and `--limit` as new flags, but these don't appear in any of the flag tables in `commands-api.md`. Since they apply only to the `state` command (and only when `--query` returns an array), they should be documented either as command-specific flags on the `state` command definition or in the Global Flags table with a note about applicability.

---

### 5. IMPORTANT: `BeginResult` in `rpc-layer-api.md` includes `context?` and `paths?` fields but the implementation omits them

**File:** `rpc-layer-api.md` lines 190-198, `src/core/rpc/types.ts` lines 103-108
**Resolution:** Align `rpc-layer-api.md` spec with the implementation or add the fields to the implementation

The architecture spec defines `BeginResult` with optional `context?: ContextBundle` and `paths?: PathReferences` fields. The implementation defines `BeginResult` as only `{ entity, phase, previousStatus, newStatus }` without `context` or `paths`. Similarly, `SubmitResult` in the spec (line 182) includes `context?` and `paths?` but the implementation (lines 135-141) omits both. This is a contract gap: the `cli-interaction-conventions.md` explicitly tells skills to use `paths` from mutation responses to know where to write markdown content.

---

### 6. IMPORTANT: `CompleteResult` in implementation lacks `paths?: PathReferences` field documented in the spec

**File:** `rpc-layer-api.md` line 258, `src/core/rpc/types.ts` lines 119-133
**Resolution:** Add `paths` field to `CompleteResult` in implementation

The spec says `CompleteResult` includes `paths?: PathReferences` (which would contain absolute filesystem paths for where the LLM should write content). The implementation has `architecturePaths` but not the generic `paths` field. Skills rely on `paths` in completion responses to know where to update architecture docs. The `cli-interaction-conventions.md` documents this pattern explicitly.

---

### 7. IMPORTANT: `Target` type in implementation has extra variants not in the spec

**File:** `rpc-layer-api.md` lines 57-61, `src/core/rpc/types.ts` lines 60-66
**Resolution:** Update `rpc-layer-api.md` to document `project` and `rollup` Target variants

The implementation adds `{ type: "project" }` and `{ type: "rollup"; from: string; to: string }` to the `Target` union, beyond the four variants documented in the spec. The `rollup` variant addresses the learnings rollup use case, which the spec acknowledges as awkward (learning from `learnings.md`: "non-entity RPC operations need dedicated return types"). The architecture doc should reflect what was actually built.

---

### 8. IMPORTANT: `show` commands do not return the `artifacts` field specified in `cli-changes.md`

**File:** `cli-changes.md` section 2, `src/commands/slice/show.ts`, `src/commands/epic/show.ts`
**Resolution:** Clarify this is a planned enhancement, not current behavior, or implement it

`cli-changes.md` specifies that `show --json` responses should include an `artifacts` field with boolean flags for file existence (goal, plan, planRefined, etc.). The `cli-interaction-conventions.md` explicitly shows skills using this field for workflow phase detection. However, the current `show` implementations return only the raw entity JSON (no `artifacts` enrichment). If this is a planned change for this epic, the architecture should note it as "to be implemented." If it's expected to exist now, it's a missing feature.

---

### 9. IMPORTANT: `status --json` enrichment with file path arrays is documented but not reflected in `StatusResult` type

**File:** `cli-changes.md` section 3, `rpc-layer-api.md` lines 328-345
**Resolution:** Update `StatusResult` type in `rpc-layer-api.md` to include file arrays

`cli-changes.md` section 3 specifies upgrading `status --json` artifact counts to include file listings (e.g., `{ count: 10, files: ["_overview.md", ...] }`). But the `StatusResult` type in `rpc-layer-api.md` still shows simple number fields (`architectureFiles?: number`). The contract types should match the planned output shape.

---

### 10. IMPORTANT: `rollup` target type in `begin()` creates a conceptual mismatch

**File:** `rpc-layer-api.md` lines 87, `src/core/rpc/types.ts` lines 96-99
**Resolution:** Document the design rationale or extract to a dedicated function

The `begin('rollup', {type:'rollup', from, to})` pattern requires the caller to pass both `from` and `to` in the Target AND in the BeginPayloadMap. This is redundant (learnings: "non-entity RPC operations need dedicated return types"). The architecture acknowledged this issue via the `RollupResult` type in the implementation but didn't update the `rpc-layer-api.md` to show the dedicated result type. The spec should document the `RollupResult` type and the rationale for keeping rollup within `begin()`.

---

### 11. MINOR: `cli-interaction-conventions.md` references `activity:list --limit 5 --json` but `activity:list` is documented as "not yet implemented"

**File:** `cli-interaction-conventions.md` line 104, `commands-api.md` line 124
**Resolution:** Remove the reference or mark as planned

The conventions doc shows `activity:list --limit 5 --json` as a concrete command that orchestrator skills should use, but `commands-api.md` marks `activity:list` as "not yet implemented." Skills following the conventions doc would encounter an unknown command error.

---

### 12. MINOR: `CREATE_QUEST` event in `state-machine-api.md` lacks `goal` field but implementation has it

**File:** `state-machine-api.md` line 63, `src/schemas/state-events.ts` line 78
**Resolution:** Add `goal: string` to `CREATE_QUEST` in `state-machine-api.md`

The spec shows `{ type: 'CREATE_QUEST'; name: string; ts: string }` but the implementation has `{ type: "CREATE_QUEST"; name: string; goal: string; ts: string }`. This omission means implementers reading the architecture doc would miss the required `goal` field.

---

### 13. MINOR: Error shape `detail` type inconsistency between `StateError` and `GoodplanError`

**File:** `state-machine-api.md` lines 142-146, `src/util/errors.ts` line 33
**Resolution:** Align types

`StateError.detail` is typed as `Record<string, unknown> | undefined` in the spec. `GoodplanError.detail` in the implementation is `string | Record<string, unknown> | undefined`. The `ErrorOutput` schema (`src/schemas/error-output.ts`) correctly includes both `string` and `Record<string, unknown>` via a union. The architecture doc's `StateError` should note that the broader error contract accepts both shapes, or `GoodplanError` should be narrowed to match the spec.

---

### 14. MINOR: `--archive` flag on complete commands is not reflected in `CompleteInput` types or `commands-api.md` flags tables

**File:** `cli-changes.md` section 4, `commands-api.md` lines 292-297
**Resolution:** Add `--archive` to Common Workflow Flags table and to `CompleteResult`

`cli-changes.md` defines `--archive` on `slice:complete`, `quest:complete`, and `epic:complete`. The `commands-api.md` Common Workflow Flags table does not include it. The `CompleteResult` type should also document the `archivedPath?` return field (shown in `cli-changes.md` but not in `rpc-layer-api.md`).

---

### 15. MINOR: `cli-interaction-conventions.md` shows `echo '{"plan":"..."}' | goodplan submit-plan` but submit-plan carries no content payload

**File:** `cli-interaction-conventions.md` line 141
**Resolution:** Fix the example to match the documented contract

The conventions doc shows `echo '{"plan":"..."}' | goodplan submit-plan --slice my-slice --json` which implies plan content in stdin. But `submit-plan` is documented (and implemented) as a pure state-transition trigger -- the sub-agent writes plan.md directly to the filesystem, and `submit-plan` carries no content. The stdin should be `""` or `{}` per the SubmitInput type `{ phase: 'plan' }`.

---

### 16. MINOR: `DecisionEntry` in `state-machine-api.md` lacks a `context` field referenced in `cli-changes.md` jq examples

**File:** `cli-changes.md` line 42, `state-machine-api.md` lines 112-120
**Resolution:** Remove the jq example or add `context` to `DecisionEntry`

`cli-changes.md` includes a jq example: `.["decisions.jsonl"][] | select(.context | contains("create-architecture"))`. But `DecisionEntry` has no `context` field -- only `id`, `status`, `domain`, `title`, `summary`, `date`, `supersededBy`. This example would always return empty.

## Score: 6/10

The architecture is thoughtfully designed with strong foundational patterns (pure reducer, layered stack, entity-namespaced commands, structured errors). The contracts are mostly internally consistent within individual files. However, there are significant cross-file contract inconsistencies: the implementation diverges from the spec in several places (missing `paths`/`context` on result types, extra Target variants), the primary skill-facing conventions doc has incorrect flag names and misleading examples, and the keystone `state` command is fully specified in `cli-changes.md` but not integrated into the authoritative `commands-api.md`. These gaps would cause skills to construct invalid CLI invocations.

To reach 9+: (1) Reconcile `rpc-layer-api.md` result types with the implementation, documenting `project` and `rollup` Target variants. (2) Fix all flag name inconsistencies in `cli-interaction-conventions.md`. (3) Add the `state` command to `commands-api.md`. (4) Fix the `COMPLETE_QUEST` type names in `state-machine-api.md`. (5) Update `StatusResult` and `show` output types to reflect the enrichments described in `cli-changes.md`.

## Summary

- Critical: 2
- Important: 8
- Minor: 6
