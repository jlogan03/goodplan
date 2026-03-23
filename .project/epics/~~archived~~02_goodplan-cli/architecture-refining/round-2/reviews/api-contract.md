# API Contract Review (Round 2)

Reviewer: API Contract
Scope: Entire architecture -- inter-subsystem contract coherence after tree model integration fixes
Goal: Verify inter-subsystem contracts are coherent after tree model integration fixes.

## Round 1 Fix Verification

All 11 issues from round 1 are resolved:
- All `_derived` references removed (only the historical note in the section header remains)
- `dirHasFile()` standardized to `hasChild()` everywhere
- `getJson<T>()` and `getJsonl<T>()` return unwrapped types consistently across data-model.md and data-layer-api.md
- State Key Dependencies table references tree paths, not `_derived`
- "Free-Form Markdown" section correctly references `DirectoryEntry.contents` keys
- `complete()` RPC function no longer takes a `BeginPhase` parameter -- signature is now `complete(target, input, options)`
- `plan-refined.md` example entry uses `type: "markdown"`
- Context bundling documents tree traversal for directory references (MarkdownEntry children)
- Status enum values in state-machine-api.md match transition table status names
- Schema registry path construction specified (forward-slash-separated, no leading slash)
- `getMarkdown()` added to data-model.md

## Issues

**[IMPORTANT] `CompleteInput` type cannot represent `COMPLETE_EPIC` payload**

`rpc-layer-api.md` defines a single `CompleteInput` type used by `complete(target, input, options)`:

```typescript
interface CompleteInput {
  verificationPassed: boolean;
  deferred?: DeferredItem[];
  learnings?: Learning[];
  architectureDelta?: ArchitectureDelta[];
}
```

This works for `COMPLETE_SLICE` and `COMPLETE_QUEST` (which use `verificationPassed: boolean`). However, `COMPLETE_EPIC` (state-machine-api.md line 48) uses a fundamentally different payload:

```typescript
{ type: 'COMPLETE_EPIC'; epic: string; verificationResults: VerificationResult[] }
```

There is no way to pass `verificationResults` through `CompleteInput`. The commands-api.md stdin example (lines 157-166) correctly shows the epic payload shape with `verificationResults`, and the transition table guard ("all verificationResults have passed: true") matches. Only the RPC layer's `CompleteInput` type is missing the field.

Fix: Add `verificationResults?: VerificationResult[]` to `CompleteInput` and document that epic completion uses `verificationResults` while slice/quest completion uses `verificationPassed`. Alternatively, make `CompleteInput` a discriminated union on target type.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `BeginPhase` mapping comments incomplete -- several values unmapped**

`rpc-layer-api.md` defines `BeginPhase` with 16 values (lines 25-40) but the explicit mapping comments (lines 57-69) only cover 11. Missing:

- `begin('refine-plan', {type:'slice'})` -> `BEGIN_REFINEMENT`
- `begin('refine-plan', {type:'quest'})` -> `BEGIN_QUEST_REFINEMENT`
- `begin('abandon', {type:'epic'})` -> `ABANDON_EPIC` (and slice/quest variants)
- `begin('add-verification', {type:'epic'})` -> `ADD_VERIFICATION`
- `begin('update-verification', {type:'epic'})` -> `UPDATE_VERIFICATION`
- `begin('rollup', ...)` -> `ROLLUP_LEARNINGS`

The `'complete'` value in `BeginPhase` is also questionable -- the routing table (line 90) shows completion goes through the separate `complete()` function, not `begin()`. Either remove `'complete'` from `BeginPhase` or document that `begin('complete', ...)` delegates to `complete()`.

The routing table (lines 86-95) covers these correctly, but the inline mapping comments serve as the primary implementor reference and are incomplete.

Fix: Add the missing mapping lines. Remove or document `'complete'` in `BeginPhase`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] Three types referenced in RPC result interfaces are never defined**

`rpc-layer-api.md` uses three types that have no definition anywhere in the architecture:

1. `PathReferences` -- used in `SubmitResult.paths`, `BeginResult.paths`, `CompleteResult.paths`
2. `DecisionSummary` -- used in `ContextBundle.decisions`
3. `LearningSummary` -- used in `ContextBundle.learnings`

These are part of the contract between the RPC layer and the Commands layer. Without definitions, implementors must guess the shape.

Fix: Add interface definitions. `PathReferences` is likely `Record<string, string>` (logical name -> filesystem path). `DecisionSummary` and `LearningSummary` are likely lightweight projections of their full record types (id + title/summary + status).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `StatusOptions` type referenced but never defined**

`rpc-layer-api.md` line 16: `function status(options: StatusOptions): StatusResult` -- `StatusOptions` has no definition. The `status` command accepts `--json`, `--query`, `--verbose` flags, but those are output formatting (Commands layer concern). The RPC layer's `status()` function likely needs a subset of `WorkflowOptions` or nothing at all.

Fix: Define `StatusOptions`. If it's just `WorkflowOptions`, use that type. If it needs nothing, use an empty interface or remove the parameter.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] flows.md slice:complete flow references wrong source status**

`flows.md` line 67: "Reads slice status -> `implementing`"

Per transition-tables.md, `COMPLETE_SLICE` fires from `implementation-complete`, not `implementing`. The `COMPLETE_IMPLEMENTATION` event transitions `implementing` -> `implementation-complete`; then `COMPLETE_SLICE` transitions `implementation-complete` -> `completed`.

Fix: Change "`implementing`" to "`implementation-complete`" on line 67.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Quest lifecycle missing first-round skip path that slices have**

Transition-tables.md line 74 documents a slice skip path: `plan-created | COMPLETE_REFINEMENT_ROUND | plan-refined` (first round scores meet threshold, bypassing the `refining` state). No equivalent `plan-created | COMPLETE_QUEST_REFINEMENT_ROUND | plan-refined` row exists for quests.

The document states "Quest lifecycle mirrors slice" but this path is absent. If intentional, note why quests differ. If an oversight, add the row.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All round-1 issues are fully resolved. The tree model migration is complete and consistent across all documents. Core inter-subsystem contracts -- `reduce()` signature with tree state, `commitState()` with tree diff, context bundling with `MarkdownEntry` traversal, `hasChild()` guards, status enums matching transition tables -- are now coherent.

The remaining issues are real but bounded. The most impactful is the `CompleteInput` type gap: it literally cannot represent the `COMPLETE_EPIC` payload, which will block implementation of `epic:complete`. The undefined result types and incomplete mapping comments are documentation gaps that create implementation friction but not architectural confusion.

To reach 9+: (1) Make `CompleteInput` support epic completion's `verificationResults`. (2) Complete the `BeginPhase` mapping comments and resolve the `'complete'` value. (3) Define `PathReferences`, `DecisionSummary`, `LearningSummary`, and `StatusOptions`. (4) Fix the two minor issues.

## Summary
- Critical: 0
- Important: 4
- Minor: 2
