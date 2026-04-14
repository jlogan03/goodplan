# Implementation Plan — 09-epic-creation-skills-v2

## Goal

Rewrite the epic creation and exploration skills for v2: `create-epic` (design-tree interviewing, pressure-test phase, shape checkpoints, `refine:*` commands), `start-epic` (shape checkpoint guards, steering display), and `explore` (collaborative mode awareness, `decision:record`, subsystem tagging). Also create the new `pressure-test-phase` agent.

---

## Phase 1: create-epic SKILL.md Major Rewrite

**Objective:** Replace the current create-epic SKILL.md with a v2 version that uses the new epic lifecycle commands (P1 goal-draft/commit, P2 explore-start/conclude, P3 architecture-draft/commit + shape checkpoint, P4 pressure-test, P5 slices-draft/commit + shape checkpoint) and integrates `refine:*` commands for refinement loops.

### Expected Behavior

**Before:** create-epic uses old command names (`epic:create`, `epic:define-architecture`, `submit-architecture`, `epic:refine-architecture`, `submit-refine-architecture`, `epic:define-slices`, `submit-slices`, `epic:refine-slices`, `submit-refine-slices`, `epic:explore`, `submit-explore`). No pressure-test phase. No shape checkpoints. No design-tree interviewing. Refinement uses old `submit-refine-*` pattern.

**After:** create-epic uses v2 commands:
- P1: `epic:create` + `epic:goal-draft` + `epic:goal-commit`
- P2: `epic:explore-start` + `epic:research-capture` + `epic:brainstorm-capture` + `epic:explore-conclude`
- P3: `epic:architecture-draft` + `epic:architecture-commit` + `epic:architecture-shape-start` + `epic:architecture-shape-approve`/`epic:architecture-shape-auto`
- P4: `epic:pressure-test-draft` + `epic:pressure-test-commit` + `epic:pressure-test-finding-disposition` (NEW phase)
- P5: `epic:slices-draft` + `epic:slices-commit` + `epic:slice-set-shape-start` + `epic:slice-set-shape-approve`/`epic:slice-set-shape-auto`
- Refinement uses `refine:start` / `refine:score` / `refine:synthesize` / `refine:revise` / `refine:evaluate` / `refine:converge` / `refine:stuck` / `refine:override`
- Design-tree interviewing in P1 (goal capture) and P3 (architecture Q&A)
- Collaborative vs autonomous phase awareness throughout

**Verification:**
- `bun run build` succeeds (plugin is included in build)
- Diff the new SKILL.md against the v2 command tree from `gp --help` -- every referenced command must exist
- No references to old commands: `epic:define-architecture`, `submit-architecture`, `epic:refine-architecture`, `submit-refine-architecture`, `epic:define-slices`, `submit-slices`, `epic:refine-slices`, `submit-refine-slices`, `epic:explore`, `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices`
- Note: `start-explore --quest` and `submit-explore --quest` are still valid v1 quest commands with no v2 replacements -- they must NOT be removed from quest-scoped code paths

### Tasks

#### 1.1 Rewrite Phase Table and Re-Entry Detection

Replace the current 6-phase table with the v2 phase structure:

| Phase | Type | What Happens |
|---|---|---|
| P1. Goal capture | Collaborative | Design-tree interviewing for goal, `epic:create` + `epic:goal-draft` + `epic:goal-commit` |
| P2. Explore | Collaborative | `epic:explore-start`, spawn explore-phase, user-controlled exit, `epic:explore-conclude` |
| P3. Architecture shape | Collaborative (Q&A) + Autonomous (draft/refine) | Architecture Q&A with design-tree interviewing, `epic:architecture-draft` + `epic:architecture-commit`, shape checkpoint |
| P4. Pressure-test | Autonomous | Spawn pressure-test-phase agent, `epic:pressure-test-draft` + `epic:pressure-test-commit`, finding dispositions |
| P5. Slice-set shape | Collaborative (Q&A) + Autonomous (draft/refine) | Slices Q&A, `epic:slices-draft` + `epic:slices-commit`, shape checkpoint |

Update re-entry detection to map `epic:show` phase to the correct resume point. The v2 CLI uses a phase model (not a status string). The phases, derived from event replay in the reducer, are:

| Phase | Meaning | Triggered by event |
|---|---|---|
| `P0` | Created, no goal yet | `epic-created` |
| `P1` | Goal committed, ready for exploration | `epic-goal-committed` |
| `P2` | Exploration concluded, ready for architecture | `exploration-concluded` |
| `P3` | Architecture committed, ready for pressure-test | `architecture-target-committed` |
| `P4` | Pressure-test committed, ready for slices | `pressure-test-committed` |
| `P5` | Slices committed, ready for activation | `slice-set-committed` |
| `P6` | Activated (epic is live) | `epic-activated` |

Additionally, `architectureShapeApproved` and `sliceSetShapeApproved` are boolean flags on the epic state (set by `architecture-shape-approved` / `architecture-shape-checkpoint-auto-shaped` and `slice-set-shape-approved` / `slice-set-shape-checkpoint-auto-shaped` events respectively).

Use `epic:show --epic $EPIC_NAME --json` and map the `phase` field to resume points.

#### 1.2 Rewrite P1: Goal Capture with Design-Tree Interviewing

**Note on `epic:create` vs `epic:goal-draft`/`epic:goal-commit`:** These are separate commands with distinct roles. `epic:create` (see `src/commands/epic/create.ts`) only creates the epic directory and appends the `epic-created` event -- it accepts a `name` (via `--name` flag or stdin `{ name }`) but does NOT accept a goal. The goal is captured separately via `epic:goal-draft` (which stores content as a git blob and emits `epic-goal-drafted`) followed by `epic:goal-commit` (which emits `epic-goal-committed` and advances the phase to P1). The implementer must use all three commands in sequence: create the epic, then draft the goal, then commit it.

Replace the simple "ask about the goal" pattern with structured design-tree interviewing:

1. `epic:create --name $EPIC_NAME --json` (if epic doesn't exist -- creates directory + `epic-created` event only, no goal)
2. Design-tree goal exploration: structured alternative-tree exploration instead of open-ended questions. Ask about goal, motivation, scope, and key constraints. At each branch, present 2-3 alternatives and let the user choose or propose their own.
3. Write goal content, then `echo '{"content":"..."}' | $GP epic:goal-draft --epic $EPIC_NAME --json` followed by `$GP epic:goal-commit --epic $EPIC_NAME --json`
4. Keep expertise calibration (unchanged)

#### 1.3 Rewrite P2: Explore Phase with v2 Commands

Replace old `epic:explore` / `submit-explore` with:

1. `epic:explore-start --epic $EPIC_NAME --json` (starts exploration cycle)
2. For each research artifact: `epic:research-capture --epic $EPIC_NAME --json` with stdin payload
3. For each brainstorm artifact: `epic:brainstorm-capture --epic $EPIC_NAME --json` with stdin payload
4. `epic:explore-conclude --epic $EPIC_NAME --json` (concludes exploration)

Update the explore-phase-pattern.md reference usage to use these new commands instead of `epic:explore` and `submit-explore`.

#### 1.4 Rewrite P3: Architecture with Shape Checkpoint

Replace `epic:define-architecture` / `submit-architecture` / `epic:refine-architecture` / `submit-refine-architecture` with:

1. Architecture Q&A with design-tree interviewing (structured alternative exploration for subsystem design decisions)
2. Spawn architecture-phase agent
3. `epic:architecture-draft --epic $EPIC_NAME --json` (draft)
4. Refinement loop using `refine:*` commands (see task 1.6)
5. `epic:architecture-commit --epic $EPIC_NAME --json` (commit after refinement converges)
6. **Shape checkpoint**: `epic:architecture-shape-start --epic $EPIC_NAME --json`
7. Check steering preference via `epic:show --epic $EPIC_NAME --json` -- if autonomous steering, call `epic:architecture-shape-auto --epic $EPIC_NAME --json`. If collaborative, present summary and use AskUserQuestion, then `epic:architecture-shape-approve --epic $EPIC_NAME --json`.

#### 1.5 Add P4: Pressure-Test Phase (NEW)

This is entirely new. After architecture shape is approved:

1. Spawn `pressure-test-phase` agent (created in Phase 2 of this plan) with architecture-target paths and subsystem context
2. Agent produces `pressure-test.md` with findings across five failure-mode classes
3. `epic:pressure-test-draft --epic $EPIC_NAME --json` (draft)
4. `epic:pressure-test-commit --epic $EPIC_NAME --json` (commit)
5. For each finding: present to user and call `epic:pressure-test-finding-disposition --epic $EPIC_NAME --json` with stdin payload containing the disposition
6. All findings must be dispositioned before proceeding to P5

#### 1.6 Rewrite Refinement Loops to use `refine:*` Commands

Replace the old `submit-refine-architecture` / `submit-refine-slices` pattern with the artifact-agnostic `refine:*` commands. The iteration-loop.md reference already describes the pattern -- update the Loop Parameters sections to use:

- `refine:start --epic $EPIC_NAME --artifact architecture --json` (begin round)
- `refine:score --epic $EPIC_NAME --artifact architecture --json` with stdin `{reviewer, dimensions, score}` (per reviewer)
- `refine:synthesize --epic $EPIC_NAME --artifact architecture --json` with stdin synthesis payload
- `refine:revise --epic $EPIC_NAME --artifact architecture --json` (record revision)
- `refine:evaluate --epic $EPIC_NAME --artifact architecture --json` (check convergence -- read-only)
- `refine:converge --epic $EPIC_NAME --artifact architecture --json` (on pass)
- `refine:stuck --epic $EPIC_NAME --artifact architecture --json` (circuit breaker)
- `refine:override --epic $EPIC_NAME --artifact architecture --json --override="reason"` (force advance)

Same pattern for slices refinement with `--artifact slices`.

Update the Architecture Loop Parameters and Slices Loop Parameters tables accordingly. Remove references to `start-refine-architecture`, `submit-refine-architecture`, `start-refine-slices`, `submit-refine-slices`.

#### 1.7 Rewrite P5: Slices with Shape Checkpoint

Replace `epic:define-slices` / `submit-slices` / `epic:refine-slices` / `submit-refine-slices` with:

1. Slices Q&A (keep existing pattern)
2. Spawn slices-phase agent
3. `epic:slices-draft --epic $EPIC_NAME --json` (draft)
4. Refinement loop using `refine:*` commands (same as architecture, different artifact)
5. `epic:slices-commit --epic $EPIC_NAME --json` (commit)
6. **Shape checkpoint**: `epic:slice-set-shape-start --epic $EPIC_NAME --json`
7. Check steering preference -- if autonomous, `epic:slice-set-shape-auto`. If collaborative, present summary and AskUserQuestion, then `epic:slice-set-shape-approve`.

#### 1.8 Add Collaborative vs Autonomous Phase Awareness

Add explicit phase mode documentation throughout the skill:

| Phase | Mode | Behavior |
|---|---|---|
| P1 Goal capture | Collaborative | Always uses AskUserQuestion, design-tree interviewing |
| P2 Explore | Collaborative | User-controlled exploration cycles |
| P3 Architecture | Mixed | Q&A is collaborative; draft+refine is autonomous (respects steering) |
| P4 Pressure-test | Autonomous | Agent runs independently; findings presented to user for disposition |
| P5 Slices | Mixed | Q&A is collaborative; draft+refine is autonomous (respects steering) |

Add steering preference checks before autonomous phases (P4, autonomous parts of P3/P5). Read via `epic:show --epic $EPIC_NAME --json` and check the steering field.

#### 1.9 Update iteration-loop.md for `refine:*` Command Protocol

`plugin/skills/_references/iteration-loop.md` is a shared reference that currently describes the refinement loop in terms of abstract orchestrator roles (reviewer spawn, synthesis, editor, exit evaluation) without CLI command bindings. Update it to integrate the `refine:*` command protocol so that consuming skills can record refinement state in the event engine.

This is a **protocol change**, not just a parameter swap. The iteration loop must call CLI commands at each stage to create an auditable event trail. Map the loop stages to commands:

| Loop Stage | CLI Command | When to Call |
|---|---|---|
| Start of refinement loop | `refine:start --epic $EPIC_NAME --artifact $ARTIFACT --json` | Once at loop entry (before round 1) |
| After each reviewer returns | `refine:score --epic $EPIC_NAME --artifact $ARTIFACT --json` (stdin: `{reviewer, dimensions, score}`) | Per reviewer per round |
| After synthesis completes | `refine:synthesize --epic $EPIC_NAME --artifact $ARTIFACT --json` (stdin: synthesis payload) | Once per round |
| After editor applies fixes | `refine:revise --epic $EPIC_NAME --artifact $ARTIFACT --json` | Once per round |
| Exit evaluation (read-only) | `refine:evaluate --epic $EPIC_NAME --artifact $ARTIFACT --json` | Once per round (checks convergence) |
| Pass (all scores >= 9, no critical/important) | `refine:converge --epic $EPIC_NAME --artifact $ARTIFACT --json` | On successful exit |
| Circuit breaker (stagnation/reduction/cap) | `refine:stuck --epic $EPIC_NAME --artifact $ARTIFACT --json` | On non-pass exit |
| Force advance | `refine:override --epic $EPIC_NAME --artifact $ARTIFACT --json --override="reason"` | On user-forced exit |

Update the Round Flow, Exit Criteria Evaluation, and Loop Parameters Schema sections of iteration-loop.md accordingly. The `--artifact` value is skill-specific (e.g., `architecture`, `slices`, `plan`) and should be documented in the Loop Parameters Schema as a new parameter slot.

**Backward compatibility**: The `refine:*` commands are epic-scoped. For non-epic refinement (e.g., plan-slice for standalone slices), the iteration loop should still work without these commands -- make the CLI calls conditional on epic scope being available.

#### 1.10 Update Done Summary

Update the completion summary to include shape checkpoint statuses and pressure-test findings count alongside the existing refinement round counts and scores.

### Verification

1. `bun run build` succeeds
2. `grep` the new SKILL.md for old command names -- zero matches for: `epic:define-architecture`, `submit-architecture`, `epic:refine-architecture`, `submit-refine-architecture`, `epic:define-slices`, `submit-slices`, `epic:refine-slices`, `submit-refine-slices`, `epic:explore`, `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices`
   - Note: `start-explore --quest` and `submit-explore --quest` are valid quest-scoped commands; only bare `start-explore` (no `--quest`) and `submit-explore --epic` should be absent
3. `grep` for every v2 command referenced -- confirm each exists in `gp --help` output
4. Confirm skill still includes all shared references: cli-interaction.md, orchestrator-discipline.md, expertise-tracking.md, explore-phase-pattern.md, iteration-loop.md, orchestrator-error-handling.md

---

## Phase 2: pressure-test-phase Agent Definition

**Objective:** Create the `pressure-test-phase.md` agent that performs adversarial analysis of the architecture-target, producing structured findings for user disposition.

### Expected Behavior

**Before:** No `plugin/agents/pressure-test-phase.md` exists.

**After:** `plugin/agents/pressure-test-phase.md` exists, follows the same structural patterns as `explore-phase.md` and `architecture-phase.md` (frontmatter, inputs, return format, instructions), and produces a structured pressure-test report with findings across five failure-mode classes.

**Verification:**
- File exists at `plugin/agents/pressure-test-phase.md`
- `bun run build` succeeds
- Agent frontmatter has correct fields: `name`, `description`, `model`
- Agent references `sub-agent-return-format.md`
- Agent defines five failure-mode classes and structured finding output

### Tasks

#### 2.1 Create pressure-test-phase.md Agent

Create `plugin/agents/pressure-test-phase.md` modeled on the architecture-phase agent pattern:

**Frontmatter:**
```yaml
---
name: pressure-test-phase
description: Performs adversarial analysis of an epic's architecture-target. Examines five failure-mode classes and produces structured findings for user disposition. Spawned by create-epic orchestrator after architecture shape is approved.
model: opus
---
```

**Inputs (provided in task prompt):**
- Architecture-target file paths (the committed architecture files)
- Subsystem maturity data (from `epic:show` or `subsystem:list`)
- Epic goal path
- Conventions path
- Inline context and reference paths from context bundle
- Past findings (if re-entry)

**Instructions:**
1. Read the architecture-target files
2. Analyze across five failure-mode classes:
   - **Scalability risks** -- components that won't scale with expected growth
   - **Integration fragility** -- coupling points, brittle interfaces, missing error handling
   - **Assumption violations** -- implicit assumptions that could be wrong
   - **Missing capabilities** -- gaps in the architecture for stated goals
   - **Operational blind spots** -- deployment, monitoring, debugging gaps
3. For each finding, produce structured output:
   - `class`: one of the five failure-mode classes
   - `severity`: BLOCKING | CRITICAL | IMPORTANT | MINOR
   - `description`: clear explanation of the risk
   - `subsystem`: affected subsystem(s)
   - `recommendation`: suggested mitigation
4. Write `pressure-test.md` to the temp directory

**Return format:** SUCCESS with `filesWritten` and a `findings` array in the payload. PARTIAL if critical context is missing. FAILED on unrecoverable error.

**Tools:** Read, Grep, Glob, Write. No Agent tool. No Bash.

### Verification

1. File exists: `ls plugin/agents/pressure-test-phase.md`
2. `bun run build` succeeds
3. Frontmatter validates: has `name: pressure-test-phase`, `description`, `model: opus`
4. Contains five failure-mode class definitions
5. References `@${CLAUDE_PLUGIN_ROOT}/agents/_references/sub-agent-return-format.md`

---

## Phase 3: start-epic SKILL.md Update

**Objective:** Update start-epic to check shape checkpoint guards and display steering preference before epic activation.

### Expected Behavior

**Before:** start-epic checks status is `slices-refined`, checks for active epic, checks architecture exists, checks verifications exist, then presents architecture for approval and activates.

**After:** start-epic additionally:
1. Checks `architecture-shape-approved` status (or event) before allowing activation -- if shape was never approved, directs user to `create-epic` to complete the shape checkpoint
2. Checks `slice-shape-approved` status before allowing activation
3. Displays the current steering preference in the activation presentation (read from `epic:show` response)

**Verification:**
- `bun run build` succeeds
- New guards are present in the Pre-activation Guard section (Step 3)
- Steering preference display is in the architecture presentation (Step 4)

### Tasks

#### 3.1 Add Shape Checkpoint Guards

In Step 3 (Pre-activation Guard), add two new checks after the existing guards:

4. **Architecture shape approved**: Check from `epic:show` response whether architecture shape was approved. If not, tell user: "Architecture shape checkpoint not completed -- run `/gp:create-epic <name>` to continue the pipeline." **Stop.**

5. **Slice-set shape approved**: Check from `epic:show` response whether slice-set shape was approved. If not, tell user: "Slice-set shape checkpoint not completed -- run `/gp:create-epic <name>` to continue the pipeline." **Stop.**

#### 3.2 Display Steering Preference

In Step 4 (Present Architecture), add a line showing the steering preference from `epic:show`:

```
5. **Steering preference** -- current setting (e.g., "collaborative", "autonomous", or "default")
```

This helps the user understand how autonomous phases will behave before activating.

#### 3.3 Update Status Mapping for v2

Review the status-to-suggestion mapping in Step 2 (Pre-activation Check). Ensure it covers all v2 statuses that may appear in `epic:show`. Add entries for any new intermediate statuses from the v2 lifecycle (e.g., `architecture-shaped`, `pressure-tested`, `slices-shaped`).

### Verification

1. `bun run build` succeeds
2. `grep` for `architecture-shape` and `slice-set-shape` in the updated SKILL.md -- both present in guard section
3. `grep` for `steering` in the updated SKILL.md -- present in Step 4

---

## Phase 4: explore SKILL.md Update

**Objective:** Update explore to use collaborative mode awareness, replace `decision:create` with `decision:record`, and add subsystem tagging to decisions/learnings.

### Expected Behavior

**Before:** Explore uses `decision:create` for decisions. No explicit collaborative mode. No subsystem tagging on decisions.

**After:**
1. Brainstorm mode explicitly waits for user input at each step (collaborative mode -- does not auto-advance)
2. `decision:record` replaces `decision:create` for recording decisions
3. Decisions include `subsystems: [...]` in the stdin payload
4. Learnings include `subsystems: [...]` when captured

**Verification:**
- `bun run build` succeeds
- No references to `decision:create` in explore SKILL.md
- `decision:record` present in the decision recording section
- `subsystems` field mentioned in decision/learning payloads

### Tasks

#### 4.1 Replace decision:create with decision:record

In Step 4b2 (Record durable decisions), replace:

```bash
echo '{"id":"<kebab-case-id>","domain":"<topic-area>","title":"<decision-title>","summary":"<brief-summary>","reconsiderWhen":["<condition>"]}' | $GP decision:create --json
```

with:

```bash
echo '{"id":"<kebab-case-id>","domain":"<topic-area>","title":"<decision-title>","summary":"<brief-summary>","reconsiderWhen":["<condition>"],"subsystems":["<subsystem-name>"]}' | $GP decision:record --json
```

Note the addition of `subsystems` array and the command name change.

#### 4.2 Add Collaborative Mode to Brainstorm

In the Brainstorm Mode section, add explicit collaborative mode instructions:

- After each brainstorm exchange, explicitly wait for user response via AskUserQuestion before continuing
- Do not auto-generate follow-up questions and answer them -- present them and wait
- At the backstop (8-10 exchanges), the nudge to capture is presented as a question, not an automatic action

This is largely behavioral clarification rather than structural change -- the existing brainstorm pattern is mostly collaborative already, but the explicit framing ensures the LLM doesn't try to run brainstorm autonomously.

#### 4.3 Add Subsystem Tagging

When decisions or learnings are captured during exploration:

1. If the scope is an epic (where subsystems are defined), query `subsystem:list --json` to get available subsystem names
2. When recording a decision, include `subsystems: [...]` matching the relevant subsystem(s)
3. Add a note in the mode sections that subsystem tagging should be included when the topic clearly maps to one or more subsystems

#### 4.4 Replace v1 Explore Commands in SKILL.md (Epic Scope Only)

The explore SKILL.md references some commands that have v2 replacements. Apply these replacements **for epic-scoped invocations only**. Quest-scoped invocations use their own command set and must be left intact.

| v1 Command | v2 Replacement | Scope | Notes |
|---|---|---|---|
| `epic:explore` | `epic:explore-start` | Epic only | Starts exploration cycle (v2 is a dedicated command, not a state transition) |
| `submit-explore` (epic scope) | `epic:explore-conclude` | Epic only | Concludes exploration, transitions to `explored` (P2) |
| `start-explore --quest` | **KEEP** | Quest only | Still valid -- no v2 quest equivalent exists |
| `submit-explore --quest` | **KEEP** | Quest only | Still valid -- no v2 quest equivalent exists |
| `quest:explore` | **KEEP** | Quest only | Still valid v2 command for quest-scoped exploration |

Specific locations to update in `plugin/skills/explore/SKILL.md`:
- Step 3 (Handle Skip), **epic scope** (~lines 112-119): Replace `submit-explore --epic <name>` with `epic:explore-conclude --epic <name>`
- Step 3 (Handle Skip), **quest scope** (~lines 120-123): Leave `submit-explore --quest` unchanged
- Step 6 (Complete Exploration), **epic scope** (~lines 209-219): Replace `epic:explore` with `epic:explore-start` and `submit-explore --epic` with `epic:explore-conclude`
- Step 6 (Complete Exploration), **quest scope** (~lines 229-234): Leave `quest:explore`, `start-explore --quest`, and `submit-explore --quest` unchanged

**IMPORTANT**: The `start-explore` command exists for quest scope (`start-explore --quest`) and must not be removed. Only the epic-scoped usage of these v1 commands is being replaced.

#### 4.5 Rewrite explore-phase-pattern.md with Entity-Type-Conditional Command Tables

`plugin/skills/_references/explore-phase-pattern.md` is a shared reference used by both `create-epic` and `create-side-quest`. It currently uses a single placeholder-based command set (`{ENTITY_TYPE-singular}:explore`, `start-explore`, `submit-explore`) that cannot cleanly represent the v2/v1 split between epic and quest scopes.

Rewrite the pattern to use **entity-type-conditional command tables** -- one block for epic scope, one for quest scope:

**Epic scope commands (v2):**
| Step | Command |
|---|---|
| Start exploration | `$GP epic:explore-start --epic {ENTITY_NAME} --json` |
| Capture research artifact | `$GP epic:research-capture --epic {ENTITY_NAME} --json` |
| Capture brainstorm artifact | `$GP epic:brainstorm-capture --epic {ENTITY_NAME} --json` |
| Conclude exploration | `$GP epic:explore-conclude --epic {ENTITY_NAME} --json` |

**Quest scope commands (v1 -- no v2 replacements exist):**
| Step | Command |
|---|---|
| Load context | `$GP start-explore --quest {ENTITY_NAME} --json` |
| Start exploration | `$GP quest:explore --quest {ENTITY_NAME} --json` |
| Conclude exploration | `$GP submit-explore --quest {ENTITY_NAME} --json` |

The pattern body should read: "If epic scope: use `epic:explore-start` / `epic:research-capture` / `epic:brainstorm-capture` / `epic:explore-conclude`. If quest scope: use `quest:explore` / `start-explore --quest` / `submit-explore --quest`."

**Do NOT remove `start-explore`** -- it is still required for quest-scoped context loading. **Do NOT remove `submit-explore`** -- it is still required for quest-scoped exploration completion.

Update the Placeholders table to document the conditional: replace the single `{START_EXPLORE_EXTRA_FLAGS}` placeholder (which was epic/quest-agnostic) with a note explaining the entity-type conditional. Remove any placeholder that implied a single generic command worked for both scopes.

**Verification that both consumers still work:**
- `create-epic` uses epic scope commands after the rewrite -- confirm no quest-scope commands appear in its flow
- `create-side-quest` uses quest scope commands -- confirm `start-explore --quest` and `submit-explore --quest` are still present in the quest branch

### Verification

1. `bun run build` succeeds
2. `grep -c "decision:create" plugin/skills/explore/SKILL.md` returns 0
3. `grep -c "decision:record" plugin/skills/explore/SKILL.md` returns at least 1
4. `grep -c "subsystems" plugin/skills/explore/SKILL.md` returns at least 1
5. Brainstorm mode section contains explicit "wait for user" language
6. Epic-scope `submit-explore` (without `--quest`) replaced: `grep "submit-explore --epic" plugin/skills/explore/SKILL.md` returns 0
7. Quest-scope commands preserved: `grep -c "submit-explore --quest" plugin/skills/explore/SKILL.md` returns at least 1
8. Quest-scope context loading preserved: `grep -c "start-explore --quest" plugin/skills/explore/SKILL.md` returns at least 1
9. `grep -c "epic:explore-start" plugin/skills/explore/SKILL.md` returns at least 1
10. `grep -c "epic:explore-conclude" plugin/skills/explore/SKILL.md` returns at least 1
11. explore-phase-pattern.md has conditional epic/quest sections: `grep -c "epic:explore-start" plugin/skills/_references/explore-phase-pattern.md` returns at least 1
12. explore-phase-pattern.md retains quest commands: `grep -c "start-explore --quest" plugin/skills/_references/explore-phase-pattern.md` returns at least 1
13. explore-phase-pattern.md retains quest commands: `grep -c "submit-explore --quest" plugin/skills/_references/explore-phase-pattern.md` returns at least 1
14. `grep -c "epic:explore-conclude" plugin/skills/_references/explore-phase-pattern.md` returns at least 1

---

## Phase 5: Build Verification and Integration Check

**Objective:** Verify all changes work together as a coherent set and that no old command references remain.

### Expected Behavior

**Before:** Individual phases verified in isolation.

**After:** Full cross-skill consistency verified. Build succeeds. No stale command references anywhere in the three updated skills.

### Tasks

#### 5.1 Full Build Check

Run `bun run build` and verify no errors.

#### 5.2 Cross-Skill Command Audit

Run a comprehensive check across all three updated skills and the new agent:

1. Collect all `gp` command references from the four files
2. Verify each against `gp --help` output
3. Flag any command that appears in the skills but not in the CLI binary

#### 5.3 Shared Reference Consistency

Verify that shared references (`@` includes) are still valid:
- `cli-interaction.md` -- still referenced by all three skills
- `orchestrator-discipline.md` -- still referenced by create-epic
- `iteration-loop.md` -- still referenced by create-epic
- `explore-phase-pattern.md` -- still referenced by create-epic and create-side-quest (updated in Phase 4 task 4.5 to use v2 commands)
- `reviewer-registry.md` -- still referenced via iteration-loop.md
- `sub-agent-return-format.md` -- referenced by pressure-test-phase agent

#### 5.4 Verify No Stale v1 Command References

Grep across all four files for known v1 commands that should no longer appear:
- `epic:define-architecture`, `submit-architecture`, `epic:refine-architecture`
- `submit-refine-architecture`, `submit-refine-slices`
- `start-refine-architecture`, `start-refine-slices`
- `start-architecture`, `start-slices`
- `epic:define-slices`, `submit-slices`, `epic:refine-slices`
- `epic:explore` (replaced by `epic:explore-start` for epic scope)
- Epic-scoped `submit-explore --epic` (replaced by `epic:explore-conclude` for epic scope)
- Bare `start-explore` without `--quest` flag (the `--quest` variant is still valid)
- `decision:create` (in explore only -- other skills may still use it if not in scope)
- Note: `start-explore --quest` and `submit-explore --quest` are valid quest-scoped v1 commands with no v2 replacements -- they should remain and must NOT be flagged as stale

### Verification

1. `bun run build` succeeds with exit code 0
2. All v2 commands referenced exist in CLI binary
3. Zero matches for stale v1 commands in the four changed/created files
4. All `@` references resolve to existing files in `plugin/agents/_references/` or `plugin/skills/_references/`

---

## Phase 6: Dogfood Harness Test

**Objective:** Create an Agent SDK harness test that exercises the updated create-epic skill end-to-end, verifying the v2 command integration works in a live session.

### Expected Behavior

**Before:** `tools/dogfood/test-create-epic.ts` exists but tests the v1 create-epic flow.

**After:** `tools/dogfood/test-create-epic-v2.ts` exists and tests the v2 flow including: goal capture (epic:create + epic:goal-draft + epic:goal-commit), explore phase (epic:explore-start + epic:explore-conclude), and verifies that the epic progresses through phases P0 -> P1 -> P2.

**Verification:**
- `bun tools/dogfood/test-create-epic-v2.ts` runs without errors
- Test creates an epic, drafts+commits a goal, starts+concludes exploration
- Epic state shows phase progression through at least P0 -> P1 -> P2

### Tasks

#### 6.1 Create test-create-epic-v2.ts

Create `tools/dogfood/test-create-epic-v2.ts` following the existing `test-create-epic.ts` pattern:

1. Import `query` from `@anthropic-ai/claude-agent-sdk` and `createTestEnv` from `utils.ts`
2. Set up isolated environment: `permissionMode: "bypassPermissions"`, `plugins: [{ type: "local", path: PLUGIN_DIR }]`, `settingSources: []`, `env: createTestEnv(PLUGIN_DIR)`
3. Create a temp `.goodplan/` directory for the test
4. Run `/gp:create-epic` with a test epic name
5. Verify the skill calls v2 commands (`epic:create`, `epic:goal-draft`, `epic:goal-commit`, `epic:explore-start`, `epic:explore-conclude`) by checking the conversation output
6. Verify epic phase reaches at least P2 via `gp epic:show --epic <name> --json`
7. Use `--model opus` per project convention (never use sonnet for e2e tests)

#### 6.2 Verify explore-phase-pattern.md Integration

Add a test assertion that confirms the explore phase uses `epic:explore-start` and `epic:explore-conclude` (not `start-explore` / `submit-explore`). This can be a simple grep of the conversation output for the expected command strings.

#### 6.3 Verify refine:* Integration (Optional)

If time permits, extend the test to cover architecture drafting and at least one refinement round, verifying that `refine:start` and `refine:score` are called. This is optional because the full refinement loop is expensive to run in tests.

### Verification

1. `bun tools/dogfood/test-create-epic-v2.ts` exits with code 0
2. Test output shows v2 commands being invoked
3. No v1 commands appear in the test conversation output
