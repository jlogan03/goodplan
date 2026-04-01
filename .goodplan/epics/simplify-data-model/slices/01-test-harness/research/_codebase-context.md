# Codebase Context: Test Harness Foundation

## Fresh Documentation (Reliable References)

- `.goodplan/conventions.md` — tech stack (Bun 1.3, Vitest 4, Zod 4, Biome), repo structure, testing conventions (no filesystem mocks, use temp dirs with real `.goodplan/` structures). Last updated recently; accurate.
- `.goodplan/architecture/invariants.md` — INV-001 through INV-007. Relevant: INV-001 (all mutations through state machine), INV-005 (schema validation on read/write), INV-007 (structured errors with exit codes 0/1/2/3). These constrain what violation detection must check.
- `CLAUDE.md` — three-thing distinction (repo source, installed tools, `.goodplan/` state). Testing rules: use Agent SDK harness, don't ask user for manual tests, use `gp` CLI for state mutations.
- `tests/` structure is well-established: `unit/`, `integration/`, `fitness/`, `fixtures/`. The plan puts new tests at `tests/unit/dogfood-utils.test.ts` — this fits the existing layout.

## Current Harness Scripts — Patterns and Duplication

### 5 scripts, ~134KB total

| Script | Lines | Purpose | Model |
|---|---|---|---|
| `harness.ts` | ~600+ | Multi-phase dogfood of nondet-eval project | `claude-haiku-4-5` (default, with `patchSkillModels()`) |
| `validate.ts` | ~470 | Full workflow: 2 epics + 2 quests on flashcards project | `claude-opus-4-6` (hardcoded) |
| `test-plugin-skills.ts` | ~230 | Plugin skill discovery and execution | `claude-sonnet-4-6` (hardcoded) |
| `test-onboard.ts` | ~310 | `/onboard-repo` skill e2e + negative test | `claude-opus-4-6` (hardcoded) |
| `test-migrate.ts` | ~240 | `/migrate` skill e2e | `claude-opus-4-6` (hardcoded) |

### Duplication Analysis

**1. CLI Helper (gp/goodplan wrapper)** — duplicated 3 ways:
- `harness.ts`: `goodplan()` + `goodplanJson()` — most verbose, includes `describeExitCode()`, detailed error shape handling
- `validate.ts`: `gp()` + `gpJson()` + `gpForce()` — adds `--force` retry on `CONCURRENT_MODIFICATION`
- `test-onboard.ts` and `test-migrate.ts`: inline `execFileSync()` calls (no wrapper)
- Binary path varies: `~/bin/goodplan` (harness), `~/bin/goodplan` (validate — actually uses that path), `~/.local/bin/goodplan` (onboard, migrate), plugin binary path (test-plugin-skills)

**2. Logging** — duplicated 4 ways:
- `harness.ts`: `log(file, content)` appends to per-skill log files + `logFriction()` for friction log
- `validate.ts`: `log(file, content)` appends to log dir files
- `test-onboard.ts`: `log(content)` writes to both file and console
- `test-migrate.ts`: `log(content)` writes to both file and console
- `test-plugin-skills.ts`: `log(content)` writes to both file and console

**3. canUseTool / AskUserQuestion auto-responder** — duplicated 3 ways:
- `harness.ts`: full `canUseTool` with AskUserQuestion first-option auto-answer + violation detection
- `validate.ts`: `canUseTool` with AskUserQuestion first-option auto-answer + `checkViolation()`
- `test-onboard.ts` and `test-migrate.ts`: `canUseTool` with AskUserQuestion first-option auto-answer only
- `test-plugin-skills.ts`: no `canUseTool` (simpler tests)

**4. Violation detection** — duplicated 2 ways:
- `harness.ts`: inline in `canUseTool`, checks Read/Write/Edit on `.project/*.json|.jsonl|state.md` + Bash patterns
- `validate.ts`: separate `checkViolation()` function, same patterns but checks `.project/` (different directory name)

**5. AUTONOMOUS_SYSTEM_PROMPT** — duplicated 3 ways:
- `harness.ts`: detailed autonomous prompt mentioning nondet-eval project context
- `test-onboard.ts`: `AUTONOMOUS_PROMPT` (similar content, onboard-specific)
- `test-migrate.ts`: `AUTONOMOUS_PROMPT` (similar content, migrate-specific)
- `validate.ts`: `SYSTEM_APPEND` (shorter version)

**6. Cost tracking** — duplicated 2 ways:
- `harness.ts`: global `totalCostUsd` variable, accumulated in `runSkill()`
- `validate.ts`: `costUsd` per-skill in `runSkill()`, returned but not globally accumulated

**7. Model selection** — no shared mechanism:
- `harness.ts`: `patchSkillModels()` / `restoreSkillModels()` — rewrites skill files to replace "opus"/"sonnet" with "haiku", restores after. Fragile (file mutation + git checkout fallback).
- `validate.ts`: `MODEL` constant, hardcoded `claude-opus-4-6`
- `test-plugin-skills.ts`: hardcoded `claude-sonnet-4-6`
- Others: hardcoded `claude-opus-4-6`

**8. Entity status checking** — duplicated 2 ways:
- `harness.ts`: `epicStatus()` with archived-directory fallback
- `validate.ts`: `entityStatus(type, name)` — generic for epic/slice/quest

**9. query() call boilerplate** — each script has its own `for await (const message of query(...))` loop with message type switching. The structure is nearly identical across all 5 scripts.

### Auto-First-Option Pattern (to be removed per plan)

All scripts with `canUseTool` use the same pattern:
```typescript
const firstOption = q.options[0];
answers[q.question] = firstOption?.label ?? "Proceed";
```
This appears in: `harness.ts`, `validate.ts`, `test-onboard.ts`, `test-migrate.ts`.

### AUTONOMOUS_SYSTEM_PROMPT Usage

Present in 4 of 5 scripts (not test-plugin-skills.ts). Each has a variant telling the agent to not use AskUserQuestion and make autonomous decisions. The plan removes all of these.

## Recent Development Activity

Git log (last 3 months, 20 commits to `tools/dogfood/`):

- Most recent: `2f391dd` — open-source cleanup (likely superficial)
- `2f87258` — plugin skills integration testing + harness docs
- `015c41f` — test-onboard break-after-result fix
- `26a9aa9` — onboard-repo phase 1 + skill skeleton
- `2fdf4de` — migration test harness added
- `b8e788e` — Opus 4.6 validate.ts added
- Multiple `[dogfood-harness]` commits — iterative fixes for concurrent-mod, plan-refined.md, force flags, nuclear recovery

**Activity pattern**: heavy iteration from initial creation through stabilization. The `harness.ts` script went through ~12 commits of incremental fixes. Other scripts were added later and are more stable (1-3 commits each after creation).

**Last modification date**: all scripts last modified March 30, 2026 (the open-source cleanup commit).

## Key Conventions and Constraints

1. **Testing**: Vitest for unit/integration/fitness tests. No filesystem mocks — use real temp directories. The plan's `tests/unit/dogfood-utils.test.ts` follows this convention.
2. **TypeScript strictness**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. The `q.options[0]` pattern returns `T | undefined` — the existing code handles this correctly with `?.label ?? "Proceed"`.
3. **Error handling**: structured errors with codes. No empty catch blocks. CLI exit codes: 0=success, 1=internal, 2=validation, 3=state-machine.
4. **File naming**: kebab-case for files, camelCase for variables/functions.
5. **Agent SDK dependency**: `@anthropic-ai/claude-agent-sdk` — used for `query()`, `AskUserQuestionInput` type. The plan adds `AsyncIterable<SDKUserMessage>` and PreToolUse hook usage.
6. **Binary path**: varies across scripts. The plan should standardize on env var (`GP_CLI_PATH`) with fallback.
7. **`.goodplan/` vs `.project/`**: the codebase has migrated from `.project/` to `.goodplan/`. Some violation detection patterns still reference `.project/` — needs updating to `.goodplan/`.

## Areas of Churn vs Stability

**Active churn:**
- `harness.ts` — most complex, most commits, most workarounds. The plan's Phase 4 migration of this script will be the hardest.
- Violation detection patterns — evolved from `.project/` references, may need `.goodplan/` update.
- Model selection — `patchSkillModels()` in harness.ts is a hack that mutates source files. The plan replaces this with `parseModel()`.

**Stable:**
- `test-plugin-skills.ts` — simplest script, focused scope, minimal canUseTool needs.
- `validate.ts` — well-structured, clear separation of concerns, good extraction candidate.
- Test infrastructure (`tests/unit/`, `tests/integration/`, `tests/fitness/`) — mature, ~50+ test files, established helpers pattern.

**Stale/legacy:**
- The `~~archived~~` directory rename pattern in `harness.ts` `epicStatus()` — this was a legacy skill behavior. May not be relevant anymore.
- `GOODPLAN_BIN` path inconsistency across scripts — some use `~/bin/goodplan`, others `~/.local/bin/goodplan`. Needs standardization.

## Implementation Risks for the Plan

1. **AsyncIterable prompt for Agent SDK** — the plan assumes `query()` accepts `AsyncIterable<SDKUserMessage>` as the prompt. This is an Agent SDK feature that needs verification against the actual SDK version.
2. **PreToolUse hook** — the plan uses `canUseTool` (which already exists and works) but calls it "PreToolUse hook" — these appear to be the same thing. The deny-with-message behavior (`{ behavior: "deny", message: "..." }`) needs SDK verification.
3. **harness.ts complexity** — at ~600+ lines with heavy state management (epic lifecycle, slice cycles, model patching), Phase 4 migration of this script carries the highest risk.
4. **Binary path standardization** — four different paths across scripts. The `GP_CLI_PATH` env var approach is sound but needs fallback chain.
