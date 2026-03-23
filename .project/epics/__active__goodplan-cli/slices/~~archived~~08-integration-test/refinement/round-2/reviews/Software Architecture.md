## Issues

**[IMPORTANT]** Workflow chain tests do not specify stdin payloads for commands that require them

Phase 2 workflow tests (`workflow-slice.test.ts`, `workflow-quest.test.ts`, `workflow-epic.test.ts`) describe command chains like `slice:create` -> `slice:plan` -> `start-plan` -> `submit-plan` -> `slice:refine-plan` -> `start-refinement` -> `submit-refinement` -> ... but do not mention the stdin JSON payloads required by several commands. Specifically:

- `epic:create` requires stdin `{ "name": "...", "goal": "..." }`
- `slice:create` requires stdin `{ "name": "...", "epic": "..." }`
- `submit-refinement` requires stdin `{ "scores": { "<criterion>": <number> } }`
- `slice:complete` requires stdin `{ "verificationPassed": true, "learnings": [...], ... }`
- `quest:complete` requires stdin `{ "verificationPassed": true, ... }`

Without specifying these payloads, the implementer will either have to reverse-engineer the required inputs from `src/schemas/commands/` or will write tests that fail validation. The `runCommand()` helper mentions JSON parsing for `--json` output but the plan never describes how stdin is piped to the spawned binary.

Fix: Add a note in the Phase 2 overview (or in the `runCommand` helper specification in Phase 1) explaining that commands requiring stdin should receive input via the helper's `options` parameter (e.g., `{ stdin: JSON.stringify({...}) }`). For each workflow chain task, specify the minimal stdin payloads needed for commands that accept stdin input. At minimum: `epic:create` (name, goal), `slice:create` (name, epic), `submit-refinement` (scores), `slice:complete` / `quest:complete` (verificationPassed).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `runCommand` helper lacks stdin piping specification

The Phase 1 `runCommand(binPath, args, options?)` helper signature returns `{ stdout, stderr, exitCode, json? }` and uses `node:child_process`, but the `options` parameter is not specified to include a `stdin` field. Since many mutation commands read from stdin (via `readStdin()`), the helper must support piping JSON to the spawned process's stdin. Without this, workflow chain tests that call `epic:create`, `slice:create`, `submit-refinement`, `slice:complete`, etc. cannot provide required input.

Fix: Extend the `runCommand` options specification to include `stdin?: string` that gets piped to the child process's stdin. With `spawnSync`, this is the `input` option. Example: `runCommand(bin, ['epic:create', '--json'], { stdin: '{"name":"test","goal":"test goal"}' })`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `stateless-commands.test.ts` (INV-004) approach is underspecified

The plan says "Verify that mutation commands require explicit target flags -- no command should implicitly mutate state without the caller specifying a target." But it does not describe how to implement this test. Options include: (1) static analysis of command definitions checking for required `--slice`/`--epic`/`--quest` flags, (2) running each mutation command without target flags and verifying it fails, (3) inspecting the `schema` command output. The test boundary and approach should be specified so the implementer knows which strategy to use.

Fix: Specify the approach. Recommended: import the command registry used by the `schema` command (or use `schema --json` output) and verify that every mutation command (identified by its mapped StateEvent) includes at least one of `--slice`, `--epic`, `--quest`, `--id` as a required argument. This aligns with INV-004's spirit and is stable.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `schema-output-accuracy.test.ts` (INV-006) approach is underspecified

The plan says "Verify schema command output matches actual command definitions -- flag names, types, and required/optional status should reflect the real command surface." This is a good invariant to test, but the plan does not specify whether this test should: (1) spawn the binary and run `schema --json`, (2) import the command registry directly, or both. It also does not specify what "actual command definitions" means in practice -- the citty `defineCommand` metadata or the Zod schemas.

Fix: Specify that the test should spawn the binary with `schema --json`, parse the output, and for each command entry verify: (a) flag names match the citty command definition's `args` keys, (b) required/optional status matches, (c) stdin schema (if any) is present for commands that accept stdin. This tests INV-006 at the system boundary (through the binary) which is the appropriate test level.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `epic:create --json` without required flags scenario in runner-modes is misleading

Phase 2's `runner-modes.test.ts` says: "`./goodplan epic:create --json` without required flags -> JSON validation error to stdout, empty stderr". But `epic:create` has no required flags -- it reads `name` and `goal` from stdin. The validation error occurs because stdin is empty (TTY returns `{}`, which fails Zod validation for missing `name` and `goal`). The description should be accurate to avoid implementer confusion.

Fix: Reword to: "`echo '{}' | ./goodplan epic:create --json` -> JSON validation error to stdout (missing name, goal), empty stderr" or "`./goodplan epic:create --json` with empty stdin -> JSON validation error".
Resolution: DIRECTLY_ACTIONABLE

## Round-1 Fix Verification

All 7 round-1 issues from this reviewer were addressed:
- Error codes: `STATE_SLICE_NOT_FOUND` and `STATE_GUARD_FAILED` removed, replaced with correct `STATE_INVALID_TRANSITION`, `STATE_MISSING_VERIFICATIONS`, `STATE_SLICE_NOT_READY`
- Vitest config task added to Phase 1
- `error-concurrent.test.ts` removed from Phase 2 (covered by Phase 3 fitness function)
- `handlerRecord` export from `reduce.ts` specified instead of separate `EVENT_TYPES` array
- Data Layer fitness function note added to Phase 3
- Key Decisions updated to acknowledge `handlerRecord` export
- Fixture determinism clarified (hand-crafted with fixed timestamps)
- `withFixture` specifies `cwd` behavior
- `node:child_process` specified definitively

## Score: 8/10

Round-1 fixes were applied correctly. The plan has sound architectural boundaries (binary-level integration tests, module-level Data Layer fitness functions) and good coverage of all 7 invariants plus 2 additional ones (INV-004, INV-006). The main gap is that workflow chain tests describe command sequences without addressing stdin input requirements, which is an important practical concern since many commands require specific JSON payloads via stdin to succeed. The `runCommand` helper also lacks stdin piping in its specification. Fixing the stdin gaps (both in the helper spec and the workflow test descriptions) plus specifying approaches for INV-004 and INV-006 fitness functions would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
