# Software Architecture Review — Epic Lifecycle Plan

## Issues

**[IMPORTANT] Phase 3: `complete` RPC function maps incorrectly to COMPLETE_EPIC for all entity types**
Phase 4 says: "`complete(target, input)` maps to COMPLETE_EPIC/COMPLETE_SLICE/COMPLETE_QUEST based on input.type." But the RPC Layer API (`rpc-layer-api.md`) defines `complete(target, input, options)` where the target discriminates entity type. The plan's Phase 4 description of the `complete` function conflates `input.type` (which is the CompleteInput discriminant) with `target.type` (which is the Target discriminant). This is cosmetic — the implementation will likely get it right — but the plan text is misleading and could cause confusion during implementation.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/04-rpc-layer.md`

**[IMPORTANT] Phase 3: Missing events from transition-tables.md in Phase 1 type list**
Phase 1 lists ~20 epic events and ~6 slice/quest submit events but omits several events that appear in transition-tables.md and state-machine-api.md: `CREATE_SLICE`, `CREATE_QUEST`, `BEGIN_PLAN`, `BEGIN_REFINEMENT`, `BEGIN_IMPLEMENTATION`, `COMPLETE_SLICE`, `ABANDON_SLICE`, `BEGIN_QUEST_PLAN`, `BEGIN_QUEST_REFINEMENT`, `BEGIN_QUEST_IMPLEMENTATION`, `COMPLETE_QUEST`, `ABANDON_QUEST`, `CREATE_DECISION`, `UPDATE_DECISION`, `ROLLUP_LEARNINGS`. The overview says "~25 event types" but the Phase 1 task list only enumerates ~20 epic events + 6 submit events. The full StateEvent union in `state-machine-api.md` has ~30+ event types. The plan should clarify scope: is this slice adding ALL event types, or only epic-related ones plus the submit events needed for the submit commands? The current text is ambiguous — Phase 1 says "Extend StateEvent union with all epic lifecycle events from transition-tables.md" but also adds slice submit events, which implies non-epic events are partially in scope.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/01-state-event-types.md`

**[IMPORTANT] Phase 3: slice-submit.ts handles COMPLETE_PLAN but guard depends on `hasChild` which reads directory state — plan should clarify how the state machine accesses this**
The `COMPLETE_PLAN` guard requires `hasChild(state, "slices/<name>", "plan.md")`. The state machine reads this from the `ProjectState` tree in-memory. For this to work, the LLM must have already written `plan.md` to the filesystem, and the state must have been re-loaded (via `loadState()`) to include it. The RPC layer handles this (load state -> reduce -> commit), but the Phase 3 tasks for `slice-submit.ts` describe the guard without noting that the loaded state must already include the plan.md file. This is implicit and correct (loadState reads the filesystem first), but worth a note to the implementer since the state machine is pure and depends on the RPC layer providing a state tree that reflects the current filesystem.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/03-epic-state-machine.md`

**[IMPORTANT] Phase 4: `submit` RPC function signature inconsistency with `rpc-layer-api.md`**
Phase 4 describes `submit(phase, target, content, options)` matching the architecture, but the task for `submit.ts` says it "Maps to COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, etc." without specifying how the phase+target combination selects the event. The rpc-layer-api.md has an explicit mapping table (e.g., `submit('plan', {type:'slice'})` -> `COMPLETE_PLAN`). The Phase 4 task should reference this mapping explicitly or include it inline rather than leaving the implementer to discover it.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/04-rpc-layer.md`

**[IMPORTANT] Phase 5: `epic:list` uses `assembleState()` directly instead of `loadState()`**
Phase 5 says read-only commands like `epic:list` and `epic:show` call `assembleState()`. After Phase 2 implements `loadState()`, all state reads should use `loadState()` for cache benefits. The plan should specify `loadState()` for read-only commands, not `assembleState()`.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/05-epic-cli-commands.md`

**[IMPORTANT] Phase 3: Handler Map registration pattern needs architectural clarity**
Phase 3 says "Each transition file registers its handlers. Export the handler registration function so transition files can register themselves." This self-registration pattern requires either (a) an explicit import of each transition file in `reduce.ts` to trigger registration, or (b) a side-effect-based auto-discovery mechanism. Option (a) is cleaner and matches the existing `import { handleInitProject } from "./transitions/init.js"` pattern. The plan should specify which approach to use. A side-effect registration pattern could violate tree-shaking expectations and make the dependency graph implicit. Recommend: `reduce.ts` imports all handler files and builds the Map explicitly.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/03-epic-state-machine.md`

**[MINOR] Phase 2: loadState cache format lacks hash/checksum for staleness detection**
The cache format is `{ version: 1, state: ProjectState }`. When the CLI is updated and schema shapes change, the version field helps. But if the user manually edits a JSON file, the cache will be stale until the next `readdirSync` detects the change. Since `readdirSync` only detects new/deleted files (not modified content), a manually-edited JSON file would not be detected. The architecture doc says `loadState` uses `readdirSync` to "detect new files not in cache" — modified files are not covered. This is a known limitation per the data-layer-api.md design (cache miss on version mismatch triggers full assembly). The plan should note this limitation explicitly so the implementer doesn't accidentally promise more than the design delivers.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/02-data-layer-upgrades.md`

**[MINOR] Phase 5: `epic:abandon` uses `begin('abandon', ...)` but transition-tables.md shows ABANDON_EPIC needs `reason` field**
Phase 5 says `epic:abandon` "requires `--epic` and `--reason` flags. Calls `begin('abandon', {type:'epic', name})`." The `begin` function's event mapping from rpc-layer-api.md shows `begin('abandon', {type:'epic'})` -> `ABANDON_EPIC`. But `ABANDON_EPIC` in state-machine-api.md requires `{ epic: string; reason: string }`. The plan doesn't show how `--reason` flows into the event. The `begin` function signature is `begin(phase, target, options?)` — there's no payload parameter for the reason. Either: (a) `WorkflowOptions` needs a `reason` field, (b) `begin` needs an additional parameter for event-specific payloads, or (c) `abandon` should be a separate RPC function. The rpc-layer-api.md doesn't address this. This is an architectural gap that the plan should resolve.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/04-rpc-layer.md`

**[MINOR] Phase 6: submit commands placed under `src/commands/subagent/` but architecture says `src/commands/` namespace-organized**
The conventions doc says commands are organized by namespace (`epic/`, `slice/`, `quest/`, etc.). Phase 6 places submit commands under `src/commands/subagent/`. The `commands-api.md` lists `submit-*` as top-level commands (not under an entity namespace), so `subagent/` is a reasonable grouping. But this directory name isn't documented in the architecture. The plan should note this as a new convention or use a name that matches the existing pattern (e.g., `src/commands/global/` for non-namespaced commands).
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/06-submit-commands-integration.md`

**[MINOR] Phase 3: Transition table exports for fitness function enumeration add public API surface to state machine**
Phase 3 says: "Export transition tables from handler files as `epicTransitions: { from, event, to }[]`." This exports internal implementation details (the transition table structure) as a public API for fitness function consumption. This creates coupling — fitness function tests will depend on the shape of these exports. Consider: exporting only from a dedicated `transitions/index.ts` barrel file, or having the fitness function enumerate by calling `reduce()` on all (status, event) combos rather than reading the table directly. The latter is more resilient to implementation changes.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/03-epic-state-machine.md`

## Score: 7/10

The plan is well-structured with clear phase ordering, bottom-up layering, and good alignment with the 4-layer architecture. The phase decomposition enables independent testing at each level. The key structural concern is that several Phase 1 and Phase 4 details are ambiguous or inconsistent with the architecture docs — particularly around event scope (which of the ~30+ events are in-scope), the `begin` function's inability to carry event-specific payloads (like `reason` for abandon), and the `complete` RPC function's description. These are resolvable without architectural changes but need clarification before implementation. To reach 9+: resolve the event scope ambiguity, clarify the handler registration pattern, fix the `loadState` vs `assembleState` usage in read commands, and address the `begin` payload gap for abandon/verification events.

## Summary
- Critical: 0
- Important: 6
- Minor: 4
