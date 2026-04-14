# Implementation Plan — 10-slice-execution-skills-v2

## Goal

Build the slice execution skills for v2: `plan-slice` (P7+P8+P9 with plan-shape checkpoint and refinement via `refine:*` commands), `implement-slice` (P10+P11 with chunk lifecycle events and code refinement), and `land-slice` (P12 with spine promotion, findings triage, and epic completion detection on final slice). Update agent contracts and reference documents. Create new agents (verifier, completion-side-quest). Reconcile convergence evaluator types with YAML-loaded rubrics. Create implementation-plan rubric.

---

## Phase 1: Type Reconciliation + Rubric + Agent Infrastructure

**Objective:** Reconcile the convergence evaluator's inline `Rubric`/`RubricDimension` types with the YAML-loaded `RubricYaml` from slice 07a. Create the implementation-plan rubric YAML. Create two new agents (verifier, completion-side-quest). Update agent reference documents with v2 contracts.

### Expected Behavior

**Before:** The convergence evaluator (`src/trust/convergence/evaluator.ts`) defines its own inline `Rubric` and `RubricDimension` interfaces that are structurally a subset of the YAML-loaded `RubricYaml` from `src/schemas/trust/rubric.ts`. No `implementation-plan` rubric exists. No `verifier` or `completion-side-quest` agent exists. `sub-agent-return-format.md` has no entries for these agents.

**After:**
- A minimal `ConvergenceRubric` interface is defined (just `dimensions: { name: string; threshold: number }[]`) that `RubricYaml` structurally satisfies — the evaluator uses this narrow type, inline `Rubric`/`RubricDimension` are removed
- `refine:converge` loads a real rubric YAML file (resolved by artifact-type) instead of constructing inline
- `plugin/rubrics/implementation-plan.yaml` exists with dimensions for plan quality scoring
- `plugin/agents/verifier.md` exists — chunk verification agent that independently runs expected-behavior checks
- `plugin/agents/completion-side-quest.md` exists — analyzes findings and proposes structured side quests during landing
- `plugin/agents/_references/sub-agent-return-format.md` updated with verifier and completion-side-quest return schemas
- `plugin/agents/_references/plan-format.md` updated to document v2 chunk format (id, description, expectation, redTest, verificationType, chunk dependencies)
- `plugin/agents/_references/review-preamble.md` updated with v2 review context additions

**Verification:**
- `bun run build` succeeds
- `bun test` passes (convergence evaluator tests use `ConvergenceRubric` — minimal construction, no full YAML needed)
- New rubric passes `rubricYamlSchema.parse()` validation
- New agent files have valid YAML frontmatter (parseable by gray-matter)

### Tasks

#### 1.1 Reconcile Convergence Evaluator Types

**Strategy:** Define a minimal `ConvergenceRubric` interface that captures only what the evaluator needs. `RubricYaml` structurally satisfies it, so callers can pass either a loaded YAML rubric or a minimal object. This follows interface segregation — the trust layer does not depend on the full YAML schema.

In `src/trust/convergence/evaluator.ts`:
- Replace inline `Rubric` and `RubricDimension` with a single exported `ConvergenceRubric` interface:
  ```typescript
  export interface ConvergenceRubric {
    dimensions: ReadonlyArray<{ readonly name: string; readonly threshold: number }>;
  }
  ```
- Update `evaluateConvergence()` signature: `rubric: ConvergenceRubric` (the function body needs no changes — it only uses `.name` and `.threshold`)
- `RubricYaml` (which has `dimensions: { name, description, scoring, threshold }[]`) structurally satisfies `ConvergenceRubric`, so callers can pass it directly

In `src/trust/refinement-loop-types.ts` (also imports `Rubric`):
- Update the `RefinementLoopOptions.rubric` field to use `ConvergenceRubric` instead of `Rubric`
- Use `import type { ConvergenceRubric }` (required by `verbatimModuleSyntax`)

In `src/commands/refine/converge.ts` and `src/commands/refine/evaluate.ts` (both call `evaluateConvergence()` which takes a rubric):
- Both commands have the same inline rubric construction pattern. Note: `refine:stuck` calls `checkCircuitBreaker()` which does NOT take a rubric — it only needs `--rubric-path` excluded from its scope. Update `converge` and `evaluate` to accept a `--rubric-path` CLI argument (optional) that specifies the rubric YAML file path. The calling skill passes this argument — the skill knows `${CLAUDE_PLUGIN_ROOT}` and can resolve rubric paths. This avoids coupling the command layer to plugin filesystem layout.
- When `--rubric-path` is provided: load using existing `loadRubric()` from `src/trust/reviewers/rubric-loader.ts` and pass the loaded `RubricYaml` as `ConvergenceRubric` (structural compatibility).
- When `--rubric-path` is omitted (backward compatibility): fall back to the current inline construction `{ name, threshold: 7 }` which satisfies `ConvergenceRubric`. This preserves v1 compatibility and handles the case where no rubric file is available.
- Error handling: if `--rubric-path` is provided but the file doesn't exist, emit a structured error (`RUBRIC_NOT_FOUND`) — never silently fall back to inline.

In barrel export files (update re-exports for the rename):
- `src/trust/convergence/index.ts`: change `export type { Rubric, RubricDimension, ScoredEvent }` → `export type { ConvergenceRubric, ScoredEvent }`
- `src/trust/index.ts`: change `export type { Rubric, RubricDimension, ... }` → `export type { ConvergenceRubric, ... }`
- `ScoredEvent` export is unchanged — clarify this for implementers.

In `tests/trust/convergence/evaluator.test.ts`:
- Update `defaultRubric` type annotation from `Rubric` to `ConvergenceRubric` — the test objects already satisfy the minimal interface (just `{ name, threshold }`), so no test rewrite needed

Check all imports of the removed `Rubric`/`RubricDimension` types across the codebase and update them to `ConvergenceRubric`.

#### 1.2 Create Implementation-Plan Rubric

Create `plugin/rubrics/implementation-plan.yaml`:

```yaml
id: implementation-plan
version: 1
dimensions:
  - name: completeness
    description: "All goal requirements are covered by plan phases with no gaps"
    scoring: "1-10: 1=major requirements missing, 5=partial coverage, 10=every requirement mapped to a phase"
    threshold: 7
  - name: verification-first
    description: "Each phase has concrete, falsifiable expected-behavior checks (before/after)"
    scoring: "1-10: 1=no checks, 5=vague checks, 10=every phase has runnable before/after checks"
    threshold: 8
  - name: phasing
    description: "Phases are properly sequenced with clear dependencies and incremental verifiability"
    scoring: "1-10: 1=random ordering, 5=mostly sequential, 10=each phase builds on the last with clear rationale"
    threshold: 7
  - name: chunk-decidability
    description: "Each chunk declares verificationType and has enough detail for independent execution"
    scoring: "1-10: 1=no chunks, 5=partial chunk definitions, 10=every chunk has id, expectation, verificationType"
    threshold: 7
convergence:
  max_rounds: 3
  zero_blocking_required: true
  zero_critical_required: true
```

#### 1.3 Create Verifier Agent

Create `plugin/agents/verifier.md` with frontmatter:
- `name: verifier`
- `model: opus`
- `description: Independently verifies chunk expected behavior by running before/after checks from the plan. Spawned by the implement-slice orchestrator after chunk implementation to provide verification evidence.`

Agent instructions:
- Receives: chunk ID, chunk expected behavior (before/after checks from plan), slice path, implementation file paths
- Runs the "after implementation" checks and records evidence
- Returns: `{ status, summary, filesWritten, verificationEvidence: { chunkId, checksRun: [{check, passed, output}], overallPassed } }`
- Tools: Read, Grep, Glob, Bash (for running checks)
- No Agent tool (flat hierarchy)

#### 1.4 Create Completion-Side-Quest Agent

Create `plugin/agents/completion-side-quest.md` with frontmatter:
- `name: completion-side-quest`
- `model: opus`
- `description: Analyzes findings from implementation and proposes structured side quest definitions. Spawned by the land-slice orchestrator during findings triage.`

Agent instructions:
- Receives: findings list (from `finding:list --json`), epic architecture paths, conventions path
- Triages findings into: promote (→ side quest), merge (combine related), cull (not worth pursuing)
- For each "promote" finding, produces a structured side quest proposal: name, goal, estimated scope, rationale
- Returns: `{ status, summary, filesWritten, proposals: [{ name, goal, scope, rationale, sourceFindings }], triageResults: [{ findingId, disposition, reason }] }`
- Tools: Read, Grep, Glob
- No Agent tool, no Write tool (proposals are returned, not written — orchestrator creates via CLI)

#### 1.5 Update Sub-Agent Return Format Reference

Update `plugin/agents/_references/sub-agent-return-format.md`:
- Add `verifier` entry with `verificationEvidence` field
- Add `completion-side-quest` entry with `proposals` and `triageResults` fields
- Add `pressure-test-phase` entry (agent exists from slice 09 but has no entry in this reference yet) with `findings` and `triggeredConditions` fields
- Update `implement-phase` entry: replace `redGreenResults` with the new granular `lifecycle` object (see Phase 3 Task 3.6)
- Verify existing entries (completion-slice, completion-epic) are accurate

**Note:** The goal lists "New agents: pressure-test, verifier, completion-side-quest" but `pressure-test-phase` was already created in slice 09. This plan correctly creates only verifier and completion-side-quest. The pressure-test-phase entry is added to sub-agent-return-format (which was missing) but the agent definition itself is not recreated.

#### 1.6 Update Plan-Format Reference

Update `plugin/agents/_references/plan-format.md`:
- Add documentation for the v2 chunk format within Expected Behavior sections
- Each chunk should declare: `id` (short kebab-case), `description`, `expectation` (what changes), `redTest` (what should fail before implementation), `verificationType` (live | supplementary-tests | impossible-with-reason)
- Document chunk dependency declaration (which chunks depend on others)
- This format feeds the plan extractor and the `chunk-start` command

#### 1.7 Update Review-Preamble Reference

Update `plugin/agents/_references/review-preamble.md`:
- Verify the review context adaptation section covers all v2 contexts: `architecture-proposal`, `slice-definitions`, `implementation-plan`, `code-implementation`, `audit-findings`
- Add any new v2-specific guidance (e.g., chunk-level review context for code-implementation reviews should assess chunk TDD adherence)
- Ensure the scoring rubric references are consistent with the rubric YAML files from slice 07a

#### 1.8 Agent Responsibility Delineation

**Important:** The `completion-side-quest` and `completion-slice` agents have distinct, non-overlapping responsibilities:
- `completion-slice`: analyzes **changed files** (git diff) to synthesize learnings, detect architecture drift, and propose recommendations. Its side quest proposals come from code analysis.
- `completion-side-quest`: triages **CLI-tracked findings** (from `finding:list --json`) — findings captured during implementation via `finding:capture`. Its side quest proposals come from the findings ledger.

Both agents may produce side quest proposals, but from different inputs. The land-slice orchestrator deduplicates by comparing proposal descriptions before presenting to the user.

#### 1.9 Update iteration-loop.md to Match CLI Flags

The shared `plugin/skills/_references/iteration-loop.md` has several flag/stdin mismatches with the actual CLI:

1. **`--artifact` → `--artifact-type`**: The reference uses `--artifact $ARTIFACT` throughout, but the CLI uses `--artifact-type` (see `src/commands/refine/_shared.ts`). Update all occurrences. Also rename the `$ARTIFACT` variable to `$ARTIFACT_TYPE` and update the Loop Parameters Schema row that defines the `artifact` parameter key to `artifact_type`.

2. **`refine:score` reviewer field**: The reference passes `reviewer` inside stdin JSON (`{"reviewer":"<name>","dimensions":[...],"score":<N>}`), but the CLI defines `--reviewer` as a **required CLI flag** (`src/commands/refine/score.ts`), and the stdin schema (`refineScoreInputSchema`) only accepts `dimensions` and `findings` — no `reviewer` or `score` field. Fix the invocation pattern: remove `reviewer` and `score` from stdin JSON, add `--reviewer $REVIEWER_ID` as a CLI flag, change stdin to `{"dimensions":[...],"findings":[...]}`.

3. **Add `rubric_path` to Loop Parameters Schema**: Add a new optional parameter `rubric_path` with description: "Path to rubric YAML for convergence evaluation. Passed to `refine:converge`/`refine:evaluate` via `--rubric-path`. Optional — omit for non-epic scopes that don't use rubric-based convergence."

#### 1.10 Update implement-phase Agent Definition

The implement-phase agent return contract changes from `redGreenResults: { passed, hasUnexpectedPass, details }` to a granular `lifecycle` object (see Phase 3 Task 3.6). Update `plugin/agents/implement-phase.md`:
- Rewrite the Return Results section (Section 9) to document the new `lifecycle` schema
- Update any examples that reference `redGreenResults`
- Ensure the agent instructions describe returning granular per-step status so the orchestrator can emit the correct subset of chunk lifecycle events on partial completion

### Verification

1. `bun run build` succeeds with exit code 0
2. `bun test` passes — existing convergence evaluator tests work with `ConvergenceRubric`
3. `node -e "require('gray-matter')(require('fs').readFileSync('plugin/agents/verifier.md','utf8'))"` parses without error
4. `node -e "require('gray-matter')(require('fs').readFileSync('plugin/agents/completion-side-quest.md','utf8'))"` parses without error
5. `node -e "require('js-yaml').load(require('fs').readFileSync('plugin/rubrics/implementation-plan.yaml','utf8'))"` parses without error

---

## Phase 2: plan-slice v2 Rewrite

**Objective:** Rewrite the plan-slice skill to use v2 slice commands (`slice:plan-draft`, `slice:plan-commit`, `slice:plan-shape-*`) and epic-scoped `refine:*` commands for the refinement loop. Add the plan-shape checkpoint (P8) between draft and refinement. Update plan-pipeline.md with entity-type conditional command tables for v1/v2 coexistence.

### Expected Behavior

**Before:** plan-slice uses v1 commands: `start-plan`, `submit-plan`, `{ENTITY_TYPE}:refine-plan`, `start-refinement`, `submit-refinement`. No plan-shape checkpoint. Refinement uses `submit-refinement --slice`.

**After:** plan-slice uses v2 commands for slices:
- Draft: `slice:plan-draft --epic $EPIC_NAME --slice $SLICE_NAME` (stdin: `{content}`) → emits `slice-plan-drafted` (P7)
- Shape checkpoint: `slice:plan-shape-start` → `slice:plan-shape-approve`/`slice:plan-shape-auto` (P8)
- Refinement: `refine:start`, `refine:score`, `refine:synthesize`, `refine:revise`, `refine:evaluate`, `refine:converge`/`refine:stuck`/`refine:override` (all with `--epic $EPIC_NAME --artifact-type implementation-plan`)
- Commit: `slice:plan-commit --epic $EPIC_NAME --slice $SLICE_NAME` (P9)
- plan-pipeline.md updated with entity-type conditional command tables (slices use v2, quests still use v1)
- `expertise-tracking.md` added as shared reference (plan-slice has an interactive Q&A phase — all interactive skills include this reference per codebase convention)

**Verification:**
- `bun run build` succeeds
- Diff plan-slice SKILL.md — every `gp` command reference is a valid v2 command (verify against `gp --help`)
- No v1 commands remain: `start-plan`, `submit-plan`, `refine-plan`, `start-refinement`, `submit-refinement` for slice scope
- plan-pipeline.md still supports quest scope via v1 commands (conditional tables)
- plan-shape checkpoint step exists between draft and refinement

### Tasks

#### 2.1 Update plan-pipeline.md with Entity-Type Conditional Commands

Add conditional command tables to plan-pipeline.md, following the pattern established in slice 09 (entity-type-conditional command tables):

| Stage | Slice (v2) | Quest (v1) |
|---|---|---|
| Context assembly | `slice:plan-draft` returns contextBundle | `start-plan --quest` |
| Submit draft | `slice:plan-draft` (already done above) | `submit-plan --quest` |
| Shape checkpoint | `slice:plan-shape-start` → `slice:plan-shape-revise` (loop) → approve/auto | *(skip — quests have no shape checkpoint)* |
| Begin refinement | `refine:start --epic --artifact-type implementation-plan` | `{ENTITY_TYPE}:refine-plan --quest` |
| Refinement context | `refine:evaluate` (read-only check) | `start-refinement --quest` |
| Record score | `refine:score --epic --artifact-type implementation-plan` | *(scores embedded in submit command)* |
| Record synthesis | `refine:synthesize --epic --artifact-type implementation-plan` | *(not recorded for quests)* |
| Record revision | `refine:revise --epic --artifact-type implementation-plan` | *(not recorded for quests)* |
| Submit refinement | `refine:converge` / `refine:stuck` / `refine:override` + `slice:plan-commit` | `submit-refinement --quest` |

Update Phase B steps (B1-B7) to use the conditional commands based on entity type.

#### 2.2 Rewrite plan-slice Phase Table and Re-Entry Detection

Replace the current 2-phase table with a v2 phase model:

| Phase | Type | v2 Phase | What Happens |
|---|---|---|---|
| 1. Plan Q&A | Interactive | — | Ask user about approach, phasing, expected behavior |
| 2. Plan draft | Autonomous | P7 | Spawn plan-phase agent, `slice:plan-draft` |
| 3. Plan shape | Collaborative/Autonomous | P8 | `plan-shape-start` → approve/auto based on steering |
| 4. Plan refinement + commit | Autonomous | P8→P9 | Refinement loop via `refine:*`, then `slice:plan-commit` |

Update re-entry detection to use v2 phase model from `slice:show --json`:

| Phase | Action |
|---|---|
| (no slice or pre-P7) | Proceed to Phase 1 (Q&A) |
| P7 (plan drafted, not shaped) | Skip to Phase 3 (shape checkpoint) |
| P8 (shape approved, not committed) | Skip to Phase 4 (refinement) |
| P9 (plan committed) | Plan complete — inform user |
| P10+ | Slice is past planning — not ready for plan-slice |

#### 2.3 Rewrite Plan Draft Step (Phase 2)

Replace the plan-pipeline Phase B1-B4 with v2 commands for slice scope:

1. Spawn `plan-phase` agent (unchanged — same agent, same Q&A output path)
2. Pipe plan content to `slice:plan-draft`. **Orchestrator-discipline exception:** the orchestrator reads the agent's output file to pipe its content to the CLI command via shell pipeline. This is necessary because `slice:plan-draft` accepts stdin `{content}` — there is no file-path-based alternative. The orchestrator does not interpret the plan content; it passes it through opaquely.

```bash
cat $TMPDIR/draft/plan.md | jq -Rs '{content: .}' | $GP slice:plan-draft --epic $EPIC_NAME --slice $SLICE_NAME --json
```

3. Parse the response — extract `contextBundle` for downstream use

#### 2.4 Add Plan-Shape Checkpoint Step (Phase 3, NEW)

After `slice:plan-draft` succeeds (P7):

1. `$GP slice:plan-shape-start --epic $EPIC_NAME --slice $SLICE_NAME --json` — emits `plan-shape-checkpoint-reached`
2. Check steering preference via `$GP epic:show --epic $EPIC_NAME --json` — read the `steeringPreference` field. Expected values: `always-consult` (collaborative), `best-guess-and-flag` (autonomous with flagging), `ask-in-the-moment` (default — treat as collaborative for shape checkpoints). If field is absent, default to collaborative (present to user).
3. If autonomous steering (`best-guess-and-flag`): `$GP slice:plan-shape-auto --epic $EPIC_NAME --slice $SLICE_NAME --json`
4. If collaborative steering (`always-consult`, `ask-in-the-moment`, or absent): present plan summary to user via AskUserQuestion ("Plan drafted for {SLICE_NAME}. Review the plan shape before refinement begins. Approve / Request revisions?"). If approved: `$GP slice:plan-shape-approve --epic $EPIC_NAME --slice $SLICE_NAME --json`. If revisions requested: spawn editor with user feedback, then `slice:plan-shape-revise`, loop back.

#### 2.5 Rewrite Refinement Loop for v2 (Phase 4)

Replace plan-pipeline Phase B5-B7 refinement commands with `refine:*` for slice scope:

1. `$GP refine:start --epic $EPIC_NAME --artifact-type implementation-plan --json` — begins refinement round
2. Per reviewer: `echo '{"dimensions":[...],"findings":[...]}' | $GP refine:score --epic $EPIC_NAME --artifact-type implementation-plan --reviewer $REVIEWER_ID --json`
3. After synthesis: `echo '<synthesis payload>' | $GP refine:synthesize --epic $EPIC_NAME --artifact-type implementation-plan --json`
4. After editor: `$GP refine:revise --epic $EPIC_NAME --artifact-type implementation-plan --json`
5. Read-only check: `$GP refine:evaluate --epic $EPIC_NAME --artifact-type implementation-plan --json`
6. Exit (pass `--rubric-path` to load the real rubric YAML):
   - Pass: `$GP refine:converge --epic $EPIC_NAME --artifact-type implementation-plan --rubric-path ${CLAUDE_PLUGIN_ROOT}/rubrics/implementation-plan.yaml --json`
   - Stagnation/reduction/cap: `$GP refine:stuck --epic $EPIC_NAME --artifact-type implementation-plan --json`
   - Force: `$GP refine:override --epic $EPIC_NAME --artifact-type implementation-plan --override="<reason>" --json`
7. After loop exits: `$GP slice:plan-commit --epic $EPIC_NAME --slice $SLICE_NAME --json` (P9)

#### 2.6 Update Loop Parameters

Update the Loop Parameters table:

| Parameter | Value |
|---|---|
| **max_iterations** | 10 (override via `$GP_PLAN_SLICE_MAX_ITERATIONS`) |
| **run_dir_mode** | `temp` |
| **submit_command** | `$GP refine:converge --epic $EPIC_NAME --artifact-type implementation-plan --json` (pass exit) |
| **override_flag** | Use `refine:override --override="<reason>"` instead of `--override` flag on submit |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **resume_detection** | yes — deterministic temp dir |
| **review_context** | `"implementation-plan"` |
| **rubric** | `implementation-plan` (from Phase 1) |

### Verification

1. `bun run build` succeeds
2. All v2 commands referenced in plan-slice SKILL.md exist in `gp --help` output
3. Zero matches for v1 slice-scoped commands: `start-plan --slice`, `submit-plan --slice`, `refine-plan`, `start-refinement --slice`, `submit-refinement --slice`
4. plan-pipeline.md still contains v1 quest commands (backward compatibility)
5. Plan-shape checkpoint step exists between draft and refinement in plan-slice

---

## Phase 3: implement-slice v2 (New Skill)

**Objective:** Create the new `implement-slice` skill for P10+P11, splitting implementation concern from the current `implement` skill. This skill orchestrates chunk-based TDD implementation with v2 chunk lifecycle events and code refinement.

### Expected Behavior

**Before:** No `plugin/skills/implement-slice/` directory exists. The current `implement` skill handles both implementation and completion in one flow using v1 commands.

**After:** `plugin/skills/implement-slice/SKILL.md` exists with:
- P10 implementation: `slice:implement-start` → per-chunk TDD cycle (`chunk-start`, `chunk-red-written`, `chunk-red-failed`, `chunk-green`, `chunk-verify`/`chunk-unverifiable`/`chunk-decide`)
- P11 code refinement: `slice:code-refine-start` → refinement loop via `refine:*` → `slice:code-refine-commit`
- Chunk-based implementation (one implement-phase agent spawn per chunk, not per plan phase)
- Verifier agent integration for chunk verification
- R1 pause discipline (pre-flight + reactive triggers)

**Verification:**
- `bun run build` succeeds
- All v2 commands referenced exist in `gp --help` output
- SKILL.md has valid YAML frontmatter
- No v1 commands: `slice:implement`, `submit-implementation`
- Chunk lifecycle commands are called in correct TDD order: start → red-written → red-failed → green → verify

### Tasks

#### 3.1 Create Skill Directory and Frontmatter

Create `plugin/skills/implement-slice/SKILL.md` with frontmatter:
```yaml
name: implement-slice
description: >-
  Implements a slice plan using v2 chunk-based TDD. Orchestrates P10 (implementation with
  chunk lifecycle events) and P11 (code refinement). Common triggers: 'implement slice',
  'implement this slice', 'start implementation', 'build this slice'.
user-invocable: true
requires: gp >= 1.0.0
```

#### 3.2 Write Phase Table and Shared References

Include standard references:
- `@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md`
- `@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md`
- `@${CLAUDE_PLUGIN_ROOT}/skills/_references/iteration-loop.md`

Phase table:

| Phase | Type | v2 Phase | What Happens |
|---|---|---|---|
| 1. Implementation | Autonomous | P10 | Per-chunk TDD: implement-phase agent → chunk lifecycle events → review loop |
| 2. Code refinement | Autonomous | P11 | Code review loop via `refine:*` → `code-refine-commit` |

#### 3.3 Write Step 0-2: Setup, Scope Resolution, Re-Entry

- **Step 0**: CLI version check, temp directory formula (`/tmp/gp-implement-slice-${SLICE_NAME}`)
- **Step 1**: Scope resolution — accept slice name or auto-detect from `status --json` or `slice:list --json`. Require slice in P9 (plan-committed) or P10 (implementing) or P11 (code-refining) status.
- **Step 2**: Re-entry detection using v2 phase model from `slice:show --epic $EPIC_NAME --slice $SLICE_NAME --json`:

| Phase | Action |
|---|---|
| P9 (plan committed) | Fresh start — `slice:implement-start`, proceed to Phase 1 |
| P10 (implementing) | Resume — check chunk states, find first non-terminal chunk, resume |
| P11 (code refining) | Resume code refinement loop |
| P12 (landed) | Already done — inform user |
| Other | Not ready for implementation |

#### 3.4 Write Step 3: Plan Loading + Chunk Extraction

Load the plan from `slice:show --json` — extract plan path and parse chunk definitions:
- Structural parse: extract chunk IDs, descriptions, expected behavior, verification types, dependencies
- Build `chunks` array: `{ id, description, expectation, redTest, verificationType, dependencies }`
- Derive `PLAN_SLUG` from slice name (kebab-case)
- Store `totalChunks = chunks.length`

Resolve chunk execution order from dependency graph (topological sort). If cyclic dependencies detected, stop with error.

#### 3.5 Write Step 4: Pre-Implementation

- **4a. Clean git state**: `git status --porcelain` — stop if uncommitted changes
- **4b. Resolve architecture path**: from `$GP status --json` — extract active epic, construct `.goodplan/epics/{EPIC_NAME}/architecture/_overview.md`
- **4c. Record pre-impl commit**: `PRE_IMPL_COMMIT=$(git rev-parse HEAD)`
- **4d. R1 pre-flight**: Commit to pause triggers before entering autonomy. Log: "Pre-flight: will pause on blocking-finding, assumption-invalidated, stuck (2+ rounds without progress), unverifiable-chunk, non-convergence"
- **4e. Create temp dir**: `mkdir -p "$TMPDIR"`

#### 3.6 Write Step 5: Chunk Implementation Loop (P10)

For each chunk `c` in `chunks` (in dependency order, starting from first non-terminal on resume):

**5.1. Start chunk:**
```bash
echo '{"description":"<chunk description>"}' | $GP slice:chunk-start --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

**5.2. Spawn implement-phase agent** with: chunk ID, chunk description, expected behavior (before/after checks), plan path, architecture path, temp dir, merged feedback (if retry). Agent implements the chunk following the TDD cycle: write RED test → verify RED fails → implement → verify GREEN passes.

Expected return — granular per lifecycle step so the orchestrator knows which events to emit on partial completion:
```json
{
  "status": "SUCCESS | PARTIAL | FAILED",
  "summary": "...",
  "filesWritten": [...],
  "lifecycle": {
    "redWritten": true | false,
    "redFailed": true | false,
    "redFailureEvidence": "...",
    "greenPassed": true | false,
    "greenEvidence": "...",
    "hasUnexpectedPass": true | false,
    "details": "..."
  }
}
```

**Partial completion handling:** If the agent returns `PARTIAL` or `FAILED`, the orchestrator emits only the lifecycle events the agent completed. For example, if `redWritten: true` but `redFailed: false` (RED unexpectedly passed), the orchestrator emits `chunk-red-written` but not `chunk-red-failed`. On resume, the chunk's last-emitted event determines where to restart.

**5.3. Record RED test** (if `lifecycle.redWritten`):
```bash
$GP slice:chunk-red-written --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

**5.4. Verify RED fails** (if `lifecycle.redFailed`):
```bash
echo '{"evidence":"<redFailureEvidence>"}' | $GP slice:chunk-red-failed --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

If RED check unexpectedly passes (`hasUnexpectedPass`), surface to user: "RED check passed unexpectedly for chunk {CHUNK_ID}. This suggests the test doesn't test what you expect. Continue / Stop to investigate?"

**5.5. Record GREEN** (if `lifecycle.greenPassed`):
```bash
echo '{"evidence":"<greenEvidence>"}' | $GP slice:chunk-green --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

**5.6. Verify chunk:**
Spawn `verifier` agent for independent verification. If verification passes:
```bash
echo '{"evidence":"<verification evidence>"}' | $GP slice:chunk-verify --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

If verification fails or is impossible:
```bash
$GP slice:chunk-unverifiable --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```
Then surface to user for decision:
```bash
echo '{"decision":"accept|revert|defer","reason":"<reason>"}' | $GP slice:chunk-decide --epic $EPIC_NAME --slice $SLICE_NAME --chunk $CHUNK_ID --json
```

**5.7. Review loop (per-chunk):**
Follow iteration-loop.md with `review_context: "code-implementation"`. Run dir: `<slice-path>/implementation/chunk-${CHUNK_ID}/`. Each round: reviewers → synthesis → editor → exit criteria. If not converged, re-spawn implement-phase with merged feedback.

**Note on event logging:** Per-chunk review rounds are ephemeral — they do NOT use `refine:*` commands and are not recorded in the event log. This is intentional: chunk-level review is local quality assurance, not trust-layer auditable refinement. The trust boundary for implementation is the `chunk-verify` event (Step 5.6), which carries concrete verification evidence. The P11 code refinement phase (Step 6) uses `refine:*` commands for trust-auditable whole-slice review.

**Debugging artifacts:** Although not event-logged, chunk review artifacts ARE persisted in the run directory (`<slice-path>/implementation/chunk-${CHUNK_ID}/round-{N}/reviews/`, `round-{N}/merged.md`) per `run_dir_mode: persistent`. These files serve as debugging artifacts for investigating chunk-level review failures and are git-committed with the implementation. They are not cleaned up until the slice lands.

**5.8. Orchestrator commits:**
```bash
git add <filesWritten>
git commit -m "[${PLAN_SLUG}] Chunk ${CHUNK_ID}: ${chunk.description}"
```

**5.9. Advance** to next chunk.

#### 3.7 Write Step 6: Code Refinement (P11)

After all chunks complete:

1. `$GP slice:code-refine-start --epic $EPIC_NAME --slice $SLICE_NAME --json` — emits `slice-code-refinement-started`, returns contextBundle (P11)
2. Refinement loop using `refine:*` commands with `--artifact-type code-implementation`:
   - `refine:start`, `refine:score`, `refine:synthesize`, `refine:revise`, `refine:evaluate`
   - Exit: `refine:converge` / `refine:stuck` / `refine:override`
3. `$GP slice:code-refine-commit --epic $EPIC_NAME --slice $SLICE_NAME --json` — emits code refinement converged

#### 3.8 Write Step 7: Post-Implementation Checks

Auto-format, lint, build, test (same pattern as current implement skill Step 5.5). If failures, feed back into code refinement loop.

#### 3.9 Write Loop Parameters and Error Handling

Loop Parameters:

| Parameter | Value |
|---|---|
| **max_iterations** | 12 (override via `$GP_IMPLEMENT_SLICE_MAX_ITERATIONS`) |
| **early_exit_threshold** | `{ min_iterations: 3, score: 8 }` |
| **run_dir_mode** | `persistent` — `<slice-path>/implementation/chunk-{ID}/` |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **review_context** | `"code-implementation"` |
| **rubric** | `code-quality` |

Error handling: include `@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md`. Additional: git commit failure → log warning, continue. Chunk verification failure → surface to user (never silently skip).

#### 3.10 Write Done Summary

Display completion summary with:
- Chunk summary table: `Chunk | Description | Iterations | Final Score | Commit`
- Verification evidence summary
- Next step: `/gp:land-slice {SLICE_NAME}` (or `/gp:implement-slice {next slice}` if code refinement not yet started)

### Verification

1. `bun run build` succeeds
2. All v2 commands referenced exist in `gp --help` output
3. SKILL.md has valid YAML frontmatter (parseable by gray-matter)
4. Chunk lifecycle commands appear in correct TDD order: start → red-written → red-failed → green → verify/unverifiable/decide
5. Code refinement uses `refine:*` commands (not v1 submit commands)
6. No v1 commands: `slice:implement`, `submit-implementation`

---

## Phase 4: land-slice v2 (New Skill)

**Objective:** Create the new `land-slice` skill for P12, handling spine promotion (architecture-current.md update), findings triage, learnings capture, and epic completion detection on final slice.

### Expected Behavior

**Before:** No `plugin/skills/land-slice/` directory exists. Slice landing is handled by the current `implement` skill's Step 6-7, and epic completion is a separate `complete-epic` skill.

**After:** `plugin/skills/land-slice/SKILL.md` exists with:
- P12 landing: spine promotion, findings triage, learnings capture
- `slice:land` command with deferred/learnings/architectureDelta payload
- Findings triage via `completion-side-quest` agent
- Spine promotion: update `architecture-current.md` with honest-intermediate-state
- Epic completion detection: if all slices terminal, auto-trigger complete-epic flow
- Standalone skill — does NOT include implementation (that's implement-slice)

**Verification:**
- `bun run build` succeeds
- All v2 commands referenced exist in `gp --help` output
- SKILL.md has valid YAML frontmatter
- Spine promotion step updates `architecture-current.md` (honest-intermediate-state rule)
- Findings triage uses `completion-side-quest` agent
- Epic completion detection checks all slices terminal and suggests `/gp:complete-epic`

### Tasks

#### 4.1 Create Skill Directory and Frontmatter

Create `plugin/skills/land-slice/SKILL.md` with frontmatter:
```yaml
name: land-slice
description: >-
  Lands a completed slice: promotes spine artifacts, triages findings, captures learnings,
  and detects epic completion. Common triggers: 'land slice', 'land this slice', 'complete
  landing', 'finish slice'.
user-invocable: true
requires: gp >= 1.0.0
```

#### 4.2 Write Phase Table and Re-Entry

Include references: `cli-interaction.md`, `orchestrator-discipline.md`, `expertise-tracking.md`.

Phase table:

| Phase | Type | What Happens |
|---|---|---|
| 1. Spine promotion | Autonomous | Update architecture-current.md with honest intermediate state |
| 2. Findings triage | Collaborative | Spawn completion-side-quest agent, surface proposals for user decisions |
| 3. Learnings + land | Autonomous + Collaborative | Spawn completion-slice agent, surface recommendations, call `slice:land` |
| 4. Epic check | Autonomous | Detect if all slices terminal, suggest next steps |

Re-entry via `slice:show --json` phase field:

| Phase | Action |
|---|---|
| P11 (code refinement converged) | Ready for landing — proceed to Step 1 |
| P12 (already landed) | Inform user: "Slice is already landed." |
| P10 (implementing) | Not ready: "Slice is still implementing. Run `/gp:implement-slice` first." |
| P9 or earlier | Not ready: "Slice is in planning phase. Run `/gp:plan-slice` or `/gp:implement-slice` first." |

#### 4.3 Write Step 1: Spine Promotion

**The honest-intermediate-state rule:** architecture-current.md must always reflect what the codebase IS (not what it's becoming). After each slice lands, update it.

1. Resolve paths:
   - `architecture-current.md` at `.goodplan/architecture/_overview.md`
   - Epic target architecture at `.goodplan/epics/{EPIC_NAME}/architecture/`
2. Derive `PRE_IMPL_COMMIT`: land-slice runs in a separate session from implement-slice, so the variable is not available. Resolve by finding the commit before the first `[${PLAN_SLUG}]` commit in git log: `git log --oneline --fixed-strings --grep="[${PLAN_SLUG}]" --reverse | head -1` to find the first implementation commit, then `git rev-parse <that-commit>^` for the pre-implementation state. Use `--fixed-strings` to avoid regex interpretation of PLAN_SLUG characters.
3. Spawn `completion-slice` agent with: slice path, plan path, changed files (`git diff --name-only $PRE_IMPL_COMMIT..HEAD`), architecture-current path, epic architecture path. **This single agent spawn serves both spine promotion (Step 1) and learnings capture (Step 3)** — cache the full return for reuse. The agent's return type serves two consumers; document this coupling in the agent's instructions so future maintainers understand it.
4. Agent returns `architectureDelta` — list of `{ subsystem, type, description }` changes
5. For each delta: present the agent's structured `architectureDelta` entry (`{ subsystem, type, description }`) to user ("Architecture change: {description}. Apply to architecture-current.md / Defer / Skip"). **Orchestrator-discipline exception (narrow, justified):** the orchestrator must Read `architecture-current.md` to derive the `old_string` for the Edit tool, since the agent's delta description alone cannot specify what text to replace. This is a narrow exception — the orchestrator reads only to locate the edit target, not to interpret architectural content. After locating the relevant section (by subsystem name), it applies the Edit with the agent's description as the replacement guidance. This mirrors the `complete-epic` Step 5 architecture-update pattern where the orchestrator also reads for Edit operations.
6. **Re-entry resilience:** After the agent completes, persist its full return as `$TMPDIR/agent-return.cache` (JSON) in the temp directory (`/tmp/gp-land-slice-${SLICE_NAME}/`). On re-entry, if this file exists, skip the agent spawn and load from cache. Using the temp dir (not `.goodplan/`) avoids violating the CLI-only write rule for `.goodplan/` state. The cache may not survive reboots, which is acceptable — the agent is re-spawned on cache miss.

#### 4.4 Write Step 2: Findings Triage

1. Load findings: `$GP finding:list --epic $EPIC_NAME --json`
2. If findings exist, spawn `completion-side-quest` agent with findings and context
3. Agent returns `proposals` (side quest definitions) and `triageResults` (disposition per finding)
4. For each proposal: present to user ("Proposed side quest: {name} — {goal}. Create / Defer / Skip")
5. For approved: `echo '{"name":"<name>","goal":"<goal>"}' | $GP side-quest:create --json`
6. For each triage result: if disposition is "cull", no action; if "merge", note for learnings

#### 4.5 Write Step 3: Learnings Capture + Land Command

1. From the completion-slice agent return (spawned in Step 1, or loaded from `agent-return.cache` on re-entry), extract `learnings` array
2. Surface recommendations to user (same pattern as current implement skill Step 6.4)
3. Build the `slice:land` payload:
   ```bash
   echo '{"deferred":[...],"learnings":[...],"architectureDelta":[...]}' | $GP slice:land --epic $EPIC_NAME --slice $SLICE_NAME --json
   ```
4. `deferred`: items the user chose to defer in Steps 1-2
5. `learnings`: from completion-slice agent + any user-surfaced learnings
6. `architectureDelta`: approved architecture changes from Step 1

#### 4.6 Write Step 4: Epic Completion Detection

After landing:
1. `$GP slice:list --epic $EPIC_NAME --json` — check if all slices are in terminal state (`completed`, `abandoned`, or `landed`)
2. If all terminal: "All slices are complete. Run `/gp:complete-epic` when ready."
3. If not all terminal: "Slice landed. Next unfinished slice: {name} (phase: {phase}). Run `/gp:plan-slice {name}` or `/gp:implement-slice {name}`."

#### 4.7 Write Done Summary and Error Handling

Done summary:
```
**Slice Landed**
- **Slice**: {SLICE_NAME}
- **Architecture updates**: {count applied} applied, {count deferred} deferred
- **Side quests created**: {count}
- **Learnings captured**: {count}
- **Findings triaged**: {count promote} promoted, {count cull} culled, {count merge} merged
- **Next**: {next step suggestion}
```

Error handling: `@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md`. Additional: if `slice:land` fails with invariant violation (`slice.code-refinement-converged-before-land`), inform user that code refinement must converge first.

### Verification

1. `bun run build` succeeds
2. All v2 commands referenced exist in `gp --help` output
3. SKILL.md has valid YAML frontmatter
4. Spine promotion step references `architecture-current.md`
5. Findings triage spawns `completion-side-quest` agent
6. Epic completion detection uses `slice:list --json`
7. `slice:land` is called with structured payload (deferred, learnings, architectureDelta)

---

## Phase 5: Cross-Skill Audit + Build Verification

**Objective:** Verify all new and modified files are internally consistent, reference valid commands, and build cleanly.

### Expected Behavior

**Before:** New skills and agents have been written but not cross-checked for consistency.

**After:** Full cross-skill consistency verified. Build succeeds. No stale command references. All shared references resolve.

### Tasks

#### 5.1 Full Build Check

Run `bun run build` and verify no errors.

#### 5.2 Cross-Skill Command Audit

Run a comprehensive check across all new/modified files:

Files to audit:
- `plugin/skills/plan-slice/SKILL.md`
- `plugin/skills/implement-slice/SKILL.md`
- `plugin/skills/land-slice/SKILL.md`
- `plugin/skills/_references/plan-pipeline.md`
- `plugin/agents/verifier.md`
- `plugin/agents/completion-side-quest.md`
- `plugin/agents/_references/sub-agent-return-format.md`
- `plugin/agents/_references/plan-format.md`

For each file:
1. Collect all `gp` command references
2. Verify each against `gp --help` output
3. Flag any command that appears in the skills but not in the CLI

#### 5.3 Shared Reference Consistency

Verify that `@` includes resolve to existing files:
- `cli-interaction.md` — all three skills
- `orchestrator-discipline.md` — all three skills
- `iteration-loop.md` — plan-slice, implement-slice
- `plan-pipeline.md` — plan-slice
- `reviewer-registry.md` — via iteration-loop.md
- `sub-agent-return-format.md` — all agents
- `expertise-tracking.md` — plan-slice (interactive Q&A), land-slice (user-facing completion)
- `orchestrator-error-handling.md` — all three skills
- `review-preamble.md` — referenced by reviewer agents (modified in Task 1.7)

#### 5.4 Verify No Stale v1 Command References in Slice-Scoped Code

Grep across all new/modified files for v1 commands that should not appear in slice-scoped contexts:
- `start-plan --slice`, `submit-plan --slice` (replaced by `slice:plan-draft`, `slice:plan-commit`)
- `slice:refine-plan`, `start-refinement --slice`, `submit-refinement --slice` (replaced by `refine:*`)
- `slice:implement` (replaced by `slice:implement-start`)
- `submit-implementation --slice` (replaced by chunk lifecycle commands)
- `slice:complete` (replaced by `slice:land`)

Note: v1 quest commands (`start-plan --quest`, `submit-plan --quest`, etc.) are valid and should NOT be flagged.

#### 5.5 Agent Consistency Check

Verify:
- `verifier` and `completion-side-quest` agent frontmatter has: name, description, model (matching existing agent convention — tools are documented in body text, not frontmatter)
- Agent body text includes explicit tools list (e.g., "This agent runs with Read, Grep, Glob, Bash tools")
- Return format matches entries in `sub-agent-return-format.md`
- `implement-phase.md` return section matches the new `lifecycle` contract from Task 1.10
- No Agent tool in disallowedTools (flat hierarchy)
- Rubric reference in `implementation-plan.yaml` is valid YAML

#### 5.6 Old Skill Coexistence

The old `implement` skill and the new `implement-slice`/`land-slice` skills will coexist (both auto-discovered from directory structure). Update:
- `plugin/skills/implement/SKILL.md`: add a note at the top of the description: "**v1 only — for v2 slices, use `/gp:implement-slice` and `/gp:land-slice` instead.**" This prevents the LLM trigger matcher from selecting the old skill for v2 slices.
- `plugin/skills/complete-epic/SKILL.md`: no change needed — it remains the standalone epic completion skill. `land-slice` detects final-slice and *suggests* `/gp:complete-epic`, not absorbs it.

Verify: both old and new skill descriptions clearly indicate their scope (v1 vs v2).

### Verification

1. `bun run build` succeeds with exit code 0
2. All v2 commands referenced exist in CLI
3. Zero matches for stale v1 commands in slice-scoped files
4. All `@` references resolve to existing files
5. New agents have valid frontmatter

---

## Phase 6: Dogfood Harness Test

**Objective:** Create an Agent SDK harness test that exercises the slice execution pipeline (plan → implement → land) through the v2 skills, verifying correct event emission and CLI command usage.

### Expected Behavior

**Before:** No `tools/dogfood/test-slice-execution-v2.ts` exists.

**After:** `tools/dogfood/test-slice-execution-v2.ts` exists and tests:
- `plan-slice` skill produces v2 events (slice-plan-drafted, plan-shape-*, slice-plan-committed)
- `implement-slice` skill emits chunk lifecycle events
- `land-slice` skill completes the slice
- Full pipeline: plan → implement → land produces expected event sequence

**Verification:**
- `bun tools/dogfood/test-slice-execution-v2.ts` runs without errors
- Test output shows v2 commands being invoked
- Event log contains expected v2 event types

### Tasks

#### 6.1 Create test-slice-execution-v2.ts with Fixture Setup

Create `tools/dogfood/test-slice-execution-v2.ts` following existing harness patterns (test-create-epic-v2.ts):

1. Import `query` from `@anthropic-ai/claude-agent-sdk` and `createTestEnv` from `utils.ts`
2. Set up isolated environment: `permissionMode: "bypassPermissions"`, `plugins: [{ type: "local", path: PLUGIN_DIR }]`, `settingSources: []`, `env: createTestEnv(PLUGIN_DIR)`
3. **Fixture setup** — use the Agent SDK `query()` pattern (not raw CLI calls) to create the prerequisite state, following `test-create-epic-v2.ts` pattern:
   - First `query()` call: drive `/gp:create-epic` to create an epic with a goal, explore, and define architecture + slices. This produces an activated epic with a test slice.
   - Alternative (cheaper): use raw CLI calls with explicit stdin payloads for fixture setup. If using this approach, specify exact invocations:
     ```bash
     gp init --json
     echo '{"name":"test-epic"}' | gp epic:create --json
     echo '{"content":"Test epic goal"}' | gp epic:goal-draft --epic test-epic --json
     gp epic:goal-commit --epic test-epic --json
     # ... (skip explore/architecture for fixture — activate directly if possible)
     echo '{"name":"test-slice","goal":"Create a single-file hello.ts with one exported function"}' | gp slice:create --epic test-epic --json
     ```
   - Add explicit error handling around each fixture step with clear failure messages.
4. Run `/gp:plan-slice test-slice` — verify it calls v2 commands (`slice:plan-draft`, `slice:plan-shape-start`, `slice:plan-commit`)
5. Verify slice phase reaches at least P9 via `gp slice:show --epic test-epic --slice test-slice --json`
6. Use `--model opus` per convention

#### 6.2 Add implement-slice + land-slice Pipeline Test

The full pipeline test is required to satisfy goal verification #6 ("Dogfood harness exercises the full slice pipeline"). Use cost controls to keep it affordable:

1. After plan-slice completes (P9), run `/gp:implement-slice test-slice` with `$GP_IMPLEMENT_SLICE_MAX_ITERATIONS=2`
2. Verify chunk lifecycle events appear in conversation output (`chunk-start`, `chunk-red-written`, etc.)
3. Verify slice reaches P10+
4. After implement-slice completes, run `/gp:land-slice test-slice`
5. Verify `slice:land` is called
6. Verify slice phase reaches P12

Use a minimal test slice goal (e.g., "create a single-file utility with one function") to keep agent costs low. The test validates command integration, not implementation quality.

#### 6.3 Verify Event Log

After pipeline completes, read the event log:
```bash
gp events:tail --epic test-epic --json
```

Verify the event sequence includes (in order):
- `slice-plan-drafted`
- `plan-shape-checkpoint-reached`
- `plan-shape-approved` or `plan-shape-checkpoint-auto-shaped`
- `slice-plan-committed`
- (if implement ran) `slice-implementation-started`, `slice-implementation-chunk-started`, etc.
- (if land ran) `slice-landed`

### Verification

1. `bun tools/dogfood/test-slice-execution-v2.ts` exits with code 0
2. Test output shows v2 commands being invoked
3. No v1 commands appear in the test conversation output
4. Event log contains expected v2 event types

---

## Notes

### v2 Slice Phase Model (Quick Reference)

| Phase | Triggered By | Meaning |
|---|---|---|
| P7 | `slice-plan-drafted` | Plan exists, needs shape approval |
| P8 | `plan-shape-approved` / `plan-shape-checkpoint-auto-shaped` | Shape approved, ready for refinement |
| P9 | `slice-plan-committed` | Plan finalized, ready for implementation |
| P10 | `slice-implementation-started` | Implementation in progress (chunk lifecycle) |
| P11 | `slice-code-refinement-started` | Code refinement in progress |
| P12 | `slice-landed` | Slice complete |

### Chunk TDD Lifecycle (Event Sequence per Chunk)

```
chunk-start → chunk-red-written → chunk-red-failed → [implement] → chunk-green → chunk-verify
                                                                                    ↘ chunk-unverifiable → chunk-decide
```

### Key Invariants Enforced by CLI

- `slice.plan-converged-before-implement` — plan must be committed before implementation
- `slice.code-refinement-converged-before-land` — code refinement must converge before landing
- `chunk.red-test-failed-before-green` — RED must fail before GREEN
- `chunk.evidence-non-empty` — verification evidence must be concrete

### Files Changed/Created by This Slice

**Modified:**
- `src/trust/convergence/evaluator.ts` — type reconciliation (ConvergenceRubric)
- `src/trust/convergence/index.ts` — barrel re-export update
- `src/trust/index.ts` — barrel re-export update
- `src/trust/refinement-loop-types.ts` — Rubric → ConvergenceRubric
- `src/commands/refine/converge.ts` — add `--rubric-path` arg, load rubric YAML
- `src/commands/refine/evaluate.ts` — add `--rubric-path` arg
- `tests/trust/convergence/evaluator.test.ts` — Rubric → ConvergenceRubric type annotations
- `plugin/skills/plan-slice/SKILL.md` — v2 rewrite
- `plugin/skills/implement/SKILL.md` — v1-only deprecation note
- `plugin/skills/_references/plan-pipeline.md` — conditional command tables
- `plugin/skills/_references/iteration-loop.md` — `--artifact` → `--artifact-type` flag fix
- `plugin/agents/implement-phase.md` — return contract update (lifecycle object)
- `plugin/agents/_references/sub-agent-return-format.md` — new + updated agent entries
- `plugin/agents/_references/plan-format.md` — v2 chunk format
- `plugin/agents/_references/review-preamble.md` — v2 review context additions

**Created:**
- `plugin/rubrics/implementation-plan.yaml`
- `plugin/agents/verifier.md`
- `plugin/agents/completion-side-quest.md`
- `plugin/skills/implement-slice/SKILL.md`
- `plugin/skills/land-slice/SKILL.md`
- `tools/dogfood/test-slice-execution-v2.ts`
