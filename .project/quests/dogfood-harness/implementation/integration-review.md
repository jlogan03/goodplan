# Integration Review: Dogfood Harness

**Reviewer:** Claude Opus 4.6 (automated)
**Date:** 2026-03-24
**File:** `tools/dogfood/harness.ts` (2127 lines)
**Commits:** 947c9d0, ca87370, b1fc20d, 484efb7

## 1. Goal Alignment

**Verdict: FULLY ALIGNED**

The implementation delivers exactly what the plan specifies:
- Full workflow lifecycle: explore -> architecture -> refine-architecture -> slices -> activate -> per-slice cycles -> complete
- Two epics: `core-provider` (Phase 2, standard path) and `llm-judge` (Phase 4, proposal path)
- One quest: `add-readme` (Phase 3)
- Agent SDK integration with `canUseTool` callback for `AskUserQuestion` interception
- Haiku model override via `patchSkillModels()` / `restoreSkillModels()`
- `--json` flag on all CLI calls per conventions
- `execFileSync` (not `execSync`) per conventions
- Exit code branching (0/1/2/3) per `cli-interaction-conventions.md`

## 2. Cross-Phase Integration

**Verdict: STRONG**

- **Phase 4 reuses Phase 2 patterns correctly.** `phase4Explore`, `phase4Architecture`, `phase4RefineArchitecture`, `phase4Slices`, `phase4SliceCycle`, `phase4EpicComplete` all follow the same state-check -> CLI-transition -> skill-run -> fallback-recovery pattern established in Phase 2. Functions are parameterized by `epicName` rather than copy-pasted with hardcoded values.
- **Phase 3 quest lifecycle** follows the same 10-step state machine path as slice cycles (plan -> refine -> implement -> complete), with `--quest` instead of `--slice` flags. Consistent fallback and friction logging.
- **Phase 4 adds the proposal path** (architecture-proposal/ -> architecture/ copy + approved.md) as specified, with the correct friction log entry about missing CLI command.
- **Phase 4 parameterizes verification index** via `phase4Activate()` return value, used in `phase4EpicComplete()` -- matches plan requirement to not hardcode index 0.
- **`all` command** correctly chains: reset -> Phase 2 -> Phase 3 -> Phase 4 -> friction summary.
- **`slice:list --epic <name>`** used in both Phase 2 and Phase 4 to scope slices -- prevents cross-epic contamination as plan requires.

## 3. Consistency

**Verdict: STRONG**

Patterns used uniformly throughout:

| Pattern | Consistency |
|---|---|
| State check before transition | All phases check current status before CLI calls |
| `logCliResult()` helper | Used everywhere for CLI result reporting |
| Fallback recovery after skills | Every skill invocation followed by status check + manual submit if needed |
| `logFriction()` on recovery | Every manual fallback logs friction with severity + source |
| Exit code interpretation | `describeExitCode()` used in all error paths |
| `goodplanJson()` with ok check | Consistent JSON parsing with error context |
| Skill runner opts | Same budget/turns/model pattern across all `runSkill()` calls |
| Log file naming | Consistent `phase{N}-{step}-{name}.log` convention |

## 4. Regressions

**Verdict: NO REGRESSIONS DETECTED**

- Phase 2 functions remain unchanged and unaffected by Phase 3/4 additions.
- `epicStatus()` accepts optional `epicName` parameter (defaults to `core-provider`) -- backward compatible.
- `questStatus()` and `sliceStatus()` added as new helpers without modifying existing ones.
- `patchSkillModels()` / `restoreSkillModels()` operate independently of phase logic.
- `totalCostUsd` accumulates correctly across all phases.
- Entry point `main()` switch statement cleanly separates phases.

## 5. Completeness

**Verdict: ALL PLAN TASKS IMPLEMENTED**

### Step 1 Tasks
- [x] LOG_DIR / FRICTION_LOG constants updated
- [x] Environment variable validation (HOME check)
- [x] `goodplan()` helper with exit code + parsed error
- [x] `goodplanJson()` with `result.ok` check + JSON.parse try/catch
- [x] `logFriction()` unified 3-arg signature + appendFileSync
- [x] `runSkill()` rewritten with `canUseTool` callback + `AskUserQuestionInput` type
- [x] `model` option with `claude-haiku-4-5` default
- [x] `patchSkillModels()` / `restoreSkillModels()` with grep discovery + startup check + verify replacements
- [x] `reset` command with .project/ deletion, init, epic:create, verify
- [x] Logging: discriminated union result detection, tool call counting from assistant messages, sub-agent logging, cost accumulation
- [x] `phase2Explore()` with state check + fallback
- [x] Top-level try/catch with exit codes

### Step 2 Tasks
- [x] `phase2Architecture()` with explicit `epic:define-architecture` CLI transition
- [x] `phase2RefineArchitecture()` with explicit `epic:refine-architecture` CLI transition + `--override`
- [x] `phase2Slices()` with `epic:define-slices` + `epic:refine-slices` transitions
- [x] `phase2Activate()` with `epic:add-verification` + `epic:activate`
- [x] `phase2SliceCycle()` full 10-step rewrite with explicit submit commands
- [x] `phase2EpicComplete()` with verification payload + fallback
- [x] State recovery after each skill run

### Step 3 Tasks
- [x] `runPhase3()` with quest create + full 10-step lifecycle
- [x] `STATE_QUEST_ALREADY_ACTIVE` handling (exit 3 check on create)
- [x] Quest verification via `questStatus()`

### Step 4 Tasks
- [x] `runPhase4()` with second epic create + full lifecycle
- [x] Architecture proposal path (filesystem copy + approved.md + friction log)
- [x] `--epic llm-judge` scoping on `slice:list`
- [x] Parameterized verification index
- [x] `all` command wired into entry point
- [x] Friction summary (`printFrictionSummary()`) with severity categorization + aggregate cost

### Not Yet Done (expected -- marked as unverified in plan)
- [ ] Actual end-to-end execution verification (plan tasks marked with "Run full...")
- [ ] `bun test` / `bun tsc --noEmit` verification

## Findings

### Critical: 0

None.

### Important: 1

1. **`phase2Explore()` is not parameterized by epic name** while `phase4Explore()` is. The Phase 2 functions hardcode `"core-provider"` throughout. This is correct for the plan's scope (Phase 2 always operates on core-provider), but means Phase 2 functions cannot be directly reused if a third epic were added. The plan does not require this generalization, so this is not blocking -- but it is a structural asymmetry worth noting. Phase 4 correctly demonstrates the parameterized pattern that future phases should follow.

### Minor: 3

1. **`AUTONOMOUS_SYSTEM_PROMPT` references only `core-provider` epic** (line 439: "Epic: core-provider"). This prompt is used for all phases including Phase 3 (quest) and Phase 4 (llm-judge). The skill prompt passed to `runSkill()` always includes the correct epic/quest name, so the system prompt's mention of core-provider is misleading but unlikely to cause issues since the per-call prompt takes precedence.

2. **`restoreSkillModels()` runs `git checkout -- skills/`** as a safety net (line 243-248). This is a destructive git operation inside tooling code. If any legitimate uncommitted skill changes existed, they would be lost. Acceptable for a harness but worth documenting.

3. **Friction summary only prints during `all` command** (line 2091). Running individual phases (e.g., `bun harness.ts 2`) does not print the friction summary. The final harness summary (lines 2103-2112) always prints cost and log paths, but not friction categorization.

## Score

| Category | Assessment |
|---|---|
| Goal alignment | 10/10 |
| Cross-phase integration | 9/10 |
| Consistency | 9/10 |
| Regressions | 10/10 |
| Completeness | 10/10 |

**Overall: 9/10**

The implementation is a faithful, thorough translation of the plan. All 4 steps are implemented with consistent patterns. Phase 4 correctly reuses Phase 2 conventions while adding the proposal path. No regressions. The one important finding (Phase 2 hardcoding vs Phase 4 parameterization) is a design asymmetry that doesn't affect correctness within the plan's scope.
