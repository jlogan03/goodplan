# Software Architecture Review — Slice Goal Definitions and Sequencing

## Issues

**[IMPORTANT]** `goal-refining.md [02-project-init]`: Slice 02 has massive scope — it is the largest slice in the sequence and may be under-estimated

Slice 02 bundles the recursive tree types, assembleState/commitState/loadState, state cache, schema registry, all Zod schemas for every entity type (epic, slice, quest, overview, all 4 JSONL record types), the reduce() scaffold, INIT_PROJECT handler, concurrent modification detection, atomic writes, tree navigation helpers (resolve, getJson, getJsonl, getDir, getMarkdown, hasChild), debug logging infrastructure, and refactoring the existing init command to go through the full stack. This is substantially more work than any other slice and touches all four architecture layers simultaneously. The risk is that this slice becomes so large it either takes disproportionately long or forces corner-cutting.

Consider splitting: (a) core types + data layer (StateEntry union, tree helpers, assembleState, commitState, loadState, schema registry, all Zod schemas) and (b) state machine reduce() scaffold + INIT_PROJECT + init command refactor. The first sub-slice is pure data infrastructure verifiable by round-trip tests; the second proves the state machine wiring through the full stack. This would keep each piece independently verifiable while reducing risk.

Alternatively, if the scope stays unified, the goal should explicitly acknowledge this is the largest slice and call out which items could be deferred without breaking the end-to-end verification (e.g., concurrent modification detection, state cache, debug logging could be deferred to later slices without breaking init).

Resolution: USER_INPUT

---

**[IMPORTANT]** `goal-refining.md [04-slice-lifecycle]`: Missing content-write mechanics — how does plan.md get into the state tree without sub-agent commands?

Slice 04 defines slice lifecycle including the `COMPLETE_PLAN` guard that checks `hasChild(state, "slices/<name>", "plan.md")`. However, the start-*/submit-* commands (including submit-plan which triggers COMPLETE_PLAN) are deferred to slice 05. Slice 04's verification step says "Walk 01-auth through full lifecycle: plan -> refine (2 rounds) -> implement -> complete" but doesn't explain how the plan.md file gets written during verification.

The implicit assumption is that testers manually write plan.md to the filesystem, and then `loadState()` picks it up via directory contents recomputation. This should be stated explicitly in the Verification section — otherwise the tester (human or LLM) will be confused about how to advance past the `plan.md` guard without submit-plan.

Additionally, COMPLETE_PLAN is listed as triggered by submit-plan in the architecture, but slice 04 doesn't have submit-plan. The slice needs to clarify how COMPLETE_PLAN is invoked — directly via the state machine in tests? Via a temporary CLI command? Via manual file creation + a command that just triggers the transition?

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [04-slice-lifecycle]`: Same issue applies to plan-refined.md guard for BEGIN_IMPLEMENTATION

The `BEGIN_IMPLEMENTATION` guard checks `hasChild(state, "slices/<name>", "plan-refined.md")`. Without submit-refinement (slice 05), how does plan-refined.md appear? The verification section says "refine (2 rounds)" but doesn't explain the mechanism. This needs the same clarification as the plan.md issue above.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [03-epic-lifecycle]`: Epic lifecycle verification is incomplete without slice creation

The epic lifecycle includes `COMPLETE_SLICING` which creates slice definitions. The architecture's transition table shows `defining-slices -> COMPLETE_SLICING -> slices-defined`. But slice creation (CREATE_SLICE) is deferred to slice 04. The goal says "define-slices" and "refine-slices" phase transitions are in scope, but doesn't clarify whether slices are actually created in the epic directory or just that the epic status transitions work.

The `COMPLETE_SLICING` event presumably needs the state machine to record that slicing happened, but the actual `slice:create` command is slice 04. The goal should clarify: does this slice implement the state machine transitions for the slicing phases only (status changes), or does it also implement the mechanism for recording slice names in `epic.json.sliceSequence`?

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [05-sub-agent-commands]`: Quest completion learnings rollup may conflict with slice 06 scope

Slice 05 says "Quest completion appends learnings to quest-level and project-level learnings.jsonl" and slice 06 says "learning:rollup" is in its scope. The architecture shows that learnings at completion time are handled by the state machine (COMPLETE_QUEST event with learnings payload), not by the learning:rollup command. However, the rollup behavior (filtering by `rollupTo` targets and appending to higher-level JSONL files) is the same logic in both cases.

This is architecturally sound (COMPLETE_QUEST handles inline learnings; learning:rollup handles explicit post-hoc rollup), but the goal files should be more explicit about the distinction to prevent confusion during implementation. Slice 05 implements learnings-as-part-of-completion (state machine handles it). Slice 06 implements the standalone rollup command (ROLLUP_LEARNINGS event). Clarify this in both goals.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `sequencing-refining.md`: Slice 06 depends on slice 04 but should also depend on slice 05

The sequencing table shows slice 06 (decisions-learnings) depends on slice 04. However, slice 06's scope includes "full status command" which should report on quests (active quest status, quest artifact counts). Quests are implemented in slice 05. If slice 06's full status command needs to display quest information, it has an implicit dependency on slice 05.

Also, the `learning:rollup` command in slice 06 needs to work for quest-level learnings (rollup from quests/<name> to project), which requires quest entities to exist (slice 05). The dependency should be `05` not `04`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [02-project-init]`: Success criteria references `--query` but architecture says `--query` requires `--json`

Success criterion 5 says: `goodplan status --json --query '.project.name'` — this is correct per the architecture. But the existing tracer bullet code (status.ts line 121) requires `--json` when `--query` is used. The architecture's commands-api.md says `--query` "implies `--json` for the intermediate representation." These are inconsistent — should `--query` auto-imply `--json`, or should the user always pass both? The success criterion is correct either way, but this should be resolved before implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [07-skills-migrate]`: "Copy existing skills" assumes current skill structure matches target

The goal says "Copy the existing workflow skills from `~/.claude/skills/`" but the existing skills were written before the CLI existed — they reference different command patterns (like `/create-plan`, `/implement-plan` slash commands). The scope boundaries say "Out of scope: Modifying skill content to use the new CLI commands" but the success criteria say "Skills reference correct CLI commands — grep for `goodplan` in skill files, verify each command exists in the CLI." These are contradictory — if skills aren't modified, they won't reference `goodplan` commands.

Clarify: is the success criterion about verifying that skills *will need* updating (audit), or that they *have been* updated? If just an audit, reword the success criterion.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [08-integration-test]`: Fitness function for state machine completeness derives count from StateEvent type, not transition tables

Success criterion says "count of transition test cases matches count derived from the `StateEvent` discriminated union." But the architecture's transition-tables.md is the source of truth, and multiple transition rows can exist for a single (status, event) pair (different guards). Counting from the `StateEvent` union gives event type count, not transition row count. The fitness function should verify coverage against transition-tables.md rows, or clarify that it's checking event-type coverage (every event type has at least one test), not row-level coverage.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [06-decisions-learnings]`: Schema command mentioned but not clearly owned

Success criterion 8 says: `goodplan schema --command epic:create --json` — returns the expected stdin schema. The `schema` command is listed as a global command in commands-api.md but is not mentioned in any other slice's scope. Slice 06 should explicitly claim ownership of the `schema` command implementation, or defer it to another slice. Currently it appears in a success criterion without being in the "In scope" list.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [03-epic-lifecycle]`: Skip paths for explore and architecture are mentioned but not in success criteria

The scope boundaries say "Skip paths for explore and architecture (if architecture specifies them) are in scope." The transition tables confirm skip paths exist (e.g., `created -> COMPLETE_EXPLORE -> explored` skipping the exploring phase). But no success criterion tests skip paths. Add at least one success criterion for a skip path to ensure they're verified.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [04-slice-lifecycle]`: `slice:create` takes `--goal` flag but data model stores goal in `slice.json`

The success criterion shows `goodplan slice:create --name 01-auth --epic my-epic --goal "Auth"`. The data model (data-model.md) confirms goals are stored as string fields in entity JSON. But the commands-api.md doesn't list `--goal` as a flag for `slice:create` — it shows `slice:create --epic <name>` without a goal flag. The goal content might be expected via stdin (like epic:create). Clarify the input mechanism.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The slice definitions demonstrate strong architectural thinking — feature-vertical cuts, clear dependency ordering, and alignment with the 4-layer architecture. However, several important gaps would cause implementation friction: slice 04 can't be verified without explaining how plan.md/plan-refined.md appear without sub-agent commands; slice 02's scope is disproportionately large; dependency tracking misses the slice 05->06 link; and a few success criteria contradict their scope boundaries. Addressing these would bring the score to 9+.

## Summary
- Critical: 0
- Important: 6
- Minor: 6
