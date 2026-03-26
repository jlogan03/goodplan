# Tracer Bullet Quality Review (Round 3)

## Summary

Round 2 scored 8/10 with 2 IMPORTANT and 4 MINOR issues. The editor addressed all of them: added `paths?` field specification with per-command examples to slice 02, added `VERSION_MAJOR_MISMATCH` success criterion, added test state setup preamble to slice 03, noted version check protocol timing in slice 01, fixed slice 05 precondition statuses, updated convention doc topic list to "at minimum" framing, added `--inline[=<bytes>]` documentation note, resolved slice 06 grep contradiction with "prior slice grep compliance assumed," and fixed `loadState()` reference. The slice goals are now well-specified and verifiable.

## Round 2 Issue Re-evaluation

| Round 2 Issue | Status | Assessment |
|---|---|---|
| IMPORTANT I1: `paths?` field underspecified in slice 02 | **Resolved.** Behavior section now includes per-command examples: `BeginResult.paths` for plan = `{ plan: "<abs-path-to-plan.md>" }`, for explore = `{ research: "<abs-path-to-research-dir>" }`. `SubmitResult.paths` similarly specified. References `cli-changes.md` section for full mappings. | Good fix. |
| IMPORTANT I2: Semver major mismatch behavior undefined | **Resolved.** Success criterion added: "With CLI 1.0.0 and project 2.0.0, exits with non-zero exit code and `VERSION_MAJOR_MISMATCH` error to stderr." | Good fix. |
| MINOR M1: Slice 06 grep criteria contradict "don't re-verify" note | **Partially resolved.** Success criteria now say "prior slice grep compliance assumed — not re-verified here." However, the Verification section (step 2) still runs a cross-skill grep: `grep -rn 'Read.*\.project/.*\.json\|...' skills/`. And the Scope Boundaries still list "Final verification grep across all skills." The success criteria say "assumed," but verification and scope say "do it." Contradiction persists. See M1. |
| MINOR M2: `--inline` byte budget not mentioned in slice 04 | **Resolved.** Slice 01 behavior section now documents `--inline[=<bytes>]` with optional byte budget, noting the convention doc should cover this. Slice 04 behavior says "always JSON" for `start-*`, and the convention doc (written in slice 01) will carry the `--inline` detail. | Good fix. |
| MINOR M3: Convention doc nine-topic checklist creates false completeness | **Resolved.** Success criterion now says "covers at minimum: binary detection, invocation patterns, state orientation, error handling. Additional topics [...] may be drafted but are validated by subsequent slices." Honest expectation-setting. | Good fix. |
| MINOR M4: Slice 03 lacks test state setup preamble | **Resolved.** Test state setup preamble added with full lifecycle command chain: "For steps 1-2, use an empty temporary directory. For steps 3-4, create a test project via `goodplan init`... advance through the full lifecycle... to reach `implementation-complete` status." | Good fix. |

## Issues

### IMPORTANT

#### I1. `goal-refining.md [02]` — `paths?` field specification references `cli-changes.md` but no per-command mapping table exists in the goal itself

The behavior section now says: "Exact per-command mappings are defined in `cli-changes.md` section Result Type Fields; this slice implements that spec." This is better than round 2's unspecified state — the two examples (`slice:plan` and `epic:explore` for `BeginResult`, `submit-plan` and `submit-implementation` for `SubmitResult`) give the implementer a pattern. However, verification step 4 only tests one command: `goodplan slice:plan --slice <test-slice> --json`. The `paths` field must work across many commands (`epic:explore`, `epic:define-architecture`, `slice:implement`, etc.), each returning different path shapes. With only one verification point, an implementer could hard-code paths for `slice:plan` and miss others.

Verification should sample at least 2-3 command types to confirm the `paths` mapping is general (e.g., `slice:plan` for plan path, `epic:explore` for research path, `slice:implement` for implementation path).

#### I2. `goal-refining.md [03]` — Test state setup for `complete` verification is the most complex in the entire epic but has no fallback strategy

Slice 03's test state setup says: "advance through the full lifecycle (explore -> architecture -> refine-architecture -> define-slices -> create slice -> plan -> submit-plan -> refine-plan -> submit-refinement -> implement -> submit-implementation) to reach `implementation-complete` status." That is 11+ CLI commands in sequence, each depending on the previous one succeeding. Any failure in the chain (a bug in a command, missing required payload) blocks all `complete` skill verification.

This is different from slices 04-05 where test state setup involves fewer steps (e.g., slice 04 only needs `created` -> `explored` for the first test). Slice 03's setup is the longest chain in the entire epic and is being run before most skill migrations have been validated.

The risk is real: if `submit-implementation` has a bug (or any intermediate command), the `complete` skill cannot be verified at all. At minimum, note that a helper script or test fixture that bootstraps a project to `implementation-complete` status is acceptable. Or allow direct state construction (create entity JSON files directly) as a fallback for verification purposes.

### MINOR

#### M1. `goal-refining.md [06]` — Grep contradiction persists across three sections

Success criteria say "prior slice grep compliance assumed — not re-verified here." But Verification step 2 runs `grep -rn ... skills/` to "verify no direct structured state access." And Scope Boundaries include "Final verification grep across all skills." Three sections give three different answers about whether to grep. The success criteria fix from round 2 was applied, but the verification and scope sections were not updated to match.

**Recommendation:** Either (a) remove step 2 from Verification and "Final verification grep" from Scope, replacing with "Prior slice grep compliance assumed per success criteria," or (b) remove the "assumed" note from Success Criteria and accept that slice 06 re-runs the grep as a final safety net. Option (b) is arguably better — dogfooding is the last slice and a final grep is cheap insurance.

#### M2. `goal-refining.md [01]` — `state` command public API contract note is present but the backward-compatibility implication is not in Success Criteria

The behavior section correctly notes: "Its JSON output constitutes a public API contract — internal state tree type changes must maintain backward compatibility with the unwrapped serialization format defined in `cli-changes.md`." This is good documentation. But no success criterion tests this property. For slice 01 this is acceptable (the contract is new), but the note implies future slices must not break it. Consider adding a note to the convention doc scope: "Convention doc should note that `state --json` output format is a public API contract subject to backward compatibility."

This is minor because it is a documentation concern, not a verification gap in this slice.

#### M3. `sequencing-refining.md` — Parallelization candidate note for slices 04+05 lacks a decision point

The sequencing table notes slices 04+05 as a "parallelization candidate" but does not specify when or how the decision would be made. Adding "evaluated at slice 03 exit" or "decided during slice 04 kickoff based on convention doc change count from slice 03" would make this actionable rather than aspirational.

#### M4. `goal-refining.md [04]` — `audit-architecture` verification step says "On a test epic with architecture defined" but does not specify a status

All other verification steps specify exact statuses (e.g., "in `created` status," "in `architecture-defined` status"). Step 4 for `audit-architecture` says "On a test epic with architecture defined" — which could mean `architecture-defined`, `architecture-refined`, `activated`, or any later status. Since `audit-architecture` is read-only and should work on any epic with architecture, this is correct behavior but the verification step should pick a specific status for reproducibility.

## Strengths

- **All round 2 IMPORTANT issues resolved.** The `paths?` field now has concrete examples and a spec reference. Major version mismatch has explicit behavior.
- **Slice 03 test state setup is the most thorough in the epic.** The full lifecycle chain accurately reflects what is needed to reach `implementation-complete`. The preamble makes the verification reproducible.
- **Convention doc expectations are now honest.** The "at minimum" framing with "validated by subsequent slices" correctly positions slice 01's convention doc as a living document.
- **Version compatibility timing is explicit.** The slice 01 note about "convention doc only" and "CLI-side enforcement deferred to slice 02" prevents confusion about what is enforced when.
- **Slice 05 precondition statuses are now correct.** `architecture-refined` for `create-slices` and `slices-defined` for `refine-slices` match the transition tables.
- **`--inline[=<bytes>]` byte budget documented in slice 01.** This feeds through the convention doc to all downstream slices.

## Score: 9/10

The editor resolved all 6 round 2 issues. Two new concerns surfaced at the IMPORTANT level: the `paths?` verification only tests one command type (should sample 2-3), and slice 03's complex test state setup chain has no fallback if intermediate commands fail. Both are addressable without structural changes. The slice 06 grep contradiction is a persistent cosmetic issue across three sections. Overall, the slice goals are well-defined, sequenced correctly, and verifiable end-to-end.
