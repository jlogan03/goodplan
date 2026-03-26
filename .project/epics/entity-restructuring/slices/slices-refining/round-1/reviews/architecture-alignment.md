# Architecture Alignment Review

## Issues

**[IMPORTANT]** `goal-refining.md [01-schema-and-state-machine]`: Slice 1 scope lists "all `src/core/state/transitions/` handler files" but does not explicitly mention `slice-submit.ts`
The `slice-submit.ts` handler contains 5 references to `slices/${event.slice}` paths (lines 47, 60, 111, 129, 153). It handles `COMPLETE_PLAN`, `COMPLETE_REFINEMENT_ROUND`, and `COMPLETE_IMPLEMENTATION` transitions. The Behavior section lists "all 9 slice events" and "updated transition handler paths" but the Scope Boundaries in-scope line says "all `src/core/state/transitions/` handler files" which technically includes it. However, the affected-apis.md research only calls out guard path changes and helper changes — `slice-submit.ts` path literals are not enumerated anywhere. This creates a risk of being missed during implementation. Add `slice-submit.ts` to the explicit file list in Behavior or Scope Boundaries.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [01-schema-and-state-machine]`: `slice-complete.ts` has flat path references that are not state machine paths — they are activity log scope strings
In `slice-complete.ts`, lines 59, 73, 82-83, 125-126, 149 use `slices/${event.slice}` as activity log scope strings and learnings source strings, not just state tree paths. The Behavior section says "transition handler path updates" but these are semantically different — they are scope/source metadata strings. The affected-apis.md Activity Log Scope Format section documents this change, but Slice 1's goal does not mention activity log scope format changes. Either add "activity log scope strings in all transition handlers" to the Behavior section, or document that these are covered by the blanket "transition handler path updates" statement.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [03-context-and-learnings]`: `priorities.ts` `entityDir()` function (line 14-25) also needs updating, not just "string literals"
The Behavior section says "priorities.ts string literals updated" with three specific references. But `priorities.ts` also has an `entityDir()` helper function (line 14-25) that returns `slices/${target.name}` for slice targets. This is a function, not a string literal, and it is used by multiple priority table entries (plan, refinement, implementation sources). The affected-apis.md research file documents this under "priorities.ts — Silent string literal changes" but incorrectly categorizes `entityDir()` as a string literal. The slice goal should explicitly list `entityDir()` as a fourth item to update, since it is a different kind of change (function body vs. inline string).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [03-context-and-learnings]`: `context/index.ts` `resolveScope()` is listed in Behavior but not in Scope Boundaries
Behavior item 1 says "`resolveScope()` returns `epics/<epic>/slices/<name>` for slices" and the file is at `src/core/context/index.ts` (line 101: `return \`slices/${target.name}\``). However, Scope Boundaries lists only `src/core/context/`, `skills/complete/SKILL.md`, `skills/complete/references/guidance.md`, context unit tests. While `src/core/context/` is a directory wildcard that covers `index.ts`, the explicit mention of `priorities.ts` and `learnings.ts` in Behavior without mentioning `index.ts` could cause confusion. List `index.ts` explicitly alongside `priorities.ts` and `learnings.ts` in Behavior for clarity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `goal-refining.md [03-context-and-learnings]`: `resolveScope()` needs `epic` parameter but the `Target` type change happens in Slice 2
`resolveScope()` at `src/core/context/index.ts:101` currently receives a `Target` with `{ type: "slice"; name: string }`. After Slice 1 changes the `Target` type to include `epic: string`, this function would get the epic from `target.epic`. But Slice 3 depends on Slice 2 (RPC/commands), not directly on Slice 1. Since TypeScript compilation in Slice 1 adds `epic` to the Target type, and Slice 3 won't compile without updating `resolveScope()` to use `target.epic`, the dependency is actually on Slice 1's type change. This is consistent with the stated dependency chain (03 depends on 02 depends on 01), but worth noting that `resolveScope` will fail to compile after Slice 1 unless a temporary `as any` is used or the context module is updated simultaneously. The current sequencing handles this correctly since Slice 3 is the first to touch context.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `goal-refining.md [02-rpc-and-commands]`: `buildSliceCompleteResult` in `complete.ts` reads `slices/overview.json` (line 187) — this is an RPC layer file but the overview consolidation is a state machine concern
`buildSliceCompleteResult` in `src/core/rpc/complete.ts` reads `slices/overview.json` for sibling-slice detection (line 187). The architecture proposal says this "must switch to the embedded `slices` array in `epics/overview.json`". This is correctly placed in Slice 2 (RPC layer). However, the Behavior section says "buildSliceCompleteResult uses nested paths for all 6 references" — this understates the change. One of those 6 references is not just a path change but a structural change: reading from `epics/overview.json` and navigating `items[].slices[]` instead of reading `slices/overview.json` and filtering by epic. The Behavior section should distinguish the 5 path-only changes from the 1 structural change.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `sequencing-refining.md`: Slice 4 (skills-update) dependency on 01-03 is broader than needed
Slice 4 says dependencies are "01-03" with rationale "depends on correct CLI behavior". But skills are content-only changes (SKILL.md files) — they reference paths like `.project/epics/<epic>/slices/<name>/` which are filesystem conventions, not runtime dependencies. Skills would be correct even if only Slice 1's schema changes landed, since the path convention is established by the architecture proposal, not by running CLI commands. The stated dependency is conservative (safe) but could be relaxed to "01" only if parallel work is desired.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `goal-refining.md [01-schema-and-state-machine]`: `epic-lifecycle.ts` calls `updateOverviewStatus` which will need to handle `EpicOverview` type
The `epic-lifecycle.ts` handler calls `updateOverviewStatus` (lines 73, 121, 163). Per affected-apis.md, `updateOverviewStatus` must switch from `Overview` to `EpicOverview` type because epic overview items now carry a `slices` array. This is documented in affected-apis.md under helpers.ts but is not mentioned in Slice 1's Behavior or Scope Boundaries. Since `epic-lifecycle.ts` is not a slice handler, it could be missed. The helpers.ts changes are in scope for Slice 1, but the downstream impact on `epic-lifecycle.ts` (which calls updated helpers) should be noted.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The slices map well to the four-layer architecture (state machine, RPC, context, skills) and the dependency ordering follows the unidirectional dependency stack. The sequencing is architecturally sound. However, several concrete file-level changes documented in the research files (affected-apis.md) are not reflected in the slice goal Behavior sections — particularly `slice-submit.ts` path literals, `entityDir()` in priorities.ts, the structural (vs path-only) change in `buildSliceCompleteResult`, and activity log scope string changes. These gaps create implementation risk because an implementer reading only the goal files would miss them. To reach 9+: (1) enumerate all transition handler files with flat path references in Slice 1's Behavior, (2) distinguish structural changes from path-only changes in Slice 2, (3) list `entityDir()` and `index.ts` explicitly in Slice 3.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
