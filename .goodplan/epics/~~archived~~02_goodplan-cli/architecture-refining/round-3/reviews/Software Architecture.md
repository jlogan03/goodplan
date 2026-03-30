# Software Architecture Review -- Round 3

Reviewer: Software Architecture
Scope: Entire architecture directory
Goal: Ensure the recursive tree state model is well integrated. Verify round 2 fixes landed, check for regressions.

## Round 2 Fix Verification

All round 2 CRITICAL and IMPORTANT issues have been addressed:

- **CRIT-1** (DecisionEntry enum): FIXED. `DecisionEntry.status` in state-machine-api.md now reads `'active' | 'superseded' | 'revisiting'`, matching transition-tables.md exactly.
- **IMP-1** (CompleteInput epic payload): FIXED. `CompleteInput` is now a discriminated union with `type: 'epic'` (carrying `verificationResults`), `type: 'slice'`, and `type: 'quest'` variants.
- **IMP-2** (Undefined RPC types): FIXED. All five types now defined in rpc-layer-api.md: `PathReferences` (line 262), `DecisionSummary` (line 265), `LearningSummary` (line 273), `StatusOptions` (line 282), `ContextResult` (line 290).
- **IMP-3** (BeginPhase mappings + dead 'complete'): FIXED. `'complete'` removed from `BeginPhase`. All 21 `(function, phase, target.type) -> StateEvent` mappings now documented in comments.
- **IMP-4** (Quest skip path): FIXED. Row added at transition-tables.md line 105: `plan-created | COMPLETE_QUEST_REFINEMENT_ROUND -> plan-refined`.
- **IMP-5** (submit-* scope): FIXED per USER_INPUT. `submit()` documented as handling content write + state event in one call. Routing table and description align.
- **IMP-6** (reduce() signature): FIXED. flows.md uses `reduce(state, event)` two-arg form throughout.
- **IMP-7** (Phantom guards): FIXED. state-machine-api.md "Key guards" section now lists only the two guards that appear in transition-tables.md (`plan.md` and `plan-refined.md`).
- **IMP-8** (Learnings on intermediate phases): FIXED per USER_INPUT. `SubmitInput` no longer carries `learnings`. Explicit note at rpc-layer-api.md lines 159-161 clarifies learnings are captured only at entity completion via `CompleteInput`.
- **IMP-9** (Epic phase events): FIXED per USER_INPUT. Mapping comments reference explicit per-phase events; no generic `BEGIN_PHASE` needed.
- **IMP-10** (--override not connected): FIXED. `override?: boolean` added to all four refinement completion events. Line 77 of state-machine-api.md documents override behavior. commands-api.md `--override` flag description at line 294 traces the full path: `WorkflowOptions.override -> StateEvent.override`.
- **IMP-11** (context command positional arg): FIXED per USER_INPUT. Standalone `context` command removed; commands-api.md line 229 confirms.
- **IMP-12** (Windows aspirational): FIXED per USER_INPUT. _overview.md line 56 marks windows-x64 as aspirational with Known Platform Gaps note.

Round 2 MINOR issues:
- **MIN-1** (src/commands/build/): FIXED. No longer referenced in conventions.md.
- **MIN-2** (Quest implement event): Was already consistent -- `BEGIN_QUEST_IMPLEMENTATION` exists in the state machine, and `quest:implement` maps to it.
- **MIN-3** (context command routing): Resolved by removing the context command entirely.
- **MIN-4** (State cache versioning): FIXED. data-model.md lines 372-374 document `cacheVersion` field and version mismatch behavior.
- **MIN-5** (flows.md slice:complete wrong status): FIXED. flows.md line 67 correctly says `implementation-complete`.
- **MIN-6** (Example state tree missing project-level dirs): FIXED. Example state tree now includes `architecture` directory at project root (line 250).
- **MIN-7** (schema positional arg): FIXED. commands-api.md line 222 shows `--command <command-path>` flag.
- **MIN-8** (resource namespace patterns): N/A -- no `resource:` namespace in current architecture.
- **MIN-9** (--override convention): FIXED. commands-api.md lines 293-294 document `--override` as a cross-cutting refinement pattern.
- **MIN-10** (Help text strategy): FIXED. commands-api.md lines 299-300 specify help text quality expectations.
- **MIN-11** (plan-refining.md lifecycle): Partially addressed. data-model.md line 429 has a comment explaining it's a working draft. No guard or flow references it, which is correct (it's LLM-managed content), but its relationship to plan-refined.md could be clearer.
- **MIN-12** (INIT_PROJECT "To" column): FIXED. transition-tables.md line 9 now shows "To: --" with a note about no status field.

## Issues

**[IMPORTANT]** Conventions.md routing rule groups read-only RPC commands with mutation commands
conventions.md line 13 lists `start-*` and `status` under "Workflow commands" routing to "Commands -> RPC Layer -> State Machine + Data Layer". However, `start-*` calls `startContext()` (read-only context assembly, no reducer call) and `status` calls `status()` (read-only status derivation). Neither invokes `reduce()` or `commitState()`. The commands-api.md routing table (line 308-311) and rpc-layer-api.md (line 113) correctly distinguish these as read-only. But conventions.md -- the quick-reference for implementers -- conflates them with mutation paths.
Resolution: DIRECTLY_ACTIONABLE

Fix: Split the "Workflow commands" bullet into two:
- **Mutation commands** (`create`, `plan`, `complete`, `abandon`, `submit-*`): Commands -> RPC Layer -> State Machine + Data Layer
- **Workflow read commands** (`start-*`, `status`): Commands -> RPC Layer -> Data Layer (no state machine)

---

**[MINOR]** `plan-refining.md` lifecycle still underspecified
data-model.md line 429 has a brief comment ("working draft updated during each refinement round") but the relationship between `plan-refining.md` and `plan-refined.md` is still implicit. When does `plan-refining.md` first appear? Is it created by the sub-agent on `start-refinement`, or copied from `plan.md`? When refinement passes, is `plan-refining.md` renamed to `plan-refined.md`, or does the sub-agent write `plan-refined.md` directly? Since these are LLM-managed files, the architecture does not need to enforce this, but a one-line note clarifying the intended flow would help implementers understand what sub-agents are expected to do.
Resolution: DIRECTLY_ACTIONABLE

Fix: Add a brief note in data-model.md after line 430, e.g.: "The sub-agent creates `plan-refining.md` during refinement rounds. When scores pass threshold, the final version becomes `plan-refined.md` (the sub-agent writes it directly; the CLI does not rename files)."

---

**[MINOR]** `ContextResult` type alias adds no information
rpc-layer-api.md line 290 defines `type ContextResult = ContextBundle` with a comment "Alias for ContextBundle -- startContext assembles and returns a context bundle directly." If the types are identical, having a separate alias adds a name to remember with no added type safety or semantic distinction. The `startContext()` signature on line 15 could just return `ContextBundle` directly.
Resolution: DIRECTLY_ACTIONABLE

Fix: Either change `startContext()` return type to `ContextBundle` and remove the `ContextResult` alias, or add a distinguishing field to `ContextResult` (e.g., `phase: SubmitPhase` or `target: Target`) that would make the alias carry information.

---

**[MINOR]** `StatusOptions` has `json` and `query` fields that duplicate global flags
rpc-layer-api.md line 283 defines `StatusOptions` with `json?: boolean` and `query?: string`. These are global CLI flags handled by the Commands layer's `output()` function (commands-api.md line 268). The RPC layer's `status()` function should not need to know about output formatting -- it assembles `StatusResult` and the Commands layer formats it. Passing output formatting options into the RPC layer leaks a Commands-layer concern downward.
Resolution: DIRECTLY_ACTIONABLE

Fix: Either make `StatusOptions` empty (reserved for future filtering like `--scope`), or replace `json`/`query` with domain-relevant options that would actually affect what `status()` computes (e.g., `scope?: string` for filtering to a specific entity).

## Score: 9/10

All 25 round 2 issues (1 CRITICAL, 12 IMPORTANT, 12 MINOR) have been verified as fixed. The architecture files are now internally consistent: status enums match transition tables, all public API types are defined, mapping comments are complete, discriminated unions handle all entity types, guards align with the source-of-truth transition tables, and override flows are fully traced. The recursive tree state model is well-integrated across all files.

The one IMPORTANT issue (conventions.md routing inaccuracy) is a documentation inconsistency that could mislead implementers but does not indicate a structural flaw. The three MINORs are polish items. To reach 10/10: fix the conventions.md routing categories and clean up the minor type alias / options concerns.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
