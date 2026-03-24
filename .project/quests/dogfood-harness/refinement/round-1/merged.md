# Merged Review Feedback — Dogfood Harness Plan (Round 1)

## CRITICAL Issues

### C1. Phase 3 quest lifecycle skips required `plan-refined` state — hard failure at runtime
**Reviewers:** Software Architecture, Holistic
**File:** plan.md (Phase 3)

The plan says "Skip `/refine-plan` for the quest (tests direct plan-to-implement path)." The quest transition tables require `plan-refined` status AND the guard `hasChild(state, "quests/<name>", "plan-refined.md")` before `BEGIN_QUEST_IMPLEMENTATION`. There is no skip path from `plan-created` to `implementing`. The state machine will reject with `STATE_CONTENT_MISSING`.

**Fix:** Either (a) include `/refine-plan` in the Phase 3 quest lifecycle, or (b) explicitly call `quest:refine-plan` to advance through `refining` -> `plan-refined` before implementation. Update the phase tasks and before/after checks accordingly.

Resolution: DIRECTLY_ACTIONABLE

---

### C2. Harness does not differentiate CLI exit codes (1/2/3) in error handling
**Reviewer:** CLI
**File:** `tools/dogfood/harness.ts` — `goodplan()` helper

The `goodplan()` helper collapses all non-zero exits into `{ ok: false }`. The CLI defines three distinct exit codes per INV-007: exit 2 (validation/usage — fix invocation), exit 3 (state machine — may be idempotent re-entry, recoverable), exit 1 (internal — stop). Without exit code parsing, the harness will attempt manual recovery on internal errors (exit 1) and miss the idempotent re-entry pattern for exit 3.

**Fix:** Update `goodplan()` to expose the exit code and parsed error JSON. Branch state-recovery logic on exit code per `cli-interaction-conventions.md`.

Resolution: DIRECTLY_ACTIONABLE

---

### C3. "Before" verification checks are not falsifiable against current code
**Reviewer:** Holistic
**File:** plan.md (Phase 1, Phase 2 before-checks)

Phase 1 before-check says `bun tools/dogfood/harness.ts 2 explore` should "fail or produce no useful output" but the existing harness already has a working `phase2Explore()` wired up. Phase 2 before-check similarly claims code "fails after explore" but `phase2Architecture()` etc. are already wired.

**Fix:** Rewrite before-checks to assert specific absent behaviors — e.g., verify no `canUseTool` callback in source, verify model defaults to opus/sonnet, verify no `reset` subcommand, verify no exit-code branching logic.

Resolution: DIRECTLY_ACTIONABLE

---

### C4. `"result" in message` type narrowing is fragile — plan perpetuates it
**Reviewer:** TypeScript
**File:** `tools/dogfood/harness.ts` (line 132)

Uses `"result" in message` to detect successful results. `SDKResultError` lacks a `result` field so this happens to work, but relies on an implementation detail rather than the discriminated union. The plan doesn't address fixing this.

**Fix:** Switch to `message.type === "result" && message.subtype === "success"` as documented in the Agent SDK research.

Resolution: DIRECTLY_ACTIONABLE

---

### C5. `canUseTool` plan uses `(input as any)` pattern — violates project anti-patterns
**Reviewer:** TypeScript
**File:** plan.md (Phase 1 `runSkill()` rewrite)

The plan references the research's `canUseTool` approach which casts `input as any` to access `questions`. This violates the project's ban on `as any`.

**Fix:** Import or define the `AskUserQuestion` input type from the SDK's type definitions and use proper type narrowing.

Resolution: CODEBASE_EXPLORATION

---

## IMPORTANT Issues

### I1. `canUseTool` vs `disallowedTools` — conflicting AskUserQuestion strategies
**Reviewer:** Software Architecture
**File:** plan.md (Phase 1)

The plan calls for `canUseTool` callback to intercept `AskUserQuestion` while also keeping system prompt append as a "soft guard." The research also shows `disallowedTools: ["AskUserQuestion"]` as an option. These are mutually exclusive — if `AskUserQuestion` is in `disallowedTools`, `canUseTool` will never fire for it.

**Fix:** Clarify strategy: use `canUseTool` to intercept and auto-respond (capturing questions in friction log). Do NOT use `disallowedTools` for `AskUserQuestion`.

Resolution: DIRECTLY_ACTIONABLE

---

### I2. `goodplanJson()` has no error handling — unsafe parse, no `result.ok` check
**Reviewers:** TypeScript, Software Architecture, Holistic
**File:** `tools/dogfood/harness.ts` (lines 57-60)

`JSON.parse(result.stdout) as T` without checking `result.ok` or wrapping in try/catch. If the CLI returns non-JSON, this throws an unstructured `SyntaxError`. With `noUncheckedIndexedAccess`, callers treat the returned `T` as fully typed with no runtime validation.

**Fix:** (a) Check `result.ok` before parsing. (b) Wrap in try/catch with descriptive error including raw stdout. (c) Consider Zod validation for critical paths.

Resolution: DIRECTLY_ACTIONABLE

---

### I3. `message.subtype === "tool_use"` on system messages is incorrect — tool call counter always zero
**Reviewers:** Holistic, TypeScript
**File:** `tools/dogfood/harness.ts` (line 139)

System message subtypes are `init`, `status`, `task_started`, etc. Tool use blocks appear in `assistant` messages, not `system` messages. The `toolCalls` counter is always 0.

**Fix:** Count tool calls from `assistant` message content blocks where `block.type === "tool_use"`.

Resolution: DIRECTLY_ACTIONABLE

---

### I4. Phase 3 quest lifecycle uses wrong CLI commands / missing quest-specific flags
**Reviewers:** CLI, Holistic
**File:** plan.md (Phase 3)

Quest submit commands require `--quest` flag: `submit-plan --quest <name>`, `submit-implementation --quest <name>`. The plan doesn't mention these quest-specific flags. Also, `quest:plan` sets `activeQuest` in project.json with a `STATE_QUEST_ALREADY_ACTIVE` guard the harness should handle.

**Fix:** Update Phase 3 tasks to use `--quest <name>` on all submit commands. Add handling for `STATE_QUEST_ALREADY_ACTIVE`.

Resolution: DIRECTLY_ACTIONABLE

---

### I5. `reset` command is under-specified — missing CLI invocations, stdin payloads, error handling
**Reviewers:** Holistic, CLI
**File:** plan.md (Phase 1)

Plan says "Run `epic:create` with core-provider name/goal" and "Write `goal.md`" but doesn't specify: (a) the exact CLI invocation with flags, (b) the stdin JSON payload shape for `epic:create` (`{"name": "core-provider", "goal": "..."}`), (c) error handling if any step fails, (d) whether `goal.md` is an epic goal (stored in `epic.json` via CLI) or a free-form file. Per data ownership conventions, the epic goal is set via `epic:create` stdin, not a separate `goal.md`.

**Fix:** Specify exact CLI commands with `--json` flag, stdin payloads, and error handling for each reset step. Clarify `goal.md` ownership.

Resolution: DIRECTLY_ACTIONABLE

---

### I6. No `--json` flag on all CLI calls in the plan
**Reviewer:** CLI
**File:** plan.md (Phase 1, 3, 4)

CLI interaction conventions require `--json` for structured output. The plan's `reset`, `quest:create`, `quest:show`, `epic:create` descriptions omit `--json`.

**Fix:** Add `--json` to all CLI command descriptions in the plan.

Resolution: DIRECTLY_ACTIONABLE

---

### I7. Missing stdin piping documentation for commands that require it
**Reviewer:** CLI
**File:** plan.md (Phase 1, 3)

`epic:create` requires stdin JSON, `quest:create` similarly needs stdin. The plan should document the expected stdin payloads. (The existing `goodplan()` helper correctly sends `input: opts.stdin ?? ""` so the code side is fine.)

**Fix:** Document expected stdin payloads for `epic:create`, `quest:create`, and completion commands.

Resolution: DIRECTLY_ACTIONABLE

---

### I8. Log directory path — no explicit task to relocate constants
**Reviewers:** Holistic, Software Architecture, CLI
**File:** `tools/dogfood/harness.ts` — `LOG_DIR` and `FRICTION_LOG` constants

Logs are hardcoded to `.project/epics/__active__skills-cli-integration/slices/06-dogfooding/`. The plan says to use `.project/quests/dogfood-harness/harness-logs/` but no task explicitly says "change LOG_DIR and FRICTION_LOG constants."

**Fix:** Add explicit task in Phase 1 to update `LOG_DIR` and `FRICTION_LOG` constants to the new quest-based path.

Resolution: DIRECTLY_ACTIONABLE

---

### I9. No error recovery / state-check between steps in Phase 1
**Reviewer:** Software Architecture
**File:** plan.md (Phase 1)

Phase 1 exercises explore end-to-end but state recovery is deferred to Phase 2. The existing harness already has manual `submit-explore` fallback logic. The plan doesn't say whether Phase 1's rewrite preserves or strips this.

**Fix:** Explicitly state whether Phase 1's `phase2Explore()` rewrite includes existing recovery logic or defers it. If deferred, note the explore step may fail without recovery in Phase 1.

Resolution: DIRECTLY_ACTIONABLE

---

### I10. `process.env.HOME!` non-null assertion without validation
**Reviewer:** TypeScript
**File:** `tools/dogfood/harness.ts` (line 20)

With `noUncheckedIndexedAccess`, `process.env.HOME` is `string | undefined`. Using `!` is fragile.

**Fix:** Validate required environment variables at startup with clear error messages.

Resolution: DIRECTLY_ACTIONABLE

---

### I11. Error catch block uses unsafe `as { stdout?: string; ... }` type assertion
**Reviewer:** TypeScript
**File:** `tools/dogfood/harness.ts` (line 52)

Caught error cast with `as { ... }` instead of proper type narrowing. If `execFileSync` throws a different error shape, destructuring silently produces `undefined`.

**Fix:** Use Bun's / Node's typed `child_process` error types or a type guard.

Resolution: DIRECTLY_ACTIONABLE

---

### I12. `logFriction` assumes friction log file exists
**Reviewer:** TypeScript
**File:** `tools/dogfood/harness.ts` (line 74)

`readFileSync(FRICTION_LOG)` will throw if the file doesn't exist. With path relocation, this is likely.

**Fix:** Create friction log if absent before reading, or use `appendFileSync` directly.

Resolution: DIRECTLY_ACTIONABLE

---

### I13. Phase 2 `complete` skill prompt is ambiguous about target entity
**Reviewer:** CLI
**File:** plan.md (Phase 2)

`/complete` for a slice requires `verificationPassed`, `deferred`, `learnings`, `architectureDelta` via `slice:complete --slice <name>`. `/complete` for an epic requires `verificationResults` via `epic:complete --epic <name>`. The plan prompts don't differentiate.

**Fix:** Ensure prompts pass correct entity identification and construct appropriate completion payloads per `commands-api.md`.

Resolution: DIRECTLY_ACTIONABLE

---

### I14. Phase 4 architecture proposal approval bypasses state machine (INV-001)
**Reviewers:** Software Architecture, CLI
**File:** plan.md (Phase 4)

Plan says "Manual approval: copy `architecture-proposal/` to `architecture/`, write `approved.md`." This is direct filesystem manipulation that bypasses INV-001 (every state mutation goes through the state machine).

Resolution: CODEBASE_EXPLORATION

---

### I15. Plan/harness conflates plan "phases" with goodplan phases — naming collision
**Reviewer:** Software Architecture
**File:** plan.md

Plan refers to "Phase 1-4" at the plan level, but the harness code uses "Phase 2" internally for the first epic lifecycle. Creates confusion about what "Phase 2" means.

**Fix:** Use distinct terminology for plan phases (e.g., "Step 1: Core Harness", "Step 2: Full Pipeline", "Step 3: Quest Lifecycle") or add an explicit mapping note.

Resolution: DIRECTLY_ACTIONABLE

---

### I16. Harness exit codes not specified for the harness itself
**Reviewer:** CLI
**File:** plan.md

Plan defines "exits 0" for success but doesn't specify failure exit codes. No top-level try/catch. Errors in individual phases just log and continue or crash with unhandled exceptions.

**Fix:** Add a task for structured harness exit codes (0 for pass, non-zero for failures) and a final summary report.

Resolution: DIRECTLY_ACTIONABLE

---

### I17. Missing `model` field name verification for `query()` options
**Reviewer:** TypeScript
**File:** plan.md (Phase 1)

Plan says "Add `model` option defaulting to `claude-haiku-4-5`" but doesn't confirm the SDK field name is `model` (could be `modelId` or similar).

Resolution: CODEBASE_EXPLORATION

---

## MINOR Issues

### M1. No budget/cost tracking across the full run
**Reviewer:** Software Architecture
**File:** plan.md

Individual `runSkill()` calls have `maxBudgetUsd` but no aggregate tracking. `SDKResultSuccess` includes `total_cost_usd` — should accumulate and report.

Resolution: DIRECTLY_ACTIONABLE

---

### M2. Phase 2 verification says code "doesn't need to compile" — undermines harness value
**Reviewer:** Software Architecture
**File:** plan.md (Phase 2)

Accepting non-compiling code means `verificationPassed: true` is misleading. Should at least run `bun tsc --noEmit` and log the result.

Resolution: DIRECTLY_ACTIONABLE

---

### M3. No documentation update tasks
**Reviewer:** Holistic
**File:** plan.md

No README or header comment explaining how to run the harness, prerequisites, or expected outputs.

Resolution: DIRECTLY_ACTIONABLE

---

### M4. Phase 4 architecture proposal path is under-specified
**Reviewer:** Holistic
**File:** plan.md (Phase 4)

Plan doesn't specify what CLI commands trigger the "proposal path" vs "direct write" path, or whether `approved.md` is a CLI-enforced convention.

Resolution: DIRECTLY_ACTIONABLE

---

### M5. `const [phase, step] = process.argv.slice(2)` — tsconfig coverage question
**Reviewer:** TypeScript
**File:** `tools/dogfood/harness.ts`

File is in `tools/` but `tsconfig.json` includes only `src/**/*.ts`. Plan should note whether Bun's implicit checking covers `tools/` or if separate tsconfig is needed.

Resolution: DIRECTLY_ACTIONABLE

---

### M6. `bun test` verification clarification
**Reviewer:** TypeScript
**File:** plan.md

Plan says "bun test passes" but the harness has no unit tests. Should clarify this verifies no regressions in main codebase, not harness test coverage.

Resolution: DIRECTLY_ACTIONABLE

---

### M7. No `--help` or usage text testing
**Reviewer:** CLI
**File:** plan.md

Harness is a CLI tool with basic usage text but no verification of its own help output.

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE (for loop exit)

| # | File | Change | Why |
|---|------|--------|-----|
| C1 | plan.md Phase 3 | Add `/refine-plan` step (or `quest:refine-plan` CLI call) before implementation in quest lifecycle | State machine requires `plan-refined` status + `plan-refined.md` guard |
| C2 | plan.md Phase 1 | Add task: update `goodplan()` to expose exit code + parsed error JSON; add exit-code branching to state-recovery logic (exit 2=fix invocation, exit 3=check idempotent re-entry, exit 1=stop) | Without this, recovery logic is blind to error type |
| C3 | plan.md Phase 1-2 | Rewrite before-checks to assert specific absent behaviors (no `canUseTool` in source, no model override, no `reset` subcommand, no exit-code branching) | Current before-checks test conditions that are already true |
| C4 | plan.md Phase 1 logging task | Add: switch `"result" in message` to `message.type === "result" && message.subtype === "success"` | Current pattern relies on implementation detail, not discriminated union |
| I1 | plan.md Phase 1 | Clarify: use `canUseTool` for AskUserQuestion interception (captures questions in friction log). Do NOT add `AskUserQuestion` to `disallowedTools`. Remove system prompt append as primary guard (keep as soft secondary only). | Strategies are mutually exclusive at SDK level |
| I2 | plan.md Phase 1 | Add task: harden `goodplanJson()` — check `result.ok`, wrap `JSON.parse` in try/catch, include raw stdout in error | Unhandled `SyntaxError` will crash harness |
| I3 | plan.md Phase 1 logging task | Fix tool call counting: check `message.type === "assistant"` then count `content.filter(b => b.type === "tool_use")` | Current code checks system messages — counter is always 0 |
| I4 | plan.md Phase 3 | Add `--quest <name>` to all submit commands; handle `STATE_QUEST_ALREADY_ACTIVE` | Quest commands require quest flag; active quest guard exists |
| I5 | plan.md Phase 1 reset task | Specify: (a) `goodplan init --name nondet-eval --json`, (b) `echo '{"name":"core-provider","goal":"..."}' \| goodplan epic:create --json`, (c) error handling per step, (d) clarify goal.md vs epic.json ownership | Implementer cannot execute without these details |
| I6 | plan.md all phases | Add `--json` flag to every CLI command description | Convention requires structured output |
| I7 | plan.md Phase 1, 3 | Document stdin payloads for `epic:create`, `quest:create`, completion commands | Commands will block or fail without correct stdin |
| I8 | plan.md Phase 1 | Add explicit task: update `LOG_DIR` and `FRICTION_LOG` constants to `.project/quests/dogfood-harness/harness-logs/` | Old paths point to stale epic slice directory |
| I9 | plan.md Phase 1 | State whether Phase 1 explore rewrite preserves existing `submit-explore` fallback or defers recovery to Phase 2 | Ambiguity about what's included in Phase 1 |
| I10 | plan.md Phase 1 | Add task: validate `process.env.HOME` (and other required env vars) at startup with clear error | Non-null assertion on potentially undefined value |
| I11 | plan.md Phase 1 | Add task: replace `as { stdout?: string }` catch block with proper type guard or Node/Bun typed errors | Unsafe cast silently produces undefined on unexpected error shapes |
| I12 | plan.md Phase 1 | Add task: create friction log file if absent, or use `appendFileSync` | `readFileSync` throws on missing file |
| I13 | plan.md Phase 2 | Differentiate slice `/complete` (needs `verificationPassed`, `deferred`, `learnings`, `architectureDelta`) from epic `/complete` (needs `verificationResults`) in prompts | Different entities require different payloads |
| I15 | plan.md | Rename plan-level phases to "Step 1-4" or add explicit mapping note distinguishing plan phases from harness/goodplan phases | "Phase 2" is ambiguous between plan and harness contexts |
| I16 | plan.md | Add task: top-level try/catch, structured exit codes (0=pass, 1=fail), final summary report | Harness currently crashes or silently continues on errors |
| M1 | plan.md | Add task: accumulate `total_cost_usd` from `SDKResultSuccess` across all runs, report at end | No aggregate cost visibility |
| M2 | plan.md Phase 2 | Change verification to run `bun tsc --noEmit` and log result (pass/fail) even if not blocking | "Doesn't need to compile" undermines verification value |

## RESEARCH_NEEDED

All research completed. See Available Research section.

### R1. Sub-agent model propagation — RESOLVED
`options.model` propagates to sub-agents that omit or set `model: 'inherit'`. BUT skills hardcode `model: "opus"` in Agent tool calls. User solution: temporarily patch skill files to use haiku. Best targets: `_shared/references/iteration-loop.md` + `implement-plan/SKILL.md` (covers ~80% of spawns).

### R2. `canUseTool` input parameter typing (C5)
**Source:** TypeScript (CODEBASE_EXPLORATION)
**What to look up:** Check `@anthropic-ai/claude-agent-sdk` exported types for `canUseTool` input parameter typing. Look at `node_modules/@anthropic-ai/claude-agent-sdk/dist/sdk.d.ts` for `CanUseToolInput` or equivalent, and the `AskUserQuestion` input shape.
**Why it matters:** Plan uses `as any` which violates project anti-patterns. Need proper types for type-safe `canUseTool` implementation.
**Tool strategy:** Grep/Read in `node_modules/@anthropic-ai/claude-agent-sdk/`.

### R3. `query()` model field name (I17)
**Source:** TypeScript (CODEBASE_EXPLORATION)
**What to look up:** Check `@anthropic-ai/claude-agent-sdk` type definitions for the correct field name to specify model in `query()` options (`model`, `modelId`, or other).
**Why it matters:** Plan specifies `model` field but needs verification.
**Tool strategy:** Read `node_modules/@anthropic-ai/claude-agent-sdk/dist/sdk.d.ts`, search for `QueryOptions` or similar.

### R4. Phase 4 architecture proposal path — CLI support (I14)
**Source:** Software Architecture + CLI (CODEBASE_EXPLORATION)
**What to look up:** Does the CLI support a "proposal path" for architecture (separate from direct write)? Check `submit-architecture` / `epic:define-architecture` commands. Is `approved.md` a CLI convention?
**Why it matters:** If CLI doesn't support proposal path, Phase 4's manual copy violates INV-001. If it does, the plan should reference the correct commands.
**Tool strategy:** Grep for `submit-architecture`, `define-architecture`, `proposal` in `src/` commands. Read transition tables for architecture-related events.

### R5. Quest skill compatibility — `/create-plan` and `/implement-plan` for quests (Holistic I5)
**Source:** Holistic (CODEBASE_EXPLORATION)
**What to look up:** Do the `/create-plan` and `/implement-plan` skills work for quests (not just slices)? What entity context do they need?
**Why it matters:** Phase 3 relies on these skills working for quests. If they're slice-only, quest lifecycle will fail.
**Tool strategy:** Grep for `create-plan`, `implement-plan` in skills directories. Check if they accept quest context.

## Contradictions Resolved

1. **Quest lifecycle skip (C1):** Holistic flagged as "needs verification" (CODEBASE_EXPLORATION). Software Architecture gave the definitive answer: transition tables explicitly require `plan-refined` status + `plan-refined.md` guard. **Trusted Software Architecture** as the domain specialist — upgraded to CRITICAL/DIRECTLY_ACTIONABLE.

2. **`canUseTool` vs `disallowedTools` (I1):** Only Software Architecture flagged this explicitly. No contradiction — accepted as stated.

3. **Phase 4 proposal path (I14):** Holistic said "under-specified" (MINOR). Software Architecture and CLI both flagged INV-001 violation (IMPORTANT). **Trusted Software Architecture and CLI** — kept as IMPORTANT/CODEBASE_EXPLORATION since the right approach depends on whether the CLI supports proposal paths.

4. **`goodplanJson` error handling:** Flagged by three reviewers (Holistic as MINOR, TypeScript and Software Architecture as IMPORTANT). **Trusted TypeScript** for severity since it's a type safety concern with `noUncheckedIndexedAccess` — kept as IMPORTANT.

## Unresolved (USER_INPUT required)

None — all resolved.

## USER_INPUT Resolved

1. **Sub-agent model propagation:** User wants to temporarily update model frontmatter in skill files (in the repo's `skills/` directory) to specify haiku, then restore them after testing. The `reset` command or a prep step should handle this patching. This eliminates the cost risk without relying on system prompt overrides.

2. **Phase 2 code compilation:** Log `bun tsc --noEmit` results but don't block the harness run. Compilation failures are informational.

3. **Phase 4 architecture proposal:** Use CLI commands (not manual file copy). Research needed to identify the correct CLI commands for proposal approval (likely `start-epic` or similar).

## Available Research

- `/Users/iwhite/Repos/goodplan/.project/quests/dogfood-harness/research/agent-sdk-harness.md` — Agent SDK v0.2.81 comprehensive research
- `/Users/iwhite/Repos/goodplan/.project/quests/dogfood-harness/research/agent-sdk-types.md` — SDK type definitions: model field, canUseTool typing, sub-agent propagation
- `/Users/iwhite/Repos/goodplan/.project/quests/dogfood-harness/research/cli-quest-proposal.md` — Quest lifecycle commands, architecture proposal approval path
- `/Users/iwhite/Repos/goodplan/.project/quests/dogfood-harness/research/skill-model-config.md` — Skill model configuration, patch strategy for haiku forcing
- `/Users/iwhite/Repos/goodplan/.project/quests/dogfood-harness/research/_codebase-context.md` — Codebase context summary

### Key Research Findings for Editor

1. **Model field**: `model?: string` in `Options` type. Use `model: "claude-haiku-4-5"`.
2. **canUseTool input**: `Record<string, unknown>`. Import `AskUserQuestionInput` from `sdk-tools.d.ts` for type-safe casting (not `as any`).
3. **Sub-agent model forcing**: Patch `_shared/references/iteration-loop.md` + `implement-plan/SKILL.md` to replace `"opus"`/`"sonnet"` with `"haiku"`. Add reset/restore step to harness.
4. **Quest lifecycle**: All submit commands support `--quest <name>`. Full lifecycle: quest:create → quest:plan → submit-plan --quest → quest:refine-plan → submit-refinement --quest → quest:implement → submit-implementation --quest → quest:complete.
5. **Architecture proposal approval**: No CLI command exists for approval. Manual filesystem operation is the current path. `/start-epic` is broken. This is a known friction gap — log as friction item.
6. **Compilation**: Log `bun tsc --noEmit` results without blocking.
