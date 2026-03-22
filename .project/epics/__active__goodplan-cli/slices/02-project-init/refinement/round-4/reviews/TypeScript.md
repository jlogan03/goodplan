# TypeScript Review — 02-project-init Plan (Round 4)

## Issues

**[MINOR]** Phase 2 schema registry typing — `ZodSchema` should be `z.ZodType` in Zod 4

The plan's Phase 2 task for `schema-registry.ts` says `{ pattern: RegExp, schema: ZodSchema }`. The Zod 4 research doc explicitly notes that `z.ZodTypeAny` is removed and recommends `z.ZodType` instead. While `ZodSchema` may still work as an alias, the canonical Zod 4 type for schema-accepting functions is `z.ZodType`. The architecture docs (`data-model.md`, `data-layer-api.md`) also use `ZodSchema` in their examples, so this is a documentation-level inconsistency rather than a compile error — but the implementer should use `z.ZodType` to align with Zod 4 conventions. This is a minor precision issue that could be noted in the task or left for the implementer to resolve based on the research doc.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 `isStateError` re-export uses `export type` but the function is a value

Phase 4 task says: "Export `StateEvent`, `StateError`, and `isStateError` from `src/core/state/types.ts` (thin re-export layer from schemas). Use `export type` for all type-only re-exports per `verbatimModuleSyntax: true`." The instruction to use `export type` for "all" re-exports is slightly misleading — `isStateError` is a runtime function (a type guard), not a type. With `verbatimModuleSyntax: true`, `export type` on a value would be a compile error. The task should say "Use `export type` for `StateEvent` and `StateError`; use a regular `export` for `isStateError`." The plan already defines `isStateError` correctly in Phase 2 (`state-events.ts`), so the re-export layer just needs the right export form.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round 3 issues were thoroughly addressed. The plan now explicitly documents `getJson<T>` unsafety with the validation boundary at `commitState`, specifies silent skip for unregistered `.json` files, defines `StateEvent` as a plain TypeScript discriminated union (not Zod), specifies `slice` + `map` for JSONL appends to avoid `noUncheckedIndexedAccess` friction, and exports an `isStateError` type guard. The two remaining issues are minor precision gaps: using the correct Zod 4 type name in the registry, and distinguishing type vs value re-exports under `verbatimModuleSyntax`. Neither affects correctness — both are small clarifications that an experienced implementer would resolve naturally.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
