# Risk/Dependency Analysis Review (Round 2)

## Summary

Round 1 scored 8/10 with 3 IMPORTANT and 3 MINOR issues. The editor addressed all three IMPORTANT issues well: begin() factoring risk removed from slice 02, slices 04->05 made sequential with explicit rationale, CLI-changes scope acknowledged in slices 03-05 with "Note on CLI changes" sections, and dogfooding exit criteria bounded. Re-evaluating against the updated files.

**Score: 9/10**

---

## Issues

### IMPORTANT: `goal-refining.md [02]` — Semver compatibility checking has an implicit circular dependency with slice 01's convention doc

Slice 02 implements semver compatibility checking, including the `requires` frontmatter in SKILL.md files. But slice 01 writes the convention doc that prescribes this frontmatter format and migrates project-status to use it. The convention doc (slice 01) references `--version --json` and the version check protocol, but the actual semver enforcement mechanism (CLI-side compatibility checking in the command dispatcher) doesn't exist until slice 02.

This means the convention doc written in slice 01 prescribes a protocol (version checking at skill startup) whose CLI-side counterpart doesn't exist yet. The project-status skill migrated in slice 01 would either need to implement version checking without CLI-side enforcement, or skip it and retrofit later.

**Impact:** Low-to-moderate. The skill-side version check (`goodplan --version --json` + manual comparison) works without CLI-side enforcement. But it means the convention doc in slice 01 documents behavior that isn't fully exercisable until slice 02. Skills migrated in slices 03-05 would need to re-verify version checking once CLI enforcement lands.

**Recommendation:** Acknowledge in slice 01's scope boundaries that version compatibility checking is "convention doc only" in slice 01 (the protocol is documented, `--version --json` output exists, but CLI-side major/minor enforcement is deferred to slice 02). Alternatively, pull `--version --json` output into slice 01 (already there) but explicitly defer the convention doc's version-checking protocol details to slice 02's scope.

### MINOR: `sequencing-refining.md` — Sequential 04->05 ordering trades parallelism for convention doc stability, but the risk it mitigates may not materialize

The rationale for making 04 sequential before 05 is "convention doc updates from 04 inform 05." This is sound in principle, but both slices explicitly note "CLI code changes are not expected" and patterns are established from slices 03's core validation. If slice 03 does its job (validating convention doc against the most complex workflows), the marginal convention doc changes from slice 04 (5 skills following established patterns) may be minimal. The cost is that 11 skills (slices 04+05) must be migrated sequentially rather than in parallel.

**Recommendation:** No change needed — the sequential ordering is the safer choice given convention doc is a shared mutable resource. But note this as a candidate for parallelization if slice 03 produces a stable convention doc with minimal updates.

### MINOR: `goal-refining.md [03]` — create-epic's Mode A (project initialization) adds a second unknown to the core validation slice

Slice 03 migrates create-epic, which includes `goodplan init --name <name> --json` for project initialization (Mode A: fresh directory). This is the only skill that exercises the `init` command path. If `init` has CLI gaps (it was implemented in the tracer bullet with a direct write, per flows.md: "The tracer bullet's init implementation writes project.json directly"), the slice 03 migration would be the first real test of `init` through the full state machine path. This adds a second unknown (init command correctness) alongside the primary goal (validating the convention doc against complex workflows).

**Recommendation:** Slice 03's verification section already covers "fresh project" and "existing project" scenarios, which is good. Consider noting in the goal that `init` is exercised through the state machine for the first time here, so it may surface init-specific issues distinct from the convention doc validation goal.

### MINOR: `goal-refining.md [06]` — "One full workflow cycle" exit criterion may not exercise cross-skill edge cases

The bounded exit criteria ("one full workflow cycle end-to-end; critical issues fixed; non-critical issues logged") are a good improvement from round 1. However, one happy-path cycle through create-epic -> explore -> create-architecture -> create-slices -> create-plan -> refine-plan -> implement-plan -> complete may not exercise the error recovery patterns documented in the convention doc (re-entry after graceful stop, STATE_INVALID_TRANSITION recovery, concurrent quest conflicts). These cross-skill transitions under non-happy conditions are where integration gaps typically hide.

**Recommendation:** Add to the success criteria: "Error recovery patterns from the convention doc (re-entry, idempotent resume) are exercised at least once during the cycle." This could be as simple as interrupting and resuming one skill mid-workflow.

---

## Round 1 Issue Re-evaluation

| Round 1 Issue | Status | Assessment |
|---|---|---|
| IMPORTANT: Slice 02 bundles unrelated risk domains (begin() factoring) | **Resolved.** begin() factoring removed from slice 02 scope. Slice 02 now contains only enrichments + semver + result type fields — coherent scope. | Good fix. |
| IMPORTANT: "CLI code changes should be complete" assumption is fragile | **Resolved.** All three slices (03, 04, 05) now include "Note on CLI changes: CLI code changes are not expected but are in scope if validation reveals gaps." | Good fix — explicitly acknowledges the escape valve. |
| IMPORTANT: jqjs library risk unacknowledged | **Resolved.** Slice 01 verification section now includes step 6: "jqjs performance: Run the specific jq expressions from the success criteria against the goodplan repo's own state tree. Confirm all return within acceptable time (< 1s)." | Good fix — bounds the performance concern. |
| MINOR: Parallel slices share convention doc dependency | **Resolved.** Slices 04 and 05 are now sequential (04 before 05), eliminating concurrent convention doc update risk. | Good fix, conservative choice. |
| MINOR: Dogfooding scope open-ended | **Resolved.** Exit criteria section added: "One full workflow cycle end-to-end; critical issues fixed; non-critical issues logged as deferred work." | Good fix. |
| MINOR: Convention doc chicken-and-egg risk | **Persists but acceptable.** Convention doc evolves across slices 01-05 by design. Each slice includes convention doc update tasks. The sequential ordering (now including 04->05) provides a stable update path. | No action needed. |

## Strengths

- **All round 1 IMPORTANT issues addressed.** The begin() factoring removal from slice 02 is the highest-impact fix — it eliminates the risk domain bundling that was the primary concern.
- **Sequential 04->05 is the right call for a shared mutable resource.** Convention doc stability matters more than parallelism for 11 skill migrations.
- **"Note on CLI changes" sections are well-scoped.** They acknowledge CLI gaps as in-scope without expanding the success criteria to require CLI changes. The framing "not expected but in scope if validation reveals gaps" is precise.
- **Bounded dogfooding exit criteria prevent scope creep.** "One full workflow cycle; critical fixed; non-critical deferred" is the right granularity.
- **Dependency graph remains clean and acyclic.** 01 -> 02 -> 03 -> 04 -> 05 -> 06 is now a linear chain, which is simpler to reason about than the previous fan-out.
