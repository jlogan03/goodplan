# Side Quest: Dogfood Test Harness

## What We're Building

A test harness using `@anthropic-ai/claude-agent-sdk` that programmatically runs goodplan skills in the nondet-eval repo, enabling automated dogfooding of the full epic lifecycle without requiring interactive sessions.

## Why

Skills can't complete in `claude -p` mode — they pause for interactive approval via `AskUserQuestion`. This blocks automated dogfooding. The Agent SDK provides `query()` with `cwd`, `permissionMode`, hooks, and message streaming, giving us full programmatic control over skill execution.

## Behavior

1. A TypeScript script that orchestrates Phase 2-4 of the dogfooding plan
2. Uses `query()` from `@anthropic-ai/claude-agent-sdk` to invoke skills in `~/Repos/nondet-eval`
3. Handles `AskUserQuestion` via system prompt override (autonomous decisions) or hooks
4. Runs CLI state transitions between skill invocations
5. Logs all friction to the dogfooding friction log
6. Produces a structured report of each skill run (messages, tool calls, errors, duration)

## Success Criteria

- [ ] Harness can run `/explore` end-to-end (skill completes, state transitions, research files written)
- [ ] Harness can run `/create-architecture` end-to-end
- [ ] Harness can chain multiple skills in sequence (explore → architecture → slices → plan)
- [ ] Friction is automatically logged
- [ ] Each run produces a log file with enough detail to diagnose issues

## Scope Boundaries

**In scope:** Harness for Phases 2-4 skills, CLI transition glue, friction logging, run logs
**Out of scope:** Full Phase 5 verification (stays manual), harness for non-goodplan projects
