# API Contract Review — Round 3

Reviewer: API Contract
Iteration: 3
Scope: Entire architecture — inter-subsystem contract coherence after round 2 fixes
Goal: Verify contracts are fully coherent after fixing CompleteInput union, undefined types, learnings removed from SubmitInput, and BeginPhase mapping completion.

---

## Round 2 Fix Verification

All 6 issues from round 2 are resolved:

- `CompleteInput` is now a discriminated union on `type` — epic uses `verificationResults`, slice/quest use `verificationPassed`. Correctly maps to `COMPLETE_EPIC`, `COMPLETE_SLICE`, `COMPLETE_QUEST` event payloads.
- `BeginPhase` mapping comments now list all 16 `begin()` call combinations including `refine-plan`, `abandon`, `add-verification`, `update-verification`, and `rollup`. The spurious `'complete'` value is gone from `BeginPhase`.
- `PathReferences`, `DecisionSummary`, `LearningSummary`, and `StatusOptions` are all defined in `rpc-layer-api.md`.
- `flows.md` line 67 now correctly reads `implementation-complete` (was `implementing`).
- Quest first-round skip path (`plan-created | COMPLETE_QUEST_REFINEMENT_ROUND | plan-refined`) now exists in `transition-tables.md`.

---

## Issues

**[IMPORTANT]** `decision:create` and `decision:update` route through `begin()` but `Target` has no `decision` variant

`rpc-layer-api.md` routing table (line 97) lists `decision:create` → `begin('create', ...)` and line 104 lists `decision:update` → `begin(phase, ...)`. The `begin()` function signature is `begin(phase: BeginPhase, target: Target, ...)`. `Target` is:

```typescript
type Target =
  | { type: 'epic'; name: string }
  | { type: 'slice'; name: string }
  | { type: 'quest'; name: string };
```

There is no `{ type: 'decision'; id: string }` variant. The Commands layer has no valid `Target` to pass for `decision:create` or `decision:update`. Additionally, the BeginPhase mapping comments (lines 57–78) have no entry for `decision:create → CREATE_DECISION` or `decision:update → UPDATE_DECISION`.

Fix: Either (a) add `{ type: 'decision'; id: string }` to the `Target` union and add decision mapping lines to the BeginPhase comments, or (b) document that decision commands call a dedicated `createDecision()` / `updateDecision()` RPC function rather than routing through `begin()`. The decision entity is structurally different (JSONL-based, no lifecycle phases) — option (b) may be architecturally cleaner.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `--override` listed on `BEGIN_*` commands where it has no effect

`commands-api.md` lists `[--override]` on `epic:refine-architecture` (line 69), `epic:refine-slices` (line 71), `slice:refine-plan` (line 86), `quest:refine-plan` (line 99). These commands trigger `BEGIN_REFINE_ARCHITECTURE`, `BEGIN_REFINE_SLICES`, `BEGIN_REFINEMENT`, `BEGIN_QUEST_REFINEMENT` respectively. None of these events carry an `override` field in `state-machine-api.md` — `override` is only meaningful on `COMPLETE_*` events (`COMPLETE_REFINE_ARCHITECTURE`, `COMPLETE_REFINE_SLICES`, `COMPLETE_REFINEMENT_ROUND`, `COMPLETE_QUEST_REFINEMENT_ROUND`).

The `--override` flag table (commands-api.md line 294) correctly lists `submit-refinement`, `submit-refine-architecture`, `submit-refine-slices` as the commands that carry override to completion events. However, it *also* lists the four `begin` commands, implying they accept and use `--override`. This is contradicted by the state machine event definitions.

Fix: Remove `[--override]` from the `epic:refine-architecture`, `epic:refine-slices`, `slice:refine-plan`, and `quest:refine-plan` command usage lines. Remove those four from the `--override` flag table. Override belongs only on `submit-refine-*` and `submit-refinement` commands.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `CompleteInput` uses optional arrays where state events require required arrays — silent coercion undocumented

`CompleteInput` slice type uses `deferred?: DeferredItem[]`, `learnings?: Learning[]`, `architectureDelta?: ArchitectureDelta[]` (all optional). The corresponding `COMPLETE_SLICE` event payload in `state-machine-api.md` uses non-optional arrays: `deferred: DeferredItem[]`, `learnings: Learning[]`, `architectureDelta: ArchitectureDelta[]`.

The RPC layer must coerce `undefined` → `[]` when building the `StateEvent` from `CompleteInput`. This is a reasonable default but it's not documented. The same applies to `COMPLETE_QUEST` (`learnings` and `architectureDelta` required in event, optional in `CompleteInput` quest type).

Fix: Add a one-line note to the `CompleteInput` comment block stating that `undefined` array fields are coerced to `[]` by the RPC layer before building the state event. Alternatively, make the state event arrays optional too (but this changes the state machine contract). The coercion note is the lighter change.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `architectureDelta` stdin examples omit required `ts` field

`commands-api.md` shows stdin examples for `slice:complete` (line 179) and `quest:complete` (line 193) with `architectureDelta` entries that omit the `ts` field. The `ArchitectureDelta` interface in `state-machine-api.md` defines `ts: string` as a required field.

Either the `ts` field is caller-supplied (in which case the examples are incomplete) or the RPC layer injects it (in which case the interface should show `ts` as optional on input). Currently there is no indication of which is the case.

Fix: Clarify ownership of `ts`. If caller-supplied, add `"ts": "2026-03-20T12:00:00Z"` to the stdin examples. If RPC-injected, mark `ts` as optional in `ArchitectureDelta` or define a separate `ArchitectureDeltaInput` type (without `ts`) for command input and keep `ArchitectureDelta` (with `ts`) for stored records.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

Round 2 fixes are complete and correct. The `CompleteInput` discriminated union is well-formed, all referenced types are defined, the BeginPhase mapping is exhaustive, the flows.md status is corrected, and the quest skip path is in place. The remaining issues are bounded: two important gaps (`decision` routing and spurious `--override` on begin commands) and two minor documentation clarifications. Neither important issue is a design problem — they are specification gaps that will surface immediately during implementation. The `decision:create` routing gap is the highest-priority fix since it will block that command's implementation.

To reach 10/10: resolve the four issues above, particularly the decision command routing (which requires either a Target extension or a dedicated RPC function) and the override placement (a one-line removal in two places).

## Summary

- Critical: 0
- Important: 2
- Minor: 2
