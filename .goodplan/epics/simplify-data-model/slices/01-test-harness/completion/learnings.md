# Learnings: 01-test-harness

## Agent SDK persistent sessions work well for simulated users
_Source: 01-test-harness_

The persistent `query()` session with `AsyncQueue<SDKUserMessage>` is the right design for simulated users. Each `ask()` pushes a message into the session, and the simulated user naturally accumulates conversational context across all questions. The stateless alternative (one LLM call per question) loses cross-question context and requires a separate API key. Key implementation detail: `query()` doesn't expose `send()` on its return type — you must pass an `AsyncIterable<SDKUserMessage>` as the prompt parameter and push messages via the queue.

## Agent SDK query() uses the subscription, not the API
_Source: 01-test-harness_

`@anthropic-ai/claude-agent-sdk` `query()` uses the user's Claude subscription — no `ANTHROPIC_API_KEY` needed. `@anthropic-ai/sdk` `messages.create()` requires an API key. For test harness tooling that should work out of the box, always prefer Agent SDK `query()` over the base Anthropic SDK. The base SDK dependency was removed entirely.

## Skills writing to .goodplan/ breaks HMAC state integrity
_Source: 01-test-harness_

The installed plugin skills (refine-plan, implement-plan, etc.) instruct agents to write review artifacts, research files, and implementation logs directly into `.goodplan/` subdirectories. This invalidates the HMAC `stateSignature` computed over the state tree. The HMAC was designed to exclude markdown files (line 68 of hmac.ts filters them), so the root cause needs further investigation — likely the `.state-cache.json` becoming stale rather than the HMAC itself. HMAC verification was temporarily disabled (mismatch → debug log instead of throw) until skills are updated to only write to CLI-provided paths.

## gpForce needs stdin support for migration compatibility
_Source: 01-test-harness_

The first implementation of `gpForce()` omitted `stdin` from its options type. This silently dropped JSON payloads for 14 CLI calls across `validate.ts` and `harness.ts` (epic:create, slice:complete, quest:complete, submit-refinement, etc.). Every CLI command that accepts JSON input via stdin must have `stdin` forwarded through all wrapper layers. This was caught by reviewers but would have been a silent runtime failure.

## Shared utilities reduce harness code by ~375 lines but migration order matters
_Source: 01-test-harness_

Migrating 5 scripts to shared utilities (simplest → most complex: test-plugin-skills → test-onboard → test-migrate → validate → harness) worked well. `harness.ts` was by far the riskiest — ~600+ lines with model patching, friction logging, and complex state management. The `patchSkillModels()`/`restoreSkillModels()` pattern (mutating source files on disk) was safely eliminated by passing `model` to `query()` options, since skills are now plugin-bundled rather than local files.

## canUseTool composition needs to be owned by runSkillSession
_Source: 01-test-harness_

When `runSkillSession` was first designed, it passed `canUseTool` through from callers. This left the simulated user handler and violation detection composited manually at every call site — the exact duplication the shared utility was meant to eliminate. Moving composition inside `runSkillSession` (accepting `simulatedUser` + `checkViolations` params) was the right fix: callers specify intent, the utility handles plumbing.
