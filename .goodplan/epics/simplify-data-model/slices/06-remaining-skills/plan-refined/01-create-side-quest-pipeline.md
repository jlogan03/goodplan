# Phase 1: create-side-quest Pipeline

Build the `/gp:create-side-quest` skill as a 4-phase pipeline orchestrator following the proven pattern from create-epic and plan-slice.

**Prerequisite**: The quest state machine does not currently have `exploring`/`explored` statuses, and `start-explore` only supports `--epic`. This phase must first extend the quest schema and CLI before building the skill.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/create-side-quest/` — directory does not exist
- [ ] `ls tools/dogfood/test-create-side-quest.ts` — file does not exist
- [ ] `gp start-explore --quest test 2>&1` — fails (flag not supported)

**After implementation** (should pass / show presence):
- [ ] `ls skills/create-side-quest/SKILL.md` — file exists
- [ ] `bun tools/dogfood/test-create-side-quest.ts` — full pipeline completes: quest created, explore runs, plan Q&A collects input, plan drafted and refined, quest status reaches `plan-refined`
- [ ] Re-entry test: invoke on a quest in `explored` status — resumes from plan Q&A phase, not goal capture. Concrete assertion: agent's first sub-agent spawn is `plan-phase`, not `explore-phase`, and CLI status output shows `explored` before transition to `planning`.
- [ ] `gp start-explore --quest test --inline --json` — succeeds (flag now supported)

### Tasks

**Sub-phase A: Quest exploration support (CLI prerequisite)**

- [x] Add `exploring` and `explored` to the quest status enum in `src/schemas/entities/quest.ts`
- [x] **Transition table** — add rows to `.goodplan/architecture/transition-tables.md`:
  - `created -> BEGIN_QUEST_EXPLORE -> exploring`
  - `exploring -> COMPLETE_QUEST_EXPLORE -> explored`
  - `created -> COMPLETE_QUEST_EXPLORE -> explored` (skip-explore path, mirrors epic pattern)
  - `created|explored -> BEGIN_QUEST_PLAN -> planning` (dual precondition: accepts both `created` for quests that skip exploration, and `explored` for quests that completed exploration; replaces current `created -> BEGIN_QUEST_PLAN -> planning`)
- [x] **Event schema** — add `BEGIN_QUEST_EXPLORE` and `COMPLETE_QUEST_EXPLORE` to `src/schemas/state-events.ts`
- [x] **Transition handlers** — added as `src/core/state/transitions/quest-explore.ts` (mirroring `epic-phase.ts`)
- [x] **RPC layer** — update `src/core/rpc/begin.ts` and `src/core/rpc/submit.ts` to handle quest-scoped explore
- [x] **Context module** — extend explore priority table in `src/core/context/priorities.ts` for quest scope; update `startContext()` target resolution
- [x] **activeQuest guard** — `BEGIN_QUEST_EXPLORE` should NOT set `activeQuest` (following the epic pattern where `BEGIN_EXPLORE` does not set `activeEpic`). This allows other quests to remain accessible during a potentially long explore phase. Document this decision in the transition table comments.
- [x] **Update `quest-plan.ts` guard** — the `guardQuestStatus()` call in `src/core/state/transitions/quest-plan.ts` currently only accepts `"created"`. Update it to accept both `"created"` and `"explored"` to match the dual-precondition transition row. Also update the command description in `src/commands/quest/plan.ts` (which says `Precondition: 'created' status`) and `src/commands/global/schema.ts` to reflect the dual precondition.
- [x] **Fitness functions** — verify `tests/fitness/transition-completeness.test.ts` and `state-machine-purity.test.ts` (INV-003) still pass after adding new transitions
- [x] Extend `start-explore` CLI command to accept `--quest <name>` flag. The current `epic` arg in `src/commands/subagent/start-explore.ts` has `required: true` — change to `required: false` and add a `quest` arg (also `required: false`), then add a mutual-exclusivity guard that errors if neither or both are provided (same pattern as `start-plan.ts`: `"Exactly one of --epic or --quest is required"`)
- [x] Extend `submit-explore` CLI command to support quest exploration submission: change `epic` arg from `required: true` to `required: false`, add `--quest <name>` flag (also `required: false`), add mutual-exclusivity guard (`"Exactly one of --epic or --quest is required"`), route to `COMPLETE_QUEST_EXPLORE` event in the RPC submit layer
- [x] **Update `schema.ts` registerCommand entries** — update `registerCommand("start-explore", ...)` and `registerCommand("submit-explore", ...)` in `src/commands/global/schema.ts`: change `epic` arg from `required: true` to `required: false`, add `quest` arg (`type: "string", description: "Quest name", required: false`), update descriptions to reflect mutual exclusivity. This maintains INV-006 (schema output matches actual command signatures).
- [x] Verify: `gp start-explore --quest <name> --inline --json` returns a context bundle
- [x] Verify: quest can transition `created` → `exploring` → `explored` via CLI commands

**Sub-phase B: Skill and test harness**

- [x] Update `agents/explore-phase.md` description/documentation to mention quest support (not just epic). The agent currently references "epic goal" in its description, but inputs are fully parameterized via task prompt — the description should reflect that it supports both epic and quest exploration.
- [x] Create `skills/create-side-quest/SKILL.md` as a lightweight orchestrator with these phases:

  | Phase | Type | CLI Status Mapping | What Happens |
  |---|---|---|---|
  | 1. Goal capture | Interactive | `created` | Orchestrator asks about quest goal, creates quest via `gp quest:create`, writes `goal.md` |
  | 2. Explore | Autonomous | `created` → `exploring` → `explored` | Spawns `explore-phase` agent with quest-scoped paths. Quest goal is passed to the agent via the context bundle from `gp start-explore --quest <name> --inline --json` (analogous to epic goal for `--epic`). |
  | 3. Plan Q&A | Interactive | `explored` → `planning` | Orchestrator runs plan Q&A (approach, phasing, expected behavior) |
  | 4. Plan draft + refinement | Autonomous | `planning` → `plan-created` → `plan-refined` | Spawns `plan-phase` agent, then refinement-coordinator → reviewers → synthesis → editor loop |

- [x] Step 0 — Version Check: Use `GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"` and verify CLI version before proceeding (matches create-epic/plan-slice pattern).
- [x] Implement Context Discipline section (formal, matching create-epic pattern): orchestrator reads only CLI status + sub-agent return values. No Read calls on artifact content. Document which CLI commands provide context for each phase.
- [x] Implement re-entry logic: query `gp quest:show --quest <name> --json`, check `status`, offer continue/go-back for each phase.

  **Status-to-phase mapping table:**

  | Quest Status | Re-entry Phase | Behavior |
  |---|---|---|
  | (no quest) | Phase 1 | Start from goal capture |
  | `created` | Phase 1 or Phase 3 | Offer to continue with explore, skip to Plan Q&A (Phase 3) if explore is not needed, or re-capture goal |
  | `exploring` | Phase 2 | Resume explore (agent idempotent) |
  | `explored` | Phase 3 | Skip to plan Q&A |
  | `planning` | Phase 3 | Resume plan Q&A |
  | `plan-created` | Phase 4 | Skip to plan refinement |
  | `refining` | Phase 4 | Resume refinement loop |
  | `plan-refined` | Done | Report completion |

- [x] Implement graceful stop: if user requests early exit or the agent encounters an unrecoverable CLI error, save progress to current quest status and report what was completed. Do not leave quest in an intermediate state without a valid status.
- [x] Use `gp start-plan --quest <name> --inline --json` to get context bundle for plan-phase agent (same pattern as plan-slice).
- [x] Use `gp start-explore --quest <name> --inline --json` for explore-phase context. The quest goal (from `goal.md`) is included in the context bundle, analogous to epic goal for `--epic`.
- [x] Frontmatter: `name: create-side-quest`, `description:` must trigger for "side quest", "new quest", "quick task that needs a plan". Add `user-invocable: true`, `requires: gp >= 1.0.0`.
- [x] Write `tools/dogfood/test-create-side-quest.ts` following the pattern from `test-create-epic.ts`:
  - Create minimal fixture with `gp init` + `gp epic:create` + `gp epic:activate`
  - Run `/gp:create-side-quest` via Agent SDK `query()` with plugin path
  - Verify quest reaches `plan-refined` status via `verifyEntityStatus()`
  - Test re-entry: create a quest at `explored` status, invoke skill, verify it starts at plan Q&A (assert first sub-agent is `plan-phase`, not `explore-phase`)
  - Accept `--model` and `--max-iterations` flags (default `--max-iterations 30` for full pipeline, `15` for re-entry)
  - Test error path: invoke with missing epic context, verify graceful error message

### Verification

- `bun tools/dogfood/test-create-side-quest.ts` passes — both full pipeline and re-entry scenarios
- Quest status transitions: `created` → `exploring` → `explored` → `planning` → `plan-created` → `plan-refined` (verified via CLI)
- Skill frontmatter validates: `name:`, `description:`, `user-invocable: true` all present
- No Read calls on artifact files in orchestrator context (manual review of SKILL.md)
