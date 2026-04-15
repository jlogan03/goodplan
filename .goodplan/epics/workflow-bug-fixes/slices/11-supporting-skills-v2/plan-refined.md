# Implementation Plan — 11-supporting-skills-v2

## Goal

Rewrite the supporting skills for v2: `create-side-quest` (v2 `side-quest:*` commands, `refine:*` refinement), `audit` (v2 side-quest creation from proposals). Create two new skills: `implement-side-quest` (simplified chunk lifecycle — no TDD red/green, just start→verify) and `land-side-quest` (findings triage, learnings, side-quest landing). These complete the full v2 skill set.

---

## Phase 1: create-side-quest v2 Rewrite

**Objective:** Rewrite the create-side-quest skill to use v2 `side-quest:*` commands and `refine:*` refinement. Update plan-pipeline.md with a Side-Quest (v2) column for the entity-type conditional command tables.

### Expected Behavior

**Before:** create-side-quest uses v1 commands: `quest:create`, `quest:show`, `quest:list`, `start-plan --quest`, `submit-plan --quest`, `quest:refine-plan`, `start-refinement --quest`, `submit-refinement --quest`. Re-entry uses `quest:show` status strings. No v2 side-quest command references.

**After:** create-side-quest uses v2 commands for side-quests:
- Creation: `side-quest:create --name $SQ_NAME --goal "$GOAL"` (CLI args, not stdin)
- Goal: `side-quest:goal-commit` (stdin: `{ content }`) — S0→S1
- Show/list: `side-quest:show --side-quest $SQ_NAME --json`, `side-quest:list --json`
- Plan: `side-quest:plan-draft` (stdin: `{ content }`), `side-quest:plan-commit`
- Refinement: `refine:start --side-quest $SQ_NAME --artifact-type implementation-plan`, `refine:score --side-quest ... --reviewer $ID`, `refine:converge --side-quest ...`, `refine:stuck --side-quest ...`
- Exploration: `start-explore --quest` and `submit-explore --quest` (v1 — no v2 replacements for quest-scoped explore)
- Re-entry uses S0-S3 phase model from `side-quest:show --json`
- plan-pipeline.md updated with Side-Quest (v2) column

**Verification:**
- `bun run build` succeeds
- All v2 commands referenced exist in `gp --help` output
- No v1 `quest:create`, `quest:show`, `quest:list` commands remain (except explore which stays v1)
- plan-pipeline.md has three entity types: Slice (v2), Quest (v1), Side-Quest (v2)
- Re-entry maps S0/S1/S2/S3 phases correctly

### Tasks

#### 1.1 Update plan-pipeline.md with Side-Quest (v2) Column

Extend the Entity-Type Command Reference table to three columns. **All rows must be specified** — the current table has 11 stages. Side-Quest (v2) rows mirror Slice (v2) but with `--side-quest` scope instead of `--epic`:

| Stage | Slice (v2) | Quest (v1) | Side-Quest (v2) |
|---|---|---|---|
| Context assembly | `slice:plan-draft` (stdin: `{content}`) returns contextBundle | `start-plan --quest` | `side-quest:plan-draft` (stdin: `{plan: ContentRef}`) — requires `git hash-object -w` first |
| Submit draft | `slice:plan-draft` | `submit-plan --quest` | `side-quest:plan-draft` (same as above) |
| Shape checkpoint | `slice:plan-shape-start` → approve/auto | *(skip)* | *(skip — shape approval optional, no plan-shape-start for side-quests)* |
| Begin refinement | `refine:start --epic --artifact-type ...` | `quest:refine-plan` | `refine:start --side-quest --artifact-type ...` |
| Refinement context | `refine:evaluate --epic ...` | `start-refinement --quest` | `refine:evaluate --side-quest ...` |
| Record score | `refine:score --epic ...` | *(embedded)* | `refine:score --side-quest ... --reviewer $ID` |
| Record synthesis | `refine:synthesize --epic ...` | *(not recorded)* | `refine:synthesize --side-quest ...` |
| Record revision | `refine:revise --epic ...` | *(not recorded)* | `refine:revise --side-quest ...` |
| Submit refinement (pass) | `refine:converge --epic ...` + `slice:plan-commit` | `submit-refinement --quest` | `refine:converge --side-quest ...` + `side-quest:plan-commit` |
| Submit refinement (stuck) | `refine:stuck --epic ...` | *(override on submit)* | `refine:stuck --side-quest ...` |
| Submit refinement (force) | `refine:override --epic ... --reason="..."` | *(override on submit)* | `refine:override --side-quest ... --reason="..."` |

Update Phase B steps (B1-B7) to add Side-Quest (v2) conditional blocks alongside Slice (v2) and Quest (v1). **Side-Quest (v2) follows the same pattern as Slice (v2) except:**
- **B1 (Context Assembly):** `side-quest:plan-draft --side-quest $SQ_NAME` instead of `slice:plan-draft --epic ... --slice ...`
- **B3 (Submit Draft):** `side-quest:plan-draft --side-quest $SQ_NAME` (same command as B1 — drafting IS submitting)
- **B4 (Shape Checkpoint):** Skip (no `plan-shape-start` for side-quests; `plan-shape-approve` is optional and rarely used)
- **B5-B7 (Refinement):** Same as Slice (v2) but with `--side-quest $SQ_NAME` instead of `--epic $EPIC_NAME`, and `side-quest:plan-commit` instead of `slice:plan-commit`
- All other steps are identical in structure, just with side-quest scoping

**Also update iteration-loop.md** to support parameterized scope. Specific changes:
1. **Add `scope_flag` to the Loop Parameters Schema table** with description: "CLI scope flag for `refine:*` commands. Set to `--epic $EPIC_NAME` for epic-scoped refinement or `--side-quest $SQ_NAME` for side-quest-scoped refinement. Required when `artifact_type` is defined."
2. **Replace all hardcoded `--epic $EPIC_NAME`** in the Refinement Event Protocol table and Round Flow section with `$SCOPE_FLAG` (the consuming skill's `scope_flag` parameter value).
3. **Update conditional text** from "conditional on epic scope" to "conditional on epic or side-quest scope (when `scope_flag` is defined)" throughout the Refinement Event Protocol and Round Flow sections.
4. **Existing consuming skills** (plan-slice, implement-slice, create-epic) should add `scope_flag: --epic $EPIC_NAME` to their Loop Parameters — this is backward-compatible since they already use `--epic` hardcoded.

#### 1.2 Rewrite create-side-quest Phase Table and Re-Entry

Replace the current phase table with v2 phase awareness:

| Phase | Type | v2 Phase | What Happens |
|---|---|---|---|
| 1. Goal capture | Interactive | S0→S1 | Design-tree goal interview, `side-quest:create` + `side-quest:goal-commit` (ContentRef) |
| 2. Plan Q&A | Interactive | — | Plan approach interview |
| 3. Plan draft + refinement | Autonomous | S1→S2 | Spawn plan-phase, `side-quest:plan-draft` + `refine:*` + `side-quest:plan-commit` (ContentRef) |

Update re-entry detection to use v2 phase model from `side-quest:show --side-quest $SQ_NAME --json`:

| Phase | Action |
|---|---|
| S0 (created, no goal) | Proceed to Phase 1 (goal capture) |
| S1 (goal or plan committed) | **Check plan artifact** via `side-quest:show --json`: if plan exists → plan complete, inform user, suggest `/gp:implement-side-quest`. If no plan → skip to Phase 2 (plan Q&A). |
| S2 (implementing) | Already implementing — inform user, suggest `/gp:implement-side-quest` |
| S3 (landed) | Already done — inform user |

#### 1.3 Rewrite Goal Capture (Phase 1)

Replace `quest:create` with:
1. `$GP side-quest:create --name "$SQ_NAME" --goal "$GOAL" --json` — creates side-quest directory + emits `side-quest-created` (S0). Note: `side-quest:create` uses CLI args (`--name`, `--goal`), not stdin JSON.
2. Design-tree goal exploration (same pattern as create-epic P1)
3. Store goal content as git blob and pass as ContentRef:
```bash
# Write goal to temp file
echo "$GOAL_CONTENT" > $TMPDIR/goal.md
# Store as git blob and get SHA
GOAL_SHA=$(git hash-object -w $TMPDIR/goal.md)
GOAL_SIZE=$(wc -c < $TMPDIR/goal.md | tr -d ' ')
# Pass ContentRef to goal-commit
echo "{\"goal\":{\"sha\":\"$GOAL_SHA\",\"size\":$GOAL_SIZE,\"path\":\"$TMPDIR/goal.md\",\"mediaType\":\"text/markdown\"}}" | $GP side-quest:goal-commit --side-quest $SQ_NAME --json
```
Emits `side-quest-goal-committed` (S1).

**ContentRef pattern:** Side-quest commands (`goal-commit`, `plan-draft`, `plan-commit`) expect `ContentRef` objects (git blob SHA + size + path + mediaType), NOT raw content strings. This differs from `slice:plan-draft` which accepts raw `{ content }` and calls `storeContentRef` internally. The skill must construct ContentRefs manually via `git hash-object -w`.

#### 1.4 Explore Phase: Skipped for v2 Side-Quests

**The explore phase is removed from create-side-quest v2.** The v1 explore commands (`quest:explore`, `start-explore --quest`, `submit-explore --quest`) operate on the v1 quest state machine (checking `created` status), which is incompatible with the v2 side-quest phase model (S0-S3). A v2 side-quest at S1 has no v1 `created` status, so `quest:explore` would fail with a precondition error.

**Rationale:** Side-quests are smaller-scoped follow-up work. Exploration is typically not needed — the goal is usually well-defined from the source finding or recommendation. If exploration is needed, the user can research independently before creating the side-quest.

**Future:** If v2 explore commands are added for side-quests (`side-quest:explore-start`, `side-quest:explore-conclude`), the explore phase can be restored. This is a known limitation, not a design gap.

Remove the explore phase from the phase table and re-entry logic. Update the re-entry table: S1 without plan skips directly to Phase 3 (plan Q&A), not Phase 2.

#### 1.5 Rewrite Plan Draft + Refinement (Phase 4)

Follow plan-pipeline.md Side-Quest (v2) path:
1. Spawn plan-phase agent (unchanged)
2. Store plan as git blob and pass as ContentRef:
```bash
PLAN_SHA=$(git hash-object -w $TMPDIR/draft/plan.md)
PLAN_SIZE=$(wc -c < $TMPDIR/draft/plan.md | tr -d ' ')
echo "{\"plan\":{\"sha\":\"$PLAN_SHA\",\"size\":$PLAN_SIZE,\"path\":\"$TMPDIR/draft/plan.md\",\"mediaType\":\"text/markdown\"}}" | $GP side-quest:plan-draft --side-quest $SQ_NAME --json
```
3. Refinement loop using `refine:*` with `--side-quest $SQ_NAME --artifact-type implementation-plan`
4. On convergence, store refined plan as ContentRef:
```bash
REFINED_SHA=$(git hash-object -w $TMPDIR/draft/plan.md)
REFINED_SIZE=$(wc -c < $TMPDIR/draft/plan.md | tr -d ' ')
echo "{\"plan\":{\"sha\":\"$REFINED_SHA\",\"size\":$REFINED_SIZE,\"path\":\"$TMPDIR/draft/plan.md\",\"mediaType\":\"text/markdown\"}}" | $GP side-quest:plan-commit --side-quest $SQ_NAME --json
```

#### 1.6 Update Loop Parameters

| Parameter | Value |
|---|---|
| **max_iterations** | 10 (override via `$GP_CREATE_SIDE_QUEST_MAX_ITERATIONS`) |
| **run_dir_mode** | `temp` |
| **artifact_type** | `implementation-plan` |
| **scope_flag** | `--side-quest $SQ_NAME` (tells iteration-loop to use `--side-quest` instead of `--epic` for `refine:*` commands) |
| **rubric_path** | `${CLAUDE_PLUGIN_ROOT}/rubrics/implementation-plan.yaml` |
| **stagnation_window** | 2 |
| **reduction_exit_threshold** | 2 |
| **review_context** | `"implementation-plan"` |

### Verification

1. `bun run build` succeeds
2. All v2 commands in create-side-quest SKILL.md exist in `gp --help`
3. Zero stale v1 commands: `quest:create`, `quest:show`, `quest:list`, `quest:complete` (v1 explore commands `start-explore --quest` / `submit-explore --quest` are explicitly preserved)
4. plan-pipeline.md has Side-Quest (v2) conditional blocks
5. Re-entry uses S0-S3 phase mapping

---

## Phase 2: implement-side-quest (New Skill)

**Objective:** Create the new `implement-side-quest` skill for side-quest implementation. Key difference from `implement-slice`: side-quests have a **simplified chunk lifecycle** (no TDD red/green cycle — just `chunk-start` → `chunk-verify`). No code refinement phase (no P11 equivalent).

### Expected Behavior

**Before:** No `plugin/skills/implement-side-quest/` directory exists.

**After:** `plugin/skills/implement-side-quest/SKILL.md` exists with:
- S2 implementation using simplified chunks: `side-quest:implement-start` → per-chunk `side-quest:chunk-start` + `side-quest:chunk-verify`
- No TDD red/green events (no chunk-red-written, chunk-red-failed, chunk-green)
- No code refinement phase (no P11 equivalent — side-quests go straight to landing after chunks)
- Per-chunk review loop (ephemeral, same as implement-slice)
- Verifier agent integration for chunk verification

**Verification:**
- `bun run build` succeeds
- SKILL.md has valid YAML frontmatter
- Chunk lifecycle uses only `side-quest:chunk-start` and `side-quest:chunk-verify` (no red/green)
- No v1 commands: `start-implement`, `submit-implementation --quest`

### Tasks

#### 2.1 Create Skill Directory and Frontmatter

Create `plugin/skills/implement-side-quest/SKILL.md` with:
```yaml
name: implement-side-quest
description: >-
  Implements a side-quest plan using simplified chunk verification. No TDD red/green
  cycle — chunks go directly from start to verify. Common triggers: 'implement side quest',
  'implement this quest', 'build side quest'.
user-invocable: true
requires: gp >= 1.0.0
```

#### 2.2 Write Phase Table and Shared References

Include: `cli-interaction.md`, `orchestrator-discipline.md`, `iteration-loop.md`.

Phase table (single phase — no code refinement for side-quests):

| Phase | Type | What Happens |
|---|---|---|
| 1. Implementation | Autonomous | Per-chunk: implement-phase agent → simplified verify → review loop |

#### 2.3 Write Scope Resolution and Re-Entry

- **Step 0**: CLI version check, temp dir (`/tmp/gp-implement-side-quest-${SQ_NAME}`)
- **Step 1**: Scope resolution — accept side-quest name or auto-detect from `status --json` `.activeQuest` or `side-quest:list --json`. Require S1 (with plan) or S2 (implementing).
- **Step 2**: Re-entry via `side-quest:show --side-quest $SQ_NAME --json`:

| Phase | Action |
|---|---|
| S1 (goal or plan committed) | **Check plan exists** via `side-quest:show --json` — look for `plan` field or plan artifact path. If plan exists: fresh start — `side-quest:implement-start`, proceed. If no plan: not ready — "Side quest has a goal but no plan. Run `/gp:create-side-quest` to create a plan first." |
| S2 (implementing) | Resume — check chunk states, find first non-terminal chunk |
| S3 (landed) | Already done |
| S0 | Not ready — suggest `/gp:create-side-quest` |

**Important:** S1 is set by BOTH `side-quest-goal-committed` and `side-quest-plan-committed`. Phase alone does not guarantee a plan exists. Always verify plan artifact presence before calling `implement-start`.

#### 2.4 Write Plan Loading + Chunk Extraction

**Orchestrator-discipline exception:** The orchestrator MAY read the plan overview to extract chunk IDs, descriptions, and verification types (structural metadata only, not implementation details). Same exception as implement-slice.

- Load plan path from `side-quest:show --json`
- Structural parse: extract chunks (id, description, expectation, verificationType)
- No chunk dependencies for side-quests (execute sequentially)
- Derive PLAN_SLUG from side-quest name

#### 2.5 Write Chunk Implementation Loop

For each chunk `c` (simplified lifecycle):

**5.1. Start chunk:**
```bash
echo '{"description":"<desc>"}' | $GP side-quest:chunk-start --side-quest $SQ_NAME --chunk $CHUNK_ID --json
```

**5.2. Spawn implement-phase agent** with chunk details. The agent implements the chunk (no RED test phase — side-quest chunks are simpler).

Expected return: same `lifecycle` object as implement-slice, but `redWritten`/`redFailed` will be `false` (no TDD for side-quests). The orchestrator only checks `greenPassed` for the verify step.

**5.3. Verify chunk:**
Spawn `verifier` agent. If verification passes:
```bash
echo '{"evidence":"<evidence>"}' | $GP side-quest:chunk-verify --side-quest $SQ_NAME --chunk $CHUNK_ID --json
```

If verification fails: surface to user via AskUserQuestion with options: "Accept (proceed to next chunk) / Retry (re-spawn verifier) / Stop (halt implementation)". No CLI event is recorded for unverifiable side-quest chunks — side-quests don't have the full `chunk-unverifiable` → `chunk-decide` flow. If user accepts, note the unverified chunk in learnings during landing.

**5.4. Per-chunk review loop** (ephemeral, same pattern as implement-slice Step 5.7).

**5.5. Orchestrator commits:**
```bash
git add <filesWritten>
git commit -m "[${PLAN_SLUG}] Chunk ${CHUNK_ID}: ${chunk.description}"
```

#### 2.6 Write Post-Implementation + Done Summary

- Auto-format, lint, build, test (same as implement-slice Step 7)
- Done summary: chunk table, verification evidence
- Next step: `/gp:land-side-quest ${SQ_NAME}`

#### 2.7 Per-Chunk Review Parameters and Error Handling

**Note:** implement-side-quest has NO formal refinement loop (no P11 equivalent). The per-chunk review loop (Task 2.5 step 5.4) is ephemeral and uses these parameters for its local review cycle only:

| Parameter | Value | Notes |
|---|---|---|
| **max_iterations** | 8 (override via `$GP_IMPLEMENT_SIDE_QUEST_MAX_ITERATIONS`) | Per-chunk review rounds cap |
| **early_exit_threshold** | `{ min_iterations: 2, score: 8 }` | Exit per-chunk review early if quality sufficient |
| **run_dir_mode** | `persistent` — `<side-quest-path>/implementation/chunk-{ID}/` | Debugging artifacts, not trust-auditable |
| **review_context** | `"code-implementation"` | Reviewer focus |

These are NOT passed to iteration-loop.md's `refine:*` commands (no `artifact_type` or `scope_flag` — side-quest implementation has no event-logged refinement).

Error handling: `@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md`.

### Verification

1. `bun run build` succeeds
2. SKILL.md has valid YAML frontmatter
3. Only `side-quest:chunk-start` and `side-quest:chunk-verify` in chunk lifecycle (no red/green)
4. No v1 commands: `start-implement`, `submit-implementation --quest`, `quest:implement`
5. Verifier agent spawned for chunk verification

---

## Phase 3: land-side-quest (New Skill)

**Objective:** Create the new `land-side-quest` skill for side-quest landing. Simpler than `land-slice` — no multi-slice learnings synthesis, no epic completion detection, no spine promotion (side-quests don't update architecture-current.md).

### Expected Behavior

**Before:** No `plugin/skills/land-side-quest/` directory exists.

**After:** `plugin/skills/land-side-quest/SKILL.md` exists with:
- Learnings capture via adapted completion-slice agent task prompt
- `side-quest:land` command with learnings payload
- Done summary with next steps
- No findings triage — `finding:list` only supports `--epic` scope, not `--side-quest`. Side-quest findings are not yet CLI-supported. This is a known limitation deferred to a future slice or side-quest.

**Verification:**
- `bun run build` succeeds
- SKILL.md has valid YAML frontmatter
- Uses `side-quest:land` (not `quest:complete`)
- No spine promotion step (side-quests don't update architecture-current)

### Tasks

#### 3.1 Create Skill Directory and Frontmatter

Create `plugin/skills/land-side-quest/SKILL.md` with:
```yaml
name: land-side-quest
description: >-
  Lands a completed side quest: captures learnings and finalizes.
  Common triggers: 'land side quest', 'land this quest', 'finish side quest',
  'complete side quest'.
user-invocable: true
requires: gp >= 1.0.0
```

#### 3.2 Write Phase Table and Re-Entry

Include: `cli-interaction.md`, `orchestrator-discipline.md`, `orchestrator-error-handling.md`.

Note: `expertise-tracking.md` is intentionally omitted from land-side-quest. Side-quest landing is a brief, mostly-autonomous operation. Expertise tracking is reserved for interactive/collaborative skills (create-epic, explore, plan-slice, complete-epic, land-slice).

Phase table (simpler than land-slice — no spine promotion, no findings triage):

| Phase | Type | What Happens |
|---|---|---|
| 1. Learnings capture | Autonomous | Spawn completion-slice agent (adapted prompt) for learnings |
| 2. Land | Autonomous + Collaborative | Surface recommendations, call `side-quest:land`, suggest next steps |

Re-entry via `side-quest:show --json`:

| Phase | Action |
|---|---|
| S2 (implementation done) | Ready for landing — proceed |
| S3 (landed) | Already done |
| S1 or S0 | Not ready — suggest implement-side-quest first |

Temp dir: `/tmp/gp-land-side-quest-${SQ_NAME}`

#### 3.3 Write Learnings Capture (Step 1)

1. Derive PRE_IMPL_COMMIT via `git log --fixed-strings --grep="[${PLAN_SLUG}]" --reverse | head -1` then `git rev-parse <commit>^`
2. Spawn `completion-slice` agent with an **adapted task prompt** for side-quest context:
   - Pass: side-quest path (not slice path), plan path, changed files (`git diff --name-only $PRE_IMPL_COMMIT..HEAD`), architecture-current path (for reference only)
   - Instruct the agent to **skip architecture delta analysis** — side-quests don't update spine artifacts
   - Instruct the agent to focus on **learnings only** (what worked, what didn't, domain insights)
   - The agent's return will include `architectureDelta: []` (empty) and `learnings: [...]` (populated)
3. Cache agent return to `$TMPDIR/agent-return.cache` for re-entry resilience
4. Extract `learnings` array from return

**No spine promotion:** Side-quests don't update architecture-current.md. Architecture delta is explicitly empty.
**No findings triage:** `finding:list` only supports `--epic` scope. Side-quest findings support is deferred.

#### 3.4 Write Land Command + Done Summary (Step 2)

1. Persist learnings via `learning:capture` (project-scoped) for each learning from the agent return. The `learningCapturedPayloadSchema` accepts `{ summary: string, scope?: "slice"|"epic"|"project", tags?: string[] }` — encode category and detail into the summary string and tags:
```bash
echo '{"summary":"[worked] Simplified chunks effective for side-quests — detail here","scope":"project","tags":["worked","side-quest"]}' | $GP learning:capture --json
```
Note: `side-quest:land` does NOT accept stdin (unlike `slice:land` which takes learnings/deferred/architectureDelta). Learnings must be captured individually via `learning:capture` before calling land.

2. Land the side-quest:
```bash
$GP side-quest:land --side-quest $SQ_NAME --json
```

3. Done summary:
```
**Side Quest Landed**
- **Side Quest**: {SQ_NAME}
- **Learnings captured**: {count}
- **Next**: {suggest next unfinished side-quest or /gp:status}
```

3. Error handling: `@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md`
4. Cleanup: delete temp on success, preserve on error

### Verification

1. `bun run build` succeeds
2. SKILL.md has valid YAML frontmatter
3. Uses `side-quest:land` (not v1 `quest:complete`)
4. No spine promotion step
5. No findings triage step (finding:list doesn't support --side-quest — documented limitation)
6. Completion-slice agent task prompt adapted for side-quest context (skip architecture delta)

---

## Phase 4: audit v2 Rewrite

**Objective:** Rewrite the audit skill to use v2 side-quest commands for proposal creation and ensure compatibility with the v2 CLI.

### Expected Behavior

**Before:** audit uses `quest:create` for side-quest proposals.

**After:** audit uses `side-quest:create` for proposals and references v2 CLI commands throughout. Audit report writing and agent dispatch are unchanged (they already work correctly).

**Verification:**
- `bun run build` succeeds
- No v1 `quest:create` command references
- `side-quest:create` used for proposals

### Tasks

#### 4.1 Replace v1 quest:create with v2 side-quest:create

In `plugin/skills/audit/SKILL.md`:
- Find all references to `quest:create` and replace with `side-quest:create`
- Update invocation to use CLI args: `$GP side-quest:create --name "$NAME" --goal "$GOAL" --json` (side-quest:create uses CLI args, not stdin)
- Update any `quest:show` or `quest:list` references to `side-quest:show` / `side-quest:list`

**Note:** `land-slice` SKILL.md also uses `quest:create` for side-quest proposals (in its findings triage and recommendations steps). This is out of scope for this slice — land-slice targets epic-scoped slices where `quest:create` is the established pattern. A future side-quest can update land-slice to use `side-quest:create` if needed.

#### 4.2 Verify Audit Agent Dispatch

Confirm the three audit agents (audit-architecture-phase, audit-docs-phase, audit-tests-phase) are dispatched correctly. These agents were created in earlier slices and their contracts are unchanged — this is a verification step, not a modification.

#### 4.3 Update Re-Entry and Status Checks

If the audit skill references `quest:show` for checking existing side-quests created from proposals, update to `side-quest:show`. Update any status field mappings to use v2 phase model (S0-S3) instead of v1 status strings.

### Verification

1. `bun run build` succeeds
2. Zero `quest:create`, `quest:show`, `quest:list` references in audit SKILL.md
3. Audit agents dispatched correctly (agent files exist, return format matches)

---

## Phase 5: Cross-Skill Audit + Build Verification

**Objective:** Verify all new and modified files are internally consistent, build cleanly, and pass tests.

### Expected Behavior

**Before:** New skills written but not cross-checked.

**After:** Full consistency verified. Build succeeds. No stale v1 references.

### Tasks

#### 5.1 Full Build + Test

Run `bun run build` and `bun test`. Both must pass with zero failures.

#### 5.2 Cross-Skill Command Audit

Files to audit:
- `plugin/skills/create-side-quest/SKILL.md`
- `plugin/skills/implement-side-quest/SKILL.md`
- `plugin/skills/land-side-quest/SKILL.md`
- `plugin/skills/audit/SKILL.md`
- `plugin/skills/_references/plan-pipeline.md`

For each: collect all `gp` command references, verify against `gp --help`.

#### 5.3 Stale v1 Command Check

Grep across all 4 skill files for v1 commands that should not appear:
- `quest:create`, `quest:show`, `quest:list`, `quest:complete` (replaced by `side-quest:*`)
- `start-implement --quest`, `submit-implementation --quest` (replaced by `side-quest:implement-start`, chunk commands)

**Preserved v1 commands** (should NOT be flagged):
- `start-explore --quest`, `submit-explore --quest` — no v2 replacements exist

#### 5.4 Shared Reference Consistency

Verify `@` includes resolve:
- `cli-interaction.md` — all 4 skills
- `orchestrator-discipline.md` — all 4 skills
- `iteration-loop.md` — create-side-quest, implement-side-quest
- `plan-pipeline.md` — create-side-quest
- `orchestrator-error-handling.md` — all 4 skills

#### 5.5 Skill Count Update

Update `scripts/build-plugin.sh` skill count assertion from 15 to 17 (adding implement-side-quest + land-side-quest). Update the expected skills comment.

#### 5.6 Old create-side-quest Deprecation Check

Unlike the `implement` skill (which was deprecated in slice 10), `create-side-quest` is being **rewritten in place** — no new skill directory needed. The `audit` skill is also rewritten in place. No deprecation notes needed.

### Verification

1. `bun run build` succeeds with skill count 17
2. `bun test` passes with 0 failures
3. Zero stale v1 commands in the 4 skill files (except preserved v1 explore)
4. All `@` references resolve

---

## Phase 6: Dogfood Harness Test

**Objective:** Create an Agent SDK harness test exercising the side-quest lifecycle (create → implement → land) through v2 skills.

### Expected Behavior

**Before:** No `tools/dogfood/test-supporting-skills-v2.ts` exists.

**After:** Test exists and validates:
- `create-side-quest` skill produces v2 events (side-quest-created, side-quest-goal-committed)
- Static checks: implement-side-quest and land-side-quest exist with correct commands
- Audit skill references v2 commands

**Verification:**
- `bun tools/dogfood/test-supporting-skills-v2.ts` runs without errors
- Test output shows v2 commands being invoked

### Tasks

#### 6.1 Create test-supporting-skills-v2.ts

Following the test-slice-execution-v2.ts pattern:

1. Import Agent SDK utilities from `utils.ts`
2. Set up isolated environment (permissionMode, local plugin, settingSources: [], createTestEnv)
3. Create fixture: `gp init` only (bare project with git). Do NOT pre-create the side-quest — let the skill do it to test the full fresh-start flow (S0 goal capture).
4. Run `/gp:create-side-quest` with prompt: "Create a side quest named 'test-sq' with goal: Add a hello.ts utility with a greet function." This tests fresh creation (not re-entry).
5. Verify v2 commands invoked (`side-quest:create`, `side-quest:goal-commit`, `side-quest:plan-draft`)
6. Verify side-quest phase progression via `side-quest:show --side-quest test-sq --json`

#### 6.2 Static Skill Checks

Verify all 4 skills exist in dist and reference correct commands:
- `create-side-quest` references `side-quest:create`, `side-quest:goal-commit`, `side-quest:plan-draft`
- `implement-side-quest` references `side-quest:implement-start`, `side-quest:chunk-start`, `side-quest:chunk-verify`
- `land-side-quest` references `side-quest:land`
- `audit` references `side-quest:create` (not `quest:create`)

#### 6.3 Event Log Verification

After create-side-quest runs, verify events:
- `side-quest-created`
- `side-quest-goal-committed`
- Optionally: `side-quest-plan-drafted`, `side-quest-plan-committed` (if refinement completes)

### Verification

1. `bun tools/dogfood/test-supporting-skills-v2.ts` exits with code 0
2. V2 commands detected in session output
3. No v1 commands detected

---

## Notes

### Side-Quest Phase Model (Quick Reference)

| Phase | Triggered By | Meaning |
|---|---|---|
| S0 | `side-quest-created` | Created, no goal yet |
| S1 | `side-quest-goal-committed` OR `side-quest-plan-committed` | Goal or plan committed (both set S1 — check artifacts to distinguish) |
| S2 | `side-quest-implementation-started` | Implementation in progress |
| S3 | `side-quest-landed` | Complete |

### Side-Quest vs Slice: Key Differences

| Aspect | Slice (epic) | Side-Quest |
|---|---|---|
| Chunk lifecycle | Full TDD: start → red-written → red-failed → green → verify | Simplified: start → verify |
| Code refinement phase | Yes (P11 with refine:* commands) | No |
| Spine promotion | Yes (architecture-current.md update) | No |
| Epic completion detection | Yes (check all slices terminal) | No |
| Explore commands | v2 (epic:explore-start/conclude) | Skipped (v1 explore incompatible with v2 phase model) |
| Refinement | refine:* with --epic | refine:* with --side-quest |

### Files Changed/Created by This Slice

**Modified:**
- `plugin/skills/create-side-quest/SKILL.md` — v2 rewrite
- `plugin/skills/audit/SKILL.md` — v2 side-quest commands
- `plugin/skills/_references/plan-pipeline.md` — Side-Quest (v2) column
- `plugin/skills/_references/iteration-loop.md` — $SCOPE_FLAG parameterization + side-quest scope support
- `plugin/skills/plan-slice/SKILL.md` — add `scope_flag: --epic $EPIC_NAME` to Loop Parameters (backward compat)
- `plugin/skills/implement-slice/SKILL.md` — add `scope_flag: --epic $EPIC_NAME` to Loop Parameters (backward compat)
- `plugin/skills/create-epic/SKILL.md` — add `scope_flag: --epic $EPIC_NAME` to Loop Parameters (backward compat)
- `scripts/build-plugin.sh` — skill count 15 → 17

**Created:**
- `plugin/skills/implement-side-quest/SKILL.md`
- `plugin/skills/land-side-quest/SKILL.md`
- `tools/dogfood/test-supporting-skills-v2.ts`
