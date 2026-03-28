# Merged Feedback — Slice Lifecycle Plan (Round 3)

Reviewers: Holistic (9/10), TypeScript (9/10). SoftwareArchitecture and TUICLI passed in round 2 and were not re-run.

---

## Important

**[IMPORTANT-1] Phase 2 COMPLETE_SLICE — overview update missing from explicit step list** *(Holistic)*

Phase 2's COMPLETE_SLICE handler lists 7 numbered steps but step 5 says "set slice to `completed`, update overview" as a single bullet. The `updateSliceOverviewStatus` helper is defined in the helpers task, but the step list doesn't call it out as a separate named operation the way CREATE_SLICE does. Overview sync is a documented invariant ("Overview.json must be synced by every status-changing handler"). The step should explicitly name the helper call to prevent an implementer from only updating `slice.json` and forgetting the overview.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2] Phase 2 ABANDON_SLICE — overview status update not mentioned** *(Holistic)*

The ABANDON_SLICE task describes "Sets abandoned, records reason. Clears activeSlice if this was the active slice. Appends activity-log." but does not mention updating `slices/overview.json` status to `abandoned`. Every other status-changing handler in the plan mentions the overview update. The `setSliceStatus` helper likely bundles this, but the omission is a trap for implementers — make it explicit.

Resolution: DIRECTLY_ACTIONABLE

> Note: This was categorised MINOR by Holistic but promoted here because it is the same class of issue as IMPORTANT-1 (missing overview sync callout for a status-changing handler) and the consequence is identical.

---

**[IMPORTANT-3] Phase 1 `learningInputSchema` — category should use `z.enum()` not `z.string()`** *(TypeScript)*

Phase 1 task 2(a) describes a "category enum" but the existing `learningEntrySchema` uses `z.string().min(1)` (intentionally open for forward-compatibility). `learningInputSchema` is the RPC/CLI boundary schema; it should validate at input time with `z.enum(["domain", "worked", "didnt-work", "do-differently"])` per INV-005 and INV-007. The storage schema can remain an open string. Without the enum on input, invalid categories pass through the CLI boundary unchecked.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4] Phase 3 `BeginPayloadMap` `epic` field — runtime error message must be user-facing** *(Holistic)*

Phase 3 task 3 adds `epic?: string` to `BeginPayloadMap` for `create`, with a runtime check catching a missing `epic` when creating a slice. The plan acknowledges this as a deliberate tradeoff. The error message must name the `--epic` flag (user-facing), not just say "epic is absent" (developer-facing). The existing `goal === undefined` error at `begin.ts:119` sets the precedent — match its style.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-5] Phase 3 `CompleteResult.deferredRouted` — `target` field redundancy with `item.targetSlice`** *(TypeScript)*

Phase 3 task 5 defines `deferredRouted?: { item: DeferredItem; target: string }[]`. `DeferredItem` already contains `targetSlice: string`, making `target` potentially redundant. If `target` always equals `item.targetSlice`, simplify to `deferredRouted?: DeferredItem[]`. If `target` represents the confirmed/resolved target (as opposed to the user-requested `item.targetSlice`), document the distinction explicitly. As written, implementers will set `target = item.targetSlice` without understanding the intent.

Resolution: DIRECTLY_ACTIONABLE

---

## Minor

**[MINOR-1] Phase 2 `guardSliceStatus` — plan should state callers use return value directly, eliminating `!` assertions** *(TypeScript)*

Phase 2 task 7 defines `guardSliceStatus` returning `Slice | StateError`, and task 8 updates callers to `isStateError()` narrowing. The plan should explicitly state that the guard return value IS the narrowed slice — callers must assign it (`const sliceOrErr = guardSliceStatus(...); if (isStateError(sliceOrErr)) return sliceOrErr; const slice = sliceOrErr;`) and drop all existing non-null assertions (`slice!`) in `slice-submit.ts`. This is the main type-safety benefit of the migration and should be called out clearly.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] Phase 1 `overviewItemSchema` — needs export for type-safe use in later phases** *(TypeScript)*

Phase 1 task 4 adds `epic?: string` to `overviewItemSchema`, and Phase 2/4 reference the field. Currently `overviewItemSchema` is not exported (`const overviewItemSchema` in `overview.ts`). Phase 1 should note that either `overviewItemSchema` must be exported or `export type OverviewItem = z.infer<typeof overviewItemSchema>` added, so downstream phases can reference the item type in a type-safe way when filtering by epic.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] Phase 4 `overviewItemSchema` change duplicates Phase 1 instruction** *(Holistic + TypeScript)*

Phase 4 task 2 (`slice:list`) says "Update `overviewItemSchema` in `src/schemas/overview.ts` to include optional `epic?: string`". Phase 1 task 4 already covers this. Replace the Phase 4 instruction with a cross-reference: "uses the `epic` field added in Phase 1." Doing it twice risks confusion about whether there are two separate changes.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4] Phase 4 `createSliceInput` — `epic` field should be required, not optional** *(TypeScript)*

Phase 4 task 9 says `createSliceInput` should have `epic` as optional. Because `validateInput` merges the `--epic` flag value into the validated object and `--epic` is a required flag (INV-004), the merged result must always have `epic` present. The schema should use `z.string().min(1)` (required) for `epic`, not optional. Making it optional would silently allow a missing flag to produce `undefined`. Verify against `validateInput` implementation to confirm merge behavior.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5] Phase 2/3 ownership of `ts` injection on `ArchitectureDelta`** *(TypeScript)*

Phase 1 says `architectureDeltaInputSchema` omits `ts` (injected by RPC). Phase 3 task 2 says "Inject `ts` on each ArchitectureDelta entry." Phase 2 task 4 step 4 also says "Inject `ts` from event.ts on each delta." Both phases claim responsibility. Clarify ownership: the RPC layer (Phase 3) injects `ts` on each `ArchitectureDeltaInput` when building the COMPLETE_SLICE event, so the state machine receives complete `ArchitectureDelta` objects. Phase 2 state machine logic should simply write them as-is (they arrive with `ts` already set).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-6] Phase 5 e2e step 8 — ambiguous ordering around `plan-refined.md`** *(Holistic)*

Step 8 begins "Write plan-refined.md" immediately after the `slice:refine-plan` command, which could be read as writing the file before running the command. Add a clearer sentence break: "Transitions to refining. Write plan-refined.md to `.project/slices/01-auth/plan-refined.md`, then submit-refinement."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-7] Phase 2 quest helper consolidation — plan must commit to a decision** *(Holistic)*

The helpers refactor task says quest helpers "should also be consolidated into `helpers.ts` or flagged as deferred work for slice 05." Leaving this to the implementer is ambiguous. Commit to deferral: flag as deferred in the overview or a comment in `slice-submit.ts`, since quest lifecycle is slice 05's scope.

Resolution: DIRECTLY_ACTIONABLE

---

## Score Summary

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| Holistic | 9/10 | 0 | 2 | 4 |
| TypeScript | 9/10 | 0 | 2 | 4 |
| **Merged** | **9/10** | **0** | **5** | **7** |

> Merged counts are higher because ABANDON_SLICE (Holistic MINOR) was promoted to IMPORTANT and unique issues from each reviewer are preserved. No contradictions between reviewers — all issues are additive.

---

## What Changed From Round 2

All round-2 critical and important issues were resolved. Round 3 issues are about explicitness (overview sync callouts, error message style, `ts` injection ownership) and type strictness (`z.enum` vs `z.string`, required vs optional `epic`). No architectural concerns remain.
