# Merged Feedback — Round 2

**Scores:** holistic 8/10 · software-architecture 9/10 · typescript 8/10
**Critical:** 0 · **Important:** 5 (merged from 8) · **Minor:** 3 (merged from 6)

---

## Important Issues

### [IMPORTANT-1] `resolveEntityJsonPath` scope boundary contradiction (all 3 reviewers)

**Holistic** flags that `src/core/rpc/types.ts` is not mentioned in the Scope Boundary even though the task correctly modifies it.
**Software-architecture** flags the contradiction more directly: the scope boundary says all `src/core/rpc/` files are slice 02, yet the task updates `resolveEntityJsonPath` (an RPC file) in Phase 1.
**TypeScript** flags that `resolveEntityName` in the same file does NOT need changes — the plan's hedge ("if discriminant changes require it") is confusing.

**Resolution:** Add an explicit exception in the Scope Boundary: `src/core/rpc/types.ts` is in-scope for Phase 1 because `resolveEntityJsonPath` and `resolveEntityName` are pure type-level helpers co-located with `Target`, not workflow orchestration. Clarify that `resolveEntityName` needs no change (returns `target.name`, correct as-is). Mark `resolveEntityDir` and all other `src/core/rpc/` files as slice 02 only.

---

### [IMPORTANT-2] `Verification` import missing from `helpers.ts` (holistic + software-architecture)

Both reviewers independently flag that `buildInitialEpicJson`'s `verifications: [] as string[]` → `[] as Verification[]` fix requires importing `Verification` from `../../schemas/entities/epic.js`. The plan describes the type fix but omits the import. Without it, `tsc` will fail.

**Resolution:** Add to the Phase 1 task: "Import `Verification` from `../../schemas/entities/epic.js` in `helpers.ts`."

---

### [IMPORTANT-3] `@ts-expect-error` strategy is underspecified and fragile (typescript reviewer)

The plan vaguely says to add `@ts-expect-error` on "handler call sites" in Phase 1. There are at least 18 sites across 5 handler files (`slice-plan.ts`, `slice-complete.ts`, `slice-implement.ts`, `slice-submit.ts`, `slice-abandon.ts`) covering `getSlice()`, `setSliceJson()`, and `setSliceStatus()` calls. Two problems: (1) implementers will miss sites and get unexpected compile errors; (2) `@ts-expect-error` silently swallows ALL errors on the annotated line, not just arity mismatches.

**Resolution (two options, pick one):** Either (a) enumerate exact file:function pairs needing `@ts-expect-error`, or (b) change Phase 1 to add arity overloads to `getSlice`/`setSliceJson`/`setSliceStatus` that accept both old `(state, name)` and new `(state, epic, name)` arities — eliminating `@ts-expect-error` entirely. Phase 2 then removes overloads and updates call sites. Option (b) is safer.

---

### [IMPORTANT-4] `completed` timestamp never set on terminal epic/slice transitions (software-architecture)

`updateOverviewStatus` (helpers.ts line 89) only spreads `status`; it never sets the `completed` field. The new `epicOverviewItemSchema` will have `completed: timestampSchema.nullable()`, and the new `updateSliceOverviewStatus` will have the same gap. Since helper signatures are already changing in this slice, this is the natural time to fix it.

**Resolution:** Either (a) fix `updateOverviewStatus` and the new `updateSliceOverviewStatus` to set `completed: event.timestamp` when transitioning to a terminal state (`completed`/`abandoned`), or (b) explicitly document it as a known gap with a follow-up task. Do not silently propagate the bug to `updateSliceOverviewStatus`.

---

### [IMPORTANT-5] `rollup-learnings.ts` task scope unclear — may be a no-op (holistic reviewer)

Phase 2 lists "Update `rollup-learnings.ts`: Resolve scope paths using nested format." But the handler's `event.from` is a caller-supplied string constructed in the RPC layer (slice 02). If the RPC layer already passes `"epics/my-epic/slices/01-auth"`, the handler already works. The task may be a no-op verification rather than a code change.

**Resolution:** Clarify whether this task requires code changes or is verification-only. If the handler does not need changes until the RPC layer passes updated paths (slice 02), mark it as "verify no changes needed" and remove it from the implementation task list to avoid implementer confusion.

---

## Minor Issues

### [MINOR-1] Before-check grep for slice events is unusable as written (holistic reviewer)

The Phase 1 before-check `grep "epic:" src/schemas/state-events.ts | grep -c ""` returns ~17 (all epic lifecycle events), not the "1" the plan implies. The plan's own note acknowledges this but leaves the check in place.

**Resolution:** Replace with a targeted grep, e.g., `grep -cE "PLAN_SLICE|REFINE_SLICE|IMPLEMENT_SLICE|COMPLETE_SLICE|ABANDON_SLICE" src/schemas/state-events.ts`, or remove the before-check entirely.

---

### [MINOR-2] `sliceOverviewItemSchema` should use `.omit()` not standalone definition (typescript reviewer)

Phase 1 says "consider deriving via `.pick()` or `.omit()`" — this should be a commitment. `sliceOverviewItemSchema` is `overviewItemSchema` minus the optional `epic` and `title` fields; defining it as `overviewItemSchema.omit({ epic: true, title: true })` prevents drift when `overviewItemSchema` evolves.

**Resolution:** Change "consider" to a firm requirement: define `sliceOverviewItemSchema` as `overviewItemSchema.omit({ epic: true, title: true })`.

---

### [MINOR-3] `guardSliceStatus` error messages lack epic context (software-architecture reviewer)

After restructuring, `guardSliceStatus` (helpers.ts line 118) error messages include only `sliceName`, which is ambiguous across epics. Not blocking but will complicate debugging.

**Resolution (low priority):** Update `guardSliceStatus` to accept and include `epicName` in error messages, consistent with `getSlice` which already takes `epic` after the Phase 2 update.

---

## Deduplication Notes

- `resolveEntityJsonPath` scope ambiguity raised by all 3 reviewers — merged into IMPORTANT-1.
- `Verification` import raised by holistic and software-architecture — merged into IMPORTANT-2.
- `verifications: [] as string[]` type fix mentioned by software-architecture as MINOR overlaps with holistic's IMPORTANT on the import — unified under IMPORTANT-2 (import is the load-bearing gap).
- TypeScript's `@ts-expect-error` strategy (IMPORTANT) and holistic's vague rollup-learnings concern (IMPORTANT) are distinct — both kept.
- TypeScript's deferred routing `targetEpic ?? event.epic` guidance and nested update pattern for `updateSliceOverviewStatus` were minor implementation-detail notes. The nested update pattern is subsumed by IMPORTANT-4 (fixing the `completed` gap requires the same nested spread anyway). The `targetEpic ?? event.epic` expression is straightforward enough to omit from this merged list — the plan already identifies the pattern correctly.

---

## Consensus Strengths

All reviewers agree round-1 issues were well-addressed: DeferredItem path correction, Target cascade documentation, atomicity ordering constraint, `@ts-expect-error` strategy adoption, phase boundary clarification, and out-of-scope RPC notation are all handled. The plan is architecturally sound and close to implementation-ready.
