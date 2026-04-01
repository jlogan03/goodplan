# Test Harness API — Simplify Data Model Epic

## Overview

Extend the existing Agent SDK test harness at `tools/dogfood/` to support the new skill model. Three improvements: LLM-simulated user responses, per-test model selection, and phase status verification.

## 1. LLM-Simulated User Responses

### Current Behavior

The `canUseTool` interceptor in all harness files auto-selects the first option for every `AskUserQuestion`:

```typescript
const firstOption = q.options[0];
answers[q.question] = firstOption?.label ?? "Proceed";
```

### Target Behavior

Replace with an LLM call that reads the question, options, and fixture context to generate a contextually appropriate answer:

```typescript
async function simulateUserResponse(
  question: string,
  options: Array<{ label: string; description: string }>,
  fixtureContext: string,
  model: string  // "claude-haiku-4-5" for structural, "claude-sonnet-4-6" for quality
): Promise<string>
```

Implementation options:
- **Agent SDK query()**: spawn a minimal Claude session with the question as prompt
- **Anthropic Messages API**: direct API call with a system prompt describing the fixture

The simulated user has a **persona** defined per fixture: project description, user expertise level, preferences. This prevents nonsensical answers.

**Error handling:** If the LLM call fails (API error, timeout, empty response), fall back to selecting the first option with a warning logged: `[simulateUserResponse] LLM call failed, falling back to first option: <label>`. This ensures tests don't hang on transient API issues.

### Integration

The `canUseTool` interceptor becomes:

```typescript
canUseTool: async (toolName, input) => {
  if (toolName === "AskUserQuestion") {
    const typed = input as AskUserQuestionInput;
    const answers: Record<string, string> = {};
    for (const q of typed.questions) {
      answers[q.question] = await simulateUserResponse(
        q.question,
        q.options,
        fixtureContext,
        testTier === "quality" ? "claude-sonnet-4-6" : "claude-haiku-4-5"
      );
      log(`  [AskUserQuestion] ${q.question} → ${answers[q.question]}`);
    }
    return { behavior: "allow", updatedInput: { questions: typed.questions, answers } };
  }
  return { behavior: "allow", updatedInput: input };
}
```

## 2. Per-Test Model Selection

### Current Behavior

Model is hardcoded per harness file (opus in most, sonnet in test-plugin-skills).

### Target Behavior

Accept `--model` CLI argument in all harness scripts:

```bash
bun tools/dogfood/test-plan-slice.ts --model claude-haiku-4-5    # structural test
bun tools/dogfood/test-plan-slice.ts --model claude-opus-4-6     # quality test
```

Default model per test tier:

| Tier | Default Model | Override |
|---|---|---|
| Structural | `claude-haiku-4-5` | `--model` flag |
| Pipeline | `claude-haiku-4-5` | `--model` flag |
| Quality | `claude-opus-4-6` | `--model` flag |

### Implementation

Parse `--model` from `process.argv` or use the tier default:

```typescript
const model = parseArg("--model") ?? tierDefaults[testTier];
```

Pass to `query()` options.

## 3. Phase Status Verification

### Current Behavior

Post-run checks use ad-hoc `existsSync()` calls on specific files.

### Target Behavior

Verify phase completion via CLI status queries:

```typescript
async function verifyEntityStatus(
  gpBin: string,
  entityType: "epic" | "slice" | "quest",
  entityName: string,
  expectedStatus: string
): Promise<{ ok: boolean; actualStatus: string }>
```

Implementation:

```typescript
async function verifyEntityStatus(gpBin, entityType, entityName, expectedStatus) {
  const flag = entityType === "epic" ? "--epic" : entityType === "slice" ? "--slice" : "--quest";
  const result = execFileSync(gpBin, [`${entityType}:show`, flag, entityName, "--json"], {
    encoding: "utf-8",
    input: "",
  });
  const data = JSON.parse(result);
  return { ok: data.status === expectedStatus, actualStatus: data.status };
}
```

Called after each skill run in pipeline tests:

```typescript
// After plan-slice completes
const { ok, actualStatus } = await verifyEntityStatus(gpBin, "slice", "01-auth", "plan-refined");
assert(ok, `Expected plan-refined, got ${actualStatus}`);
```

## 4. Test Fixture Conventions

### Minimal Fixture (structural/pipeline tests)

A pre-initialized `.goodplan/` project with:
- `project.json` with name and version
- One epic with a 5-line `goal.md`
- Two slice `goal.md` files (3 lines each)
- No research, brainstorm, or architecture files

Created by a setup script that runs `gp init` + `gp epic:create` + `gp slice:create` against a temp directory.

### Realistic Fixture (quality tests)

A real project with source code, tests, and meaningful complexity:
- TypeScript project with 3-5 source files
- Package.json with real dependencies
- At least one test file
- A project idea that requires real architectural decisions

The existing `validate.ts` flashcards project is a good model for this.

## 5. Per-Skill Test Scripts

Each consolidated skill gets its own test script:

| Script | Tests | Tier |
|---|---|---|
| `test-plan-slice.ts` | Full plan-slice pipeline (create + refine) | Structural + quality |
| `test-create-epic.ts` | Full create-epic pipeline (all 6 phases) | Structural + quality |
| `test-create-side-quest.ts` | Full create-side-quest pipeline | Structural + quality |
| `test-implement.ts` | Implementation + slice completion | Structural + quality |
| `test-complete-epic.ts` | Epic completion flow | Structural |
| `test-audit.ts` | Audit mode selection + reviewer flow | Structural |
| `test-init.ts` | Empty repo + existing repo initialization | Structural |
| `test-plugin-skills.ts` | Plugin skill discovery + namespace (existing) | Structural |

Quality tier tests run as the final epic slice (full validation).

## 6. Orchestrator Context Discipline Verification

The dogfood harness verifies the orchestrator fitness function: orchestrator context should contain only CLI output, sub-agent return values, user Q&A, and lightweight summary files. The harness already checks for `.project/` violations; extend it to also flag Read calls on full artifact files (architecture docs, plans, source code) made by the orchestrator (not sub-agents).

Implementation: the `canUseTool` interceptor tracks Read calls. After the skill run, compare Read targets against a known set of artifact paths. Any orchestrator-level Read of a full artifact is a violation.

## 7. Shared Test Utilities

Extract common patterns into `tools/dogfood/utils.ts`:

```typescript
// Fixture setup
function createMinimalFixture(dir: string, gpBin: string): void

// Status verification
function verifyEntityStatus(gpBin: string, type: string, name: string, expected: string): VerifyResult

// Simulated user responses
function simulateUserResponse(question: string, options: Option[], context: string, model: string): Promise<string>

// Cost tracking
function createCostTracker(): CostTracker

// Logging
function createLogger(logFile: string): Logger
```
