# Tracer Bullet Quality Review — Round 2

## Round 1 CRITICALs — Status Check

**C1 (Slice 03: epic phase completions unexecutable without submit-*):** RESOLVED. Slice 03 now includes `submit-plan`, `submit-refinement`, and `submit-implementation` in scope. The verification section (step 3) explicitly uses skip paths (COMPLETE_EXPLORE, COMPLETE_ARCHITECTURE, etc.) via direct `reduce()` calls exercised through unit tests and a CLI test harness. The phase chain is walked through the state machine directly for the epic-phase events; submit-explore/submit-architecture/submit-slices remain in slice 05. This is an acceptable hybrid — phase transitions are verifiable via unit tests + skip path CLI harness; the submit-* commands for slice 05 verify the LLM workflow path.

**C2 (Slice 05: only 2 of 8+ start-*/submit-* pairs exercised):** RESOLVED. Verification now includes: start-plan, start-explore/submit-explore, start-architecture/submit-architecture, start-refinement/submit-refinement, start-implementation/submit-implementation, and the quest lifecycle. All epic-phase pairs are addressed.

**C3 (Slice 04: plan.md/plan-refined.md can't appear without submit-*):** RESOLVED. Slice 04 verification (step 3) now uses `submit-plan --slice 01-auth` from slice 03, and the full lifecycle walkthrough explicitly names the commands. The verification is now executable.

All three CRITICALs are resolved. Score rises from 5/10 baseline.

---

## Issues

**[IMPORTANT]** `goal-refining.md [03-epic-lifecycle]`: Verification step 3 is executable for skip paths via unit tests, but there is a gap between unit-test-only phase validation and end-to-end CLI verification.

The verification says: "Walk through phase chain using skip paths from the transition tables (state machine handles all COMPLETE_* events in this slice — the CLI submit-* commands for epic phases come in slice 05). Use skip paths: from created, trigger COMPLETE_EXPLORE (skip) → explored…. Verify via unit tests calling `reduce()` directly, and via a test helper or CLI test harness that triggers events."

The "CLI test harness that triggers events" is mentioned but not defined. There is no specified CLI command for triggering COMPLETE_EXPLORE skip from the `created` state. A developer implementing this slice needs to know: is this a hidden/internal CLI flag, a test-only helper, or a direct call to the RPC layer in test code? The unit test path is clear, but "CLI test harness" is ambiguous — it could mean anything.

More importantly: slice 03 success criteria item "Full phase chain: explore → architecture → refine-architecture → slicing → refine-slices, each command advancing status" implies a CLI command advances each step. But the Scope Boundaries explicitly say "submit-explore/submit-architecture/submit-slices/submit-refine-architecture/submit-refine-slices CLI commands (slice 05)". The success criterion as written cannot be fully satisfied via CLI in slice 03 — only the unit test path works. This creates a disconnect between success criteria and what can actually be verified at the CLI layer.

Resolution: DIRECTLY_ACTIONABLE — Reword the phase chain success criterion to "all phase transition events exercised via unit tests calling `reduce()` directly; CLI path tested end-to-end via `epic:explore/epic:define-architecture/epic:define-slices/epic:refine-*` commands (which trigger BEGIN_* events) plus skip-path direct reduce() calls for COMPLETE_* events." Remove ambiguity about "CLI test harness" — specify either (a) test-only RPC calls in the integration test harness, or (b) explicit CLI commands for each transition.

**[IMPORTANT]** `goal-refining.md [03-epic-lifecycle]`: Verification step 3 references triggering skip-path events but the `epic:explore` command (BEGIN_EXPLORE event) and the skip-path COMPLETE_EXPLORE event are different. The verification conflates the BEGIN_* commands (which are in scope) with the COMPLETE_* skip paths (which require direct `reduce()` calls). A developer reading step 3 needs to know which transitions are triggered via CLI commands (`epic:explore` → BEGIN_EXPLORE) and which via unit tests (`reduce(createdEpic, COMPLETE_EXPLORE)` → skip path). Without this distinction, the verification step cannot be literally executed.

Resolution: DIRECTLY_ACTIONABLE — Split step 3 into (a) CLI commands for BEGIN_* transitions: `goodplan epic:explore --epic my-epic` (BEGIN_EXPLORE), and (b) unit tests for skip paths: `reduce(epicWithStatus("created"), { type: "COMPLETE_EXPLORE" })`. Specify both paths explicitly.

**[IMPORTANT]** `goal-refining.md [04-slice-lifecycle]`: Verification step 3 walks the full lifecycle but does not show the `slice:implement` command triggering BEGIN_IMPLEMENTATION. The step says "manually write plan-refined.md, `slice:implement --slice 01-auth`" — this is good. However, the plan→refine→implement path in the Behavior section says "Plan → refine → implement lifecycle: plan-created → refining → plan-refined → implementing" — the `slice:plan` command triggers BEGIN_PLAN but the path from `plan-created` to `refining` requires `BEGIN_REFINEMENT`. Verification step 3 says "begin refinement" without specifying the command. What CLI command triggers BEGIN_REFINEMENT? The success criteria say "Plan → refine → implement → complete lifecycle succeeds" but no command is listed for starting refinement.

Resolution: DIRECTLY_ACTIONABLE — Add the explicit command for beginning refinement to verification step 3. Based on the architecture patterns, this is likely `goodplan slice:refine --slice 01-auth` or `goodplan slice:begin-refinement --slice 01-auth`. Confirm the command name and add it to the verification walkthrough and success criteria.

**[IMPORTANT]** `goal-refining.md [04-slice-lifecycle]`: The `slice:complete` command is called with stdin JSON containing `verificationPassed`, `deferred`, `learnings`, `architectureDelta` fields — but Verification step 3 shows the full `echo '{"verificationPassed":true,...}' | goodplan slice:complete --slice 01-auth --json` command. This is good. However, step 6 says "Complete 01-auth, then plan 02-api — succeeds" without the stdin JSON. Since `slice:complete` requires the stdin payload, step 6 is not literally executable as written.

Resolution: DIRECTLY_ACTIONABLE — Step 6 should either show the full stdin JSON command or reference step 3's command form.

**[MINOR]** `goal-refining.md [03-epic-lifecycle]`: The scope says "Epic phase commands (explore, define-architecture, refine-architecture, define-slices, refine-slices)" but the Behavior section's step 4 says "Phase transitions: explore → define-architecture → refine-architecture → define-slices → refine-slices → ready for activation." The activation guard requires `slices-refined` status (per transition-tables.md: `slices-refined → ACTIVATE_EPIC → activated`). The Behavior section implies "ready for activation" follows refine-slices, which is correct. But the success criteria don't include a criterion for `epic:activate` succeeding after the full phase chain — they only test activation failure (STATE_MISSING_VERIFICATIONS) and success with criteria. This is technically covered but the path from "created → slices-refined → activate" isn't tested as a complete sequence in the success criteria.

Resolution: DIRECTLY_ACTIONABLE — Add a success criterion explicitly testing the complete phase chain end-to-end (created → slices-refined) followed by activation.

**[MINOR]** `goal-refining.md [05-sub-agent-commands]`: Verification step 7 says "Walk through slice plan: write plan.md, `submit-plan --slice 01-auth` (from slice 03), `start-refinement`, `submit-refinement` with scores." But `start-refinement` appears without the `--slice` flag and `--inline` option, and no expected output is specified. Given that this is the context bundling slice, the verification should show what a well-formed `start-refinement` call looks like and what fields are expected in the output (at minimum: `inline` and `references` keys).

Resolution: DIRECTLY_ACTIONABLE — Show the full command: `goodplan start-refinement --slice 01-auth --inline --json` and note the expected response shape (ContextBundle with `inline` map and `references` array).

**[MINOR]** `goal-refining.md [08-integration-test]`: Verification step 5 says "Verify fitness function derives expected transition count from `Transition[]` runtime data structures (not by parsing markdown). Verify the const event type array is compile-time validated against the `StateEvent` discriminated union." This is improved from round 1 (C11 — the mechanism is now specified) but the verification step doesn't specify what "expected count" means — expected from where? If the const array is the truth source, its count *is* the expected count, making the verification circular. The real check is that the const array is exhaustive (compile-time) and every entry in it has a test case. Restate as: "every element of the compile-time-validated `EVENT_TYPES` const array has at least one corresponding test in the state machine completeness suite."

Resolution: DIRECTLY_ACTIONABLE — Reword the verification step to clarify the check is exhaustiveness coverage (every event type in `EVENT_TYPES` has a test), not a count match.

**[MINOR]** `sequencing-refining.md`: The open item about `--query` auto-implying `--json` is noted as "Resolve this inconsistency before slice 06 implementation (update commands-api.md and tracer bullet code to be consistent)." This is a good call-out, but it is an action item embedded in a sequencing rationale note rather than a tracked success criterion or verification step. If it's forgotten, slice 06 will be implemented inconsistently with the tracer bullet.

Resolution: DIRECTLY_ACTIONABLE — Add to slice 06's success criteria: "Verify `--query` flag behavior is consistent with commands-api.md (either auto-implies `--json` or requires explicit `--json` — documented and implemented consistently)."

---

## Score: 8/10

Round 1's three CRITICALs are fully resolved: submit-plan/refinement/implementation are in slice 03, epic phase verification uses explicit skip paths via unit tests, and slice 04's plan.md/plan-refined.md paths are now traceable to concrete CLI commands. All former I-issues from round 1 (command syntax, learnings distinction, decisions in context bundling, schema command, fitness function mechanism) are addressed in the current files.

What keeps this from 9+: the two IMPORTANT issues in slice 03 and 04 leave verification steps that are still ambiguous enough that a developer couldn't execute them literally — specifically the BEGIN_* vs. COMPLETE_* split for epic phase chain verification and the missing command for triggering BEGIN_REFINEMENT in slice 04. Fixing those two brings it to 9/10.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
