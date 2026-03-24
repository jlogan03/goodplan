# Software Architecture Review — Round 2

**Reviewer:** Software Architecture
**Score:** 9/10
**Issues:** Critical: 0, Important: 1, Minor: 2

## Summary

Round 2 is significantly improved. The prior round's main issues (begin() factoring in slice 02, unclear CLI-changes scope in 03-05, missing automated test requirements) have all been addressed. The slice goals are well-aligned with the four-layer architecture, respect layer boundaries, and correctly reference CLI command names that match the existing `src/commands/` structure. The sequencing rationale is sound: tracer bullet (01) proves the pattern, enrichments (02) close ergonomic gaps, core validation (03) stress-tests the convention doc, mechanical rollout (04-05) applies established patterns, and dogfooding (06) catches emergent issues.

## Issues

### IMPORTANT

#### [03-core-skill-validation/goal-refining.md] `complete` skill references `start-complete` but no such command exists

Slice 03 behavior section for `complete` (item 2) says: "Uses `goodplan slice:show --slice <name> --json` (or quest/epic) to check entity state." The convention doc (`cli-interaction-conventions.md` worked example) references `goodplan start-complete --slice my-slice --inline --json` as part of the complete orchestrator pattern. However, there is no `start-complete` command in the codebase (`src/commands/subagent/` has no `start-complete.ts`), and `start-complete` is not listed in the Commands API (`commands-api.md` sub-agent commands section) nor in the RPC layer's `SubmitPhase` type.

The slice 03 goal itself does not explicitly mention `start-complete`, but the convention doc that slice 01 will produce does reference it. When the `complete` skill is migrated in slice 03, implementers will consult the convention doc and find a command that does not exist. Either: (a) `start-complete` needs to be added to the CLI as a side quest or scope addition in slice 01 or 02, (b) the convention doc must be updated to show the `complete` skill using `state --json --query` for deep context instead of `start-complete`, or (c) slice 03 scope boundaries should explicitly call this out.

**Recommendation:** Add a note to slice 03 scope boundaries acknowledging that the convention doc's `start-complete` example may need to be replaced with `state --json --query` for context loading, or that a `start-complete` command may need to be added as a CLI gap discovered during migration.

### MINOR

#### [sequencing-refining.md] Description column for slice 02 is dense and could mask scope

Slice 02 packs four distinct deliverables into one slice: `show --json` artifacts, `status --json` file arrays, `paths?` result type fields, and semver compatibility checking. The semver checking in particular is a cross-cutting concern (runs in the main dispatch path before every command) that is architecturally distinct from the three output enrichments. If semver checking proves complex, it could dominate the slice and push the output enrichments to a later slice.

**Recommendation:** No change required — the slice 02 goal document already sequences these internally (enrichments first, then result types, then semver). Just noting this is the densest slice and may benefit from time-boxing semver checking during implementation.

#### [04-exploration-architecture-skills/goal-refining.md] `start-explore --inline` claim that `start-*` commands "always output JSON" could confuse implementers

The explore behavior section states: "Sub-agents use `goodplan start-explore --epic <name> --inline` for context (`start-*` commands always output JSON; `--json` flag is not needed)". While this parenthetical is technically accurate (the existing `start-*` command implementations in `src/commands/subagent/` do output JSON by default), it contradicts the convention doc's own "Always use `--json`" rule. A sub-agent following the convention doc would add `--json`; a sub-agent following the slice 04 goal would omit it. This inconsistency is harmless at runtime but could cause confusion during review.

**Recommendation:** Either always include `--json` for consistency with the convention doc (even if redundant for `start-*`), or note the exception once in the convention doc rather than repeating the explanation in each slice goal.

## Positive Observations

1. **Tracer bullet scope is well-calibrated.** Slice 01 delivers the keystone command (`state --json --query`), the convention doc, and exactly one skill migration (`project-status`). This proves the end-to-end pattern without overcommitting.

2. **CLI change scope is correctly bounded in slices 03-05.** The "Note on CLI changes" at the bottom of slices 03, 04, and 05 appropriately frames CLI changes as unexpected-but-in-scope, tracked via convention doc updates. This respects the "CLI conforms to skills" constraint without opening unbounded scope.

3. **Automated test requirements are present.** Slice 01 explicitly lists integration tests for `state --json`, `--query`, pagination, and error cases. Slice 02 includes regression requirement (`bun test`). This addresses the prior round's gap.

4. **Layer boundary compliance.** Slice 02 correctly identifies semver checking as a Commands-layer concern in the main dispatch path, reading `project.json.version` via `assembleState()` — a legitimate Commands-to-Data-Layer read path. This respects the architecture's routing rules.

5. **Verification sections are concrete and executable.** Each slice specifies exact CLI commands to run, expected outputs, and grep checks. The test state setup instructions in slices 04 and 05 describe how to build the required starting state using CLI commands.

6. **Dogfooding slice (06) correctly focuses on cross-skill transitions.** The success criteria explicitly state "Focus on cross-skill transitions and emergent issues (not re-verifying grep compliance already covered by slices 03-05)." This avoids redundant work.
