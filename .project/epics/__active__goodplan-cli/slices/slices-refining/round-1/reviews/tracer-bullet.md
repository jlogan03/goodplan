# Tracer Bullet Quality Review

**Score: 7/10** | Critical: 1, Important: 4, Minor: 3

## Summary

The slice sequencing follows a sound tracer-bullet strategy — slice 01 proves the full stack before deeper investment. Dependency ordering is correct. Most slices have concrete verification steps. However, several slices produce code that is only exercised by later slices (not truly independently verifiable), and some verification sections fall back to unit tests rather than end-to-end execution.

## Critical Issues

### 01-tracer-bullet/goal-refining.md: Schema command creates unexercised scope

The tracer bullet includes `goodplan schema --json` returning the "command hierarchy," but at this point only init/status exist. More critically, it claims "All commands support `--json`, `--quiet`, `--query` flags (query via jqjs)" — but there are only two commands to exercise these on. The `--query` flag requires jqjs integration and binary compilation validation, which is good, but `--quiet` has no meaningful difference from `--json` on status output. The real concern: building the full output formatting pipeline (JSON/human/quiet/query) for only two commands risks over-engineering infrastructure that won't be validated until slice 05. **Recommendation:** Either defer `--quiet` and `schema` to slice 05, or explicitly verify them with concrete expected output in the verification section.

## Important Issues

### 03-state-machine/goal-refining.md: Not independently verifiable end-to-end

This slice is verified entirely via unit tests (`bun test tests/unit/state/`). It produces pure functions with no CLI-visible behavior. While the "pure functions = independently testable" rationale is valid, **no running code calls the reducer until slice 04**. This means slice 03 produces code that nothing exercises in a real execution path. The verification section says "count test cases vs transition table rows" — that's a coverage metric, not end-to-end verification. **Recommendation:** Either merge slice 03 into slice 04 (since RPC is the first consumer), or add a minimal smoke test that wires reduce() to a fixture and validates a full lifecycle without I/O — and be explicit that this slice is a unit-test-only exception to the end-to-end rule.

### 04-rpc-core/goal-refining.md: Verification mixes unit and integration without clarity on binary execution

Verification says "Run `bun test tests/unit/rpc/` and `bun test tests/integration/rpc/`" but doesn't specify whether integration tests use the compiled binary or call RPC functions programmatically. The success criteria reference function calls (`begin('plan', ...)`, `complete('slice', ...)`) rather than CLI commands. Since no CLI commands exist for mutations yet (those come in slice 06), the RPC layer can only be tested programmatically. This is fine, but the goal should explicitly acknowledge this is not binary-level verification. **Recommendation:** State clearly that RPC verification is programmatic (not via compiled binary), and add one smoke test that proves the compiled binary still works after RPC integration (e.g., `goodplan status --json` still functions with the deeper data layer and state machine wired in).

### 02-data-layer/goal-refining.md: "Tracer bullet's init/status commands continue to work" is implicit, not verified

The scope boundaries mention that init/status "continue to work but use the deeper data layer" — but the verification section doesn't include running these commands via the compiled binary. This is a regression risk. **Recommendation:** Add an explicit verification step: "Compile binary, run `goodplan init` + `goodplan status --json` — verify they still work with the full data layer." This also proves the deeper data layer integrates with the existing commands.

### 06-commands-mutate/goal-refining.md: Verification step 1 is a multi-step workflow, not atomic verification

The verification section describes a 7-step workflow as a single verification item. If step 3 fails, it's unclear which command or state transition broke. **Recommendation:** Break the workflow verification into numbered assertions with expected state after each command (similar to how slice 01 does it).

## Minor Issues

### 05-commands-read/goal-refining.md: Verification assumes fixture data exists but doesn't specify how

"Set up a fixture .project/ with epics, slices, quests, decisions, learnings, activity entries" — this is vague. Does the fixture come from running slice 06 commands? From manual file creation? From a shared test fixture? Since slice 05 comes before slice 06, there are no mutation commands yet. **Recommendation:** Specify that fixtures are created manually or via the compiled binary's existing init command + direct file creation.

### 07-skills-migrate/goal-refining.md: Verification modifies user's actual ~/.claude/skills/

Verification step 1 runs `bun run install:skills` against the real `~/.claude/skills/`. This is a side-effect-producing test that could break the user's current skill setup if something goes wrong. **Recommendation:** Add a note that verification should use a GOODPLAN_SKILLS_DIR override or backup/restore, or at minimum note the risk.

### sequencing-refining.md: Slice 07 "can run in parallel" but has no dependency enforcement

The sequencing table says slice 07 depends on "None (parallel)" but there's no mechanism described for tracking parallel execution. This is fine for human coordination but worth noting that the sequencing doc doesn't address how parallel slices interact with the overall workflow state.

## What Works Well

- **Slice 01** is an excellent tracer bullet — it validates the riskiest unknowns (Bun compile, citty namespaces, jqjs in binary) with concrete commands and expected outputs.
- **Dependency ordering** is correct: data layer before state machine consumers, RPC before commands.
- **Slice 08** as a capstone integration test slice is the right call — fitness functions establish ongoing quality.
- **Verification sections** in slices 01, 02, and 06 include concrete commands with expected outcomes.
- **Scope boundaries** are consistently defined with clear in/out scope in every slice.
