# Generalist Review — Phase 2: Entity Schemas

**Score: 9/10**

## Summary

Solid implementation. All entity schemas, record schemas, state events, schema registry, and tests are present and correctly structured. Schemas match the data model spec. Tests cover valid/invalid cases for every type. The registry maps all required path patterns. TypeScript and tests pass clean (109/0).

## Critical (0)

None.

## Important (2)

1. **Duplicate `scoreEntrySchema` / `refinementSchema` in slice.ts and quest.ts.** Both files define identical unexported `scoreEntrySchema` and `refinementSchema` objects. These should be extracted to `src/schemas/shared.ts` (or a dedicated `src/schemas/shared/refinement.ts`) and imported. This is a DRY violation that will cause divergence if one is updated without the other.
   - Files: `src/schemas/entities/slice.ts` (lines 17-26), `src/schemas/entities/quest.ts` (lines 17-26)

2. **`isStateError` type guard may false-positive on objects with a string `code` property.** The guard checks `typeof result === "object" && "code" in result && typeof code === "string"`, which would match any object with a string `code` field (e.g., an HTTP response object `{ code: "200", body: "..." }`). The plan specifies checking `"code" in result`, but since `StateError` will be returned from the reducer alongside `ProjectState` (which has `type: "directory"`), false positives are unlikely in practice. However, adding a check like `&& "message" in result` would make it more robust for the general `unknown` input signature. Low risk since usage is constrained, but worth noting.
   - File: `src/schemas/state-events.ts` (lines 9-18)

## Minor (3)

1. **`overview.json` status field accepts empty string.** The plan says `z.string()` (not a specific enum), which is implemented, but the overview item `status` uses `z.string()` without `.min(1)` while `name` uses `z.string().min(1)`. An empty status string would pass validation. Consider adding `.min(1)` for consistency with other string fields.
   - File: `src/schemas/entities/overview.ts` (line 6)

2. **Schema registry `learnings.jsonl` overlap not tested.** The plan notes that `^learnings\.jsonl$` (project-level) and `.*\/learnings\.jsonl$` (per-slice/quest) overlap and that ordering matters. The test covers both paths correctly, but there is no explicit test asserting that `learnings.jsonl` resolves to the project-level pattern specifically (i.e., confirming registry ordering). The current test checks schema identity (`toBe(learningEntrySchema)`) which is the same for both, so ordering bugs would be silent. A comment noting this is sufficient; it only matters if schemas diverge later.
   - File: `tests/unit/schemas/schema-registry.test.ts` (lines 52-54)

3. **`import type { z }` in schema-registry.ts.** The registry uses `z.ZodType` only as a type annotation in the interface and function return type. The `import type` is correct per `verbatimModuleSyntax`. However, the registry also imports actual runtime schemas (epicSchema, etc.) which pull in Zod transitively, so this is purely a style note -- no issue.
   - File: `src/core/data/schema-registry.ts` (line 1)

## Checklist vs Plan

| Task | Status | Notes |
|---|---|---|
| `epic.ts` — epicSchema + Epic type, all fields | Pass | Matches data-model.md exactly |
| `slice.ts` — sliceSchema + Slice type, all fields | Pass | Matches data-model.md |
| `quest.ts` — questSchema + Quest type, no epic field | Pass | Confirmed no epic field; test verifies stripping |
| `overview.ts` — overviewSchema + Overview type | Pass | status is `z.string()` per plan |
| `activity-log.ts` — activityEntrySchema | Pass | detail is optional per plan |
| `decision.ts` — decisionEntrySchema | Pass | status enum matches transition-tables.md |
| `learning.ts` — learningEntrySchema | Pass | rollup boolean + rollupTo array, source required |
| `architecture-delta.ts` — architectureDeltaSchema | Pass | type enum: add/modify/remove |
| `state-events.ts` — StateEvent DU, StateError, isStateError | Pass | Plain TS types, not Zod, per plan |
| `schema-registry.ts` — findSchema + all patterns | Pass | All patterns from data-model.md present |
| Entity status enums match transition-tables.md | Pass | All statuses verified against tables |
| Tests: valid/invalid fixtures for every schema | Pass | Comprehensive coverage |
| Tests: registry resolves all path patterns | Pass | Including project.json and all JSONL |
| Tests: unknown paths return undefined | Pass | Multiple unknown path cases tested |
