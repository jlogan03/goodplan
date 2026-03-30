# Merged Feedback: Sub-Agent Commands & Quest Lifecycle (Round 1)

## CRITICAL Issues

None.

## IMPORTANT Issues

### IMP-1: `complete` phase missing from context bundling priority tables and `SubmitPhase` type
Phase 4's `priorities.ts` lists 8 phases but omits `complete`. The architecture's `rpc-layer-api.md` and `transition-tables.md` both define a `complete` phase with its own content priority ordering. `SubmitPhase` in `src/core/rpc/types.ts` also lacks `complete`. Without it, `startContext(state, 'complete', target, options)` would fail. Either: (a) add `complete` to `SubmitPhase` and the priority table, or (b) explicitly scope it out with a note.
**Flagged by:** Holistic, SoftwareArchitecture, TypeScript
**Resolution:** USER_INPUT — need to know if `complete` context is in-scope for this slice.

### IMP-2: `COMPLETE_QUEST` event must have `learnings` and `architectureDelta` as required (non-optional) arrays
Phase 1 adds `COMPLETE_QUEST` to the `StateEvent` union but doesn't explicitly state that `learnings: LearningInput[]` and `architectureDelta: ArchitectureDeltaInput[]` are **required** on the event (not optional). The existing `COMPLETE_SLICE` event pattern (state-events.ts:67-74) uses required arrays. The RPC layer coerces `undefined` -> `[]` before building the event. Phase 1 should be explicit: these fields are required on the event, optional only on `CompleteInput`.
**Flagged by:** Holistic, SoftwareArchitecture, TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

### IMP-3: `startContext()` signature diverges from `rpc-layer-api.md`
The architecture spec defines `startContext(phase, target, options)` (loads state internally). The plan proposes `startContext(state, phase, target, options)` where callers pass state. The plan's design is better for testability and avoids coupling read-only operations to RPC's loadState pattern. But this is an intentional deviation that needs: (a) a note in the plan, and (b) a task to update `rpc-layer-api.md`.
**Flagged by:** SoftwareArchitecture, TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

### IMP-4: Context bundling module is not truly "within the RPC layer"
Phase 4 says `src/core/context/` is "a distinct module within the RPC layer." But `start-*` commands bypass the RPC layer entirely: Commands -> Data Layer + Context Module. The context module is actually a peer module consumed by both RPC (for `--inline` on mutations) and Commands (for `start-*`). The architecture docs should reflect this: `src/core/context/` depends on tree types and Data Layer reads, not on RPC or State Machine.
**Flagged by:** SoftwareArchitecture
**Resolution:** DIRECTLY_ACTIONABLE

### IMP-5: Phase 3 `completeQuestInput` schema includes redundant `quest` field
The plan specifies `completeQuestInput` with a `quest: z.string().min(1)` field. But the quest name comes from the `--quest` flag (command args), not from stdin. The stdin schema should be `{ verificationPassed, learnings?, architectureDelta? }` without a `quest` field, matching `slice:complete` which takes `--slice` flag for the name.
**Flagged by:** TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

### IMP-6: `--inline` flag parsing logic duplicated across 8 `start-*` commands
Phase 5 describes parsing `--inline` identically in all 8 `start-*` commands: `"true"` -> default budget (20480), numeric string -> custom budget, absent -> no inlining. This should be extracted to a shared utility (e.g., `parseInlineBudget(args.inline)` in `global-args.ts`), matching the pattern where `globalArgs` centralizes shared flag definitions.
**Flagged by:** TUICLI
**Resolution:** DIRECTLY_ACTIONABLE

### IMP-7: Budget uses byte length but no encoding specification
The plan specifies budget in bytes (UTF-8) but doesn't specify the measurement API. `string.length` returns UTF-16 code units, not UTF-8 bytes. The plan should specify `Buffer.byteLength(content, 'utf8')` (available in Bun) for accurate byte counting.
**Flagged by:** TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

### IMP-8: Phase 2 quest-plan.ts sets `activeQuest` but no reference to `getProject` + `setEntry` pattern
Phase 2 describes `BEGIN_QUEST_PLAN` setting `project.json activeQuest` and `COMPLETE_QUEST`/`ABANDON_QUEST` clearing it. The plan should explicitly reference the established `getProject` + `setEntry` pattern from `slice-plan.ts` to avoid implementer guesswork.
**Flagged by:** Holistic
**Resolution:** DIRECTLY_ACTIONABLE

## MINOR Issues

### MIN-1: `quests/overview.json` creation on first quest not explicitly handled
`CREATE_QUEST` says "Updates `quests/overview.json`" but doesn't specify creating it if absent (first quest case). INIT_PROJECT creates `epics/overview.json` but not `quests/overview.json`. The handler needs to handle the "first quest" case (create if absent, append item), and the overview item shape should be specified explicitly (`{ name: string, status: QuestStatus }`, no `epic` field).
**Flagged by:** Holistic, SoftwareArchitecture, TypeScript

### MIN-2: Phase 5 E2E verification uses `goodplan` binary but earlier phases use `bun run src/index.ts`
Steps 2-12 say `goodplan` which implies the binary is already built. Clarify: steps 1-12 use `bun run src/index.ts`, step 13 (binary regression) uses the compiled binary.
**Flagged by:** Holistic

### MIN-3: `quest:create` help text should clarify name comes from stdin, not a flag
The creation pattern (name from stdin) differs from other quest commands (`--quest` flag). Help text should make this clear.
**Flagged by:** TUICLI

### MIN-4: Human-readable output format unspecified for quest:show, quest:list, and start-* commands
The plan doesn't specify human-readable formats for these commands. Quest commands should follow slice patterns minus `epic` field. Start commands need a policy: always JSON, or a summary in human-readable mode.
**Flagged by:** TUICLI

### MIN-5: `handleNotImplemented` placeholder function doesn't exist
Phase 1 says to add placeholders pointing to `handleNotImplemented`. This function needs to be created (one-liner returning StateError) or replaced with inline arrow functions.
**Flagged by:** TypeScript

### MIN-6: Non-null assertion `input.quest!` pattern should use proper narrowing
Existing `submit-plan.ts:42` uses `input.quest!`. New quest commands should use proper narrowing instead. The plan doesn't call this out for new commands.
**Flagged by:** TypeScript

### MIN-7: Phase 4 budget.test.ts "first entry always inlined" contract should be in JSDoc
The "single large entry exceeds budget -> still inlined" design decision should be documented in `applyBudget` function's JSDoc, not just in the test.
**Flagged by:** TUICLI

### MIN-8: `--inline` absent case: ContextBundle.inline should be `{}` (empty object)
Without `--inline`, should `inline` be `{}` or absent? ContextBundle always has the field. Clarify: without `--inline`, `inline` is `{}` and all content goes to `references`.
**Flagged by:** TUICLI

### MIN-9: Phase 4 budget default 20480 (20KB) vs architecture ~20-30KB range
Plan correctly pins 20480. The architecture's range is intentionally vague. Just note this is a deliberate choice within the range.
**Flagged by:** Holistic

### MIN-10: No architecture doc cleanup task
Plan updates `.project/conventions.md` but doesn't include cleanup of any "deferred to slice 05" notes in architecture docs.
**Flagged by:** Holistic

## DIRECTLY_ACTIONABLE (for loop exit)

**DA-1: Make `learnings` and `architectureDelta` explicitly required on `COMPLETE_QUEST` event (IMP-2)**
File: Plan Phase 1, task 1 (StateEvent union extension)
Change: State that `COMPLETE_QUEST` event has `learnings: LearningInput[]` (required) and `architectureDelta: ArchitectureDeltaInput[]` (required), matching `COMPLETE_SLICE` pattern. Note that optionality lives only on `CompleteInput` (RPC boundary), and the RPC layer coerces `undefined` -> `[]` using conditional spread for `exactOptionalPropertyTypes` compliance.

**DA-2: Note `startContext` signature deviation and add architecture doc update task (IMP-3)**
File: Plan Phase 4 overview + Phase 5 tasks
Change: Add a note that `startContext(state, phase, target, options)` is an intentional deviation from `rpc-layer-api.md`'s `startContext(phase, target, options)` — callers pass state for testability and to avoid coupling read-only ops to RPC's loadState. Add a task in Phase 5 to update `rpc-layer-api.md` with the actual signature.

**DA-3: Clarify context module layering (IMP-4)**
File: Plan Phase 4 overview
Change: Describe `src/core/context/` as a peer module to the RPC layer (not within it). It depends on tree types and Data Layer reads. Consumed by both RPC (for `--inline` on mutations) and Commands (for `start-*`).

**DA-4: Remove `quest` field from `completeQuestInput` schema (IMP-5)**
File: Plan Phase 3, quest:complete command task
Change: `completeQuestInput` should be `{ verificationPassed: z.boolean(), learnings: z.array(...).optional(), architectureDelta: z.array(...).optional() }` — no `quest` field. Quest name comes from `--quest` flag.

**DA-5: Extract shared `--inline` parsing utility (IMP-6)**
File: Plan Phase 5 overview
Change: Add a task to create `parseInlineBudget(value: string | undefined): number | undefined` utility (in `global-args.ts` or a shared module). Returns `undefined` if absent, `20480` if `"true"`, parsed number if numeric string. All 8 `start-*` commands use this instead of inline coercion.

**DA-6: Specify `Buffer.byteLength(content, 'utf8')` for budget measurement (IMP-7)**
File: Plan Phase 4, budget.ts task
Change: Specify that byte size is measured via `Buffer.byteLength(content, 'utf8')`, not `string.length`.

**DA-7: Reference `getProject` + `setEntry` pattern in quest-plan.ts task (IMP-8)**
File: Plan Phase 2, quest-plan.ts task
Change: Add "Follow the `getProject` + `setEntry` pattern from `slice-plan.ts` for `project.json` mutations (setting/clearing `activeQuest`)."

**DA-8: Specify `quests/overview.json` creation on first quest (MIN-1)**
File: Plan Phase 2, CREATE_QUEST handler task
Change: "Create `quests/overview.json` if absent (matching epic/slice create-if-absent pattern). Item shape: `{ name: string, status: QuestStatus }` (no `epic` field)."

**DA-9: Fix E2E verification to use `bun run src/index.ts` for steps 1-12 (MIN-2)**
File: Plan Phase 5, E2E walkthrough
Change: Steps 1-12 use `bun run src/index.ts` (or alias). Step 13 uses the compiled binary.

**DA-10: Specify human-readable formats for quest:show, quest:list, start-* (MIN-4)**
File: Plan Phase 3 (quest:show, quest:list) and Phase 5 (start-*)
Change: Quest:show follows slice:show minus epic/deferred lines. Quest:list follows slice:list minus epic column. Start-* commands: always output JSON (these are sub-agent commands, human-readable mode is not meaningful).

**DA-11: Specify `handleNotImplemented` creation or use inline arrows (MIN-5)**
File: Plan Phase 1, placeholder task
Change: Either create `handleNotImplemented` as a one-liner returning `{ ok: false, code: 'STATE_INVALID_TRANSITION', message: 'Not yet implemented' }`, or use inline arrow functions.

**DA-12: Document "first entry always inlined" contract in applyBudget JSDoc (MIN-7)**
File: Plan Phase 4, budget.ts task
Change: Add "JSDoc on `applyBudget`: first priority entry is always inlined regardless of budget."

**DA-13: Clarify `inline: {}` when `--inline` absent (MIN-8)**
File: Plan Phase 4 or Phase 5
Change: When `--inline` is not passed, `ContextBundle.inline` is `{}` (empty object) and all content goes to `references`.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **`activeQuest` guard**: SoftwareArchitecture (MIN) and TypeScript (IMP) both flagged that `BEGIN_QUEST_PLAN` doesn't guard `activeQuest == null`. TypeScript elevated it to IMPORTANT. Since the transition-tables.md (the source of truth) shows no guard for this transition, and the plan explicitly says "No sequential enforcement guard (quests are independent)," this appears intentional. However, overwriting `activeQuest` silently is a legitimate concern. **Resolved: escalated to USER_INPUT** (see Unresolved below) since the architectural intent is ambiguous — the transition table omits the guard, but that could be an oversight rather than a deliberate decision.

2. **`startContext` deviation from spec**: SoftwareArchitecture says the deviation is "actually reasonable" but needs doc update. TypeScript says to either match the spec or note the deviation. Both agree on the same resolution: keep the plan's signature, update the doc. **Resolved: DIRECTLY_ACTIONABLE (DA-2)**, trusting SoftwareArchitecture's judgment that the caller-provides-state pattern is better.

3. **Context module layering**: Only SoftwareArchitecture flagged this (IMP-4). No contradiction — included as DIRECTLY_ACTIONABLE since it's an architecture clarification.

4. **`completeQuestInput` schema**: Only TypeScript flagged the redundant `quest` field (IMP-5). No contradiction with other reviewers. Trusting TypeScript as domain specialist on schema design.

## Unresolved (USER_INPUT required)

1. **Is the `complete` context phase in-scope for this slice?** The architecture spec defines a `complete` phase in the per-phase content priority table (for both slice and quest contexts). The plan omits it from `SubmitPhase` and from the priority tables. If in-scope: add `complete` to `SubmitPhase`, add priority table entry, and determine whether a `start-complete` command is needed or if `complete` context is only used inline via `--inline` on `quest:complete`/`slice:complete`. If out-of-scope: note it explicitly in the plan overview. (Flagged by: Holistic, SoftwareArchitecture, TypeScript)

2. **Should `BEGIN_QUEST_PLAN` guard against an existing `activeQuest`?** The plan says "No sequential enforcement guard (quests are independent)" and the transition table shows no guard. But setting `activeQuest` while another quest is active silently overwrites the pointer. Options: (a) add a guard requiring `activeQuest == null`, (b) allow overwrite (document that only the most recent quest is tracked), (c) make `activeQuest` an array for concurrent quest support. (Flagged by: SoftwareArchitecture, TypeScript)

## USER_INPUT Resolved

1. **`complete` context phase**: **In scope.** Add `complete` to `SubmitPhase` and the priority tables in Phase 4. No `start-complete` command needed — context is assembled inline during `quest:complete`/`slice:complete`. This means Phase 4 priorities.ts should have 9 phases (the current 8 + `complete`).

2. **`activeQuest` guard**: **Guard: activeQuest == null.** `BEGIN_QUEST_PLAN` should reject if another quest is already active (similar to the one-active-epic rule). The user must complete or abandon the active quest first. This affects Phase 2 (quest-plan.ts handler) and Phase 3 (RPC error handling). Error code: `STATE_QUEST_ALREADY_ACTIVE`.
