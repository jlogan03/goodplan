# Merged Feedback — Round 1

## Consensus Score: 6/10

Reviewers: holistic (6), software-architecture (5), typescript (6)

---

## CRITICAL

### C1. `DeferredItem` wrong file path and wrong optionality
**Sources:** holistic, software-architecture, typescript

Plan says to add `targetEpic: string` (required) to `DeferredItem` in `src/schemas/commands/submit.ts`. Two errors:
1. `DeferredItem`/`deferredItemSchema` is in `src/schemas/entities/slice.ts` (lines 18-22), not `submit.ts`.
2. Architecture doc (`data-model-changes.md`) specifies `targetEpic: z.string().min(1).optional()` — optional, defaulting to completing slice's epic. Plan must match architecture.

Resolution: DIRECTLY_ACTIONABLE — fix file path and make `targetEpic` optional.

### C2. `Target` change creates silent runtime path bugs — RPC path functions missing from plan
**Sources:** holistic, software-architecture

Phase 1 adds `epic: string` to `Target` slice variant. TypeScript won't catch it, but `resolveEntityJsonPath` (`src/core/rpc/types.ts` line 232) and `resolveEntityDir` (`src/core/rpc/paths.ts` line 150) still return flat `slices/${target.name}/...` paths. Also `entityDir()` in `src/core/context/priorities.ts` (line 16-17) returns `slices/${target.name}`. None of these appear in any phase's task list despite being identified in the research docs.

Resolution: DIRECTLY_ACTIONABLE — either (a) add tasks for `resolveEntityJsonPath`, `resolveEntityDir`, and `entityDir` in Phase 1 alongside the `Target` change, or (b) defer the `Target` change to when the RPC layer is updated simultaneously. Also add `// TODO` comments if any path functions must remain stale temporarily.

### C3. `updateOverviewStatus` type change risks INV-005 violation if not atomic with schema registry
**Sources:** holistic, typescript

If `epicOverviewSchema` is registered (requiring `slices` on each item) but `addEpicToOverview`/`updateOverviewStatus` still use `Overview` type, writes will fail schema validation. The plan mentions this as a trailing bullet rather than a first-class task. Must be atomic: schema registry change and helper type changes (`getJson<Overview>` to `getJson<EpicOverview>`) happen in the same task group.

Resolution: DIRECTLY_ACTIONABLE — promote to explicit Phase 1 task, not a trailing note.

---

## IMPORTANT

### I1. Phase 1/Phase 2 boundary is blurred — helper changes appear in both
**Sources:** holistic, software-architecture, typescript

Phase 1 ("Schemas, Types & Registry") includes 5+ tasks modifying `helpers.ts` and `init.ts` (handler-level code). Phase 2 also lists helper updates. Options: (a) rename Phase 1 to include "& Foundational Helpers", (b) move helper changes to Phase 2, or (c) merge into a single phase.

Resolution: DIRECTLY_ACTIONABLE

### I2. Phase 1 `tsc --noEmit` verification is contradictory
**Sources:** software-architecture, typescript

Plan says `tsc --noEmit` passes after Phase 1, then notes "exhaustive switches will error until Phase 2 — use `@ts-expect-error`". Adding `epic` to 8 slice events breaks all handlers that destructure them. Options: (a) defer adding `epic` to events until Phase 2 alongside handler updates (cleanest), (b) accept Phase 1 won't compile and remove the verification, (c) merge phases.

Resolution: DIRECTLY_ACTIONABLE

### I3. RPC layer functions missing from plan — `begin.ts` event builders and `complete.ts` result builder
**Sources:** software-architecture

`src/core/rpc/begin.ts` has 7 functions that must pass `epic` from `Target` into `StateEvent` (`buildBeginEvent`, `buildCreateEvent`, `buildAbandonEvent`, etc.). `src/core/rpc/complete.ts` `buildSliceCompleteResult` has 6 flat `slices/${sliceName}/...` path references. Neither file appears in any phase task list. Without these, the state machine never receives `epic` on events and completion results read from wrong paths.

Resolution: DIRECTLY_ACTIONABLE — add tasks for both files.

### I4. Missing `epic-complete.ts` handler update
**Sources:** holistic

`COMPLETE_EPIC` needs to read embedded slices from `epics/overview.json` instead of filtering `slices/overview.json`. Not listed in Phase 2.

Resolution: CODEBASE_EXPLORATION — confirm handler location and update plan.

### I5. `addSliceToOverview` parameter type unspecified
**Sources:** typescript

Plan says "Create `addSliceToOverview(state, epicName, sliceItem)`" but doesn't specify `sliceItem` type. Should use Zod-inferred `SliceOverviewItem` type from `sliceOverviewItemSchema`.

Resolution: DIRECTLY_ACTIONABLE

### I6. `getSlice` signature change cascades to `handleBeginPlan` — dependency not documented
**Sources:** typescript

`getSlice(state, name)` becomes `getSlice(state, epic, name)`. `handleBeginPlan` currently calls `getSlice(state, event.slice)` before knowing the epic. After change, it needs `event.epic` — which Phase 1 adds. Plan should document this cross-phase dependency.

Resolution: DIRECTLY_ACTIONABLE

### I7. Schema registry ordering — confirm no first-match conflicts
**Sources:** typescript

New nested slice pattern must not conflict with existing epic pattern due to first-match semantics. Also note that JSONL wildcard patterns already match nested paths — no redundant patterns needed.

Resolution: DIRECTLY_ACTIONABLE — add explicit ordering note.

### I8. Missing `handleConvertTask` review for `buildInitialEpicJson` changes
**Sources:** holistic

`buildInitialEpicJson` is called from both `epic-create.ts` and `handleConvertTask`. Plan should confirm `handleConvertTask` has no additional `sliceSequence`/`slices/overview.json` references.

Resolution: CODEBASE_EXPLORATION

---

## MINOR

### M1. Before-check grep patterns are fragile and non-specific
**Sources:** holistic

`grep "epic:" src/schemas/state-events.ts` matches epic lifecycle events too, not just slice events. Use more targeted patterns or count within specific sections.

### M2. No documentation update tasks mentioned
**Sources:** holistic

Architecture overview lists 6 docs to update. Plan should state "Documentation updates deferred to slice N" if intentional.

### M3. `sliceOverviewItemSchema` duplicates `overviewItemSchema` fields
**Sources:** typescript

Consider deriving via `.pick()` or `.omit()` to reduce maintenance surface.

### M4. `buildInitialEpicJson` has pre-existing `verifications` type bug
**Sources:** typescript

`verifications: [] as string[]` should be `[] as Verification[]` per `epicSchema`. Cheap fix while touching this function.

### M5. Phase 2 test updates underspecified for `noUncheckedIndexedAccess`
**Sources:** typescript

Tests accessing overview items by index (`overview.items[0]`) will need undefined-narrowing after shape changes.

### M6. Phase 2 test fixture migration is vague
**Sources:** holistic

"Move slice entries from `slices/` to `epics/<epic>/slices/`" should enumerate which fixture directories actually need migration.
