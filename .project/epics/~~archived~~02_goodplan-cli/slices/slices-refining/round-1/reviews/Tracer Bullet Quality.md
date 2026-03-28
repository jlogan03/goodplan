# Tracer Bullet Quality Review

## Issues

**[CRITICAL]** `goal-refining.md [03-epic-lifecycle]`: Verification steps lack concrete input/output for phase transitions

The verification section says "Walk through phase chain: explore, architecture, refine-architecture (with scores via stdin), slicing, refine-slices" but does not specify: (a) what exact commands to run for each step (the commands-api.md shows these are separate commands like `epic:explore`, `epic:define-architecture`, etc.), (b) what stdin JSON is needed for `submit-explore`, `submit-architecture`, `submit-slices`, or (c) how to simulate the "scores via stdin" for refinement rounds. An implementer cannot literally execute these steps without consulting the architecture docs separately.

Additionally, the slice references `submit-explore`, `submit-architecture`, and `submit-slices` commands (from commands-api.md), but the epic lifecycle slice (03) does not mention start-*/submit-* commands at all — those are deferred to slice 05. This means there is no way to complete the explore/architecture/slicing phases end-to-end in slice 03, since the state machine requires content to exist (e.g., `COMPLETE_EXPLORE` requires exploration artifacts). The verification steps are unexecutable as written because the submit-* mechanism does not exist yet.

Either: (1) include minimal submit-* commands in slice 03 for the epic phases (explore, architecture, slicing), or (2) add skip-path commands that bypass content requirements, or (3) explicitly state that verification uses direct state machine `reduce()` calls or manual file creation to simulate content, and show those steps concretely.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** `goal-refining.md [05-sub-agent-commands]`: 8 start-*/submit-* pairs claimed but only 3 tested in verification

The Behavior section lists "All start-*/submit-* pairs: start-explore, submit-explore, start-architecture, submit-architecture, start-slices, submit-slices, start-refinement, submit-refinement, and the refine-architecture/refine-slices variants." The Success Criteria mention "All 8 start-*/submit-* pairs work for their respective phases." But the Verification section only tests start-plan/submit-plan and start-refinement/submit-refinement. The 6 epic-phase start-*/submit-* pairs (explore, architecture, slices, refine-architecture, refine-slices, and implementation) have no verification steps. This is a large amount of unexercised code.

Add verification steps that exercise at least one epic-phase pair end-to-end (e.g., start-explore + submit-explore) and one implementation pair (start-implementation + submit-implementation), with concrete expected outputs.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** `goal-refining.md [03-epic-lifecycle]`: Epic phase transitions depend on submit-* commands scoped to slice 05

The transition tables show that `COMPLETE_EXPLORE`, `COMPLETE_ARCHITECTURE`, `COMPLETE_SLICING`, etc. are triggered by `submit-explore`, `submit-architecture`, `submit-slices` commands. These submit-* commands are scoped to slice 05 (sub-agent commands). But slice 03 needs to exercise the full phase chain (explore -> architecture -> slicing -> activate). Without submit-* commands, slice 03 cannot trigger COMPLETE_* events through the CLI.

The skip paths in the transition tables (e.g., `created -> COMPLETE_EXPLORE -> explored`) allow bypassing the "begin" step, but these still require triggering state events. The Scope Boundaries say "Skip paths for explore and architecture (if architecture specifies them) are in scope" — but does not explain how these are exposed as CLI commands.

Clarify: will slice 03 implement the submit-* commands for epic phases directly (contradicting slice 05 scope), or will it expose skip-path commands (e.g., `epic:skip-explore`), or will epic phase commands themselves trigger both BEGIN and COMPLETE events? This architectural question must be resolved for the slice to be implementable.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [02-project-init]`: Success criteria include `.state-cache.json` verification but verification section omits it

Success Criteria items 7-8 describe cache behavior (cache creation, deletion fallback). The Verification section (steps 1-6) does not include any cache-specific checks. An implementer following only the Verification section would skip cache testing. Add a verification step: "Delete .state-cache.json, run `goodplan status --json` — verify it works (full reassembly). Check that .state-cache.json is recreated."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [04-slice-lifecycle]`: Verification step 3 requires writing deferred items but doesn't show the stdin JSON

Step 3 says "complete (with deferred item targeting 02-api)" and step 4 says "Verify deferred item appears in 02-api's slice.json." The verification doesn't show the actual stdin JSON needed for `slice:complete`. The commands-api.md shows this requires a specific JSON shape with `verificationPassed`, `deferred`, `learnings`, and `architectureDelta` fields. Without showing the concrete stdin, an implementer would need to cross-reference the architecture docs. Include the exact command with stdin pipe, e.g.: `echo '{"verificationPassed":true,"deferred":[{"description":"...","targetSlice":"02-api"}],"learnings":[],"architectureDelta":[]}' | goodplan slice:complete --slice 01-auth --json`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [06-decisions-learnings]`: `schema` command included but unrelated to decisions/learnings domain

The Success Criteria include "`goodplan schema --command epic:create --json` — returns the expected stdin schema for the command." The `schema` command is a global introspection feature unrelated to decisions, learnings, or status. Including it in this slice dilutes the slice's focus. The `schema` command could be its own small slice or bundled with slice 02 (where the schema registry is built). If it stays here, its scope boundary should be called out explicitly and verification should be more thorough (test multiple commands, test `--query` on schema output).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [07-skills-migrate]`: No end-to-end verification — skills are copied but never used

The verification checks that files are copied and commands are grep-matched, but never actually runs a skill through the CLI. This slice produces code (skill files) that isn't exercised end-to-end. After copying skills and verifying command references, there should be a step that demonstrates a skill can actually invoke the CLI commands it references — even a simple dry-run showing the skill references resolve to real commands.

However, since skills are markdown prompts consumed by Claude Code (not executable scripts), the "grep for command references" approach may be the most practical verification. If so, the verification section should explicitly state why end-to-end exercise isn't possible and why grep-based command auditing is sufficient.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [08-integration-test]`: Fitness function for "state machine completeness" relies on TypeScript type system introspection

Success Criteria item says "Fitness: count of transition test cases matches count derived from the StateEvent discriminated union." The verification step says "Verify fitness function derives expected transition count from StateEvent type, not by parsing markdown." Deriving a count from a TypeScript discriminated union at runtime requires either: (a) a code generation step that emits the union members, (b) reflection via TypeScript compiler API, or (c) a manually maintained registry. None of these approaches are specified. This is a non-trivial implementation detail that could consume significant time.

Specify the concrete mechanism: will this use `ts-morph` to analyze the AST, a const array that TypeScript validates exhaustively, or some other approach? A const array of event types validated against the discriminated union (TypeScript ensures exhaustiveness at compile time) is the simplest approach for a Bun/TypeScript stack.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `sequencing-refining.md`: Slice 08 dependency listed as "06" but should be "06, 05"

The integration test slice says it depends on slice 06 and tests "Full quest lifecycle integration test passes alongside an active epic." Quest lifecycle is implemented in slice 05. The sequencing table lists dependency as just "06" but 05 is an implicit dependency. Make this explicit.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [02-project-init]`: Scope includes "all Zod entity schemas" but most aren't exercised until later slices

The scope says "all Zod entity schemas (project, epic, slice, quest, overview, activity-log entry, decision entry, learning entry, architecture-delta entry)" are in scope. But only project and overview schemas are actually exercised by the init/status commands in this slice. The remaining schemas (epic, slice, quest, decision, learning, architecture-delta) are defined but not used until slices 03-06. This is technically "unexercised code" — schemas that exist but aren't validated through an end-to-end path.

The success criteria do include "All entity schemas validate correctly — test with valid and invalid fixtures" which provides unit-level coverage. This mitigates the concern but doesn't eliminate it — unit tests on schemas aren't the same as end-to-end exercise. Consider noting this as an accepted trade-off: schemas are defined early for type inference benefits across the codebase, exercised via unit tests, and fully validated end-to-end in their respective slices.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [04-slice-lifecycle]`: "Implicit transition detection: completing last slice flags epicComplete in response" — verification doesn't test this

The Behavior section mentions `epicComplete: true` detection when all slices are completed. The Success Criteria include "Complete all slices in epic — response includes epicComplete: true." But the Verification section (steps 1-8) only walks through a two-slice lifecycle and never completes both slices to trigger the implicit transition. Add a step: "Complete 02-api through its lifecycle. Verify the final slice:complete response includes epicComplete: true."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [05-sub-agent-commands]`: Budget test uses `--inline=500` but architecture says boolean or number with default ~20KB

Step 6 of verification says "start-plan --inline=500 --json" — a 500-byte budget. This tests truncation but not the default budget. Add a step that verifies the default budget: run `start-plan --inline --json` and verify total inlined content size is under the default (~20KB). This ensures the default path is also exercised.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The slices have good structural organization and clear scope boundaries, but multiple slices have verification sections that cannot be literally executed as written. The biggest gap is the circular dependency between slice 03 (epic lifecycle) and slice 05 (submit-* commands) — slice 03 needs to trigger phase completion events but the mechanism to do so (submit-* commands) is deferred to slice 05. This makes slice 03's verification steps unexecutable. Several other slices have verification sections that skip important paths or lack concrete input/output specifications. To reach 9+: resolve the slice 03/05 dependency, make all verification steps literally executable with concrete commands and expected outputs, and ensure every code path produced by a slice is exercised in that slice's verification.

## Summary
- Critical: 3
- Important: 6
- Minor: 3
