# Holistic Review — Integration Tests & Fitness Functions (Round 2)

## Round 1 Fix Verification

All 7 issues from round 1 have been addressed:
- Error codes now reference real `StateErrorCode` values (STATE_INVALID_TRANSITION, STATE_MISSING_VERIFICATIONS, STATE_SLICE_NOT_READY, STATE_MAX_ROUNDS_REACHED) -- FIXED
- INV-004 and INV-006 fitness functions added (stateless-commands.test.ts, schema-output-accuracy.test.ts) -- FIXED
- Workflow command chains now explicitly list start-*/submit-* commands alongside entity commands -- FIXED
- Vitest config task added for ~30s timeout -- FIXED
- Phase 1 Expected Behavior "before" check cleaned up -- FIXED
- Fitness function count updated to 9 in the confirmed goal -- FIXED
- Doc comment task added for test helper -- FIXED

## Issues

**[IMPORTANT]** Workflow chain tests lack stdin payload specification for submit commands

The Phase 2 slice and quest lifecycle chains invoke commands that require stdin payloads, but the plan does not specify what those payloads should contain:
- `submit-refinement` requires `{"scores": {"<criterion>": <number>}}` via stdin (verified in `src/commands/subagent/submit-refinement.ts` line 15)
- `slice:complete` requires `{"verificationPassed": true, "deferred": [...], "learnings": [...]}` via stdin (verified in `src/commands/slice/complete.ts` line 14)
- `quest:complete` requires similar stdin with `verificationPassed` and `learnings`
- `epic:create` and `quest:create` require `{"name": "...", "goal": "..."}` via stdin
- `slice:create` requires `{"epic": "...", ...}` via stdin

The `runCommand` helper returns `{stdout, stderr, exitCode}` but the plan does not describe how stdin payloads are piped to the spawned binary. Without explicit fixture payloads and a stdin-piping mechanism in the helper, the implementer will have to reverse-engineer each command's input schema. The `runCommand` helper task should specify a `stdin` option for piping content, and each workflow chain task should list the required stdin payloads (or reference a fixtures/payloads directory).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Transition-completeness fitness function checks wrong thing

The plan says: "For each event type, verify at least one test exists in `tests/unit/state/` that exercises it." This is a test-coverage-of-tests check (meta-testing), not an architectural fitness function. The actual invariant implied by `handlerRecord` + `satisfies` is that every `StateEvent['type']` has a handler -- but that is already enforced at compile time by TypeScript's `satisfies`. A runtime fitness function re-checking this adds no value.

A more useful fitness function would verify that the number of keys in `handlerRecord` matches the number of members in the `StateEvent` discriminated union (detecting drift if someone adds an event type but forgets to register it). Or it could verify that `reduce()` returns a non-error result for each event type when given valid input (smoke test for each handler). The current formulation is neither a true invariant check nor particularly useful.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `withFixture` copies fixture but does not account for `GOODPLAN_DIR` vs cwd discovery

The plan says `withFixture` "sets `cwd` to the temp directory containing the `.project/` structure when spawning the binary." The binary discovers `.project/` either via `GOODPLAN_DIR` env var (pointing directly to the `.project/` dir) or by walking up from cwd. The plan should specify which approach to use. Using `GOODPLAN_DIR` is more explicit and avoids potential issues if the binary walks up and finds the repo's own `.project/` directory. Recommend setting `GOODPLAN_DIR` in the spawned process environment to `<tempDir>/.project/`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Circuit breaker test may be slow or fragile

The `error-circuit-breaker.test.ts` task says "Submit enough refinement rounds to hit `MAX_REFINEMENT_ROUNDS`" which is 10 (from `src/core/state/transitions/helpers.ts:18`). This means spawning the binary at least 10 times sequentially for a single test case. At ~200-500ms per spawn, that is 2-5 seconds for one test. The plan should note that the fixture should start at a high round number (e.g., round 9) so only 1-2 spawns are needed. Alternatively, the test could use a fixture with `refinement.round` already at `maxRounds - 1`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 fitness function for INV-004 (stateless-commands) lacks implementation detail

The task says: "Verify that mutation commands require explicit target flags -- no command should implicitly mutate state without the caller specifying a target." But it does not specify how. Options include: (a) statically analyzing citty command definitions for required `--slice`/`--epic`/`--quest` args, (b) spawning each mutation command without target flags and asserting exit 2, or (c) importing command definitions and checking `args` metadata. Each has tradeoffs. The implementer needs guidance on which approach to use. Option (a) or (c) would be fastest; option (b) is most thorough but slow.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 fixes were all applied correctly. The plan is well-structured with clear phasing, good fixture strategy, and comprehensive invariant coverage (9 fitness functions covering all 7 INVs). The remaining issues are: (1) missing stdin payload specs in workflow chains which will cause implementation friction, and (2) the transition-completeness fitness function checks something already enforced by the compiler rather than a meaningful runtime invariant. Fixing the stdin payload issue and refining the transition-completeness test would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
