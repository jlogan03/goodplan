## Issues

**[CRITICAL]** Plan says every StateEvent carries `ts: string` but architecture disagrees

The plan overview states: "Every StateEvent carries `ts: string` (RPC-injected, per slice 02 convention)." Phase 1 repeats this: "Each event carries `ts: string` plus its specific payload fields." However, the canonical `StateEvent` union in `state-machine-api.md` does NOT include `ts` on most epic events. For example, `CREATE_EPIC` is `{ type: 'CREATE_EPIC'; name: string; goal: string }` with no `ts` field. Only `INIT_PROJECT` has `ts`. The architecture says `ts` is included on "events that produce timestamped entities" -- not universally.

Phase 1 must either: (a) follow the architecture exactly and only add `ts` to events that produce timestamped entities (CREATE_EPIC needs `ts` since epic.json has `created`/`updated`, but navigation events like BEGIN_EXPLORE may or may not), or (b) explicitly acknowledge a deviation from the architecture and add `ts` to all events (which would require amending the architecture doc).

The current epic.json schema has `created`, `activated`, and `updated` timestamp fields, so events that set those fields need `ts`. But most BEGIN_*/COMPLETE_* events only set `updated`, so they need `ts` too. The plan should align with the architecture or explicitly note the amendment. As-is, the implementer will face type mismatches between the plan's claim and the architecture's StateEvent definition.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing `ts` field on epic events will cause compile errors with existing `epicSchema`

The existing `epicSchema` in `src/schemas/entities/epic.ts` has `created: timestampSchema` and `updated: timestampSchema`. The `CREATE_EPIC` handler in Phase 3 needs to set these timestamps, which means the event needs a `ts` field. The plan's Phase 3 tasks describe handlers that update timestamps but Phase 1's task list does not specify which events get `ts` and which do not. The implementer needs a clear specification per event type.

Fix: In Phase 1's task list, for each event, specify whether it carries `ts` based on whether the handler needs to set a timestamp field on the entity. At minimum, CREATE_EPIC, ACTIVATE_EPIC (sets `activated`), and all events that update `updated` need `ts`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3: handler Map pattern lacks type safety specification

Phase 3 says: "replace switch with handler `Map<string, Handler>` pattern." Using `Map<string, Handler>` loses the discriminated union narrowing that the current `switch` provides. With `switch (event.type)`, TypeScript narrows `event` to the specific variant in each case branch. A `Map<string, Handler>` uses string keys and a generic handler type, meaning the handler function receives the full `StateEvent` union and must narrow internally.

The plan should specify the handler signature precisely. The architecture's `Transition` interface already defines `guard` and `apply` taking `(ProjectState, StateEvent)`, but handlers should use `Extract<StateEvent, { type: T }>` to narrow the event type at registration time. For example:

```typescript
type Handler<T extends StateEvent['type']> = (
  state: ProjectState,
  event: Extract<StateEvent, { type: T }>
) => ProjectState | StateError;
```

The existing `handleInitProject` already uses `Extract<StateEvent, { type: "INIT_PROJECT" }>` — the plan should make this pattern explicit for all handlers and show how the Map registration preserves type safety (likely via a typed `register` helper that performs the cast safely at registration time).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 epicStatusSchema values already exist in codebase

Phase 1 says: "Update `epicStatusSchema` values in `src/schemas/entities/epic.ts` to include all statuses from transition-tables.md." But the codebase already has these exact values -- all 14 statuses are present in `epicStatusSchema`. The plan's "Before implementation" check (`grep "epicStatusSchema" src/schemas/entities/epic.ts` -- no match) is wrong: it will match because the schema already exists with all the status values.

Fix: Remove or update this task. The status enum already matches transition-tables.md. The "Before" check should verify something actually missing (e.g., `grep "CREATE_EPIC" src/schemas/state-events.ts`).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2: `loadState` return type should include cache metadata for concurrent modification detection

Phase 2 describes `loadState(projectDir?)` returning `ProjectState`, but `commitState` needs the `oldState` for concurrent modification detection. The plan says `commitState(projectDir, oldState, newState)` where `oldState` comes from `loadState`. This works if `loadState` returns a plain `ProjectState`. However, the cache detection for "new LLM-written files" requires `readdirSync` -- which is I/O. The plan correctly places this in the data layer, but the description conflates two concerns: the cache read (pure JSON parse) and the filesystem scan for new files (I/O).

The plan should clarify: does `loadState` do a `readdirSync` walk on every call (making the cache optimization marginal), or only when the cache is valid? If only when valid, what about files written between cache creation and the next `loadState` call? The current description says "do `readdirSync` walk of `.project/` directories to detect new files not in cache" which sounds like a full walk every time, which is nearly as expensive as `assembleState`.

Fix: Clarify the caching strategy. If the goal is fast reads, consider: cache hit -> compare directory mtimes (cheap) -> if unchanged, return cached; if changed, identify new files and incrementally update. A full `readdirSync` walk defeats much of the caching benefit.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3: epic.json missing `refinement` field for circuit breaker state

Phase 3's `epic-refine.ts` handler says "Update epic.json refinement field (round, scoreHistory)." But the existing `epicSchema` in `src/schemas/entities/epic.ts` has no `refinement` field -- it only has `name`, `status`, `goal`, `verifications`, `sliceSequence`, `created`, `activated`, `updated`. Phase 1 does not mention adding a `refinement` field to the epic schema.

Without this field, the circuit breaker logic (track round number, score history, maxRounds) has nowhere to persist its state. Phase 1 must add a `refinement` field to the epic schema (e.g., `refinement: { round: number; maxRounds: number; scoreHistory: Record<string, number>[] } | null`), or Phase 3 must specify where this state is tracked.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4: `complete()` routing mismatches architecture

Phase 4 says `complete(target, input)` "Maps to COMPLETE_EPIC/COMPLETE_SLICE/COMPLETE_QUEST based on input.type." But in the architecture's rpc-layer-api.md, the mapping table shows `epic:complete` routes to `complete(target, ...)`, while `COMPLETE_EXPLORE`, `COMPLETE_ARCHITECTURE`, `COMPLETE_SLICING` etc. route through `submit(phase, ...)`. The `complete()` function should only handle the three entity completion events (COMPLETE_EPIC, COMPLETE_SLICE, COMPLETE_QUEST), not intermediate phase completions.

The plan's Phase 4 description is consistent with this for `complete()`, but the `submit()` description says it maps to "COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, etc." and the Phase 5 `explore` command says it calls `begin('explore', ...)`. But the architecture shows `COMPLETE_EXPLORE` is triggered by `submit('explore', {type:'epic'})`, not `begin`. Phase 5's `explore.ts` correctly calls `begin('explore', ...)` which maps to `BEGIN_EXPLORE`. Then `submit-explore` (missing from Phase 6) would trigger `COMPLETE_EXPLORE`.

Phase 6 only has `submit-plan`, `submit-refinement`, `submit-implementation`, and `submit-refine-slices`. Missing: `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-architecture`. These are in the architecture's command-to-RPC routing table. The plan should either include these or explicitly scope them out with justification.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 5: `epic:list` and `epic:show` use `assembleState()` but should use `loadState()`

Phase 5 says read-only commands call `assembleState()` directly. But Phase 2 introduces `loadState()` specifically to avoid the full-walk cost. After Phase 2, all state reads should go through `loadState()` for consistency and to benefit from caching. Using `assembleState()` directly bypasses the cache and concurrent modification detection flow.

Fix: Change `epic:list` and `epic:show` to use `loadState()` instead of `assembleState()`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1: `COMPLETE_EXPLORE` in plan's Before check incorrectly references `epicStatusSchema`

Phase 1's "Before implementation" second check says: `grep "epicStatusSchema" src/schemas/entities/epic.ts` -- no match. But this file already exists and already contains `epicStatusSchema` with all status values. The comment says "(schema exists but no status values matching transition-tables.md)" which is incorrect -- they already match.

The Before checks should test for something that genuinely doesn't exist yet, e.g., `grep "CREATE_EPIC" src/schemas/state-events.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5: `epic:abandon` uses `begin('abandon', ...)` but needs `reason` in event

Phase 5 says `epic:abandon` requires `--epic` and `--reason` flags and calls `begin('abandon', {type:'epic', name})`. But the `ABANDON_EPIC` event requires a `reason` field. The `begin()` function in Phase 4 needs to accept and pass through the `reason` field. The plan doesn't show how `reason` flows from CLI flag through `begin()` to the event payload. Either `begin()` needs an optional payload/options parameter for event-specific fields, or `abandon` should use a different RPC path.

The architecture's `begin()` signature is `begin(phase, target, options?)` where `options` is `WorkflowOptions` (only `inlineContext` and `override`). There's no mechanism for passing `reason`. The plan needs to address this -- either extend `WorkflowOptions`, add a payload parameter to `begin()`, or use a different function for abandon.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5: `epic:add-verification` and `epic:update-verification` call `begin()` but need typed payloads

Similar to the `abandon` issue: `ADD_VERIFICATION` needs `{ epic, verification }` and `UPDATE_VERIFICATION` needs `{ epic, index, verification }`. The `begin()` function's current signature (`phase, target, options?`) has no way to pass these payloads. The plan should specify how verification data flows from stdin through `begin()` to the state event.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3: `epic-create.ts` creates directory tree but `setEntry` already auto-creates directories

The plan says CREATE_EPIC "creates directory tree (`architecture/`, `research/`, `brainstorm/`, `prototypes/`)." The existing `setEntry` function auto-creates intermediate `DirectoryEntry` nodes. If the handler creates `epics/<name>/epic.json` via `setEntry`, the `epics/<name>/` directory is auto-created. But empty subdirectories (`architecture/`, `research/`, etc.) need explicit creation since `setEntry` only creates intermediates for paths with a leaf entry. The plan should note that empty directories need explicit `setEntry(tree, "epics/<name>/architecture", { type: "directory", contents: {} })` calls.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6: `submit-refine-slices` is a submit command but `submit-refine-architecture` is missing

Phase 6 includes `submit-refine-slices` but not `submit-refine-architecture`. The architecture's command-to-RPC routing table lists both. If `submit-refine-architecture` is out of scope for this slice, it should be noted.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has a solid structure and follows the bottom-up approach well. However, there are significant type-level issues: the `ts` field discrepancy between the plan and architecture affects every event type, the missing `refinement` field on the epic schema creates a data persistence gap for the circuit breaker, the `begin()` function signature cannot carry event-specific payloads (reason, verification data), and several submit commands from the architecture are missing without justification. To reach 9+: resolve the `ts` field specification per-event, add the `refinement` schema field to Phase 1, design a `begin()` payload mechanism or split abandon/verification into their own RPC functions, include or explicitly scope out the missing submit commands, and fix the stale Before checks.

## Summary
- Critical: 1
- Important: 7
- Minor: 4
