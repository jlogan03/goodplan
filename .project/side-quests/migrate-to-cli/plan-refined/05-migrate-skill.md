# Phase 5: Migrate Skill

Update the `/migrate` SKILL.md stub to a goal-aware Q&A skill that reads old-format `.project/` artifacts and answers CLI migration questions. The skill understands the migration's purpose so it can troubleshoot issues and help the user if things go wrong.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `cat skills/migrate/SKILL.md` → shows "not yet implemented" stub

**After implementation** (should pass / show presence):
- [ ] `cat skills/migrate/SKILL.md` → full skill with: purpose explanation, Q&A loop instructions, status inference heuristics, sourcePath conventions, error handling guidance
- [ ] Skill starts with Step 1: `goodplan --version --json` check per `cli-interaction.md` conventions
- [ ] Skill includes concrete `echo '...' | goodplan migrate --json` invocations (correct stdin piping syntax per `cli-interaction.md`)
- [ ] Skill references `../_shared/references/cli-interaction.md` for error handling patterns
- [ ] Skill documents status inference mapping (see heuristics below)
- [ ] SKILL.md is under 500 lines / 15KB — detailed heuristics split into `references/migration-heuristics.md`

### Tasks

- [x] Rewrite `skills/migrate/SKILL.md` with full skill content:
  - **Frontmatter:** name, description — front-load natural trigger phrases and plain-language summary (under ~200 chars): "Migrate project, convert to goodplan, import existing .project/ — converts a pre-CLI .project/ directory to CLI-managed state." Move the `DATA_NO_PROJECT` error-condition trigger to the skill body, not the description. `requires: goodplan >= 1.0.0`
  - **Reference:** `../_shared/references/cli-interaction.md` (specifically Section 10: Error Handling) for error handling patterns. Note: Section 12 uses "migration" in a different sense — scope the reference to Section 10 only.
  - **Step 1 — Version check (mandatory per cli-interaction.md):**
    - Run `goodplan --version --json`
    - Verify compatible version. If fails, stop and report.
  - **Step 2 — Pre-flight checks:**
    - Check for partial migration: if `.project/` doesn't exist but `.project-old/` does, a previous migration attempt may have failed mid-run. Inform the user and ask them to rename `.project-old/` back to `.project/` before retrying. Stop.
  - **Step 3 — Start migration:**
    - Call `goodplan migrate --json` to get initial questions
    - If error `STATE_ALREADY_INITIALIZED` → inform user project is already migrated, stop
    - If error `DATA_NO_PROJECT` → inform user no `.project/` found, stop
  - **Step 4 — Answer inventory questions:**
    - Read `references/migration-heuristics.md` using the Read tool before answering (follows established skill pattern — e.g., `/explore` Step 1 loads `references/explore-logic.md`)
    - Read `.project/` filesystem to find epics, quests
    - **Epic discovery:** Scan `epics/` directory. Strip `~~archived~~NN_` prefix for clean names. Strip `__active__` prefix. Each subdirectory is an epic.
    - **Quest discovery:** Scan `side-quests/` directory (NOT `quests/` — that's the CLI name). Same prefix stripping. Each subdirectory with `goal.md` is a quest.
    - **Status inference:** See `references/migration-heuristics.md` for detailed heuristics
    - **sourcePath:** Provide the directory name as-is from the filesystem (including `~~archived~~` prefix) — this is how the CLI finds the old directory for artifact copy
    - **Goal extraction:** Read `goal.md` from each entity directory. Use the first paragraph or `## What We're Building` section as the goal string. Quest goals must be explicitly included in answers.
    - Pipe answers using `stdin:` parameter syntax (preferred) or `echo '<json>' | goodplan migrate --json` for simple cases
  - **Step 5 — Answer follow-up rounds:**
    - For each epic detail question: read the epic's directory for slices, architecture, sequencing
    - **Slice discovery:** Scan `slices/` within the epic directory (for epic slices) or directly in side-quest dirs
    - **Slice sequencing:** Read `slices/sequencing.md` if it exists, extract ordering
    - **Quest sub-structure:** Quests do not have slices in the CLI model. Any subdirectories within a quest (e.g., `plan-refining/`, `refinement/`, `research/`) are treated as markdown artifacts and copied during the artifact-copy step, not as separate entities.
    - Pipe answers using `stdin:` parameter syntax (preferred for robustness with large payloads) or `echo '<json>' | goodplan migrate --json` for simple cases
  - **Step 6 — Confirmation:**
    - Review the state summary presented by the CLI
    - Cross-check against filesystem: verify entity counts match, statuses are reasonable
    - If errors spotted: return `approved: false` with `reAnswerIds` for questions that need correction
    - If correct: return `approved: true`
  - **Step 7 — Report completion:**
    - Tell the user migration is complete
    - Mention `.project-old/` is preserved and can be deleted after verification
    - Suggest running `goodplan status` to verify
  - **Error handling:**
    - Follow fail-fast pattern from `cli-interaction.md`
    - If CLI returns validation errors (bad sourcePaths, schema failures): read the error, fix the answer, resubmit
    - If correction limit reached: explain what happened, suggest manually reviewing `.migration-in-progress.json`
    - If rename fails (`.project-old/` exists): explain and suggest removing the old backup
  - **Intermediate status handling:** Intermediate workflow statuses (e.g., `exploring`, `defining-architecture`) are not expected in pre-CLI projects. If detected, map to nearest stable predecessor (e.g., mid-refinement → `architecture-defined`).
- [x] Create `skills/migrate/references/migration-heuristics.md`:
  - Move detailed status inference heuristics here (keeps SKILL.md focused on workflow):
    1. `abandoned.md` exists → `abandoned`
    2. `completion/learnings.md` exists → `completed`
    3. `architecture/_overview.md` exists AND `slices/` has subdirs → `activated` (for epics)
    4. `architecture/_overview.md` exists without slices → `architecture-defined` (for epics)
    5. `plan-refined.md` exists → `plan-refined` (for slices/quests)
    6. `plan.md` exists → `plan-created` (for slices/quests)
    7. Only `goal.md` → `created`
  - Include directory scanning conventions (prefix stripping, ignored files)
  - Note: `~~archived~~` and `__active__` prefixes are mutually exclusive — they never co-occur on the same directory
- [x] Verify SKILL.md body uses relative path `references/migration-heuristics.md` consistently for heuristic references, matching conventions in other skills.
- [x] Verify skill references correct CLI command syntax per `cli-interaction.md` conventions (`stdin:` parameter syntax preferred for answer payloads, `echo` acceptable for simple cases, `--json` flag)

### Verification

- Read the skill and confirm it covers all question types from Phases 2-3
- Confirm status inference heuristics match the actual old-format artifacts in this repo's `.project/`
- Verify all `goodplan migrate` invocations use correct `echo '...' | goodplan migrate --json` stdin piping syntax
- Verify Step 1 version check is present (mandatory per cli-interaction.md)
- Verify `references/migration-heuristics.md` exists with detailed heuristics
- Run `goodplan migrate --json` on a copy of this repo's actual `.project/` (NOT the test fixture from Phase 6, which doesn't exist yet) and confirm the skill's documented invocations produce valid output (behavioral verification, not just file-existence checks)
- Skill size check: `wc -c < skills/migrate/SKILL.md` < 15360
- Grep for required sections: version check step, error handling, cli-interaction reference
