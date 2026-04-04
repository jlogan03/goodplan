# Plan: Fix 4 Quality Validation Metric Issues

## Overview
Fix 4 independent quality proxy metric failures discovered during Opus-tier E2E harness runs: fragile plan structure regex, missing lint auto-fix in implement agent, missing learnings rollup in epic:complete, and false-positive orchestrator discipline violations from sub-agent tool call leakage.

### Phase 1: Robust Plan Structure Metric

#### Expected Behavior
**Before implementation** (should fail / show absence):
- [ ] `checkPlanMetrics` in validate-consolidated.ts uses `^### Phase` regex (line 1108) which fails on plans that use `## Phase` (H2) headings

**After implementation** (should pass / show presence):
- [ ] `checkPlanMetrics` uses a robust check: plan file exists + non-trivial content (>500 chars) + any heading containing "Phase N" at any level (`^#{1,6}\s+Phase\s+\d/gm`)
- [ ] Plans with H2 or H3 phase headings both pass the metric

#### Tasks
- [x] Edit `tools/dogfood/validate-consolidated.ts` line 1108: replace `^### Phase` regex with `^#{1,6}\s+Phase\s+\d` to match phase headings at any heading level while avoiding false matches on unrelated headings containing "Phase" (e.g., "Phased Rollout Strategy")
- [x] Add a minimum content length check (>500 chars) as a supplementary quality signal alongside the phase count
- [x] Update the detail string (line 1118) to reflect the new check description

#### Verification
- Run `bun run lint` to confirm no lint errors
- Run `bun test` to confirm existing tests pass
- Manually verify the regex matches both `### Phase 1:` and `## Phase 1:` patterns

---

### Phase 2: Implement Agent Lint Compliance

#### Expected Behavior
**Before implementation** (should fail / show absence):
- [ ] `agents/implement-phase.md` step 6 (lines 79-94) tells the agent to run `bun run lint` but does NOT instruct it to run an auto-fix formatter first

**After implementation** (should pass / show presence):
- [ ] `agents/implement-phase.md` step 6 instructs the agent to run the project's auto-fix formatter (e.g., `biome check --write`, `prettier --write`) on changed files before running the lint check
- [ ] The instruction prefers `package.json` scripts (`format`, `lint:fix`) over raw config detection, scopes to changed files not `.`, and specifies skip-if-absent fallback

#### Tasks
- [x] Edit `agents/implement-phase.md` step 6 ("Run Lint/Build/Test", lines 79-94): add a new sub-step before the lint command that instructs the agent to detect and run the project's auto-formatter with write/fix mode on changed files (scope to `filesWritten` paths or the scope directory, not `.`)
- [x] Add guidance text explaining: first check `package.json` for `format` or `lint:fix` scripts and prefer those (e.g., `bun run format`). Only fall back to direct tool detection if no script exists: check for `biome.json` → `biome check --write <scope>`, check for `.prettierrc`/`prettier` in package.json → `prettier --write <scope>`. Do not include `eslint --fix` in the formatter list (that is a linter fix, handled by the lint step itself). If no formatter is detected, skip this sub-step and proceed to lint.

#### Verification
- Read the updated agent file and confirm the auto-fix instruction is present
- Run `bun run lint` to confirm no lint errors in the agent file itself

---

### Phase 3: Learnings Rollup in epic:complete

#### Expected Behavior
**Before implementation** (should fail / show absence):
- [x] `CompleteInput` type for epic (in `src/core/rpc/types.ts` line 178) has no `learnings` field
- [x] `COMPLETE_EPIC` event type (in `src/schemas/state-events.ts` line 40-44) has no `learnings` field
- [x] `handleCompleteEpic` (in `src/core/state/transitions/epic-lifecycle.ts` lines 78-124) does not process learnings
- [x] `completeEpicInputSchema` (in `src/schemas/commands/epic.ts` lines 21-24) has no `learnings` field
- [x] `checkLearningsMetrics` only checks `learning:list --json` which may not have project-scope learnings if epic:complete doesn't roll them up

**After implementation** (should pass / show presence):
- [x] `CompleteInput` for epic includes optional `learnings?: LearningInput[]` field
- [x] `COMPLETE_EPIC` event type includes `learnings: LearningEventEntry[]` field
- [x] `handleCompleteEpic` calls `processLearnings()` with `new Set(["project"])` to roll up learnings to project scope (epics have no parent epic, so only "project" target)
- [x] `completeEpicInputSchema` accepts optional `learnings` array
- [x] `buildCompleteEventWithLearnings` in `src/core/rpc/complete.ts` maps `input.learnings` through `mapLearningInputs()` for epic completion (same pattern as slice/quest)
- [x] Existing tests still pass; new test covers epic completion with learnings

#### Tasks

**3a. State event type + RPC layer (atomic — must compile together)**:
- [x] Add `learnings: LearningEventEntry[]` to the `COMPLETE_EPIC` union member in `src/schemas/state-events.ts` (line 40-44), following the same pattern as `COMPLETE_QUEST` (line 98-104)
- [x] Update epic `CompleteInput` type in `src/core/rpc/types.ts` (line 178): add `learnings?: LearningInput[]`
- [x] Update `buildCompleteEventWithLearnings` epic case in `src/core/rpc/complete.ts` (lines 178-194): call `mapLearningInputs()` to convert `input.learnings` to `LearningEventEntry[]` and collect markdown files, same pattern as the slice case (lines 196-230). Apply explicit `input.learnings ?? []` coercion before passing to `mapLearningInputs()` (the event type requires non-optional `learnings`, so undefined must be coerced to `[]`)
- [x] Ensure the post-reduce file-writing logic in `complete.ts` handles epic markdown files from `mapLearningInputs` — trace the `markdownFiles` return path to confirm it is consumed generically (not gated by target type). If gated, add an epic branch
- [x] Add new import: `import { learningInputSchema } from "../records/learning.js"` (value import, not `import type`, per `verbatimModuleSyntax`)

**3b. Command input schema** (`src/schemas/commands/epic.ts`):
- [x] Add optional `learnings` field to `completeEpicInputSchema` (line 21-24), importing `learningInputSchema` from `../records/learning.js` (value import). Use `.default([])` to make it optional with empty array fallback. Add a comment documenting the coercion contract (undefined → []) for consistency with slice/quest variants

**3c. State machine handler** (`src/core/state/transitions/epic-lifecycle.ts`):
- [x] Import `processLearnings` from `./helpers.js`
- [x] Import `LearningEventEntry` type from `../../../schemas/records/learning.js`
- [x] In `handleCompleteEpic` (after setting epic status to completed, before clearing activeEpic): call `processLearnings(tree, event.learnings, source, new Set(["project"]))` with `source = \`epics/${event.epic}\``
- [x] Note: `processLearnings` filters `rollupTo` targets against `availableTargets`. Learnings with `rollupTo: ["epic"]` will be silently skipped since `"epic"` is not in the available set. Verify this is the existing behavior in `processLearnings` (it should filter, not error). If it errors, add a pre-filter to remove `"epic"` from each learning's `rollupTo` before calling

**3d. Result builder** (`src/core/rpc/complete.ts`):
- [x] Update `buildCompleteResult` for the epic case (lines 267-275) to include `learningsRolledUp` counts derived from the state diff, matching the slice and quest cases. The transition table lists `learningsRolledUp` as an orchestrator return for `COMPLETE_EPIC`

**3e. Documentation alignment**:
- [x] Verify `transition-tables.md` already lists `learningsRolledUp` for `COMPLETE_EPIC` (it does per arch review) — no change needed, but confirm code now matches
- [x] Update State Key Dependencies table in `state-machine-api.md` (line 247) to show `COMPLETE_EPIC` writes to `epics/<name>/learnings.jsonl` and `learnings.jsonl` (project-scope rollup) in addition to existing keys

**3f. Harness metric** (`tools/dogfood/validate-consolidated.ts`):
- [x] Update `checkLearningsMetrics` to log a warning if `learning:list --json` returns 0 learnings after epic completion, as a diagnostic signal. Do NOT add a filesystem fallback check (that would bypass the CLI as the single interface to `.goodplan/` state)

**3g. Tests**:
- [x] Add a test case in the epic-lifecycle transition test file (likely `tests/core/state/transitions/epic-lifecycle.test.ts`) that verifies `handleCompleteEpic` with learnings produces entries in `learnings.jsonl` at both epic scope and project scope
- [x] Add a test case verifying that learnings with `rollupTo: ["epic"]` are gracefully handled (silently skipped, not errored) when completing an epic

#### Verification
- Run `bun run build` to confirm type changes compile
- Run `bun run lint` to confirm no lint errors
- Run `bun test` to confirm existing tests pass and new test passes (this runs `schema-output-accuracy.test.ts` which validates INV-006 — `gp schema` output must reflect the new `learnings` field on `epic:complete`)
- Verify INV-006 explicitly: `./gp schema --command epic:complete --json` should show `learnings` in the stdin schema
- Test manually: `echo '{"verificationResults":[{"index":0,"passed":true}],"learnings":[{"summary":"test","detail":"test detail","category":"implementation","tags":[],"rollupTo":["project"]}]}' | ./gp epic:complete --epic test-epic --json` against a fixture

---

### Phase 4: Orchestrator Discipline — canUseTool Tracking

#### Expected Behavior
**Before implementation** (should fail / show absence):
- [ ] `checkOrchestratorDiscipline` calls `verifyNoArtifactReads(ctx.allToolCalls)` where `ctx.allToolCalls` is populated from `createToolCallTracker`'s `onMessage` handler — this captures ALL tool calls including sub-agent Read calls, producing false positives
- [ ] `runSkillSession` in `utils.ts` detects state write violations via `canUseTool` (orchestrator-only) but does not track artifact read violations there

**After implementation** (should pass / show presence):
- [ ] `runSkillSession` in `utils.ts` tracks artifact read violations via `canUseTool` interceptor (orchestrator-level only), storing them in the returned `SkillSessionResult`
- [ ] `SkillSessionResult` includes a new `artifactReadViolations: string[]` field
- [ ] `checkOrchestratorDiscipline` in validate-consolidated.ts uses accumulated `artifactReadViolations` from `SkillSessionResult` instead of running `verifyNoArtifactReads` on the full `allToolCalls` list
- [ ] Sub-agent Read calls no longer produce false positive violations

#### Tasks

**4a. Diagnostic step** (before implementing):
- [ ] Add temporary logging in `createToolCallTracker`'s `onMessage` handler to confirm sub-agent tool calls are indeed appearing in `allToolCalls`. If they are NOT, the root cause analysis is wrong and Phase 4 is unnecessary. Proceed only if confirmed

**4b. Utils artifact read detection** (`tools/dogfood/utils.ts`):
- [ ] Add a new function `checkArtifactRead(toolName: string, input: unknown): string | null` that checks if a tool call is an artifact read violation (extract the matching logic from `verifyNoArtifactReads` into a single-call version that returns the violation string or null)
- [ ] Add `artifactReadViolations: string[]` to the `SkillSessionResult` interface
- [ ] In `runSkillSession`, add artifact read violation detection to the `composedCanUseTool` handler (alongside the existing `checkViolation` call): when `checkArtifactRead` returns a non-null string, push it to a local `artifactReadViolations` array
- [ ] Include `artifactReadViolations` in the returned `SkillSessionResult`

**4c. Harness metric — validate-consolidated.ts**:
- [ ] Add `allArtifactReadViolations: string[]` to the `PipelineContext` interface
- [ ] After each `runSkill` call, push `result.sessionResult.artifactReadViolations` into `ctx.allArtifactReadViolations`
- [ ] Update `checkOrchestratorDiscipline` to accept `artifactReadViolations: string[]` instead of `allToolCalls`, and check that array's length instead of calling `verifyNoArtifactReads`
- [ ] Update the metrics section to pass `ctx.allArtifactReadViolations` to `checkOrchestratorDiscipline`

**4d. Update all other harness consumers**:
- [ ] Update all other harness files that call `verifyNoArtifactReads(tracker.toolCalls)` to use `artifactReadViolations` from `SkillSessionResult` instead. Known consumers: `test-implement.ts` (lines 567, 768), `test-plan-slice.ts` (line 363), `test-create-epic.ts` (lines 447, 636), `test-complete-epic.ts` (line 570), `test-create-side-quest.ts` (lines 347, 547)
- [ ] Keep `verifyNoArtifactReads` exported from utils.ts but mark with a `@deprecated` JSDoc comment pointing to `SkillSessionResult.artifactReadViolations`

#### Verification
- Run `bun run lint` to confirm no lint errors
- Run `bun run build` to confirm type changes compile
- Run `bun test` to confirm existing tests pass
- Verify that `verifyNoArtifactReads` is still exported with `@deprecated` JSDoc but is no longer called by any harness consumer
- Grep all harness files to confirm no remaining calls to `verifyNoArtifactReads(tracker.toolCalls)` — all should use `artifactReadViolations` from `SkillSessionResult`
