# Generalist Review — Phase 2 Harness (Iteration 1)

Score: 8/10

---

## Summary

The harness is well-structured and covers the full Phase 2 lifecycle. All major requirements are
met. The issues below are real but mostly at the edges.

---

## Critical (0)

None.

---

## Important (3)

### IMP-1: `phase2SliceCycle` has 10 steps but submit commands are in skill prompts, not harness

The plan requires "submit commands BEFORE skill invocations" (i.e., the harness calls the CLI
transition, then calls the skill). In `phase2SliceCycle` the pattern is correct for CLI transitions
(`slice:plan`, `slice:refine-plan`, `slice:implement`) — those ARE called before the corresponding
skill. However, the _submit_ commands (`submit-plan`, `submit-refinement`,
`submit-implementation`) are embedded in skill prompts as instructions to the skill, not called
upfront by the harness. This is intentional for the happy path, but the fallback blocks are
conditioned on `if (currentStatus === "planning")` etc., meaning if the skill fails and status is
wrong, the fallback fires. The design is sound. But the review criterion says "CLI transition calls
BEFORE skill invocations" — the submit transitions happen _after_ skill invocations by design.
This is a minor conceptual mismatch with the review criteria wording, not a bug, but worth
flagging.

### IMP-2: `phase2Activate` has no pre-condition state check

`phase2Activate` calls `epic:add-verification` and `epic:activate` unconditionally — it does not
check that the epic is in `slices-refined` status first. If the function is called out-of-sequence
(e.g., via `bun harness.ts 2 activate` after a partial run), both CLI calls will fail and the
harness will silently log "FAIL" and continue. The other phase functions all guard with a status
check before making transitions. This function should do the same.

### IMP-3: `slice:list` in `runPhase2` has no `--epic` filter

At line 1094-1096, `runPhase2` calls `slice:list --epic core-provider --json` to enumerate slices
after activation. This is correct. However, `phase2Slices` also calls `slice:list` at line 827-830
with `--epic core-provider --json`. Both are fine. No issue here — disregard (self-corrected on
re-read). But see the separate note under Minor about the `slice:list` call in `phase2Slices`
relying on `data.items` typing without a runtime shape guard.

---

## Minor (4)

### MIN-1: `phase2SliceCycle` step count is 10, but steps 3, 6, 9 are conditional fallbacks

The plan spec says "10 steps with submit commands." The harness has 10 logical operations (steps
1-10 commented in code). Steps 3, 6, and 9 are state-recovery fallbacks, not unconditional steps.
This is correct behavior but could confuse someone expecting 10 unconditional transitions. The
comments (`// Step 3: submit-plan`) make this readable.

### MIN-2: `phase2Explore` state recovery does not re-read status before fallback submit

At line 548, after the skill runs, status is checked once. If it is still `"exploring"`, the
fallback calls `submit-explore`. But there is no second status read after the fallback to confirm
the transition succeeded. All other fallback blocks (architecture, slices) also have this gap.
`phase2Architecture` does read `finalStatus` at line 651, but only logs it — it does not assert.
Inconsistency: `phase2RefineArchitecture` reads `finalStatus` at line 717; `phase2SliceCycle`
reads `finalStatus` at line 1019-1027 and logs friction if not `completed`. `phase2Explore` does
NOT read final status after its fallback (lines 555-566) — it just checks for the research dir.

### MIN-3: `submit-refinement` prompt uses `--override` but `submit-plan` and `submit-implementation` prompts do not

The review criterion "–-override on submit-refinement/submit-refine-architecture/submit-refine-slices"
is fully satisfied in both skill prompts and fallback blocks. No issue there. However,
`submit-implementation` in the skill prompt (line 973) does NOT include `--override`. This is
probably correct (implementation submit may not need override), but if the CLI enforces a score
gate on implementation, this could cause skill failures. Worth confirming against the CLI spec.

### MIN-4: `goodplanJson` throws on failure rather than returning a typed error

`goodplanJson` throws a raw `Error` on non-zero exit codes (line 120-123). Callers like
`epicStatus()` and `sliceStatus()` propagate these throws unhandled all the way up to `main()`'s
catch, which exits with code 1. This is fine for a harness, but a structured result type (or at
least catching in `epicStatus`/`sliceStatus`) would make the error messages more actionable when,
e.g., the epic doesn't exist yet.

---

## Checklist Against Review Criteria

| Criterion | Status |
|---|---|
| All Phase 2 functions have CLI transition calls BEFORE skill invocations | PASS — `epic:explore`, `epic:define-architecture`, `epic:refine-architecture`, `epic:define-slices`, `epic:refine-slices`, `slice:plan`, `slice:refine-plan`, `slice:implement` all called before corresponding skill |
| `phase2SliceCycle` has all 10 steps with submit commands | PASS — Steps 1-10 present; submits in skill prompts + fallback blocks |
| State recovery checks after each skill | PASS — All skill invocations followed by status check and conditional fallback |
| Exit code branching used consistently | PASS — `describeExitCode()` used in all `logCliResult` / error paths; exit 2/3 semantics documented |
| `--json` flag on all CLI calls | PASS — All `goodplan()` and `goodplanJson()` calls include `--json` |
| `--epic` filter on `slice:list` | PASS — Line 829 and 1096 both use `--epic core-provider` |
| `--override` on submit-refinement/submit-refine-architecture/submit-refine-slices | PASS — Skill prompts (lines 683, 796, 925) and fallback blocks (lines 700, 809, 941) all include `--override` |
