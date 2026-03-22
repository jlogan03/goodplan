# Software Architecture Review — Phase 2: Entity Schemas (Iteration 1)

## Issues

**[IMPORTANT]** Duplicated `scoreEntrySchema` and `refinementSchema` across slice.ts and quest.ts
The `scoreEntrySchema` and `refinementSchema` are defined identically in both `src/schemas/entities/slice.ts` (lines 17-26) and `src/schemas/entities/quest.ts` (lines 17-26). The architecture data model explicitly states that `quest.json` refinement "has the same structure and semantics as in `slice.json`." This duplication creates coupling risk: a change to the refinement shape requires updating two files in lockstep. Extract both schemas into `src/schemas/shared.ts` (which already holds `timestampSchema` and `versionSchema`) and import from there.
File: src/schemas/entities/slice.ts:17
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `StateEvent` type is incomplete — only covers `INIT_PROJECT`
The `StateEvent` type in `src/schemas/state-events.ts` defines only `{ type: "INIT_PROJECT"; name: string }`. The architecture's `state-machine-api.md` specifies a full discriminated union of ~30+ event types (epic lifecycle, slice lifecycle, quest lifecycle, cross-cutting). While only `INIT_PROJECT` is needed for slice 02's Phase 4 (reduce + INIT_PROJECT), the phase description says "StateEvent/StateError types" — and the codebase context research confirms this file is Phase 2 scope. If the intent is to define only the events needed for this slice, this is acceptable but should be documented with a comment. If the intent is the full union per the phase description, the remaining variants are missing. Given the plan says Phase 4 only implements INIT_PROJECT transition, defining only that event is pragmatic. Add a `// TODO: remaining events added in future slices` comment to signal intent.
File: src/schemas/state-events.ts:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `decision.date` field uses `z.string().min(1)` instead of a date-format validator
The architecture data model shows `"date": "2026-03-20"` (ISO 8601 date). The schema accepts any non-empty string. While this won't cause runtime failures, it weakens the validation contract that INV-005 mandates. Consider using `z.string().date()` (Zod 4 supports date-only validation) or a regex pattern like `/^\d{4}-\d{2}-\d{2}$/` to match the documented ISO 8601 date format.
File: src/schemas/records/decision.ts:9
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `learning.category` is `z.string().min(1)` but the RPC API defines a fixed enum
The `rpc-layer-api.md` canonical `Learning` type specifies `category: 'domain' | 'worked' | 'didnt-work' | 'do-differently'`. The stored `learningEntrySchema` uses `z.string().min(1)`, which accepts any category string. This is a reasonable choice if the stored format should be forward-compatible with new categories, but it means the schema won't catch typos or invalid categories at the Data Layer boundary. Consider using `z.enum(["domain", "worked", "didnt-work", "do-differently"])` to match the documented canonical type, or add a comment explaining the intentional looseness.
File: src/schemas/records/learning.ts:4
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `activity-log.ts` has optional `detail` field not present in architecture data model
The `activityEntrySchema` includes `detail: z.string().optional()` (line 10), but the data model example for `activity-log.jsonl` shows only `ts`, `phase`, `scope`, `status`, and `summary` — no `detail` field. This is a minor extension that doesn't violate any invariant (Zod strips unknown fields on read, and optional fields are backward-compatible), but it should be documented in the data model or removed for consistency.
File: src/schemas/records/activity-log.ts:10
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid implementation. Schemas faithfully reflect the architecture's data model. The schema registry matches the architecture spec exactly (patterns and ordering). Tests are thorough with good coverage of valid/invalid/edge cases. The `findSchema` function and `SchemaRegistryEntry` interface are well-designed — deep module with a simple public API. Test boundary alignment is good (testing through public schema APIs, not internals).

To reach 9+: extract the duplicated refinement schema (IMPORTANT), and address the StateEvent completeness question (either expand or document the incremental approach). The MINOR items are nice-to-haves.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
