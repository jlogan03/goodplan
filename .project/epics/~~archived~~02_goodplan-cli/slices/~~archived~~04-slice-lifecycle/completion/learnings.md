# Learnings: 04-slice-lifecycle

## Bundling helpers (setSliceStatus) prevent overview sync invariant violations

The review caught that `slice-submit.ts` used `setSliceJson()` directly, bypassing overview sync. The `setSliceStatus` helper bundles status + overview sync + timestamp in one call — making it impossible to update status without syncing the overview. Apply this pattern to all future entities (quest).

## Input schemas with strict enums at the boundary, flexible storage schemas behind

`learningInputSchema` uses `z.enum(["domain","worked",...])` to catch invalid categories at input. The storage `learningEntrySchema` keeps `z.string()` for forward-compatibility. This input/storage split prevents invalid data from entering while allowing schema evolution.

## State machine writes data, RPC layer derives all counts and flags

COMPLETE_SLICE is the most complex handler but stays clean because the state machine only writes data (deferred items, learnings, deltas). The RPC layer's `buildCompleteResult` derives all computed values (deferredRouted, deferredSkipped, learningsRolledUp, epicComplete) by diffing old vs new state. This keeps the state machine's return type simple (`ProjectState | StateError`).

## exactOptionalPropertyTypes requires conditional spread for Zod parsed output

Zod `.optional()` produces `T | undefined`, but `exactOptionalPropertyTypes` distinguishes between `undefined` and absent properties. Current workaround: `...(val !== undefined ? { key: val } : {})`. Zod v4 likely has native support for distinguishing optional vs undefined properties — investigate `.optional()` vs `.removable()` or similar APIs to replace the conditional spread pattern.

## Sub-transitions (refine, implement) should not redundantly set activeSlice

BEGIN_REFINEMENT and BEGIN_IMPLEMENTATION are sub-transitions within an already-active slice — only BEGIN_PLAN (the entry transition) sets `project.json` activeSlice. Redundant writes diverge from the transition table spec and create fragility. Check transition tables for which fields each event writes.
