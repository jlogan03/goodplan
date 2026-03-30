# Software Architecture Review — Epic Lifecycle Plan (Round 2)

## Issues

**[IMPORTANT] Phase 1 + Phase 4: CREATE_EPIC timestamp handling contradicts state-machine-api.md canonical union**
The plan overview states: "`ts: string` is included only on events that set timestamp fields (CREATE_EPIC, ACTIVATE_EPIC...)." Phase 1 tasks say "CREATE_EPIC (sets `created`)" and Phase 4 says "Inject `ts: new Date().toISOString()` only on events that carry a `ts` field per state-machine-api.md (CREATE_EPIC, ACTIVATE_EPIC)." However, the canonical `StateEvent` union in `state-machine-api.md` defines `CREATE_EPIC` as `{ type: 'CREATE_EPIC'; name: string; goal: string }` with no `ts` field. `ACTIVATE_EPIC` is `{ type: 'ACTIVATE_EPIC'; epic: string }` also with no `ts` field. Only `INIT_PROJECT` carries `ts` in the canonical union. The epic entity has `created` and `activated` timestamp fields that need values, so the plan's intent is correct, but the event type definitions in Phase 1 must either (a) add `ts` to CREATE_EPIC and ACTIVATE_EPIC event types (deviating from the canonical union — needs justification) or (b) have the reducer derive timestamps from a different mechanism. The plan should explicitly state which approach and reconcile with the architecture doc.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/01-state-event-types.md`

**[IMPORTANT] Phase 2: loadState cache invalidation relies on directory mtime but JSON content edits are invisible**
Phase 2 says loadState uses "directory mtime comparison for cache validation" and "incrementally reads newly detected files when mtimes change." The plan also states: "Known limitation: manually edited JSON files (content changes without file addition/removal) are not detected by the cache." This is accurately documented, but the architectural consequence is significant: between `loadState()` returning cached state and `commitState()` comparing old state to disk, a manual JSON edit will be detected by concurrent modification detection in `commitState()` — this is correct and safe. However, two sequential read-only commands (`epic:list`, `epic:show`) after a manual edit will return stale data until something triggers a full assembly. The plan should clarify that `commitState()` always writes the cache after writes, so the staleness window is bounded to the period between a manual edit and the next mutation command. This is already implied but should be explicit for implementer clarity.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/02-data-layer-upgrades.md`

**[IMPORTANT] Phase 3: epic-create.ts task omits setting `created`, `activated`, `updated` timestamps on the epic entity**
The `epicSchema` requires `created: timestampSchema`, `activated: timestampSchema.nullable()`, and `updated: timestampSchema`. The Phase 3 task for `epic-create.ts` says "Creates `epics/<name>/epic.json` (with goal, status: created, empty verifications, empty sliceSequence, refinement: null, timestamps)" — the word "timestamps" is vague. It should explicitly list that `created` and `updated` must be set (from the event's timestamp source, whatever is resolved from the issue above) and `activated` set to `null`. Without explicit listing, the implementer may miss one.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/03-epic-state-machine.md`

**[IMPORTANT] Phase 3: epic-phase.ts COMPLETE_EXPLORE skip path guard is inconsistent with transition-tables.md**
Phase 3 says "COMPLETE_EXPLORE: guard status == created OR exploring, set explored (skip path from created)." However, transition-tables.md shows two separate rows: `created -> COMPLETE_EXPLORE -> explored` (no guard) and `exploring -> COMPLETE_EXPLORE -> explored` (no guard). These are two valid `from` statuses for the same event, not a single handler with an OR guard. The distinction matters because the transition-tables.md specification shows no guard on either row — they are unconditional. The plan's phrasing "guard status == created OR exploring" suggests a single guard function that checks membership, which is correct but should be stated as "from-status match" rather than "guard" to avoid confusion with business-logic guards (like circuit breaker).
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/03-epic-state-machine.md`

**[IMPORTANT] Phase 4: begin() function lacks explicit documentation of which BeginPhase values are in scope for this slice**
Phase 4 says `begin()` maps phase+target to events, and lists several examples. But the `BeginPhase` type in `rpc-layer-api.md` includes phases for slice and quest lifecycle (`'plan'`, `'refine-plan'`, `'implement'`) that are not in scope for this slice. The plan should explicitly state which `BeginPhase` values are implemented vs which throw "not yet implemented" (similar to how `complete()` explicitly notes that only epic completion is in scope). Without this, the implementer may either implement too much or leave type holes.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/04-rpc-layer.md`

**[MINOR] Phase 3: Transition table export vs reduce()-based enumeration left as implementation-time decision**
Phase 3 says: "Export transition tables from handler files as `epicTransitions: { from, event, to }[]` arrays to enable fitness function enumeration in slice 08. Note: an alternative approach... consider this during implementation." Leaving this as an implementation-time decision is fine for a minor concern, but it creates a public API surface on the state machine module. The note correctly identifies the alternative (enumerate via `reduce()` calls). Since the plan already flags this, no change needed — but the implementer should be aware that the exported tables become a contract that fitness functions depend on.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/03-epic-state-machine.md`

**[MINOR] Phase 6: End-to-end verification step 4 uses submit-refine-slices with empty stdin `{}`**
Step 4 says: `echo '{}' | goodplan submit-refine-slices --epic my-epic`. But `submit-refine-slices` requires `{scores}` in stdin (per Phase 6 task: "Reads stdin JSON `{scores}`"). Empty `{}` would fail Zod validation for missing `scores`. The verification step should use a realistic payload like `echo '{"scores":{"completeness":9,"consistency":9}}' | goodplan submit-refine-slices --epic my-epic`.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/06-submit-commands-integration.md`

**[MINOR] Phase 5: Missing `epic:define-architecture` skip path — transition-tables.md allows `explored -> COMPLETE_ARCHITECTURE -> architecture-defined`**
Phase 5 creates `epic:define-architecture` command, but transition-tables.md also shows a skip path: `explored -> COMPLETE_ARCHITECTURE -> architecture-defined` (row 6). There is no `submit-architecture` equivalent `epic:complete-architecture` for direct skip. The skip is handled by `submit-architecture` in Phase 6, which maps to `COMPLETE_ARCHITECTURE`. This is correct but the split across phases is implicit — the implementer of Phase 5 should know that `epic:define-architecture` only triggers `BEGIN_ARCHITECTURE`, while the skip path from `explored` is exercised through `submit-architecture`.
Resolution: DIRECTLY_ACTIONABLE
File: `/Users/iwhite/Repos/goodplan/.project/epics/__active__goodplan-cli/slices/03-epic-lifecycle/plan-refining/05-epic-cli-commands.md`

## Score: 8/10

Round 2 shows significant improvement from round 1. The key round-1 issues were addressed: event scope is now clearly delineated (16 epic events + 6 submit events, with deferred events explicitly listed), handler Map pattern is specified as explicit imports (not side-effect registration), `loadState()` is now used for read-only commands, the `begin()` payload mechanism for abandon/verification is documented, and the `complete()` function correctly references `target.type`. The remaining issues are primarily about precision: the timestamp handling contradiction with the canonical StateEvent union is the most significant because it affects the Phase 1 type definitions and Phase 4 RPC layer injection logic. The other issues are clarifications that prevent implementer confusion. To reach 9+: resolve the CREATE_EPIC/ACTIVATE_EPIC timestamp question (reconcile with or amend state-machine-api.md), make epic-create timestamp fields explicit, and clarify which BeginPhase values are in-scope in the RPC layer.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
