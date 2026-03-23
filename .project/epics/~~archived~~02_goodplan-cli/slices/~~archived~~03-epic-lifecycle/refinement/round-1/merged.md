# Merged Review Feedback — Epic Lifecycle Plan (Round 1)

## CRITICAL Issues

### C1. Plan claims every StateEvent carries `ts: string` but architecture disagrees
**Source:** typescript
The plan overview and Phase 1 both state every StateEvent carries `ts: string` (RPC-injected). However, the canonical StateEvent union in `state-machine-api.md` does NOT include `ts` on most epic events. The architecture says `ts` is included on "events that produce timestamped entities" — not universally.

Since `epicSchema` has `created`, `activated`, and `updated` timestamp fields, events that set those fields need `ts`. Phase 1 must specify per-event whether it carries `ts`, based on whether the handler needs to set a timestamp field. At minimum: CREATE_EPIC, ACTIVATE_EPIC, and all events that update `updated` need `ts`.

**Action:** In Phase 1, replace the blanket "`ts` on every event" claim with a per-event specification. Either (a) follow architecture exactly — only events that set timestamp fields get `ts`, or (b) amend the architecture to add `ts` universally and document the deviation.

---

## IMPORTANT Issues

### I1. Epic schema missing `refinement` field for circuit breaker state
**Source:** holistic, typescript
Phase 3's `epic-refine.ts` handler says "Update epic.json refinement field (round, scoreHistory)." But `epicSchema` has no `refinement` field — only `name`, `status`, `goal`, `verifications`, `sliceSequence`, `created`, `activated`, `updated`. Phase 1 does not add this field. Without it, circuit breaker logic has nowhere to persist round counts and score history.

**Action:** Add a task to Phase 1 to extend `epicSchema` with a refinement tracking field, e.g., `refinement: z.object({ round: z.number(), maxRounds: z.number(), scoreHistory: z.array(...) }).nullable()`.

### I2. Phase 1 epicStatusSchema "Before" check is false — schema already exists with correct values
**Source:** holistic, typescript
Phase 1's "Before implementation" check (`grep "epicStatusSchema"`) will pass because the schema already exists with all 14 statuses matching transition-tables.md. The task to "Update epicStatusSchema values" is a no-op.

**Action:** Remove or rewrite the Before check to test something genuinely missing (e.g., `grep "CREATE_EPIC" src/schemas/state-events.ts`). Change the epicStatusSchema task to "Verify" or remove it.

### I3. `begin()` RPC function cannot carry event-specific payloads (reason, verification data)
**Source:** tui-cli, software-architecture, typescript
The `begin()` signature is `begin(phase, target, options?)` where `options` is `WorkflowOptions` (only `inlineContext` and `override`). There is no mechanism for passing event-specific payloads like `reason` (for ABANDON_EPIC), `verification` (for ADD_VERIFICATION), or `index + verification` (for UPDATE_VERIFICATION). Multiple commands depend on this: `epic:abandon`, `epic:add-verification`, `epic:update-verification`.

**Action:** Resolve the payload gap. Options: (a) extend `WorkflowOptions` with an optional `payload` field, (b) add a `payload` parameter to `begin()`, or (c) create separate RPC functions for abandon/verification. Document the chosen approach in Phase 4.

### I4. Phase 4 `complete()` function description conflates `input.type` with `target.type`
**Source:** software-architecture, holistic
Phase 4 says `complete(target, input)` "maps to COMPLETE_EPIC/COMPLETE_SLICE/COMPLETE_QUEST based on input.type." The architecture uses `target.type` as the discriminant. Also, slice/quest completion is out of scope (slices 04-05) — the `complete()` implementation should only handle epic completion in this slice.

**Action:** Fix the description to use `target.type`. Add a note that slice/quest branches throw "not yet implemented" or are deferred.

### I5. Phase 5 read-only commands use `assembleState()` instead of `loadState()`
**Source:** holistic, tui-cli, software-architecture, typescript
Phase 5 says `epic:list` and `epic:show` call `assembleState()`. After Phase 2 introduces `loadState()` with caching, all state reads should use `loadState()` for consistency and performance.

**Action:** Change Phase 5 `epic:list` and `epic:show` (and the existing `status` command) to use `loadState()` instead of `assembleState()`.

### I6. Phase 3 slice-submit handlers are out of scope but needed by in-scope submit commands
**Source:** holistic
Phase 3's `slice-submit.ts` implements `COMPLETE_PLAN`, `COMPLETE_REFINEMENT_ROUND`, `COMPLETE_IMPLEMENTATION`, and quest variants. Goal.md says slice/quest lifecycle is out of scope (slices 04-05), but submit-plan/submit-refinement/submit-implementation commands are in scope and require these handlers.

**Action:** Add a note to Phase 3's slice-submit.ts task explaining these handlers are pulled forward from slices 04-05 because the in-scope submit commands require them. Make the scope extension deliberate and traceable.

### I7. Missing events in Phase 1 type list vs transition-tables.md
**Source:** software-architecture
Phase 1 lists ~20 epic events + ~6 submit events but omits several from transition-tables.md: `CREATE_SLICE`, `CREATE_QUEST`, `BEGIN_PLAN`, `BEGIN_REFINEMENT`, `BEGIN_IMPLEMENTATION`, `COMPLETE_SLICE`, `ABANDON_SLICE`, etc. The overview says "~25 event types" but the full union has ~30+.

**Action:** Clarify scope: explicitly list which events are in-scope for this slice and which are deferred. Don't leave the count ambiguous.

### I8. Phase 4 `submit()` task missing explicit phase+target-to-event mapping
**Source:** software-architecture
Phase 4's `submit.ts` says it "maps to COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, etc." but doesn't specify how phase+target selects the event. The rpc-layer-api.md has an explicit mapping table.

**Action:** Reference or inline the mapping table from rpc-layer-api.md in the Phase 4 submit task.

### I9. submit commands in `src/commands/subagent/` must register as flat top-level commands
**Source:** tui-cli
Phase 6 places submit commands under `src/commands/subagent/`. The directory is fine for organization, but the plan must ensure these register in `main.ts` as flat top-level subcommands (`submit-plan`, `submit-refinement`, etc.) — not nested under a `subagent:` namespace.

**Action:** Explicitly state the registration key names in Phase 6 (e.g., `"submit-plan": submitPlanCommand`).

### I10. Phase 5 `epic:create` TTY validation — clarify Zod handles this
**Source:** tui-cli
The plan says "TTY without stdin -> validation error" but `readStdin()` returns `{}` on TTY. The plan should clarify that Zod schema validation of the merged input naturally rejects missing required fields — no separate TTY check needed.

**Action:** Reword to state that Zod validation handles this case.

### I11. Missing `--override` flag on submit-refine-architecture and submit-refine-slices
**Source:** tui-cli
commands-api.md documents `--override` as a common workflow flag for refinement commands. Phase 6 only mentions `--override` for `submit-refinement`. The plan should add `--override` to `submit-refine-architecture` and `submit-refine-slices`.

**Action:** Add `--override` flag to the submit-refine-* command definitions in Phase 6.

### I12. Handler Map registration pattern needs explicit specification
**Source:** software-architecture, typescript
Phase 3 says "replace switch with handler Map" but `Map<string, Handler>` loses discriminated union narrowing. The plan should specify the handler signature using `Extract<StateEvent, { type: T }>` (matching existing `handleInitProject` pattern) and clarify that `reduce.ts` imports all handler files explicitly (not side-effect registration).

**Action:** Specify the typed handler pattern and explicit import approach in Phase 3.

### I13. Phase 2 `loadState()` not wired into RPC layer
**Source:** holistic
The existing `rpcInit()` calls `assembleState()` directly. Phase 4 doesn't specify updating the RPC layer to use `loadState()` instead.

**Action:** Add a task to Phase 4 (or Phase 2) to update the RPC layer to import and use `loadState()` for all state reads.

### I14. Missing submit commands from architecture
**Source:** typescript, tui-cli
Phase 6 only creates 4 submit commands: `submit-plan`, `submit-refinement`, `submit-implementation`, `submit-refine-slices`. The architecture lists 8 total — missing: `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-architecture`.

**Action:** Either add the missing submit commands or explicitly list them as deferred with justification.

---

## MINOR Issues

### M1. Phase 6 `subagent/` directory name not in architecture conventions
**Source:** software-architecture
The `subagent/` directory for submit commands isn't documented in the architecture. Consider using a name matching existing conventions or document it as a new convention.

### M2. Phase 2 cache staleness on manual JSON edits
**Source:** software-architecture
The cache uses `readdirSync` to detect new/deleted files, but manually edited JSON files won't be detected. The plan should note this known limitation.

### M3. Phase 2 `loadState` caching strategy unclear — full readdirSync walk on every call?
**Source:** typescript
The description says "do readdirSync walk to detect new files not in cache" which sounds like a full walk every time, nearly as expensive as `assembleState`. Clarify: cache hit -> compare directory mtimes (cheap) -> if unchanged, return cached; if changed, incremental update.

### M4. Phase 3 transition table exports create coupling with fitness functions
**Source:** software-architecture
Exporting `epicTransitions: { from, event, to }[]` exposes internal implementation details. Consider having fitness functions enumerate by calling `reduce()` on all (status, event) combos instead.

### M5. Phase 3 `epic-create.ts` empty subdirectory creation needs explicit `setEntry` calls
**Source:** typescript
`setEntry` auto-creates intermediate directories for paths with leaf entries, but empty subdirectories (`architecture/`, `research/`, etc.) need explicit `setEntry` calls with `{ type: "directory", contents: {} }`.

### M6. Phase 5 no help text quality specification for new commands
**Source:** tui-cli
commands-api.md requires descriptions for commands and flags, plus expected stdin shape, state preconditions, and resulting transitions. Phase 5 doesn't mention help text content.

### M7. Phase 6 binary path unspecified in e2e verification
**Source:** tui-cli
Phase 6 verification references `./goodplan` but the actual build output path is unspecified. Reference the actual path from `package.json` build script.

### M8. Phase 5 `NO_COLOR` / `FORCE_COLOR` handling
**Source:** tui-cli
picocolors handles this automatically. A brief note confirming the convention would be helpful but not blocking.

### M9. Phase 6 conventions.md update task is underspecified
**Source:** holistic
The task to update conventions.md should list the specific new directories/files to add (e.g., `src/commands/epic/`, `src/commands/subagent/`, `src/core/state/transitions/`, etc.).

### M10. Phase 3 `COMPLETE_PLAN` guard depends on loaded state reflecting current filesystem
**Source:** software-architecture
The `hasChild` guard requires `plan.md` to already exist in the loaded state tree. This is implicit and correct (loadState reads filesystem first), but worth a note for implementers.

---

## DIRECTLY_ACTIONABLE

1. **C1** — Specify `ts` per-event (or amend architecture for universal `ts`)
2. **I1** — Add `refinement` field to epicSchema in Phase 1
3. **I2** — Fix false Before check for epicStatusSchema
4. **I3** — Design payload mechanism for `begin()` (reason, verification data)
5. **I4** — Fix `complete()` description: `target.type` not `input.type`, scope to epic-only
6. **I5** — Change read-only commands to use `loadState()`
7. **I6** — Add scope-crossing note to Phase 3 slice-submit handlers
8. **I7** — Clarify which events are in-scope vs deferred
9. **I8** — Add phase+target-to-event mapping to Phase 4 submit task
10. **I9** — Specify flat registration keys for submit commands
11. **I10** — Reword TTY validation to reference Zod
12. **I11** — Add `--override` to submit-refine-* commands
13. **I12** — Specify typed handler pattern and explicit imports
14. **I13** — Wire `loadState()` into RPC layer
15. **I14** — Include or explicitly defer missing submit commands
16. **M1–M10** — All minor issues are directly actionable

## RESEARCH_NEEDED

None — all issues can be resolved from existing architecture docs and codebase.

## Contradictions Resolved

1. **`begin()` payload gap — MINOR vs IMPORTANT:** typescript (M2, M3) and software-architecture (M2) flagged the `begin()` reason/verification payload issue as MINOR. tui-cli flagged it as IMPORTANT. **Resolution:** Elevated to IMPORTANT (I3) — this is a structural gap that blocks 3 commands (`epic:abandon`, `epic:add-verification`, `epic:update-verification`). The tui-cli reviewer is the domain specialist for CLI command data flow.

2. **epicStatusSchema already exists — flagged by both holistic and typescript.** holistic was more specific about the false negative in the Before check. Merged as single issue (I2) using holistic's description.

3. **Missing refinement field — flagged by both holistic and typescript.** Both descriptions aligned. Merged as single issue (I1).

4. **`assembleState()` vs `loadState()` — flagged by all four reviewers.** Deduplicated to single issue (I5).

## Unresolved (USER_INPUT required)

None — all issues are directly actionable from existing architecture docs and codebase knowledge.
