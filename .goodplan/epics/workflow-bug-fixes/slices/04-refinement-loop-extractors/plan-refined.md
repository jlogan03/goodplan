# Plan: Refinement Loop & Extractors

## Overview

Build the trust layer's core machinery: an artifact-agnostic refinement loop, convergence evaluator, circuit breaker, and 10 extractors. This slice creates the `src/trust/` directory tree — the first code outside the engine layer — establishing the mechanical system that determines when artifacts are good enough to proceed.

The extractors are pure CLI functions that parse structured sections from markdown artifacts (YAML frontmatter + fenced YAML blocks). They are registered in a typed `ExtractorRegistry` following the same registry pattern used by `InvariantRegistry` in slices 01-03 (class with `register`/`getById`/`getAll`). The convergence evaluator and circuit breaker are pure functions that read reviewer-scored events and rubric definitions to produce convergence verdicts. The `RefinementLoop` controller orchestrates the full review-edit-evaluate cycle, providing the API that skills will call instead of ad-hoc score checking.

Key design decisions:
- Extractors are artifact-type extractors (architecture, plan, epic-goal, etc.) — they parse structured content from artifact markdown. They are NOT per-reviewer-domain extractors. The QA doc's reviewer-domain list was a mischaracterization; this plan's artifact-type set is correct.
- Extractors are pure functions (no I/O beyond receiving markdown string input)
- Registry pattern matches `InvariantRegistry` (class with `register`/`getById`/`getAll`); registry returns `ExtractResult<unknown>` — callers narrow via Zod parse (no unsafe generic cast)
- `ReviewerPayload` schema is Zod-first — defensive parsing with strict output types; includes `reviewerId` field so convergence evaluator can track provenance
- Circuit breaker has three configurable triggers: stuck-finding, reviewer-disagreement, round-budget-exceeded
- `ReviewerDispatcher` and `ArtifactEditor` are port interfaces in `src/trust/interfaces/` following the `GitOps` pattern from `src/engine/interfaces/git-ops.ts`
- Dependencies: `gray-matter` (frontmatter parsing) + `js-yaml` (explicit dependency for fenced YAML block parsing, rather than relying on `gray-matter`'s internal bundled version). Fenced YAML block extraction uses regex — no remark ecosystem needed for the structured templates being parsed.
- Schema placement: `src/schemas/trust/` contains trust-layer projection types (not event payloads). This follows the architecture doc's guidance that trust projection types are defined in `src/schemas/` so both engine and trust layers import from the same source.

## Phase 1: Extractor Interface + Registry

Define the core types, Zod schemas, and registry for the extractor framework. No extractors yet — just the scaffolding.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/trust/` — directory does not exist
- [ ] `bun run check` passes (baseline — no new code to lint)

**After implementation** (should pass / show presence):
- [ ] `ls src/trust/extractors/` — directory exists with `types.ts`, `registry.ts`, `index.ts`
- [ ] `bun run check` passes with no lint/type errors
- [ ] `bun vitest run tests/trust/extractors/registry.test.ts` — registry tests pass (register, get, duplicate rejection)

### Tasks

- [ ] Install dependencies: `bun add gray-matter js-yaml` and `bun add -d @types/js-yaml`. `gray-matter` ships its own types (no `@types/gray-matter` needed); `js-yaml` requires `@types/js-yaml`. `gray-matter` handles frontmatter parsing; `js-yaml` is an explicit dependency for fenced YAML block parsing (rather than relying on `gray-matter`'s internal bundled version).
- [ ] Create `src/trust/extractors/types.ts`:
  - `ExtractErrorCode` type: `"FRONTMATTER_MISSING" | "FRONTMATTER_INVALID" | "FENCED_BLOCK_MISSING" | "YAML_PARSE_ERROR" | "SCHEMA_INVALID"` — each extractor returns the most specific applicable code
  - `ExtractResult<T>` discriminated union (`{ success: true; data: T } | { success: false; error: { code: ExtractErrorCode; message: string; location?: { line: number; column: number } } }`)
  - `Extractor<T>` function type: `(markdownContent: string) => ExtractResult<T>`
  - `ExtractorDefinition<T>` interface: `{ id: string; description: string; extract: Extractor<T> }`
- [ ] Create `src/trust/extractors/registry.ts`:
  - `ExtractorRegistry` class following `InvariantRegistry` pattern
  - `register(def: ExtractorDefinition<unknown>): void` — throws on duplicate ID
  - `getById(id: string): ExtractorDefinition<unknown> | undefined`
  - `getAll(): ExtractorDefinition<unknown>[]`
  - `extract(id: string, markdown: string): ExtractResult<unknown>` — convenience method that looks up and runs; returns `ExtractResult<unknown>`, callers narrow via the specific extractor's Zod schema (no unsafe generic cast)
- [ ] Create `src/trust/extractors/parse-utils.ts`:
  - `parseFrontmatter(markdown: string): { success: true; data: Record<string, unknown>; content: string } | { success: false; error: ExtractErrorCode; message: string }` — wraps `gray-matter`, returns typed result with `ExtractErrorCode` on failure (`FRONTMATTER_MISSING` if no frontmatter, `FRONTMATTER_INVALID` if parse fails). Note: callers use `noUncheckedIndexedAccess` so `Record<string, unknown>` access returns `unknown | undefined`.
  - `extractFencedYaml(markdown: string, label: string): { success: true; data: unknown } | { success: false; error: ExtractErrorCode; message: string }` — regex-based extraction of fenced `yaml <label>` blocks, parses YAML content via `js-yaml` (added as explicit dependency rather than relying on `gray-matter`'s internal bundled version). Returns `FENCED_BLOCK_MISSING` if block not found, `YAML_PARSE_ERROR` if YAML is malformed.
  - Error handling: returns structured errors with line/column when parsing fails
- [ ] Create `src/schemas/trust/reviewer-payload.ts`:
  - `reviewerPayloadSchema` — Zod schema for the canonical `ReviewerPayload` (reviewerId, dimensions, findings, rationale). Uses `.strict()` — same rationale as extractor schemas (parsed from controlled LLM templates, unexpected fields indicate a parse bug). The `reviewerId` field tracks which reviewer produced which payload so convergence evaluator can attribute scores.
  - `dimensionResultSchema` — name, score, threshold, passed. `.strict()`.
  - `findingSeveritySchema` — `z.enum(["BLOCKING", "CRITICAL", "IMPORTANT", "MINOR"])`
  - `reviewerFindingSchema` — severity, dimension, description, optional location (structured key fields `severity` + `dimension` enable similarity matching without relying on prose consistency). `.strict()`.
- [ ] Create `src/schemas/trust/convergence.ts`:
  - `convergenceStateSchema` — `z.enum(["CONVERGED", "CONTINUE", "CIRCUIT-BROKEN"])`
  - `circuitBreakerReasonSchema` — discriminated union on `type` field: `z.discriminatedUnion("type", [z.object({ type: z.literal("stuck-finding"), findingKey: z.string(), persistedRounds: z.number() }), z.object({ type: z.literal("reviewer-disagreement"), dimension: z.string(), spread: z.number() }), z.object({ type: z.literal("round-budget-exceeded"), round: z.number(), maxRounds: z.number() })])`. Provides diagnostic context for each trigger type.
  - `convergenceResultSchema` — state, optional reason, dimensions, blockingFindings
  - `convergenceConfigSchema` — maxRounds, stagnationWindow, reductionThreshold (configurable params)
- [ ] Create `src/trust/extractors/index.ts` — re-export public API
- [ ] Create `src/trust/index.ts` — re-export from extractors (will grow as convergence/reviewers are added). The multi-level barrel pattern (`src/trust/index.ts` -> `src/trust/extractors/index.ts`) follows the established precedent from `src/engine/` (slices 01-02). Public API exports: `ExtractorRegistry`, `ExtractResult`, `ExtractErrorCode`, `ExtractorDefinition`, `parseFrontmatter`, `extractFencedYaml`. Internal (not re-exported from `src/trust/index.ts`): individual extractor implementation files, `parse-utils` internals.
- [ ] Update placeholder interfaces in `src/schemas/entities/derived-state.ts`: align `ConvergenceSnapshot` and `DimensionScore` with the new Zod schemas by importing types from `src/schemas/trust/convergence.ts` into `derived-state.ts` (not the other way around). This avoids circular dependencies since `DerivedStateData` is consumed by the engine layer. Replace the placeholder interfaces with references to the canonical schemas.
- [ ] Create `tests/trust/extractors/registry.test.ts`:
  - Test: register + getById returns the definition
  - Test: register + getAll returns all definitions
  - Test: duplicate ID throws
  - Test: getById for unknown ID returns undefined
  - Test: extract convenience method runs the extractor and returns `ExtractResult<unknown>` (caller narrows with Zod parse)

### Verification

- `bun run check` — lint + type-check pass
- `bun vitest run tests/trust/` — all trust tests pass
- Confirm `src/trust/` only imports from `src/schemas/` and `src/util/` (dependency rule compliance — trust may import engine, but extractors specifically only need schemas)

## Phase 2: Core Extractors (5)

Implement the five most commonly used extractors: architecture, architecture-target, plan, epic-goal, slice-goal. Each parses a specific artifact template format.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/trust/extractors/architecture.ts` — file does not exist
- [ ] `bun vitest run tests/trust/extractors/architecture.test.ts` — test file does not exist or fails

**After implementation** (should pass / show presence):
- [ ] `ls src/trust/extractors/architecture.ts src/trust/extractors/architecture-target.ts src/trust/extractors/plan.ts src/trust/extractors/epic-goal.ts src/trust/extractors/slice-goal.ts` — all 5 files exist
- [ ] `bun vitest run tests/trust/extractors/architecture.test.ts tests/trust/extractors/architecture-target.test.ts tests/trust/extractors/plan.test.ts tests/trust/extractors/epic-goal.test.ts tests/trust/extractors/slice-goal.test.ts` — all pass
- [ ] `bun run check` passes

### Tasks

- [ ] Create Zod output schemas in `src/schemas/trust/extracts.ts`:
  - All extractor output schemas use `.strict()` — these are parsed from controlled templates, not external inputs; unexpected fields indicate a parse bug, not forward compatibility. This is distinct from the engine layer's `.strip()` convention for event envelopes.
  - `architectureExtractSchema` — subsystems (id, maturity, owns, dependsOn), communication patterns, proposed invariants. `.strict()`.
  - `architectureTargetExtractSchema` — same shape as architecture (target state). `.strict()`.
  - `planExtractSchema` — chunks (id, description, expectation, redTest, verificationType), chunk dependencies, affected subsystems, rollback path. `.strict()`.
  - `epicGoalExtractSchema` — description, scope, non-goals, success criteria, initial subsystems. `.strict()`.
  - `sliceGoalExtractSchema` — description, acceptance criteria, affected subsystems, dependencies, scope exclusions. `.strict()`.
- [ ] Create `src/trust/extractors/architecture.ts`:
  - Parses YAML frontmatter for top-level metadata
  - Extracts fenced `yaml extract` blocks for subsystem definitions
  - Validates against `architectureExtractSchema`
  - Returns `ExtractResult<ArchitectureExtract>`
- [ ] Create `src/trust/extractors/architecture-target.ts`:
  - Same structure as architecture extractor, for target-state artifacts
- [ ] Create `src/trust/extractors/plan.ts`:
  - Parses plan chunks from fenced YAML blocks
  - Extracts chunk dependencies, affected subsystems
  - Validates against `planExtractSchema`
- [ ] Create `src/trust/extractors/epic-goal.ts`:
  - Parses epic goal frontmatter + structured sections
  - Validates against `epicGoalExtractSchema`
- [ ] Create `src/trust/extractors/slice-goal.ts`:
  - Parses slice goal frontmatter + structured sections
  - Validates against `sliceGoalExtractSchema`
- [ ] Create `src/trust/extractors/core-extractors.ts`:
  - `createCoreExtractorRegistry()` function that registers all 5 core extractors
  - Follows `createCoreRegistry()` pattern from `src/engine/invariants/core-rules.ts`
- [ ] Create test fixtures in `tests/trust/fixtures/`:
  - `architecture.md` — sample architecture artifact with valid frontmatter + fenced YAML
  - `architecture-malformed.md` — missing closing fence / bad YAML for error path testing
  - `plan.md`, `epic-goal.md`, `slice-goal.md` — valid fixture artifacts
- [ ] Create unit tests for each extractor:
  - `tests/trust/extractors/architecture.test.ts` — valid parse, malformed input (tests each error code: FRONTMATTER_MISSING, FRONTMATTER_INVALID, FENCED_BLOCK_MISSING, YAML_PARSE_ERROR, SCHEMA_INVALID), missing sections
  - `tests/trust/extractors/architecture-target.test.ts` — same pattern
  - `tests/trust/extractors/plan.test.ts` — valid parse, missing chunks, bad verificationType
  - `tests/trust/extractors/epic-goal.test.ts` — valid parse, missing required fields
  - `tests/trust/extractors/slice-goal.test.ts` — valid parse, missing required fields

### Verification

- `bun run check` — lint + type-check pass
- `bun vitest run tests/trust/` — all trust tests pass (registry + 5 extractors)
- Each extractor correctly handles: valid input, missing sections, malformed YAML, schema validation failures

## Phase 3: Remaining Extractors (5)

Implement the remaining five extractors: side-quest-goal, briefing, pressure-test, finding, subsystem. Same pattern as Phase 2.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/trust/extractors/side-quest-goal.ts` — file does not exist

**After implementation** (should pass / show presence):
- [ ] `ls src/trust/extractors/side-quest-goal.ts src/trust/extractors/briefing.ts src/trust/extractors/pressure-test.ts src/trust/extractors/finding.ts src/trust/extractors/subsystem.ts` — all 5 files exist
- [ ] `bun vitest run tests/trust/extractors/` — all 10 extractor tests + registry test pass
- [ ] `bun run check` passes

### Tasks

- [ ] Add Zod output schemas to `src/schemas/trust/extracts.ts`:
  - All schemas in this phase also use `.strict()` (same rationale as Phase 2 — controlled templates, not external inputs)
  - `sideQuestGoalExtractSchema` — description, scope, verification method, parent epic ref. `.strict()`.
  - `briefingExtractSchema` — time context, current position, last action, where stopped, next action, attention items, deep links. `.strict()`.
  - `pressureTestExtractSchema` — failure modes, scaling cliffs, optionality ledger, error classes, locked-in assumptions, findings. `.strict()`.
  - `findingExtractSchema` — classification (blocking/non-blocking x in-scope/out-of-scope), reshape option, related subsystems. `.strict()`.
  - `subsystemExtractSchema` — id, name, maturity, description, owns, dependsOn, dependentCount. `.strict()`.
- [ ] Create `src/trust/extractors/side-quest-goal.ts` — parse side-quest goal artifacts
- [ ] Create `src/trust/extractors/briefing.ts` — parse briefing artifacts (rich structured sections: deep links, attention items)
- [ ] Create `src/trust/extractors/pressure-test.ts` — parse pressure test artifacts (failure modes, findings list)
- [ ] Create `src/trust/extractors/finding.ts` — parse finding artifacts (classification enum, reshape option)
- [ ] Create `src/trust/extractors/subsystem.ts` — parse subsystem definition artifacts
- [ ] Update `src/trust/extractors/core-extractors.ts` to register all 10 extractors
- [ ] Create test fixtures: `tests/trust/fixtures/side-quest-goal.md`, `briefing.md`, `pressure-test.md`, `finding.md`, `subsystem.md`
- [ ] Create unit tests for each:
  - `tests/trust/extractors/side-quest-goal.test.ts`
  - `tests/trust/extractors/briefing.test.ts`
  - `tests/trust/extractors/pressure-test.test.ts`
  - `tests/trust/extractors/finding.test.ts`
  - `tests/trust/extractors/subsystem.test.ts`

### Verification

- `bun run check` — lint + type-check pass
- `bun vitest run tests/trust/` — all trust tests pass (registry + 10 extractors)
- `createCoreExtractorRegistry().getAll().length === 10` — all extractors registered

## Phase 4: ConvergenceEvaluator + CircuitBreaker

Build the convergence evaluation and circuit breaker logic as pure functions in `src/trust/convergence/`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/trust/convergence/` — directory does not exist

**After implementation** (should pass / show presence):
- [ ] `ls src/trust/convergence/evaluator.ts src/trust/convergence/circuit-breaker.ts src/trust/convergence/index.ts` — all files exist
- [ ] `bun vitest run tests/trust/convergence/` — all convergence tests pass
- [ ] `bun run check` passes

### Tasks

- [ ] Create `src/trust/convergence/evaluator.ts`:
  - `evaluateConvergence(scoredEvents, rubric, relevanceWeights, config): ConvergenceResult`
  - Pure function — no I/O, no event emission
  - Convergence requires: all dimensions at or above threshold AND zero BLOCKING/CRITICAL findings
  - Relevance weighting: `low`-relevance reviewers never block convergence (advisory warnings only)
  - `medium`/`high` relevance: dimension below threshold blocks; BLOCKING/CRITICAL findings block
  - Returns `ConvergenceResult` with full dimension breakdown
- [ ] Create `src/trust/convergence/circuit-breaker.ts`:
  - `checkCircuitBreaker(scoredEvents, config): CircuitBreakerResult`
  - Three trigger checks:
    1. `stuck-finding` — same finding persists across `config.stagnationWindow` rounds (default: 2). Matching uses structured key fields: findings with the same `severity` + `dimension` are considered the same finding (avoids relying on LLM prose consistency). Known limitation: findings with genuinely different root causes but same severity+dimension will be treated as duplicates — acceptable because stuck detection is a heuristic safety net, not a precision tool. Future upgrade path: token-overlap (Jaccard similarity) on description text could improve precision if needed.
    2. `reviewer-disagreement` — two reviewers produce scores differing by more than `config.disagreementThreshold` on same dimension
    3. `round-budget-exceeded` — round count exceeds `config.maxRounds`
  - Returns `CircuitBreakerResult` as a discriminated union: `{ triggered: false }` | `{ triggered: true; reason: CircuitBreakerReason }`. Implemented with `z.union([z.object({ triggered: z.literal(false) }), z.object({ triggered: z.literal(true), reason: circuitBreakerReasonSchema })])` (Zod v4 `discriminatedUnion` requires string literal discriminants, so `z.union` is used for boolean). This restores type narrowing: `if (result.triggered) { result.reason /* CircuitBreakerReason, not null */ }`
- [ ] Create `src/trust/convergence/types.ts`:
  - `ConvergenceConfig` interface: `{ maxRounds: number; stagnationWindow: number; disagreementThreshold: number; reductionThreshold: number }`
  - `DEFAULT_PLAN_CONFIG` and `DEFAULT_ARCHITECTURE_CONFIG` constants (matching current hardcoded values in skills)
  - Re-export relevant types from schemas
- [ ] Create `src/trust/convergence/index.ts` — re-export public API
- [ ] Update `src/trust/index.ts` to re-export from convergence
- [ ] Create `tests/trust/convergence/evaluator.test.ts`:
  - Test: all dimensions pass + no blocking findings = CONVERGED
  - Test: one dimension below threshold = CONTINUE
  - Test: all dimensions pass but BLOCKING finding present = CONTINUE
  - Test: low-relevance reviewer below threshold = still CONVERGED (advisory only)
  - Test: CRITICAL finding from low-relevance reviewer = advisory warning, not blocking
- [ ] Create `tests/trust/convergence/circuit-breaker.test.ts`:
  - Test: stuck-finding triggers after stagnation window
  - Test: reviewer-disagreement triggers on score divergence
  - Test: round-budget-exceeded triggers at max rounds
  - Test: no trigger when all conditions clear
  - Test: stuck-finding detection matches on severity+dimension fields (not prose description)

### Verification

- `bun run check` — lint + type-check pass
- `bun vitest run tests/trust/` — all trust tests pass (extractors + convergence)
- Confirm convergence evaluator produces correct results for edge cases: exactly-at-threshold scores, empty findings list, single reviewer

## Phase 5: RefinementLoop Controller + Integration Tests + Smoke Script

Build the top-level `RefinementLoop` that orchestrates the full review-edit-evaluate cycle. This is the API surface that skills call. Add integration tests with mock reviewers and a smoke script.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/trust/refinement-loop.ts` — file does not exist
- [ ] `ls scripts/smoke-trust.sh` — file does not exist

**After implementation** (should pass / show presence):
- [ ] `ls src/trust/refinement-loop.ts src/trust/refinement-loop-types.ts src/trust/interfaces/reviewer-dispatcher.ts src/trust/interfaces/artifact-editor.ts` — files exist
- [ ] `bun vitest run tests/trust/refinement-loop.test.ts` — integration test passes
- [ ] `bash scripts/smoke-trust.sh` — smoke script runs extractors + convergence evaluator against fixture data, exits 0
- [ ] `bun run check` passes
- [ ] `bun vitest run tests/trust/` — all trust tests pass (extractors + convergence + refinement loop)

### Tasks

- [ ] Create `src/trust/interfaces/reviewer-dispatcher.ts`:
  - `ReviewerError` interface: `{ reviewerId: string; error: string }` — represents a single reviewer that failed (LLM timeout, malformed output, etc.)
  - `ReviewerDispatcher` port interface following the `GitOps` pattern from `src/engine/interfaces/git-ops.ts`: `dispatch(artifactContent: string, reviewerIds: string[]): Promise<(ReviewerPayload | ReviewerError)[]>` — returns mixed array so the loop can proceed with partial results when individual reviewers fail
- [ ] Create `src/trust/interfaces/artifact-editor.ts`:
  - `ArtifactEditor` port interface: `edit(artifactContent: string, feedback: SynthesizedFeedback): Promise<string>` — injected by caller, skills provide the actual LLM edit
- [ ] Create `src/trust/interfaces/index.ts` — re-export port interfaces
- [ ] Create `src/trust/refinement-loop-types.ts`:
  - `RefinementLoopOptions` — artifactType, artifactContent, reviewerIds, convergenceConfig, dispatcher (ReviewerDispatcher), editor (ArtifactEditor), onRoundComplete callback
  - `RefinementLoopResult` — finalContent, convergenceResult, rounds completed, circuit breaker status, full score history
  - `SynthesizedFeedback` — combined findings from all reviewers, dimension scores, actionable items
- [ ] Create `src/trust/refinement-loop.ts`:
  - `runRefinementLoop(options: RefinementLoopOptions): Promise<RefinementLoopResult>`
  - Loop structure: dispatch reviewers -> collect results (filter out `ReviewerError` entries, log warnings for failed reviewers, proceed with successful `ReviewerPayload` results) -> evaluate convergence -> check circuit breaker -> if CONTINUE, synthesize feedback + edit artifact -> repeat
  - Convergence evaluation uses `evaluateConvergence` from Phase 4
  - Circuit breaker check uses `checkCircuitBreaker` from Phase 4
  - `onRoundComplete` callback fires after each round (for progress reporting)
  - Returns immediately on CONVERGED or CIRCUIT-BROKEN
- [ ] Create `src/trust/feedback-synthesizer.ts`:
  - `synthesizeFeedback(payloads: ReviewerPayload[]): SynthesizedFeedback`
  - Merges findings from multiple reviewers, deduplicates by three-field key: `severity` + `dimension` + normalized description (first 80 chars, lowercased, whitespace-collapsed). When duplicates are found, keeps one representative and notes the count of merged findings. This is finer-grained than the circuit breaker's two-field key (`severity` + `dimension`) because the synthesizer loses information when merging, whereas the circuit breaker is a safety-net heuristic
  - Sorts by severity (BLOCKING > CRITICAL > IMPORTANT > MINOR)
  - Aggregates dimension scores across reviewers
- [ ] Update `src/trust/index.ts` to re-export refinement loop API and port interfaces (`ReviewerDispatcher`, `ArtifactEditor`, `ReviewerError`)
- [ ] Create `tests/trust/refinement-loop.test.ts`:
  - Test: single round convergence (mock reviewer returns passing scores) -> CONVERGED after 1 round
  - Test: two-round refinement (first round fails, editor fixes, second round passes) -> CONVERGED after 2 rounds
  - Test: circuit breaker fires on max rounds (mock reviewer always fails) -> CIRCUIT-BROKEN
  - Test: stuck-finding circuit breaker (mock reviewer returns same finding every round) -> CIRCUIT-BROKEN with `{ triggered: true, reason: { type: "stuck-finding", findingKey: ..., persistedRounds: ... } }`
  - Test: partial reviewer failure (mock dispatcher returns mix of `ReviewerPayload` and `ReviewerError`) -> loop proceeds with available results, logs warnings for failed reviewers
  - Test: onRoundComplete callback fires with correct round data
  - Mock dispatcher returns canned `ReviewerPayload` objects (and `ReviewerError` for failure tests)
  - Mock editor returns modified artifact content
- [ ] Create `tests/trust/feedback-synthesizer.test.ts`:
  - Test: deduplication of findings with same three-field key (severity + dimension + normalized description) across reviewers, with merged count
  - Test: severity sorting
  - Test: dimension score aggregation
- [ ] Create `scripts/smoke-trust.ts` (run via `bun scripts/smoke-trust.ts`, not `bun --eval`):
  - Runs a self-contained trust layer exercise:
    1. Extracts from fixture artifacts (using the 10 extractors)
    2. Evaluates convergence with fixture reviewer payloads
    3. Checks circuit breaker with fixture score history
  - Exits 0 if all checks pass, non-zero with descriptive error otherwise
- [ ] Create `scripts/smoke-trust.sh` — thin wrapper that runs `bun scripts/smoke-trust.ts`
- [ ] Verify architectural fitness: `src/trust/` imports only from `src/engine/`, `src/schemas/`, `src/util/` — never from `src/commands/` or `src/context/`

### Verification

- `bun run check` — lint + type-check pass
- `bun vitest run tests/trust/` — all trust tests pass
- `bash scripts/smoke-trust.sh` — smoke script exits 0
- Confirm the `RefinementLoop` API is artifact-agnostic — no plan-specific or architecture-specific logic in the loop itself (those concerns live in the caller/skill)

## Architecture Deltas

Record these deltas in the architecture doc during implementation:

- **Dependencies reduced**: From remark ecosystem to `gray-matter` + `js-yaml` only
- **`ReviewerPayload` gained `reviewerId` field**: Tracks which reviewer produced which payload so convergence evaluator can attribute scores
- **`CircuitBreakerReason` evolved to richer discriminated union**: From architecture doc's initial simple enum to `z.discriminatedUnion("type", [...])` with diagnostic context fields (`findingKey`/`persistedRounds`, `dimension`/`spread`, `round`/`maxRounds`)
- **`evaluateConvergence` signature**: Uses `ConvergenceConfig` object parameter instead of separate `maxRounds` parameter
