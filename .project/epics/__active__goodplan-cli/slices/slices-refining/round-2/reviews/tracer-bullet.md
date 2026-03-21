# Tracer Bullet Quality Review — Round 2

**Score: 8/10** | Critical: 0, Important: 3, Minor: 3

## Summary

Round 1's critical issue (schema/quiet/query scope creep in slice 01) is fully resolved. Binary regression is now explicit in slice 02. The lifecycle smoke test is now present in slice 03. All round-1 fixes are correctly applied. The remaining issues are: slice 04 verification still lacks a binary-level smoke test, slice 06's full lifecycle walkthrough omits the refinement sub-loop (submit-refinement + scoring), and slice 08 integration tests don't establish a baseline binary check before layering on fitness functions.

## Critical Issues

None.

## Important Issues

### 04-rpc-core/goal-refining.md: Verification is entirely programmatic — no binary-level confirmation

All five verification steps call RPC functions directly via `bun test`. None of them compile and run the binary. After slice 04 wires state machine + data layer into the RPC layer, the compiled binary (`goodplan status --json`, `goodplan init`) must still work — this is not tested. The round-1 review noted this gap; the action taken was to add a status() criterion, not a binary smoke test. The underlying concern remains: a regression introduced while integrating the load → reduce → commit cycle won't surface until slice 05 or 06.

**Recommendation:** Add one verification step: "Compile binary, run `goodplan status --json` — verify it returns correct JSON with the full RPC layer wired in (state machine + data layer integrated)."

### 06-commands-mutate/goal-refining.md: Full slice lifecycle in verification omits the refinement loop

The 7-step verification workflow in slice 06 runs: init → epic:create → epic:activate → slice:create → slice:plan → submit-plan → status check. It stops at plan-created. The refinement loop (start-refinement → submit-refinement with scores → complete to plan-refined) and implementation loop (start-implementation → submit-implementation → slice:complete with verificationPassed) are in the success criteria but absent from the numbered verification walkthrough. If the refinement circuit breaker, override flag, or score threshold guard breaks, the verification script won't catch it.

**Recommendation:** Extend the numbered verification to include at minimum: one refinement round (start-refinement / submit-refinement with scores above threshold), and slice:complete with verificationPassed: true. The existing steps 2–4 (abandon, override, TTY detection) can stay as separate targeted checks.

### 08-integration-test/goal-refining.md: No binary compilation step before integration tests run

The integration test slice spawns the compiled binary — but the verification section jumps straight to `bun test tests/integration/` without a step confirming the binary was freshly compiled. If the binary on disk is stale (from slice 01 or an interrupted build), integration tests may pass against old behavior. This is particularly important because slice 08 is the first time all layers are exercised together via the binary.

**Recommendation:** Add an explicit first step: "Compile binary: `bun build --compile src/index.ts --outfile goodplan` — verify exit 0 and binary size is reasonable." Then run integration tests against that freshly compiled binary.

## Minor Issues

### 01-tracer-bullet/goal-refining.md: jqjs smoke test is a hidden implementation detail with no specified output

Success criterion 7 says "jqjs smoke test passes in compiled binary (proves the dependency compiles correctly)" and behavior item 8 describes "a hidden `--query` on status for smoke testing only." Neither specifies what the expected output is. A smoke test that doesn't assert a concrete expected value can pass vacuously (e.g., if jqjs silently falls back to identity transform). The word "hidden" also implies this flag won't appear in schema output — that distinction should be explicit.

**Recommendation:** Specify the smoke test input and expected output. Example: `./goodplan status --json --smoke-jq` should return `"ok"` or a known value. Note explicitly that this flag is excluded from `schema` output and removed in slice 05 when full `--query` support is added.

### 03-state-machine/goal-refining.md: Fitness function coupling to StateEvent union needs a fallback

The scope boundary states "Fitness function for transition table completeness should derive expected counts from the `StateEvent` discriminated union type rather than parsing the markdown table." This is correct, but creates a dependency: if the `StateEvent` discriminated union is incomplete (missing events that are in the transition tables), the fitness function will undercount and silently pass. There is no cross-check.

**Recommendation:** Add a note: either the fitness function cross-validates the discriminated union against the transition table row count (to detect undercounting), or the architecture flag about reconciling enum values (noted at bottom of the file) is resolved before implementation begins. The current text flags the architecture concern but doesn't specify when resolution is required.

### 05-commands-read/goal-refining.md: `--quiet` mode verification is underspecified

`--quiet` is in scope for slice 05. The success criteria don't include a `--quiet` criterion. The verification step (step 7) says "Test --quiet — verify minimal output" without defining what "minimal output" means. For a CLI consumed by LLMs, the exact format of `--quiet` output matters (entity name only? name + status? a JSON one-liner?). Without a concrete expected output, an implementer has no way to know if their `--quiet` output is correct.

**Recommendation:** Add one concrete success criterion for `--quiet`: e.g., `goodplan epic:list --quiet` returns one line per epic with just the name, or one line per epic with `name status`. This can be a simple assertion rather than a schema test.

## What Works Well

- **Slice 01** is tight and focused after round-1 trimming. The scope boundaries are crisp and the jqjs smoke test is kept as a targeted dependency proof rather than a full feature.
- **Slice 02** binary regression is now explicit — the tracer bullet commands are verified against the deeper data layer.
- **Slice 03** lifecycle smoke test is present and correctly scoped: wires `reduce()` to a fixture, validates a full entity lifecycle, explicitly acknowledged as a unit-test-only exception.
- **Slice 06** verification is now broken into numbered assertions with expected state after each step — the round-1 important issue is resolved.
- **Slice 07** `GOODPLAN_SKILLS_DIR` override is now present — the verification no longer modifies the real skills directory.
- **Sequencing** correctly reflects 02/03 parallelism and the slice 05 dependency clarification.
- **Slice 08** fitness functions are well-specified with concrete property tests covering purity, completeness, determinism, validation, concurrency, atomicity, and derived fields.
