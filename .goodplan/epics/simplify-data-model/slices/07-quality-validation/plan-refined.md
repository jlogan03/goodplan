# Plan: Quality Validation — Full Opus-Powered E2E Workflow

## Overview

Create `validate-consolidated.ts`, a new test harness that runs the complete 12-skill consolidated workflow end-to-end with Opus powering both the skills and simulated user responses. The harness uses a realistic flashcard app fixture and validates output quality via measurable proxy metrics (architecture depth, plan structure, review severity, compile/lint/test, learnings count, orchestrator discipline). Phase 1 writes the harness and fixture; Phase 2 runs it at Opus tier and fixes any bugs discovered.

## Phases

### Phase 1: Harness + Fixture

#### Expected Behavior
**Before implementation** (should fail / show absence):
- [ ] `tools/dogfood/validate-consolidated.ts` does not exist
- [ ] No quality proxy metric assertions exist for architecture, plans, reviews, implementation, learnings, or orchestrator discipline in any single harness

**After implementation** (should pass / show presence):
- [ ] `tools/dogfood/validate-consolidated.ts` exists and compiles (`bun build tools/dogfood/validate-consolidated.ts`)
- [ ] Harness generates a realistic flashcard app fixture (TypeScript, 3-5 source files, package.json with dependencies, at least one test file)
- [ ] Harness invokes the full pipeline: init -> create-epic -> plan-slice -> implement -> create-side-quest -> audit -> complete-epic
- [ ] Quality proxy metric checks are present: architecture size (>= 500 chars, >= 3 `##` headings), plan structure (>= 3 phases with file paths), review severity (>= 1 IMPORTANT/CRITICAL), implementation (bun build + lint + test), learnings (>= 2, each >= 100 chars), orchestrator discipline (zero Read violations)
- [ ] Cost tracking is present and logged per skill run and total

#### Tasks
- [ ] Create `tools/dogfood/validate-consolidated.ts` following the pattern from `validate.ts` and `test-create-epic.ts`
  - Import shared utilities from `tools/dogfood/utils.ts` (`createSimulatedUser`, `runSkillSession`, `verifyEntityStatus`, `isSuccess`, `parseModel`, `tierDefault`, `gp`, `gpForce`, `gpJson`, `verifyNoArtifactReads`, `createLogger`). Note: `createToolCallTracker` is defined locally in `test-create-epic.ts`, not in utils.ts — define it locally in validate-consolidated.ts or extract to utils.ts
  - Use `import type` for type-only imports (`CliResult`, `SDKMessage`, `SDKResultMessage`, `SkillSessionResult`) to satisfy `verbatimModuleSyntax: true`
  - Accept `--model` CLI arg (default: `tierDefault("e2e")` which maps to `claude-opus-4-6`)
  - Accept `--max-iterations` CLI arg (default: 1 for cost control)
- [ ] Preflight: plugin build + cache sync
  - Run `bun run build:plugin` to ensure latest skills are compiled
  - Rsync from `dist/` to `~/.claude/plugins/cache/` (matching `test-create-epic.ts` preflight pattern) so the Agent SDK discovers updated skills
- [ ] Wire tool call tracking and violation checking for all pipeline runs
  - Define a `createToolCallTracker` function locally (adapted from `test-create-epic.ts` pattern — not in utils.ts) and wire into each `runSkillSession`'s `onMessage` callback via `createLogger` for logging
  - Pass `checkViolations: true` on all `runSkillSession` calls to detect state write violations
  - Feed accumulated tool calls to `verifyNoArtifactReads` at the end for orchestrator discipline verification
- [ ] Implement realistic flashcard app fixture generation function
  - Create temp directory with: `package.json` (name, type:module, dependencies: typescript, devDependencies: `@biomejs/biome`, scripts: `{ "build": "bun build src/index.ts --outdir dist", "lint": "biome check .", "test": "bun test" }`), `tsconfig.json`, `biome.json` (with `{ "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json", "linter": { "enabled": true, "rules": { "recommended": true } }, "organizeImports": { "enabled": true } }`)
  - Run `bun install` in the fixture directory after generating files and before git init
  - 3-5 source files: `src/index.ts` (CLI entry), `src/card.ts` (Card type + loader), `src/quiz.ts` (quiz engine), `src/score.ts` (score tracker)
  - At least one test file: `tests/card.test.ts`
  - Git init + commit
  - Project idea that requires real architectural decisions (multi-module CLI app with persistence, formatting, spaced repetition potential)
- [ ] Implement the full pipeline invocation sequence with per-step error handling and fallback/recovery
  - Each skill invocation must: (1) run the skill, (2) check entity status after, (3) if failed, log the error, preserve artifacts, and apply `gpForce` fallback to advance state, (4) log whether the skill or the fallback achieved the target state
  - `/gp:init` — onboard the fixture repo; fallback: verify `.goodplan/` directory exists
  - `/gp:create-epic` — full 6-phase pipeline for "add spaced repetition with SM-2 algorithm"; fallback: force-activate epic if stuck in draft
  - Activate epic if pipeline didn't reach active status (use `gpForce` fallbacks like `validate.ts`)
  - `/gp:plan-slice` — plan the first slice; fallback: create `plan-refined.md` if missing (like `validate.ts`)
  - `/gp:implement` — implement the first slice; fallback: force-complete slice if implementation succeeded but completion failed
  - `/gp:create-side-quest` — capture and plan a side quest ("add markdown card import"); fallback: skip to next skill with degraded verification
  - `/gp:audit` — architecture mode audit; fallback: skip to next skill with degraded verification
  - `/gp:complete-epic` — complete the epic after marking remaining slices done; explicitly list `gpForce` commands to mark unimplemented slices as complete before invocation
- [ ] Implement per-skill simulated user configurations (matching `test-create-epic.ts` pattern)
  - Create a separate `createSimulatedUser` instance per skill invocation, each with a skill-specific system prompt
  - Base persona: senior TypeScript developer building a CLI flashcard app
  - `/gp:init` user: answers onboarding questions (project name, description, conventions)
  - `/gp:create-epic` user: answers architecture Q&A (simple modules, Bun, JSON persistence, kebab-case naming), slice ordering, dependency declarations, exploration termination signals
  - `/gp:plan-slice` user: answers approach decisions (implementation strategy, phasing preferences)
  - `/gp:implement` user: approves implementation steps, provides build/test guidance
  - `/gp:create-side-quest` user: describes side quest goal ("add markdown card import"), answers scoping questions
  - `/gp:audit` user: selects architecture audit mode, approves findings
  - `/gp:complete-epic` user: approves completion, confirms learnings
  - Use `createSimulatedUser` from utils with Opus-tier model for each instance
- [ ] Implement quality proxy metric assertions (run after full pipeline completes)
  - Architecture: read `_overview.md`, check length >= 500 chars, count `##` headings >= 3
  - Plans: read plan file, check >= 3 phases (count `### Phase` headings), grep for path-like strings in each phase
  - Reviews: after `plan-slice` completes, read `plan-refined.md` (or `plan-refining.md`) from the fixture's `.goodplan/` directory and grep for IMPORTANT/CRITICAL severity strings; alternatively, parse the transcript JSONL written by `writeTranscriptEntry` for severity keywords in serialized messages
  - Implementation: run `bun build`, `bun lint`, `bun test` in fixture dir, assert exit code 0
  - Learnings: use `gp learning:list --json` in fixture dir, check count >= 2 and each body >= 100 chars
  - Orchestrator discipline: use `verifyNoArtifactReads` from utils across all tracked tool calls
- [ ] Implement cost tracking and reporting
  - Track cost per skill run (returned by `runSkillSession`)
  - Sum total cost, log at end
  - Flag if total exceeds $40 as potential context leak (7 Opus-tier skill runs with sub-agents expected to cost $15-30+)
- [ ] Add `validate-consolidated.ts` to the harness table in `CLAUDE.md`
- [ ] Update the test harness API doc if needed (`test-harness-api.md` section 5 table)

#### Verification
- `bun build tools/dogfood/validate-consolidated.ts` compiles without errors
- File structure review: fixture generation creates expected files, pipeline sequence matches goal.md spec, all 7 quality metrics have assertion code

### Phase 2: Run + Fix

#### Expected Behavior
**Before implementation** (should fail / show absence):
- [ ] `bun tools/dogfood/validate-consolidated.ts --model claude-opus-4-6` has not been run
- [ ] Unknown whether skills produce production-quality output at Opus tier
- [ ] No documented cost per full Opus run

**After implementation** (should pass / show presence):
- [ ] Harness exits 0 with all quality proxy metrics passing
- [ ] Architecture output: `_overview.md` >= 500 chars, >= 3 subsystem headings
- [ ] Plan output: >= 3 phases, each with concrete file paths
- [ ] Review output: >= 1 IMPORTANT or CRITICAL severity in refinement output
- [ ] Implementation output: `bun build` + `bun lint` + `bun test` pass in fixture
- [ ] Completion output: >= 2 learnings, each >= 100 chars
- [ ] Orchestrator discipline: zero violations across all pipeline runs
- [ ] Total cost per run documented — expected $15-30, flagged if > $40
- [ ] Any bugs discovered are fixed and committed

#### Tasks
- [ ] Run `bun tools/dogfood/validate-consolidated.ts --model claude-opus-4-6` (budget 2-3 runs at $10-30 each)
- [ ] Triage failures — categorize each as: harness bug, skill bug, agent definition bug, or model limitation
- [ ] Fix harness bugs (assertion thresholds too strict/lenient, fixture issues, timing)
- [ ] Fix skill/agent bugs discovered during the run (commit with clear messages referencing this slice)
- [ ] Re-run after fixes until harness exits 0
- [ ] Document total API cost per successful run in test output/log
- [ ] Capture significant bug fixes as learnings via `gp learning:add`
- [ ] If any output is boilerplate/generic/low-quality, investigate root cause (skill issue vs. agent definition vs. model) and fix

#### Verification
- `bun tools/dogfood/validate-consolidated.ts --model claude-opus-4-6` exits 0
- Review fixture output artifacts manually for quality (not just metric thresholds)
- Cost is within expected range ($15-30 per run)
- All bug fixes committed with clear messages
