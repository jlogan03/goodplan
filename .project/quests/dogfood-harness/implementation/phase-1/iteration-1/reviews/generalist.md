# Generalist Review: Step 1 — Core Harness + Explore Validation

## Score: 8/10

## Summary

Step 1 delivers a solid core harness with proper canUseTool callback, hardened CLI helpers, structured logging, model patching, and a working explore phase with fallback recovery. The implementation closely follows the plan with only a few deviations.

## Checklist Evaluation

### canUseTool callback — PASS
- Uses `Record<string, string>` answers keyed by `q.question` (line 310-315)
- Returns `{ behavior: 'allow' as const, updatedInput: ... }` (line 326-332) — correct SDK shape
- `AskUserQuestion` is NOT in `disallowedTools` — correct
- System prompt append kept as soft secondary guard — correct
- Import of `AskUserQuestionInput` type from SDK — correct

### goodplan() helper — PASS
- Exposes exit code via `GoodplanResult` interface (lines 59-64)
- Type guard in catch: `e instanceof Error && "status" in e && "stdout" in e` (line 81) — correct, no `as any`
- Cast to `NodeJS.ErrnoException & { stdout?: Buffer | string; ... }` with `// known shape from execFileSync` comment (lines 80-86) — correct
- `describeExitCode()` function provides exit-code branching semantics (lines 104-115)

### goodplanJson() — PASS
- Checks `result.ok` before parsing (line 122) — required check present
- `JSON.parse` wrapped in try/catch with descriptive error including raw stdout (lines 127-134) — correct
- Optional Zod schema parameter not implemented — plan says "not blocking"

### logFriction() — PASS
- Unified 3-arg signature: `(severity: string, source: string, message: string)` (line 157)
- Uses `appendFileSync` directly (line 170) — handles missing file via the startup init block
- All call sites use the new 3-arg signature (lines 206, 223, 563, 579)

### patchSkillModels() — PASS
- Uses `Map<string, string>` for original contents (line 180)
- Grep-based discovery via `execFileSync("grep", ["-rl", ...])` (line 188)
- Startup check for previously-patched files (line 202)
- Verification that replacements changed something (line 221)

### restoreSkillModels() — PASS
- Called in `finally` block (line 879) and also in the `.catch()` handler (line 908) — belt and suspenders

### reset command — PASS
- Deletes `.project/` with `rmSync` + verifies removal (lines 444-456)
- Handles case where `.project/` doesn't exist (line 458)
- Runs `goodplan init --name nondet-eval --json` (line 462)
- Runs `epic:create --json` with stdin payload (line 478)
- Exit-code checking at each step with descriptive messages (lines 463-486)
- Verifies via `goodplan status --json` (line 490)

### Logging — PASS
- Result detection via discriminated union: `message.type === "result" && message.subtype === "success"` (line 341) — correct
- Tool call counting from assistant messages: `message.type === "assistant"` then `block.type === "tool_use"` (lines 358-364) — correct
- Logs `task_started`/`task_notification` for sub-agent visibility (lines 378-397)
- Accumulates `total_cost_usd` from `SDKResultSuccess` (line 344)
- Prints elapsed time, message count, tool call count, cost at end (lines 407-414)

### phase2Explore() — PASS
- Checks epic status; if `created`, runs `epic:explore` transition (lines 509-520)
- Calls `runSkill("explore", ...)` with appropriate prompt (lines 522-534)
- After skill completes: checks status, if still `exploring` runs `submit-explore` manually + logs friction (lines 537-568)
- Verifies research files exist (lines 571-584)

### Top-level try/catch + exit codes — PASS
- `main()` wrapped with `.then(() => process.exit(0))` and `.catch(() => process.exit(1))` (lines 896-910)
- Final summary report printed before exit (lines 885-893)

## Issues Found

### Important (1)

1. **phase2SliceCycle() missing explicit submit commands between skill invocations** (lines 688-745). The plan's Step 2 says "Full rewrite" for this function with explicit `submit-plan`, `submit-refinement`, `submit-implementation`, and `slice:complete` CLI calls between each skill. The current Step 1 implementation only has bare skill invocations (`create-plan` -> `refine-plan` -> `implement-plan` -> `complete`) with a single `slice:plan` transition at the start. This is technically a Step 2 task, but since the function already exists it will need the rewrite specified there. The function also lacks the `submit-plan`, `submit-refinement`, `submit-implementation` intermediate CLI transitions — it relies entirely on skills handling state transitions internally. **Not a Step 1 bug** since the plan explicitly defers this to Step 2, but worth noting.

### Minor (3)

1. **`patchSkillModels()` grep pattern uses BRE `\|` which is non-portable** (line 188). The pattern `"opus\\|sonnet"` relies on GNU grep's BRE alternation. On macOS, `grep -E "opus|sonnet"` (ERE) would be more portable. This works with `execFileSync("grep", ...)` on the current platform but could break on other systems.

2. **`restoreSkillModels()` called twice on fatal error** — once in the `finally` block (line 879) and again in `.catch()` (line 908). The `finally` block runs before `.catch()`, so by the time the catch handler calls `restoreSkillModels()`, `patchedFileOriginals` is already cleared. Harmless (the function returns early if empty), but the redundant call in `.catch()` is dead code.

3. **`phase2Architecture()` and `phase2RefineArchitecture()` lack explicit CLI transition commands** (lines 587-624). The plan Step 2 says these need `epic:define-architecture` and `epic:refine-architecture` CLI calls before running the skill. Currently they just call `runSkill()` directly. Again, this is a Step 2 task, but the functions exist in this step's diff.

## Cross-File Integration

- Plan file updated with `[x]` checkmarks on all Step 1 tasks except verification — appropriate
- `LOG_DIR` and `FRICTION_LOG` paths correctly point to `.project/quests/dogfood-harness/harness-logs/`
- Build report confirms 0 type errors and 941 tests pass — no regressions

## Code Quality

- Clean section headers with consistent formatting
- Proper error handling throughout (no empty catch blocks except the grep catch in `patchSkillModels`, which has a console.log explaining why)
- Good use of TypeScript types (`GoodplanResult` interface, proper `as const` on behavior literals)
- `execFileSync` used consistently per project conventions (no `execSync`)
- All CLI calls use `--json` flag per conventions
