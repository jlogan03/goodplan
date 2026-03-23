# Architecture Alignment Review — Round 2

## Context

Round 1 score: 7/10. Four IMPORTANT issues were flagged: stdin JSON syntax in creation commands (I4), learnings-at-completion vs rollup clarity (I5), context bundling decisions/learnings inclusion (I6), schema command scope (I7). All four were addressed in the refining pass. This round verifies the fixes hold and checks for any new alignment gaps introduced by the submit-* redistribution and slice 02 scope reduction.

## Issues

**[IMPORTANT]** `goal-refining.md [03-epic-lifecycle]`: Submit-* redistribution introduces a scope boundary inconsistency — epic-phase submit-* omitted from scope list but present in behavior and verification

The goal's "What We're Building" paragraph and Behavior section (items 10-12) correctly describe `submit-plan`, `submit-refinement`, and `submit-implementation` as thin wrappers added here. The Scope Boundaries "In scope" section also mentions them. However the "Out of scope" section states: "submit-explore/submit-architecture/submit-slices/submit-refine-architecture/submit-refine-slices CLI commands (slice 05 — though the state machine handlers for their events are implemented here)." This is architecturally sound but creates a concrete gap: verification step 3 says to walk the full phase chain (explore → architecture → slicing) using "skip paths" — but the skip paths are triggered via direct `reduce()` calls or unit test harnesses, not CLI commands, while the normal paths remain untestable at the CLI level until slice 05. The verification steps do not make clear how to distinguish skip-path testing (unit test `reduce()` directly) from the claimed CLI-level verification. An implementer reading this could be confused about which CLI commands are available to exercise the phase chain end-to-end.

The architecture's command table (commands-api.md) shows `submit-explore` → `COMPLETE_EXPLORE` and `epic:explore` → `BEGIN_EXPLORE`. Without `submit-explore` in slice 03, the full CLI-level cycle `epic:explore → submit-explore` is not exercisable here, only the begin half. The slice is internally consistent — it says to use unit tests for phase completions — but verification step 3 doesn't say this clearly enough. It says "Use skip paths" and "verify via unit tests calling `reduce()` directly" but then doesn't show concretely which parts are CLI-tested vs. unit-tested.

Resolution: DIRECTLY_ACTIONABLE

Fix: In the Verification section step 3, split the testing into two explicit tracks: (a) CLI track — `epic:explore`, `epic:define-architecture`, `epic:refine-architecture`, `epic:define-slices`, `epic:refine-slices` begin commands can be tested via CLI, showing concrete commands with expected output; (b) Unit test track — the COMPLETE_* events are exercised by calling `reduce()` directly in unit tests (not via CLI, because submit-explore etc. are slice 05). Make step 3 show both tracks explicitly. Also confirm that the success criterion "Full phase chain: explore → architecture → refine-architecture → slicing → refine-slices, each command advancing status" is achievable using only the begin commands in the CLI track — which it is, since BEGIN_* commands advance status to the *ing states, not the *-defined states. But this means the full chain can only be verified end-to-end (begin + complete each phase) at the unit test level in this slice, not the CLI level. Clarify this in success criteria so the implementer knows what "each command advancing status" means in context.

---

**[IMPORTANT]** `goal-refining.md [03-epic-lifecycle]`: `epic:complete` command is not claimed in any slice and is absent from slice 03's scope

The commands-api.md defines `epic:complete --epic <name>` which triggers `COMPLETE_EPIC`. The transition tables show this requires `verificationResults` stdin JSON and guards that all verificationResults have passed. Slice 03 covers all other epic transitions including `epic:activate` and `epic:abandon`. Slice 04 mentions the implicit `epicComplete: true` detection but that is a response flag from `COMPLETE_SLICE`, not the `epic:complete` command. Slice 06 "Out of scope" says "Epic completion command (handled within epic lifecycle transitions in slice 03)" — so slice 06 explicitly delegates it to 03.

But slice 03's Scope Boundaries "In scope" section does not list `epic:complete`. Behavior section items 1-14 do not mention it. Success criteria do not include it. Verification does not test it. The `COMPLETE_EPIC` state machine event is one of the ~20 epic transition rows that slice 03 claims to implement ("All epic-related state machine transition rows (including COMPLETE_EXPLORE, COMPLETE_ARCHITECTURE, etc. in the reducer)"). If the state machine handler is in slice 03 but the CLI command is nowhere, then the CLI command for `epic:complete` is ungated.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add `epic:complete` explicitly to slice 03's "In scope" list, add a behavior item (e.g., "15. `echo '{"verificationResults":[...]}' | goodplan epic:complete --epic my-epic` triggers COMPLETE_EPIC..."), and add a success criterion + verification step. The stdin schema is already in commands-api.md. This is a thin wrapper following the same pattern as `epic:activate`.

---

**[MINOR]** `goal-refining.md [03-epic-lifecycle]`: Verification step 3 references `COMPLETE_SLICING` event but architecture uses `COMPLETE_SLICING` → `slices-defined` (not `slices-refined`) — the refine-slices phase is omitted from the skip-path chain description

Verification step 3 lists the skip-path chain ending at "COMPLETE_REFINE_SLICES (skip) → slices-refined." This is correct and complete per the transition tables. However, it omits `BEGIN_SLICING → defining-slices` as a necessary step between `architecture-refined` and `COMPLETE_SLICING`. The transition tables show: `architecture-refined → BEGIN_SLICING → defining-slices → COMPLETE_SLICING → slices-defined → BEGIN_REFINE_SLICES → refining-slices → COMPLETE_REFINE_SLICES → slices-refined`. The verification step shows "architecture-defined → COMPLETE_REFINE_ARCHITECTURE (skip) → architecture-refined. From architecture-refined, BEGIN_SLICING → defining-slices, then COMPLETE_SLICING → slices-defined. From slices-defined, COMPLETE_REFINE_SLICES (skip) → slices-refined" — this is actually correct in step 3, but is missing the intermediate `BEGIN_REFINE_SLICES → refining-slices` step before COMPLETE_REFINE_SLICES. Per the transition tables, `COMPLETE_REFINE_SLICES` applies to both `slices-defined` (skip path) and `refining-slices` (normal or forced path). The skip path directly from `slices-defined` is valid. The description is technically correct for the skip path but an implementer may not realize `BEGIN_REFINE_SLICES` also exists and must be implemented.

Resolution: DIRECTLY_ACTIONABLE

Fix: In verification step 3, add a parenthetical noting that `BEGIN_REFINE_SLICES → refining-slices` also needs a CLI command (`epic:refine-slices`) that's listed in the "In scope" section. The skip path is valid but the `epic:refine-slices` command must exist. This is more of a documentation clarity issue than an architectural gap.

---

**[MINOR]** `goal-refining.md [05-sub-agent-commands]`: Quest lifecycle uses `quest:complete` but the command is not in scope and `COMPLETE_QUEST` differs from `COMPLETE_SLICE` in that quests have no deferred items — the completion stdin JSON is not shown

Slice 05 adds the full quest lifecycle. Success criteria include "Full quest lifecycle: create → plan → refine → implement → complete — all transitions work" and "Quest completion appends learnings." Verification step 9 says "Walk through its lifecycle." But no verification step shows the concrete stdin JSON for `quest:complete`. The commands-api.md shows quest:complete takes the same shape as slice:complete but without `deferred`. The rpc-layer-api.md CompleteInput discriminated union defines `type: 'quest'` payload (verificationPassed, learnings, architectureDelta, no deferred). This is a thin but real detail — slice 04 verification was upgraded in round 1 (I9) to show the concrete stdin for `slice:complete`, but the equivalent for `quest:complete` in slice 05 was not added.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a verification step with the concrete stdin JSON for `quest:complete`, e.g.: `echo '{"verificationPassed":true,"learnings":[{"category":"worked","summary":"Test","detail":"...","tags":[],"rollupTo":["project"]}],"architectureDelta":[]}' | goodplan quest:complete --quest fix-logging --json`. This parallels the concrete stdin added for slice:complete in slice 04's verification.

---

**[MINOR]** `goal-refining.md [02-project-init]`: "Reconcile conventions.md" is now a success criterion but verification section does not test it

Success criterion: "update `.project/conventions.md` to reflect the actual `src/` directory structure after this slice" (in scope boundaries). There is no verification step that confirms conventions.md was updated. This is a minor gap — it's a documentation task, not a behavioral test — but the verification section should at least have a step noting "Update `.project/conventions.md` to reflect the src/ directory structure built in this slice."

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a verification step: "Update `.project/conventions.md` to reflect the src/ directory structure (subsystems, file layout) established in this slice. No automated test — completed as part of the slice." This is purely a reminder step, not a test.

---

**[MINOR]** `sequencing-refining.md`: The note about `--query` auto-implying `--json` lists it as an "Open item" but slice 06 (where the full `--query` is implemented) doesn't explicitly address this in its goal

The sequencing rationale states: "Open item: `--query` auto-implying `--json` — commands-api.md says `--query` implies `--json` for the intermediate representation, but the tracer bullet requires both flags. Resolve this inconsistency before slice 06 implementation."

Slice 06's goal includes "full `--query` support" and its scope boundaries say "Full --query on all JSON-outputting commands." But slice 06's success criteria and verification don't have a step that explicitly tests `--query` without `--json` (relying on the auto-implication), nor a step confirming the tracer bullet code was updated for consistency. If the implementer forgets this open item, the inconsistency persists.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add one success criterion to slice 06: "Resolve `--query`/`--json` consistency: `goodplan status --query '.project.name'` (without `--json`) returns `"test-project"` — `--query` auto-implies `--json` for the intermediate representation." Also update (or remove) the "Open item" note in sequencing-refining.md when this is resolved.

---

## Score: 9/10

All four IMPORTANT issues from round 1 have been addressed. The submit-* redistribution is architecturally sound and the sequencing rationale explains the tradeoff clearly. Slice 02 scope is reduced with a clear boundary. The main remaining gap is `epic:complete` being unassigned (IMPORTANT) and the verification ambiguity in slice 03 about which phases are CLI-testable vs. unit-test-only. Two MINOR issues concern concrete stdin examples and open-item tracking. The fixes are all small and directly actionable.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
