# Merged Review Feedback — Epic Lifecycle Plan (Round 2)

## CRITICAL Issues

None.

## IMPORTANT Issues

**I1. CREATE_EPIC / ACTIVATE_EPIC `ts` field contradicts canonical StateEvent union in state-machine-api.md**
Flagged by: holistic, software-architecture, typescript
The plan says CREATE_EPIC and ACTIVATE_EPIC carry `ts: string`, but the canonical StateEvent union in state-machine-api.md defines these events without `ts`. The plan must either amend the canonical union to add `ts` to these events, or specify an alternative timestamp mechanism. Additionally (typescript), the plan is ambiguous about which events update `epic.updated` -- if `updated` changes on every transition, many more events need `ts`. The skip paths (e.g., created -> explored via COMPLETE_EXPLORE) make staleness of `updated` more visible.
Resolution: DIRECTLY_ACTIONABLE
Action: (a) Add a task to amend state-machine-api.md's canonical union, adding `ts` to CREATE_EPIC and ACTIVATE_EPIC. (b) Explicitly document which events set `updated` and whether all transition events need `ts` or only creation/activation events.

**I2. Phase 3 COMPLETE_EXPLORE: OR-guard phrasing misrepresents transition table structure**
Flagged by: holistic, software-architecture
Phase 3 says "COMPLETE_EXPLORE: guard status == created OR exploring" but transition-tables.md has two separate rows (created -> explored, exploring -> explored) each unconditional. The plan should express this as two from-status matches, not a single OR guard, to preserve the declarative table pattern.
Resolution: DIRECTLY_ACTIONABLE
Action: Rewrite COMPLETE_EXPLORE to show two transition rows with different `from` states, matching transition-tables.md structure.

**I3. Phase 2 loadState incremental update: missing skip-rule parity and cache mtime metadata**
Flagged by: holistic, typescript
The incremental file-reading path in loadState must replicate assembleState()'s skip rules (unregistered JSON skipped, unknown file types skipped). Also (typescript), the cache format `{ version: 1, state: ProjectState }` has no stored mtime data for comparison -- the plan should specify what the cache format looks like with mtime metadata (stored directory mtimes or a cache-write timestamp).
Resolution: DIRECTLY_ACTIONABLE
Action: (a) Add a note that the incremental path replicates assembleState()'s skip rules. (b) Specify cache format includes mtime data for comparison.

**I4. Phase 2 loadState staleness window after manual edits**
Flagged by: software-architecture
The plan documents that manual JSON edits are invisible to cache validation. The architectural consequence (read-only commands return stale data until next mutation triggers commitState) should be made explicit, noting that staleness is bounded to the period between a manual edit and the next write command.
Resolution: DIRECTLY_ACTIONABLE
Action: Add a note clarifying the staleness window and that commitState() always refreshes the cache.

**I5. Phase 3 epic-create.ts: vague "timestamps" instead of explicit field listing**
Flagged by: software-architecture
The task says "timestamps" without listing that `created` and `updated` must be set from the event's timestamp source and `activated` set to `null`.
Resolution: DIRECTLY_ACTIONABLE
Action: Replace "timestamps" with explicit: `created: ts, updated: ts, activated: null`.

**I6. Phase 4 begin() BeginPhase scope not explicitly bounded**
Flagged by: software-architecture
The BeginPhase type in rpc-layer-api.md includes phases for slice/quest lifecycle not in scope for this slice. The plan should list which BeginPhase values are implemented vs throw "not yet implemented."
Resolution: DIRECTLY_ACTIONABLE
Action: Add explicit list of in-scope BeginPhase values and note that out-of-scope values throw.

**I7. Phase 4 begin() payload type safety is underspecified**
Flagged by: tui-cli, typescript
The `payload?: Record<string, unknown>` type loses all compile-time type safety. For a strict TypeScript project, the payload should be typed per BeginPhase (discriminated union or overloads). The types.ts task should explicitly list the payload type addition.
Resolution: DIRECTLY_ACTIONABLE
Action: Specify that payload is typed per BeginPhase (at minimum acknowledge the approach; ideally use a discriminated union mapping phase to payload shape).

**I8. Phase 5 epic:complete missing `--epic` flag in task description**
Flagged by: tui-cli
The task omits that `--epic <name>` is required. Compare with `epic:abandon` which explicitly lists its flags.
Resolution: DIRECTLY_ACTIONABLE
Action: Add `--epic` flag requirement to epic:complete task description.

**I9. Phase 3 slice-submit.ts needs `refinement` field on slice/quest schemas**
Flagged by: typescript
Phase 3 creates handlers for COMPLETE_REFINEMENT_ROUND on slices/quests, which need a `refinement` field (round, maxRounds, scoreHistory). Phase 1 adds refinement to epicSchema but not to sliceSchema or questSchema.
Resolution: RESEARCH_NEEDED
Action: Check if sliceSchema/questSchema already have a refinement field from slice 02. If not, add schema amendment to Phase 1 or note the dependency in Phase 3.

## MINOR Issues

**M1. Phase 3 transition table export vs reduce()-based enumeration left unresolved**
Flagged by: holistic, software-architecture, typescript
The plan defers the choice between exporting `epicTransitions` arrays vs enumerate-via-reduce(). Should pick one approach or explicitly defer with both options documented as acceptable.
Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 6 e2e walkthrough step 4 uses invalid empty stdin `{}`**
Flagged by: holistic, software-architecture
`echo '{}' | goodplan submit-refine-slices` will fail Zod validation. Should use realistic scores payload.
Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 6 e2e walkthrough missing intermediate submit-* steps**
Flagged by: holistic
The walkthrough jumps from begin commands to next phase without showing the submit commands that complete each phase. Should show the full chain: begin -> submit -> begin -> submit.
Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 5 epic:complete vs epic:abandon inconsistent input patterns unexplained**
Flagged by: holistic
Complete uses stdin, abandon uses flags. The plan should note why: simple scalars use flags, complex structured payloads use stdin.
Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 5 human-readable output format unspecified for most commands**
Flagged by: tui-cli
Only epic:create and epic:activate have human output described. The plan should specify a general pattern (e.g., `{epicName}: {prev} -> {new}` for transitions).
Resolution: DIRECTLY_ACTIONABLE

**M6. Phase 6 submit-plan guard phrasing implies CLI does business logic**
Flagged by: tui-cli
Test description says "submit-plan verifies plan.md exists" but this is a state machine guard, not a CLI concern. Reword to test that the guard error surfaces correctly.
Resolution: DIRECTLY_ACTIONABLE

**M7. Phase 4 submit() has redundant `phase` parameter and `content.phase` field**
Flagged by: typescript
`phase` appears as both a top-level parameter and inside `SubmitInput.phase`. Plan should specify whether they must match or simplify the API.
Resolution: DIRECTLY_ACTIONABLE

**M8. Phase 5 epic:list return type shape unspecified**
Flagged by: typescript
The task says "navigates to epics/overview.json, returns items" but doesn't specify the shape in --json mode.
Resolution: DIRECTLY_ACTIONABLE

**M9. Phase 6 submit-plan has no stdin but plan creates submitPlanInputSchema**
Flagged by: typescript
Contradiction: submit-plan says "no stdin content" but a Zod schema is created for it. Clarify what the schema validates.
Resolution: DIRECTLY_ACTIONABLE

**M10. Phase 6 submit commands that say "no stdin" should note stdin is optional, not blocked**
Flagged by: tui-cli
Commands with "no stdin content" should clarify they work without piped stdin (TTY fast-path returns `{}`), not that they reject stdin.
Resolution: DIRECTLY_ACTIONABLE

**M11. Phase 5 skip path for epic:define-architecture split across phases is implicit**
Flagged by: software-architecture
The skip path (explored -> architecture-defined via COMPLETE_ARCHITECTURE) is exercised through submit-architecture in Phase 6, not via Phase 5's epic:define-architecture. Note this cross-phase dependency for implementer clarity.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

I1, I2, I3, I4, I5, I6, I7, I8, M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11

## RESEARCH_NEEDED

I9 — Check if sliceSchema/questSchema already have a `refinement` field; if not, add to Phase 1 or Phase 3.

## Contradictions Resolved

1. **COMPLETE_EXPLORE guard semantics** — holistic says "two rows not one handler with OR guard," software-architecture says "from-status match rather than guard." Both agree the plan's OR-guard phrasing is wrong; software-architecture's framing (from-status match vs business-logic guard) is the more precise correction. Merged as I2 using the software-architecture framing.

2. **Transition table export decision** — holistic says "pick one or defer explicitly," typescript says "resolve in the plan, pick reduce()-based." Since both state machine and TypeScript reviewers agree this should be resolved, merged as M1 with recommendation to pick one approach. The typescript reviewer's preference for reduce()-based enumeration is noted but left as a recommendation, not a mandate.

3. **loadState issues** — holistic flags skip-rule parity, typescript flags cache format + schema validation during incremental updates, software-architecture flags staleness window. These are complementary, not contradictory. Merged as I3 (skip rules + cache format) and I4 (staleness window).

## Unresolved (USER_INPUT required)

None. All issues are either directly actionable or require codebase exploration (I9).
