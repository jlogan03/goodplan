# Merged Review Feedback — Round 2: Sub-Agent Commands & Quest Lifecycle

## CRITICAL Issues

None.

## IMPORTANT Issues

**IMP-1: `STATE_QUEST_ALREADY_ACTIVE` missing from `StateErrorCode` union** (TypeScript)
Phase 2's `BEGIN_QUEST_PLAN` handler uses `STATE_QUEST_ALREADY_ACTIVE` but Phase 1 doesn't add it to the `StateErrorCode` union in `src/schemas/state-events.ts`. This will be a compile-time error. Phase 1 should include this variant alongside the other new event types.
Resolution: DIRECTLY_ACTIONABLE

**IMP-2: `activeQuest` guard on `BEGIN_QUEST_PLAN` not reflected in `transition-tables.md`** (Holistic + SoftwareArchitecture)
Per round 1 user input, Phase 2 adds `activeQuest == null` guard to `BEGIN_QUEST_PLAN`. However, `transition-tables.md` (the source of truth) still shows guard "—" and the Cross-Cutting Guards table has no one-active-quest entry. Phase 5's cleanup task doesn't explicitly mention this update. Add an explicit task (Phase 2 or Phase 5) to update `transition-tables.md` with the new guard and add the cross-cutting guard entry.
Resolution: DIRECTLY_ACTIONABLE

**IMP-3: Phase 4 `complete` phase priority list diverges from architecture docs** (SoftwareArchitecture)
The plan's `complete` priority list is: "entity goal, implementation output, learnings template, architecture delta template, conventions." The architecture docs (`rpc-layer-api.md`, `transition-tables.md`) specify: "quest goal, implementation results, current architecture, target architecture, learnings at all levels." The plan omits "current architecture" and "target architecture" and adds templates not in the spec. Reconcile the plan with architecture docs or add a task to update the docs with rationale.
Resolution: DIRECTLY_ACTIONABLE

**IMP-4: Context types should live in `src/core/context/types.ts`, not `src/core/rpc/types.ts`** (TypeScript + SoftwareArchitecture)
Round 1 resolved that `src/core/context/` is a peer to RPC. Placing `ContextBundle`, `DecisionSummary`, `LearningSummary` in `src/core/rpc/types.ts` creates a backwards dependency. Specify `src/core/context/types.ts` as the canonical location, with RPC importing from there if needed.
Resolution: DIRECTLY_ACTIONABLE

**IMP-5: `collectMarkdownEntries` return type needs path qualification** (TypeScript)
The plan says entries have "relative paths" but doesn't specify relative to what. Keys should be state-tree-relative paths (e.g., `epics/my-epic/architecture/_overview.md`) matching the convention in `resolveEntityJsonPath()`. This matters because the Commands layer resolves them via `projectDir + "/.project/" + key`.
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**MIN-1: Phase 2 `quest-implement.ts` redundantly sets `activeQuest` on refinement/implementation transitions** (Holistic + SoftwareArchitecture)
`activeQuest` is set by `BEGIN_QUEST_PLAN`. `BEGIN_QUEST_REFINEMENT` and `BEGIN_QUEST_IMPLEMENTATION` happen within an already-active quest. The transition tables only specify setting `activeQuest` on `BEGIN_QUEST_PLAN`. Remove the redundant `setActiveQuest` from these handlers — it's idempotent but architecturally misleading and inconsistent with the slice pattern.
Resolution: DIRECTLY_ACTIONABLE

**MIN-2: Context module layering description inconsistent between plan and architecture docs** (Holistic)
The plan says `src/core/context/` is a "peer module to the RPC layer." Architecture docs (`_overview.md`, `rpc-layer-api.md`) say "an internal module within the RPC layer." Phase 5's architecture update task should reconcile this layering description.
Resolution: DIRECTLY_ACTIONABLE

**MIN-3: `parseInlineBudget` should return `boolean | number | undefined`, not just `number | undefined`** (TypeScript)
Returning `20480` for bare `--inline` conflates "use default" with "use exactly 20480 bytes." Return `true` for bare `--inline`, a number for `--inline=N`, and `undefined` for absent. Let the context module resolve the default internally. Also extract `DEFAULT_INLINE_BUDGET = 20480` as a shared constant (TUICLI).
Resolution: DIRECTLY_ACTIONABLE

**MIN-4: Phase 4 priority source `path` function should take only `target`, not `state`** (TypeScript)
`priorities.ts` defines `path: string | ((state, target) => string)`. All dynamic paths are simple template interpolation from `target`. Remove `state` dependency to keep the priority table as a pure data mapping.
Resolution: DIRECTLY_ACTIONABLE

**MIN-5: Phase 3 quest commands missing explicit human-readable output format** (Holistic)
`quest:create` specifies its format but plan/refine-plan/implement/complete/abandon don't. Either reference the slice format pattern or specify each explicitly.
Resolution: DIRECTLY_ACTIONABLE

**MIN-6: Phase 5 `start-*` JSON-only enforcement mechanism unspecified** (Holistic + TUICLI)
Plan says start commands always output JSON but doesn't specify how. Simplest approach: always call `output(bundle, { ...args, json: true })` regardless of the `--json` flag. Note this deviation from normal flag-respecting behavior.
Resolution: DIRECTLY_ACTIONABLE

**MIN-7: Phase 3 `quest:create` help text should follow `slice:create` description pattern** (TUICLI)
Use: `"Create a new quest. Stdin: {name, goal}. No target flag needed. Transitions to 'created' status."` to match existing convention.
Resolution: DIRECTLY_ACTIONABLE

**MIN-8: Phase 2 `quest-complete.ts` — quest `LearningInput` with `rollupTo: "epic"` silently ignored** (TypeScript)
Quest-scoped learnings only roll up to `"project"`, but the schema allows `"epic"`. An `"epic"` entry silently does nothing. Document this behavior explicitly (silent skip).
Resolution: DIRECTLY_ACTIONABLE

**MIN-9: Phase 3 `buildBeginResult` quest branch — note `Quest` type import needed** (TypeScript)
Without the quest branch, begin operations fall through to defaults (`previousStatus: "none"`, `newStatus: "unknown"`). The fix needs a `Quest` type import from `schemas/entities/quest.js`.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (loop exit)

All issues are DIRECTLY_ACTIONABLE except IMP-2's underlying design question (already resolved via round 1 user input — only the doc update task is missing).

Count: 14

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **`activeQuest` guard — USER_INPUT vs DIRECTLY_ACTIONABLE**: Holistic flagged as USER_INPUT (whether the guard should exist), SoftwareArchitecture flagged as DIRECTLY_ACTIONABLE (the doc update is missing). The guard's existence was already resolved via round 1 user input. The remaining issue is only the `transition-tables.md` update — resolved as DIRECTLY_ACTIONABLE (IMP-2).

2. **Context module layering (peer vs internal)**: Holistic and SoftwareArchitecture both noted the inconsistency. SoftwareArchitecture's analysis is more specific (dependency direction). Merged as MIN-2 with the architectural rationale.

3. **Context types location**: TypeScript and SoftwareArchitecture both flagged. TypeScript provided the more specific resolution (dependency direction argument). Merged as IMP-4.

## Unresolved (USER_INPUT required)

None. The round 1 USER_INPUT item (`activeQuest` guard) was resolved — only the documentation update remains, which is DIRECTLY_ACTIONABLE.
