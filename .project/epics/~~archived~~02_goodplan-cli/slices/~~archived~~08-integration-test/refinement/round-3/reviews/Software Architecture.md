# Software Architecture Review — Round 3

## Issues

**[IMPORTANT]** INV-004 fitness function checks wrong invariant condition

The plan's `stateless-commands.test.ts` (INV-004) says: "verify every mutation command includes at least one of `--slice`, `--epic`, `--quest`, `--id` as a required argument." This is factually wrong against the codebase. Several mutation commands do NOT have these flags as required args:

- `epic:create` — no required target flag; `name` comes via stdin
- `quest:create` — no required target flag; `name` comes via stdin
- `decision:create` — no required target flag; `id` comes via stdin
- `learning:rollup` — uses `--from`/`--to`, not any of the four listed flags

The invariant INV-004 says "Every command is stateless — target flags required" meaning no implicit state from prior commands. The real invariant is that every mutation command explicitly identifies its target (whether via flag or stdin). The fitness function needs a different approach: verify that no mutation command relies on ambient/session state (e.g., a "current epic" concept). This could be done by checking that every mutation command either has a required entity-identifying flag OR accepts a required `name`/`id` field in its stdin schema.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Epic workflow test chain over-simplified

Phase 2, `workflow-epic.test.ts` describes: "From epic-created fixture: `submit-explore --epic test-epic` -> `submit-architecture --epic test-epic` -> define slices -> `epic:activate --epic test-epic`". This skips the `epic:explore`, `epic:define-architecture`, `epic:define-slices` (BEGIN_*) commands that must precede their corresponding `submit-*` commands. The state machine requires BEGIN before COMPLETE for each phase. The test would fail with `STATE_INVALID_TRANSITION` because submit commands complete a phase that was never begun.

The test should chain: `epic:explore` -> `submit-explore` -> `epic:define-architecture` -> `submit-architecture` -> `epic:define-slices` -> `submit-slices` -> (add verification) -> `epic:activate`. Each phase needs both the begin and submit step. Note also that `epic:activate` requires at least one verification criterion (INV: `STATE_MISSING_VERIFICATIONS`), so `epic:add-verification` must be called before activate.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `slice:create` stdin shape inconsistent with actual command

Phase 2 `workflow-slice.test.ts` says: `slice:create` with stdin `{ "name": "test-slice", "epic": "test-epic" }`. But looking at the actual `slice:create` command registration, it takes `--epic` as a required *flag* (not stdin field) and `name` via stdin. The stdin should be `{ "name": "test-slice" }` with `--epic test-epic` passed as a flag argument.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is architecturally sound in its overall approach — spawning a compiled binary, using real fixtures, cleanly separating integration tests from fitness functions, and correctly scoping the one allowed production code change. The round-2 fixes (stdin payloads, handlerRecord export specification, concurrent modification pattern, circuit breaker approach) are all correctly applied.

The INV-004 issue is important because if implemented as written, the test would produce false failures for create commands and miss the actual invariant being tested. The epic workflow chain issue and slice:create stdin shape are minor but would cause test failures during implementation.

To reach 9+: fix the INV-004 fitness function approach to match the actual codebase's command design, correct the epic workflow test chain to include BEGIN steps, and fix the slice:create stdin/flag split.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
