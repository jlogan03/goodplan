# Phase 5: Migrate Skill

Update the `/migrate` SKILL.md stub to a goal-aware Q&A skill that reads old-format `.project/` artifacts and answers CLI migration questions. The skill understands the migration's purpose so it can troubleshoot issues and help the user if things go wrong.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `cat skills/migrate/SKILL.md` → shows "not yet implemented" stub

**After implementation** (should pass / show presence):
- [ ] `cat skills/migrate/SKILL.md` → full skill with: purpose explanation, Q&A loop instructions, status inference heuristics, sourcePath conventions, error handling guidance
- [ ] Skill includes concrete `goodplan migrate --json` invocations (exact stdin piping syntax per `cli-interaction.md` conventions)
- [ ] Skill documents status inference mapping:
  - `abandoned.md` exists → `abandoned`
  - `completion/learnings.md` exists → `completed`
  - `architecture/_overview.md` + `slices/` with content → `activated`
  - `architecture/_overview.md` without slices → `architecture-defined`
  - Only `goal.md` → `created`

### Tasks

- [ ] Rewrite `skills/migrate/SKILL.md` with full skill content:
  - **Frontmatter:** name, description, `requires: goodplan >= 1.0.0`
  - **Purpose section:** Explains what migration does — converts pre-CLI `.project/` to CLI-managed state. Explains the Q&A protocol and what happens at each stage (old `.project/` → `.project-old/`, fresh `.project/` created).
  - **Step 1 — Start migration:**
    - Call `goodplan migrate --json` to get initial questions
    - If error `STATE_ALREADY_MIGRATED` → inform user project is already migrated
    - If error `DATA_NO_PROJECT_DIR` → inform user no `.project/` found
  - **Step 2 — Answer inventory questions:**
    - Read `.project/` filesystem to find epics, quests
    - **Epic discovery:** Scan `epics/` directory. Strip `~~archived~~NN_` prefix for clean names. Strip `__active__` prefix. Each subdirectory is an epic.
    - **Quest discovery:** Scan `side-quests/` directory (NOT `quests/` — that's the CLI name). Same prefix stripping. Each subdirectory with `goal.md` is a quest.
    - **Status inference heuristics** (check in order, first match wins):
      1. `abandoned.md` exists → `abandoned`
      2. `completion/learnings.md` exists → `completed`
      3. `architecture/_overview.md` exists AND `slices/` has subdirs → `activated` (for epics)
      4. `architecture/_overview.md` exists without slices → `architecture-defined` (for epics)
      5. `plan-refined.md` exists → `plan-refined` (for slices/quests)
      6. `plan.md` exists → `plan-created` (for slices/quests)
      7. Only `goal.md` → `created`
    - **sourcePath:** Provide the directory name as-is from the filesystem (including `~~archived~~` prefix) — this is how the CLI finds the old directory for artifact copy
    - **Goal extraction:** Read `goal.md` from each entity directory. Use the first paragraph or `## What We're Building` section as the goal string.
    - Pipe answers as JSON to `goodplan migrate --json` via stdin
  - **Step 3 — Answer follow-up rounds:**
    - For each epic detail question: read the epic's directory for slices, architecture, sequencing
    - **Slice discovery:** Scan `slices/` within the epic directory (for epic slices) or directly in side-quest dirs
    - **Slice sequencing:** Read `slices/sequencing.md` if it exists, extract ordering
    - Pipe answers back
  - **Step 4 — Confirmation:**
    - Review the state summary presented by the CLI
    - Cross-check against filesystem: verify entity counts match, statuses are reasonable
    - If errors spotted: return `approved: false` with `reAnswerIds` for questions that need correction
    - If correct: return `approved: true`
  - **Step 5 — Report completion:**
    - Tell the user migration is complete
    - Mention `.project-old/` is preserved and can be deleted after verification
    - Suggest running `goodplan status` to verify
  - **Error handling:**
    - If CLI returns validation errors (bad sourcePaths, schema failures): read the error, fix the answer, resubmit
    - If correction limit reached: explain what happened, suggest manually reviewing `.migration-in-progress.json`
    - If rename fails (`.project-old/` exists): explain and suggest removing the old backup
- [ ] Verify skill references correct CLI command syntax per `cli-interaction.md` conventions (stdin piping, `--json` flag)

### Verification

- Read the skill and confirm it covers all question types from Phases 2-3
- Confirm status inference heuristics match the actual old-format artifacts in this repo's `.project/`
- Verify all `goodplan migrate` invocations use correct stdin piping syntax
- Skill size is under 15KB (per project constraints)
