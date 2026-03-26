# Tracer Bullet Quality Review (Round 2)

## Summary

Round 1 scored 6/10 with 1 CRITICAL, 4 IMPORTANT, and 4 MINOR issues. The editor made substantial improvements: removed begin() factoring from slice 02, added automated test requirements to slice 01, added skill-like verification to slice 02, specified test state setup in slices 04-05, fixed the contradictory verification in slice 05, added jqjs performance check, and added verification steps for previously-skipped skills. The result is a significantly stronger set of slice goals. Remaining issues are minor-to-moderate.

## Round 1 Issue Re-evaluation

| Round 1 Issue | Status | Assessment |
|---|---|---|
| CRITICAL: Slice 02 five unrelated deliverables with no unifying verification | **Resolved.** begin() factoring removed. Remaining items are coherent enrichments. Verification now exercises enrichments "as a skill would" using convention-doc-prescribed command sequences. | Good fix. |
| IMPORTANT: No automated tests for `state` command in slice 01 | **Resolved.** Success criteria now include "Integration tests for `state --json`, `state --json --query`, pagination, and error cases (aligned with `tests/integration/` and `tests/unit/commands/` patterns)." Scope boundaries also list "Automated tests for `state` command." | Good fix. |
| IMPORTANT: Slices 04-05 verification requires test state with no setup | **Resolved.** Both slices now have "Test state setup" preambles: "Create a test project via `goodplan init --name test-project` and `goodplan epic:create` to establish the required starting state. Advance the epic through phases as needed using CLI commands." | Good fix. |
| IMPORTANT: Slice 05 contradictory verification step | **Resolved.** Step 3 (create-plan) now correctly says "On a test slice in `created` status, run `/create-plan`. The skill should invoke `goodplan slice:plan` to begin planning." The skill calls the CLI command, not the manual setup. | Good fix. |
| IMPORTANT: Slice 03 "CLI code changes out of scope" contradicts purpose | **Resolved.** All three slices (03-05) now include "Note on CLI changes: CLI code changes are not expected but are in scope if validation reveals gaps." | Good fix. |
| MINOR: "Three deliverables" lists four | **Resolved.** Now says "Four deliverables." | Good fix. |
| MINOR: Slice 02 version compat verification fragile | **Resolved.** Verification step 3 now says "Use an integration test with a temp directory." | Good fix. |
| MINOR: Slice 06 success criteria overlap with 03-05 | **Partially resolved.** Success criteria now include "Focus on cross-skill transitions and emergent issues (not re-verifying grep compliance already covered by slices 03-05)." However, the success criteria still list the same grep checks from 03-05 (lines about zero hits for state.md, activity-log.jsonl, .project/*.json). The note says not to re-verify, but the criteria say to verify. | See M1. |
| MINOR: Missing verification for some skills in 04-05 | **Resolved.** Slice 04 now verifies all 5 skills (explore, create-architecture, refine-architecture, audit-architecture, start-epic). Slice 05 now verifies create-slices, refine-slices, create-plan, refine-plan, implement-plan. | Good fix. |

## Issues

### IMPORTANT

#### I1. `goal-refining.md [02]` — `BeginResult` and `SubmitResult` lack `paths?` fields in the current codebase, but the goal doesn't specify what they should contain

Slice 02 success criteria say: "`BeginResult` from `slice:plan --json` includes `paths` field with filesystem paths" and "`SubmitResult` from `submit-plan --json` includes `paths` field." I verified the codebase: `BeginResult` currently has `entity`, `phase`, `previousStatus`, `newStatus` — no `paths` field. `SubmitResult` has `entity`, `phase`, `previousStatus`, `newStatus`, `advanced` — no `paths` field. So this is genuinely new work.

But the goal never specifies what `paths` should contain. What filesystem paths? For `slice:plan`, presumably the plan.md location. For `submit-plan`, what? The implementation directory? The goal says "per the architecture spec" but doesn't define the shape or enumerate which commands return which paths. Without this, the implementer must guess or research, adding risk to what should be a well-defined enrichment.

**Recommendation:** Add a brief specification: what the `paths` field contains for each command type (e.g., `BeginResult.paths` for plan = `{ plan: "/abs/path/to/plan.md" }`, for implement = `{ implementation: "/abs/path/to/implementation/" }`). Or reference the specific section of the architecture spec that defines this.

#### I2. `goal-refining.md [02]` — Semver compatibility checking verification gap: no error case for major mismatch

Verification step 3 says "Verify warning on minor mismatch, error on major mismatch" but the success criteria only specify: "With CLI 1.0.0 and project 1.1.0, prints minor version warning to stderr." There is no success criterion for major version mismatch behavior (what error code? what message? does the command abort or just warn?). The behavior section says "Warns on minor mismatch, error on major mismatch" but "error" is ambiguous — is it a non-zero exit code, a GoodplanError with a specific code, stderr output, or all three?

**Recommendation:** Add a success criterion for major version mismatch: e.g., "With CLI 1.0.0 and project 2.0.0, exits with error code and `VERSION_MAJOR_MISMATCH` error."

### MINOR

#### M1. `goal-refining.md [06]` — Success criteria still duplicate grep checks from slices 03-05 despite note saying not to re-verify

The success criteria include a note to "Focus on cross-skill transitions and emergent issues (not re-verifying grep compliance already covered by slices 03-05)" but immediately follow with three grep-based criteria that replicate slice 03-05 verification. This is contradictory — the implementer won't know whether to skip or perform these checks.

**Recommendation:** Either remove the grep criteria from slice 06 (trusting slices 03-05) and replace with "Prior slice grep compliance assumed," or remove the "not re-verifying" note. The former is cleaner — dogfooding should find runtime/ergonomic issues, not source-level compliance already proven.

#### M2. `goal-refining.md [04]` — `start-*` commands described with `--inline` flag but actual CLI uses `--inline[=<bytes>]`

Slice 04 behavior section says: "Sub-agents use `goodplan start-explore --epic <name> --inline`." The actual CLI accepts `--inline` as a string arg that can be bare or have a `=<bytes>` budget (see `start-explore.ts` line 29: `type: "string"`). The goal doesn't mention the budget parameter. This is minor because the bare `--inline` works (defaults to `DEFAULT_INLINE_BUDGET`), but the skill rewrite will need to know whether to specify a budget.

**Recommendation:** Either note that `--inline` accepts an optional byte budget or defer the decision to the convention doc (which should already cover this).

#### M3. `goal-refining.md [01]` — Convention doc topic list is ambitious and unverifiable as a success criterion

Success criterion says the convention doc "covers: binary detection, data ownership, invocation patterns, interaction patterns by role, deriving workflow phase, state orientation, error handling, deep dives, self-discovery" — nine topics. This is a checklist for completeness, not verifiability. There is no way to verify these topics are correctly written without migrating a skill against them (which project-status partially does, but project-status is read-only and won't exercise most of these topics).

The real test of the convention doc is slices 03-05, where skills with write patterns validate it. Slice 01's convention doc is necessarily a draft that will evolve. The success criterion creates a false sense of completeness.

**Recommendation:** Reframe the criterion: "Convention doc covers at minimum: binary detection, invocation patterns, state orientation, error handling. Additional topics may be drafted but are validated by subsequent slices." This sets honest expectations.

#### M4. `goal-refining.md [03]` — `complete` skill verification step 3 says "Set up a test slice in `implementation-complete` status" without setup instructions

Slices 04-05 received test state setup preambles, but slice 03 did not. Verification steps 1-2 are clear (fresh directory, existing project), but step 3 requires a slice in `implementation-complete` status. Getting to this state requires: init, epic:create, activate, define-slices, slice:create, slice:plan, submit-plan, slice:refine-plan, submit-refinement, slice:implement, submit-implementation — a long chain of commands. Step 4 (epic complete with all slices completed) is even more complex.

**Recommendation:** Add a test state setup preamble to slice 03, similar to slices 04-05.

## Strengths

- **All round 1 CRITICAL and IMPORTANT issues addressed.** The begin() factoring removal is the highest-value fix. The automated test requirement for slice 01 closes a significant gap.
- **Slice 01 remains an excellent tracer bullet.** Four deliverables that build infrastructure and immediately exercise it with a real skill migration. The jqjs performance check bounds the library risk.
- **Verification steps in slices 04-05 are now reproducible.** Test state setup preambles with concrete CLI commands make each verification step self-contained.
- **"Note on CLI changes" is well-calibrated.** "Not expected but in scope if validation reveals gaps" avoids both scope creep and artificial constraints.
- **Sequential 04->05 ordering is correct.** Convention doc is a shared mutable resource; sequential updates are the safe choice.
- **Slice 02 is now coherent.** After removing begin() factoring, the remaining enrichments + semver + result type fields are related concerns that all improve CLI output for skill consumption. The "exercise as a skill would" verification ties them together.

## Score: 8/10

The editor addressed every round 1 issue effectively. The remaining gaps are moderate: `paths?` field specification is underspecified in slice 02 (could cause implementation rework), major version mismatch behavior is undefined, and slice 03 lacks the test state setup preamble that was added to 04-05. These are addressable without structural changes to the slice definitions.
