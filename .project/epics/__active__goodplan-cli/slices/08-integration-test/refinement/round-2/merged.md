# Merged Feedback -- Integration Tests & Fitness Functions (Round 2)

## CRITICAL Issues

None.

## IMPORTANT Issues

**IMP-1. Workflow chain tests lack stdin payload specifications, and `runCommand` helper lacks stdin piping**

Sources: Holistic (IMPORTANT), Software Architecture (IMPORTANT x2)

The Phase 2 workflow tests describe command chains but do not specify the stdin JSON payloads required by many commands:
- `epic:create` requires `{ "name": "...", "goal": "..." }`
- `slice:create` requires `{ "name": "...", "epic": "..." }`
- `submit-refinement` requires `{ "scores": { "<criterion>": <number> } }`
- `slice:complete` requires `{ "verificationPassed": true, "learnings": [...], "deferred": [...], "architectureDelta": "..." }`
- `quest:complete` requires `{ "verificationPassed": true, ... }`

Additionally, the `runCommand(binPath, args, options?)` helper does not specify a `stdin` field in its options. With `spawnSync`, this maps to the `input` option.

Fix: (a) Extend `runCommand` options to include `stdin?: string` piped to the child process. (b) For each workflow chain task, list the required stdin payloads (or reference fixture data).

**IMP-2. Transition-completeness fitness function checks something already enforced by TypeScript**

Source: Holistic (IMPORTANT)

The plan says: "For each event type, verify at least one test exists." This is a meta-test. The actual `handlerRecord` + `satisfies` already enforces at compile time that every `StateEvent['type']` has a handler. A runtime fitness function re-checking this adds no value.

Fix: Replace with a more useful check -- e.g., verify the key count in `handlerRecord` matches the `StateEvent` union member count (detecting drift), or smoke-test that `reduce()` returns a non-error result for each event type with valid input.

**IMP-3. `handlerRecord` export needs explicit specification**

Source: TypeScript (IMPORTANT)

The plan says "Export `handlerRecord` from `reduce.ts`" but doesn't specify the exact change: `const handlerRecord` on line 69 becomes `export const handlerRecord`. The `handlers` Map on line 111 should remain unexported. Minor clarification but prevents ambiguity.

Fix: Specify the exact production code change: add `export` to `const handlerRecord` declaration.

**IMP-4. Vitest config task is underspecified**

Source: TypeScript (IMPORTANT)

The plan says "Create a vitest config (or workspace config)" but leaves the choice open. The project has no existing `vitest.config.ts`.

Fix: Pick one approach. Recommendation: single `vitest.config.ts` at root with `testTimeout: 30_000` -- simplest for a single-package project, and unit tests are fast enough that 30s won't mask issues.

## MINOR Issues

**MIN-1. INV-004 stateless-commands fitness function approach underspecified**

Sources: Holistic (MINOR), Software Architecture (MINOR)

The plan says "verify mutation commands require explicit target flags" but doesn't specify how.

Fix: Import the command registry (or use `schema --json` output) and verify every mutation command includes at least one of `--slice`, `--epic`, `--quest`, `--id` as a required argument.

**MIN-2. INV-006 schema-output-accuracy fitness function approach underspecified**

Source: Software Architecture (MINOR)

Fix: Specify that the test should spawn the binary with `schema --json`, parse output, and verify: (a) flag names match citty `args` keys, (b) required/optional status matches, (c) stdin schema present for commands that accept stdin.

**MIN-3. `withFixture` should use `GOODPLAN_DIR` env var**

Source: Holistic (MINOR)

The binary discovers `.project/` by walking up from cwd, which risks finding the repo's own `.project/`. Setting `GOODPLAN_DIR=<tempDir>/.project/` in the spawned process environment is more explicit and safer.

**MIN-4. Circuit breaker test should start at high round number**

Source: Holistic (MINOR)

Spawning 10 sequential binary invocations for `MAX_REFINEMENT_ROUNDS` is 2-5s for one test. Fixture should start at round 9 so only 1-2 spawns are needed.

**MIN-5. `buildBinary()` should cache across test files**

Source: TypeScript (MINOR)

`beforeAll` scopes to a single file. Multiple test files = multiple compilations. Use Vitest `globalSetup` to compile once, or a module-level singleton that checks if the binary already exists.

**MIN-6. `runCommand` return type should type `json` as `unknown` not `any`**

Source: TypeScript (MINOR)

Under `noUncheckedIndexedAccess: true`, `json` should be typed `unknown` to force callers to narrow, preventing silent type-safety escapes in test code.

**MIN-7. `concurrent-modification.test.ts` call pattern needs clarification**

Source: TypeScript (MINOR)

Plan says "Run `assembleState()` (or `loadState()`)" but the correct pattern is: `assembleState()` for initial read, then `commitState(dir, state, state)` after external modification. `loadState` has different semantics.

**MIN-8. Epic lifecycle test still uses descriptive phrases instead of exact CLI commands**

Source: TUI/CLI (MINOR)

The epic skip path in `workflow-epic.test.ts` says "skip explore -> define architecture -> ..." without exact commands. Slice and quest chains were fixed in round 1 but epic was missed.

Fix: List exact commands: `submit-explore --epic <name>`, `submit-architecture --epic <name>`, etc.

**MIN-9. `epic:create --json` error scenario description is misleading**

Source: Software Architecture (MINOR)

`epic:create` has no required flags -- it reads from stdin. The plan says "without required flags" but should say "with empty stdin" or `echo '{}' | ./goodplan epic:create --json`.

## DIRECTLY_ACTIONABLE

All 13 issues (4 IMPORTANT + 9 MINOR) are directly actionable.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

None -- no contradictions found between reviewers. The stdin payload issue was flagged at different severities (IMPORTANT by Holistic/SA, MINOR by TUI/CLI for the `slice:complete` case specifically); merged at IMPORTANT since it affects the entire workflow chain test approach.

## Unresolved (USER_INPUT required)

None.
