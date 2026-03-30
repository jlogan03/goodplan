# Architecture Alignment Review

## Issues

**[IMPORTANT]** `sequencing-refining.md`: Slice 04 goal mentions `slice:create --goal` flag but architecture puts goals in `slice.json` via stdin JSON, not flags

The slice 04 goal says `goodplan slice:create --name 01-data-layer --epic my-epic --goal "..."` using `--goal` as a flag. However, the commands-api.md pattern for entity creation uses stdin JSON (see the `epic:create`, `quest:create`, and `decision:create` stdin examples). The `slice:create` command definition in commands-api.md shows `goodplan slice:create --epic <name>` with no `--goal` flag. The goal should come via stdin like other creation commands. Slice 03 has the same issue with `epic:create --name my-epic --goal "Build X"` when the architecture shows `epic:create` takes `{ "name": "...", "goal": "..." }` via stdin.

Resolution: DIRECTLY_ACTIONABLE

Fix: In goal-refining.md for slices 03 and 04, change creation command examples to use stdin JSON for name+goal payload, matching the commands-api.md pattern. Keep `--epic` as a flag for slice:create since it's a target flag.

---

**[IMPORTANT]** `goal-refining.md [04-slice-lifecycle]`: Slice 04 scope includes learnings append at completion but excludes learnings rollup

Slice 04 says it handles "learnings append at completion" (the `COMPLETE_SLICE` event writes to `slices/<name>/learnings.jsonl` and optionally to project-level `learnings.jsonl`). This is correct per the transition tables -- `COMPLETE_SLICE` writes to both `slices/<name>/learnings.jsonl` and `learnings.jsonl`. However, the sequencing document says "learnings rollup command" is in slice 06. There's a distinction: the *automatic* learnings persistence during `COMPLETE_SLICE` (which checks `rollupTo` and writes to appropriate files) is part of the state machine, while the *explicit* `learning:rollup` command is a separate cross-cutting feature. This distinction is clear in the architecture but should be made explicit in the slice 04 goal to avoid confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

Fix: In slice 04's goal, clarify that "learnings append at completion" means the state machine's `COMPLETE_SLICE` apply function handles `rollupTo`-based writes to parent-scope learnings.jsonl files. The separate `learning:rollup` command (manual rollup) remains in slice 06.

---

**[IMPORTANT]** `goal-refining.md [05-sub-agent-commands]`: Context bundling depends on decisions and learnings data, but those commands are in slice 06

Slice 05 implements context bundling with per-phase priority tables. The architecture's priority tables (rpc-layer-api.md) include "active decisions" and "recent learnings" in nearly every phase's priority list (plan, refinement, implementation, etc.). However, `decision:create` and `learning:rollup` are slice 06 features. The context module needs to read existing decisions and learnings from the state tree -- which works fine since they're just JSONL entries that `assembleState` loads. But slice 05's verification steps don't account for populating decisions/learnings to test that context bundling actually includes them. The ContextBundle type includes `decisions: DecisionSummary[]` and `learnings: LearningSummary[]`.

Resolution: DIRECTLY_ACTIONABLE

Fix: In slice 05's verification, add a step that manually creates decisions.jsonl and learnings.jsonl entries (via direct file write or through slice 04's completion flow) before testing context bundling, to verify the context module correctly reads and prioritizes these JSONL records. Also note in scope boundaries that context bundling reads decisions/learnings from state tree (populated by assembleState from existing JSONL files) even though the decision/learning *commands* are slice 06.

---

**[IMPORTANT]** `goal-refining.md [06-decisions-learnings]`: Schema command scope unclear -- belongs here or earlier?

Slice 06 includes `goodplan schema --command epic:create --json` in its success criteria. The `schema` global command is a cross-cutting capability described in conventions.md as supporting "self-discovery" for LLM orchestrators. It's architecturally independent -- it reads citty command definitions, not state. The architecture's INV-006 says schema output must reflect actual command signatures. Since commands are added in slices 02-05, the schema command becomes useful (and testable for completeness) only after most commands exist. Placing it in slice 06 is reasonable but not explicit in the goal description or scope boundaries.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add `schema` command explicitly to slice 06's scope boundaries (in scope section) and note that it exercises INV-006. The goal already has it in success criteria but the scope boundaries section should call it out.

---

**[MINOR]** `goal-refining.md [02-project-init]`: Scope includes "reconcile .project/conventions.md repo structure with actual code" -- vague relative to architecture

The scope mentions reconciling `.project/conventions.md` but doesn't specify what this entails architecturally. The conventions.md file describes repo structure, tech stack, and coding style. "Reconcile" could mean updating it to match the new src/ directory structure from the tracer bullet, or ensuring the data model's directory structure matches what conventions.md describes. This is a documentation task bundled into an infrastructure slice.

Resolution: DIRECTLY_ACTIONABLE

Fix: Clarify what "reconcile" means -- likely updating `.project/conventions.md` to reflect the actual `src/` directory structure that exists after the tracer bullet. This is a minor documentation update, not architectural work. Make it a bullet in success criteria rather than a scope item.

---

**[MINOR]** `goal-refining.md [03-epic-lifecycle]`: Epic phase transitions include skip paths but the slice doesn't mention `submit-explore` / `submit-architecture` / `submit-slices`

The transition tables show that `COMPLETE_EXPLORE`, `COMPLETE_ARCHITECTURE`, and `COMPLETE_SLICING` are triggered by `submit-explore`, `submit-architecture`, and `submit-slices` respectively. Slice 03 says it handles all epic status transitions but puts `submit-*` commands in slice 05. The skip paths (`created -> COMPLETE_EXPLORE -> explored`) don't need submit commands, but the normal paths (`exploring -> COMPLETE_EXPLORE -> explored`) do. Slice 03 needs a way to trigger these completion events.

The architecture's command-to-RPC routing table shows these events are triggered via `submit(phase, ...)` which is slice 05's territory. Slice 03 needs to either: (a) handle the submit commands for epic phases, or (b) test only through direct state machine unit tests + the begin commands, deferring the full CLI path to slice 05.

Resolution: DIRECTLY_ACTIONABLE

Fix: In slice 03's scope boundaries, explicitly state how epic phase completions are triggered during testing. Option: slice 03 implements the epic phase `submit-*` commands (submit-explore, submit-architecture, submit-slices, submit-refine-architecture, submit-refine-slices) as thin wrappers, since they're needed to exercise the epic lifecycle end-to-end. Alternatively, note that verification uses direct state machine calls for phase completions and the full CLI `submit-*` path is verified in slice 05.

---

**[MINOR]** `sequencing-refining.md`: Slice 06 dependency listed as "04" but description says "depends on entity lifecycles being in place"

The rationale says "depends on entity lifecycles being in place for learnings rollup and comprehensive status." Learnings rollup needs slices (04) and quests (05) to have learnings to roll up. The full status command counts artifacts across all entity types including quests (05). The listed dependency is 04, but there's an implicit dependency on 05 for quest-related status artifacts and quest-level learnings.

Resolution: DIRECTLY_ACTIONABLE

Fix: Update dependency to "04, 05" or explicitly note that slice 06 can implement decision commands and basic status without quest data, but full status verification requires quest infrastructure from slice 05.

---

**[MINOR]** `goal-refining.md [08-integration-test]`: Fitness function "count derived from StateEvent union" depends on TypeScript type system at test time

The success criteria says "count of transition test cases matches count derived from the `StateEvent` discriminated union." Deriving a count from a TypeScript discriminated union at runtime isn't straightforward -- unions are erased at compile time. The architecture mentions this as a fitness function but doesn't specify the derivation mechanism. The existing codebase has no reflection infrastructure for this.

Resolution: DIRECTLY_ACTIONABLE

Fix: Clarify the derivation mechanism. The transition tables are the source of truth. The test should enumerate all `(from, event.type)` rows from the transition table data structure (which exists at runtime as the `Transition[]` arrays) and verify test coverage. This avoids TypeScript type reflection.

## Score: 7/10

The slices map well to the 4-layer architecture -- each slice has a clear "home" subsystem with limited boundary crossings. Dependency ordering follows the architecture's unidirectional dependency graph (data layer + state machine first, then RPC, then commands). However, there are several places where slice goals use command syntax inconsistent with the architecture's stdin JSON pattern, and the epic lifecycle slice (03) has a gap in how phase completion events are triggered without the submit commands that arrive in slice 05. Fixing the IMPORTANT issues above would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
