# TUI and CLI Review — Epic Lifecycle Plan (Round 2)

## Issues

**[IMPORTANT] Phase 5: `epic:complete` reads stdin `{verificationResults}` but no `--epic` flag shown in task description**

Phase 5's `epic:complete` task says "reads stdin JSON `{verificationResults}`, calls `complete({type:'epic', name}, input)`." But `name` must come from somewhere — the commands-api.md shows `epic:complete --epic <name>`. The task description omits the `--epic` flag requirement. Compare with `epic:abandon` which explicitly says "requires `--epic` and `--reason` flags." The `epic:complete` task should explicitly state that `--epic` is required, consistent with the other command descriptions and the architecture's INV-004 (target flags required).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 4: `begin()` payload parameter type safety is underspecified**

Phase 4 says `begin()` accepts "an optional `payload` parameter (or extend `WorkflowOptions` with `payload?: Record<string, unknown>`)". The `Record<string, unknown>` type loses all type safety — callers can pass any shape without compile-time checks. For a TypeScript project with `noUncheckedIndexedAccess` and strict types, this is a regression. The plan should specify that the payload is typed per BeginPhase (e.g., using a discriminated union or overloads) so that `begin('abandon', target, { payload: { reason: 'test' } })` is type-checked but `begin('explore', target, { payload: { reason: 'test' } })` would be a type error. At minimum, acknowledge the typing approach — even if the initial implementation uses `Record<string, unknown>`, note that type narrowing is needed to prevent misuse.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6: `submit-explore` and `submit-architecture` say "No stdin content" but expected behavior shows `echo '{}' | ... submit-refine-slices`**

Phase 6's expected behavior section shows `echo '{}' | bun run src/index.ts submit-refine-slices --epic my-epic --json`. This is correct for submit-refine-slices (which needs scores via stdin). But several submit commands say "No stdin content" (submit-explore, submit-architecture, submit-slices, submit-implementation). These commands should work fine when called without piped stdin (TTY → `readStdin()` returns `{}`). Worth confirming these commands do not block on stdin when called interactively — the existing `readStdin()` TTY fast-path handles this, but the task descriptions should note that stdin is optional (not required) for these commands, to avoid confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5: Human-readable output format is unspecified for most commands**

Phase 5 specifies human-readable output for `epic:create` ("shows name + status") and `epic:activate` ("shows activation success + active epic name") but not for the other 11 commands. The `output()` function in human mode expects a pre-formatted string. For consistency, each command task should briefly describe its human-readable output, or the plan should note a general pattern (e.g., "all phase transition commands show `{epicName}: {previousStatus} -> {newStatus}`"). Without this, implementers will either (a) inconsistently format output across commands or (b) need to make ad-hoc decisions during implementation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6: `submit-plan` guard "verifies plan.md exists" is a state machine concern, not a CLI concern**

Phase 6's tests say "submit-plan verifies plan.md exists." But per the architecture, CLI commands contain no business logic (commands-api.md: "No Business Logic" contract). The plan.md existence check is a state machine guard (COMPLETE_PLAN in Phase 3's slice-submit.ts with `hasChild` guard). The CLI test should verify the correct error is surfaced when the guard fails, not that the CLI itself checks for plan.md. This is a documentation clarity issue — the test description implies the CLI does the checking.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-1 IMPORTANT issues have been resolved. The plan now has explicit payload forwarding for `begin()`, flat registration for submit commands, `loadState()` usage for read-only commands, `--override` on all refinement submit commands, proper TTY-via-Zod documentation, and all 8 submit commands included. The remaining issues are relatively minor: one missing `--epic` flag mention, payload type safety specification, and human-readable output format consistency. These are small refinements that would bring the score to 10.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
