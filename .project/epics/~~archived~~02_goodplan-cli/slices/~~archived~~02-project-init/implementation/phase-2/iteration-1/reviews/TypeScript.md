# TypeScript Reviewer: Phase 2 — Entity Schemas

## Issues

**[IMPORTANT]** Duplicated `scoreEntrySchema` and `refinementSchema` between slice and quest
The `scoreEntrySchema` and `refinementSchema` are identically defined in both `src/schemas/entities/slice.ts` (lines 17-26) and `src/schemas/entities/quest.ts` (lines 17-26). The data model doc confirms these have identical structure. Extract to `src/schemas/shared.ts` (which already hosts `timestampSchema` and `versionSchema`) and import from both files. This eliminates a maintenance hazard where future changes to one copy miss the other.
File: src/schemas/entities/quest.ts:17
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `isStateError` type guard accepts any object with a string `code` property
The guard checks `"code" in result && typeof result.code === "string"` but does not check for `message`. A random object like `{ code: "foo" }` would pass the guard and be narrowed to `StateError`, even though it lacks `message`. Adding `&& "message" in result && typeof (result as StateError).message === "string"` would make the guard more precise. The risk is low since only the state machine and RPC layer construct these objects, but tighter checking costs nothing.
File: src/schemas/state-events.ts:12
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `learnings.jsonl` pattern ordering note from plan not enforced
The plan says "place the more specific project-level pattern first" for `learnings.jsonl`. In the registry, `^learnings\.jsonl$` (line 34) appears before `.*\/learnings\.jsonl$` (line 35), which is correct. However, the project-level pattern will never match `slices/x/learnings.jsonl` anyway (it's anchored with `^`), so the ordering is technically immaterial. Both schemas point to the same `learningEntrySchema`, so no functional bug. No action needed — documenting for completeness.
File: src/core/data/schema-registry.ts:34
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
Clean implementation that faithfully follows the architecture and plan. Types are strict and leverage Zod 4 correctly. All schemas match the data model and transition tables. Tests are thorough with valid/invalid fixtures for every schema. The `verbatimModuleSyntax` compliance is correct throughout — `import type` used where only type-level access is needed (`schema-registry.ts` line 1), value imports elsewhere. The one substantive issue is the duplicated refinement schemas which should be extracted to `shared.ts`.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
