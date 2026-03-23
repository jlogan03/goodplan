## Issues

**[IMPORTANT]** Phase 1: `ts` field on CREATE_EPIC and ACTIVATE_EPIC contradicts canonical StateEvent union in state-machine-api.md

The overview says `ts: string` is on `CREATE_EPIC` and `ACTIVATE_EPIC` "per state-machine-api.md convention." Phase 1 repeats this. However, the canonical union in state-machine-api.md defines:
- `{ type: 'CREATE_EPIC'; name: string; goal: string }` -- no `ts`
- `{ type: 'ACTIVATE_EPIC'; epic: string }` -- no `ts`

The *prose* convention says "events that produce timestamped entities include a `ts: string` field" which would logically include CREATE_EPIC (sets `created`/`updated`) and ACTIVATE_EPIC (sets `activated`). But the *code-level* union definitions omit it. The plan should acknowledge this is an architecture amendment (adding `ts` to these events beyond what the canonical union shows) and note that the state-machine-api.md canonical union should be updated to match. Without this, the implementer will type the events per the canonical union (no `ts`), then discover the handler needs a timestamp it can't get.

Additionally, Phase 1 says "Other events carry only their specific payload fields... (e.g., `COMPLETE_EPIC` has `verificationResults`)." But epic.json has an `updated` timestamp that presumably changes on every transition. If `updated` should be set by transition handlers, those events also need `ts`. If `updated` is only set by CREATE_EPIC, that should be stated explicitly. The plan is ambiguous about which events update `updated`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4: `begin()` signature needs `payload` but types.ts task doesn't mention it

Phase 4's `begin.ts` task correctly identifies that `begin()` needs a `payload` parameter for event-specific data (reason for ABANDON_EPIC, verification for ADD_VERIFICATION, etc.). This was a round-1 issue and the fix is good. However, the `types.ts` task says "Define these per rpc-layer-api.md" and the rpc-layer-api.md `BeginResult` / `WorkflowOptions` types do not include a payload mechanism. The `types.ts` task should explicitly list the payload type addition (e.g., `payload?: Record<string, unknown>` on `WorkflowOptions` or as a separate parameter type) so the implementer knows to define it.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3: `slice-submit.ts` handlers need slice/quest entity schemas but those aren't in Phase 1 scope

Phase 3 creates `slice-submit.ts` with handlers for COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, COMPLETE_IMPLEMENTATION, and quest variants. These handlers need to read and update slice.json/quest.json entities (setting status fields). The slice and quest entity schemas already exist from slice 02, so reading them is fine. But the handlers need a `refinement` field on slices/quests too (for circuit breaker state on COMPLETE_REFINEMENT_ROUND), similar to the `refinement` field being added to epicSchema in Phase 1.

Phase 1 adds `refinement` to `epicSchema` but doesn't mention adding it to `sliceSchema` or `questSchema`. The circuit breaker logic in `slice-submit.ts` needs `round`, `maxRounds`, and `scoreHistory` on slices. Either Phase 1 should add the `refinement` field to slice/quest schemas too, or Phase 3 should note this dependency and add the schema change there.

Resolution: CODEBASE_EXPLORATION

---

**[IMPORTANT]** Phase 2: `loadState` does directory mtime comparison but `ProjectState` tree has no mtime metadata

The plan says loadState "compare directory mtimes (cheap stat calls) to detect filesystem changes since cache was written." But the cache format is `{ version: 1, state: ProjectState }` -- there's no stored mtime data to compare against. The implementation needs to either: (a) store directory mtimes in the cache alongside the state tree, or (b) store the cache write timestamp and compare directory mtimes against it. The plan should specify which approach and what the cache format actually looks like with mtime data.

Also, the plan says "For each new file: fully read and parse it... add to the cached tree as the appropriate entry type (MarkdownEntry for .md, JsonEntry for registered .json, etc.)." This incremental update requires schema validation for new JSON files (per INV-005). The task should note that `findSchema()` from the schema registry is needed during incremental cache updates, not just during full assembly.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3: `COMPLETE_EXPLORE` skip path from `created` contradicts Phase 3's own guard

Phase 3's `epic-phase.ts` task says: "COMPLETE_EXPLORE: guard status == created OR exploring, set explored (skip path from created)." This matches the transition table. But Phase 3 also says "BEGIN_EXPLORE: guard status == created, set exploring." The skip path (created -> explored via COMPLETE_EXPLORE) means an epic can go directly from `created` to `explored` without entering `exploring`. This is correct per transition-tables.md rows 3-4.

However, the plan doesn't address the `updated` timestamp concern for these skip paths. If `epic.json.updated` should reflect when the status last changed, then COMPLETE_EXPLORE needs a `ts` field (or `updated` must be handled differently). This connects to the first issue about which events carry `ts`. The skip paths make this more visible because the epic's `updated` field would be stale if only CREATE_EPIC sets it.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3: Transition table export coupling concern should be resolved in the plan, not deferred to implementation

Phase 3 says: "Export transition tables from handler files as `export const epicTransitions` arrays... Note: an alternative approach (having fitness functions enumerate by calling `reduce()`) avoids coupling to internal table structure -- consider this during implementation." This defers a design decision to the implementer. Since this affects the public API surface of the state module (exports visible to tests and fitness functions), the plan should pick one approach. The `reduce()`-based enumeration approach is simpler and avoids exporting internal structure, aligning with the "narrow interfaces" design philosophy.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4: `submit()` has `content: SubmitInput` parameter but SubmitInput is a discriminated union on `phase` -- redundant with the `phase` parameter

The `submit()` signature is `submit(phase: SubmitPhase, target: Target, content: SubmitInput, options?: WorkflowOptions)`. The `SubmitInput` union discriminates on `phase` (e.g., `{ phase: 'plan' }`, `{ phase: 'refinement'; scores: ... }`). This means `phase` appears twice: as a top-level parameter and inside `content.phase`. The plan should specify whether these must match and who validates the match, or simplify by deriving the event type from `content.phase` + `target.type` and dropping the top-level `phase` parameter. Alternatively, if the top-level `phase` is authoritative and `content` is just payload, `content` shouldn't carry `phase`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5: `epic:list` navigates to `epics/overview.json` but doesn't specify the return type shape

Phase 5 says epic:list "Calls `loadState()`, navigates to `epics/overview.json`, returns items." The `overviewSchema` shape is `{ items: [] }` but the plan doesn't specify what the command returns in `--json` mode. The overview items from slice 02 likely have `{ name, status }` fields, but the plan should confirm the shape or reference the overview schema to ensure the implementer produces the right output.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6: submit-plan task says "No stdin content (plan already written to filesystem)" but the Zod schema task creates `submitPlanInputSchema`

Phase 6's `submit-plan.ts` task says there's no stdin content. But the `src/schemas/commands/submit.ts` task says to create "Zod schemas for submit command inputs." If submit-plan has no stdin, what does `submitPlanInputSchema` validate? The plan should clarify: either submit-plan has no input schema (only flags), or the schema validates the flag-derived structure (e.g., `{ slice?: string; quest?: string }`). The distinction matters for the `validateInput()` call pattern used in commands.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan improved substantially from round 1 -- the `ts` field is now partially specified rather than universal, the `refinement` schema field is added to Phase 1, the `begin()` payload mechanism is designed, and all 8 submit commands are included. The remaining issues center on: (1) the `ts`/`updated` timestamp question still isn't fully resolved because the canonical StateEvent union in state-machine-api.md lacks `ts` on events the plan claims have it; (2) slice/quest schemas need a `refinement` field for pulled-forward circuit breaker handlers; (3) cache format needs mtime metadata; and (4) several minor API surface ambiguities. To reach 9+: resolve the architecture amendment for `ts` on events, add `refinement` to slice/quest schemas (or note the dependency), specify cache format with mtime data, and pick a direction on the transition table export.

## Summary
- Critical: 0
- Important: 5
- Minor: 4
