# Phase 4: Renames

Create fresh skill directories for task (from capture), upgrade (from migrate), and status (from project-status). Each gets updated frontmatter, descriptions, trigger phrases, and CLI references adapted from the old skill content. Also ensure all 12 skills have `user-invocable: true`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/task/SKILL.md skills/upgrade/SKILL.md skills/status/SKILL.md` — none exist

**After implementation** (should pass / show presence):
- [ ] `ls skills/task/SKILL.md` — exists with `name: task` in frontmatter
- [ ] `ls skills/upgrade/SKILL.md` — exists with `name: upgrade` in frontmatter
- [ ] `ls skills/status/SKILL.md` — exists with `name: status` in frontmatter
- [ ] `grep -c 'name: task' skills/task/SKILL.md` — returns 1
- [ ] `grep -c 'name: upgrade' skills/upgrade/SKILL.md` — returns 1
- [ ] `grep -c 'name: status' skills/status/SKILL.md` — returns 1
- [ ] `grep -rL 'user-invocable: true' skills/*/SKILL.md | grep -v _shared` — returns no results (all 12 skills have it)
- [ ] `bun tools/dogfood/test-renames.ts` — all three renamed skills load and respond to trigger phrases

### Tasks

- [ ] Create `skills/task/SKILL.md` — adapted from `skills/capture/SKILL.md`:
  - Rename: `name: task`
  - Description triggers: "capture", "quick note", "bug", "idea", "todo", "task", "note this"
  - Update any internal references from "capture" to "task"
  - Add `user-invocable: true`, `requires: gp >= 1.0.0`
  - Content: same CLI commands (`gp task:create`), same flow — the rename is primarily in frontmatter and user-facing language. Note: the CLI command name `gp task:create` is unchanged; only the skill name changes from `capture` to `task`.

- [ ] Create `skills/upgrade/SKILL.md` — adapted from `skills/migrate/SKILL.md`:
  - Rename: `name: upgrade`
  - Description triggers: "upgrade", "migrate", "update state format", "convert project"
  - Copy `skills/migrate/references/migration-heuristics.md` to `skills/upgrade/references/migration-heuristics.md`
  - Add `user-invocable: true`, `requires: gp >= 1.0.0`
  - Update internal skill references (any mentions of "migrate" in the context of the skill name)

- [ ] Create `skills/status/SKILL.md` — adapted from `skills/project-status/SKILL.md`:
  - Rename: `name: status`
  - Description triggers: "status", "where am I", "what's next", "project state", "orient", "re-orient"
  - Copy `skills/project-status/references/status-logic.md` to `skills/status/references/status-logic.md`
  - Update `requires: gp >= 1.0.0` (currently `>= 0.0.1`)
  - Add `user-invocable: true`

- [ ] For `skills/init/` (created in Phase 3): copy the 5 reference files from `skills/onboard-repo/references/` to `skills/init/references/` (these are critical for onboarding quality and will be lost when Phase 6 deletes `skills/onboard-repo/`). Files: `architecture-extraction.md`, `convention-heuristics.md`, `expertise-profiling.md`, `migration-detection.md`, `repo-scanning.md`. Verify each exists before copying; if any are missing, check for renames or consolidation.

- [ ] Ensure ALL 12 skills have `user-invocable: true` in their frontmatter. This is an intentional frontmatter upgrade — source skills like `capture`, `migrate`, `project-status` did not have it, and existing skills `create-epic`, `plan-slice`, `implement`, `complete-epic`, `explore`, `start-epic` may also lack it. Add it to any that are missing:
  - `skills/create-epic/SKILL.md`
  - `skills/plan-slice/SKILL.md`
  - `skills/implement/SKILL.md`
  - `skills/complete-epic/SKILL.md`
  - `skills/explore/SKILL.md`
  - `skills/start-epic/SKILL.md`

- [ ] Verify each new skill's SKILL.md has valid frontmatter (opening/closing `---`, `name:`, `description:`, `user-invocable: true`)
- [ ] Diff-based semantic equivalence check: for each renamed skill, diff the new SKILL.md body (excluding frontmatter) against the source skill's SKILL.md. Verify that content changes are limited to name/reference updates — no accidental content loss or missing sections. Flag any significant body differences for manual review.

- [ ] Write `tools/dogfood/test-renames.ts` — smoke tests for all three renamed skills:
  - Verify each skill loads via plugin discovery (appears in `/gp:task`, `/gp:upgrade`, `/gp:status`)
  - Verify each responds to its trigger phrases
  - Test error path: invoke each with missing arguments or context, verify graceful error message
  - Accept `--model` flag

### Verification

- All three new skill directories exist with valid SKILL.md files
- All 12 skills have `user-invocable: true` in frontmatter
- Reference files copied: `upgrade/references/migration-heuristics.md`, `status/references/status-logic.md`, `init/references/` (5 files from onboard-repo)
- Frontmatter passes the same validation build-plugin.sh runs (name, description fields present)
- `bun tools/dogfood/test-renames.ts` passes — all three skills load and respond
- No references to old skill names in new skill content (grep for "capture" in task/, "migrate" in upgrade/, "project-status" in status/)
