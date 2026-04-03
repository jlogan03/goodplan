# Phase 6: Cleanup and Build Updates

Delete 15 old skill directories, remove install-skills.sh, update build-plugin.sh assertions. This is the destructive phase — execute only after all prior phases are verified.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/ | grep -v _shared | wc -l` — returns more than 12
- [ ] `ls scripts/install-skills.sh` — file exists (should be deleted)

**After implementation** (should pass / show presence):
- [ ] `ls skills/ | grep -v _shared | wc -l` — returns exactly 12
- [ ] `ls skills/` shows only: `_shared`, `audit`, `complete-epic`, `create-epic`, `create-side-quest`, `explore`, `implement`, `init`, `plan-slice`, `start-epic`, `status`, `task`, `upgrade`
- [ ] `ls scripts/install-skills.sh` — file does not exist
- [ ] `bun run build:plugin` — passes with "Packaged 12 skills" in output
- [ ] `bun tools/dogfood/test-plugin-skills.ts` — all 12 skills discovered with `/gp:` namespace
- [ ] `bun test` — all tests pass

### Tasks

- [ ] Delete 15 old skill directories:
  - `skills/create-architecture/`
  - `skills/refine-architecture/`
  - `skills/create-plan/`
  - `skills/refine-plan/`
  - `skills/create-slices/`
  - `skills/refine-slices/`
  - `skills/implement-plan/`
  - `skills/complete/`
  - `skills/audit-architecture/`
  - `skills/audit-docs/`
  - `skills/audit-tests/`
  - `skills/capture/`
  - `skills/onboard-repo/`
  - `skills/migrate/`
  - `skills/project-status/`

- [ ] Delete `scripts/install-skills.sh` — superseded by plugin distribution via `build-plugin.sh`

- [ ] Update `build-plugin.sh`:
  - Add exact skill count assertion: `test "$SKILL_COUNT" -eq 12 || { echo "FAIL: expected 12 skills, got $SKILL_COUNT"; exit 1; }`
  - Add deleted skill name assertion: check that none of the 15 deleted skill directory names exist in `$PLUGIN_DIR/skills/`
  - Verify existing regression guards still pass (old CLI name check, .DS_Store check, frontmatter validation)

- [ ] Remove the `install:skills` script from `package.json` (it references `install-skills.sh` which is being deleted — leaving it would break the script).

- [ ] Audit `skills/_shared/references/*.md` for stale references to the 15 deleted skill names. Grep for: `/project-status`, `/create-architecture`, `/create-slices`, `/complete`, `/audit-architecture`, `/audit-docs`, `/audit-tests`, `/onboard-repo`, `/create-plan`, `/refine-plan`, `/implement-plan`, `/refine-architecture`, `/refine-slices`, `/capture`, `/migrate`. Update all references to the new consolidated skill names.

- [ ] Audit `skills/_shared/references/` for files that are only referenced by deleted skills. If any shared reference file is no longer `@`-referenced by any remaining skill or agent, either delete it or note it as tech debt. Known orphan candidates:
  - `reviewers-cross-cutting.md` (31KB) — grep all surviving skills and agents for references; if none remain, delete it
  - `reviewers-language.md`, `reviewers-scientific.md`, `reviewers-web.md` — monolithic files superseded by per-domain `review-*.md` criteria files
  - Any other files only referenced by the 15 deleted skill directories

- [ ] Delete or update stale test harness files:
  - Delete `tools/dogfood/test-onboard.ts` (replaced by `test-init.ts` from Phase 3)
  - Delete `tools/dogfood/generate-onboard-fixture.sh` if it exists (fixture generator that only served `test-onboard.ts`)
  - Delete `tools/dogfood/test-migrate.ts` (replaced by `test-renames.ts` from Phase 4). **Coverage note:** `test-migrate.ts` tests actual migration functionality, while `test-renames.ts` only tests skill discoverability. Accept this coverage gap — the upgrade skill's functional behavior is identical to migrate's, which is already tested via unit tests in `src/`. If functional coverage is needed later, create a separate `test-upgrade.ts`.
  - Rewrite `tools/dogfood/validate.ts` — this is a significant restructuring, not just find-and-replace. The file references 13+ old skill names across ~15 lines, and the workflow structure changes from sequential skill invocations to pipeline invocations. Specific changes:
    - Old skill name mappings: `create-architecture` → `create-epic` pipeline, `create-plan` → `plan-slice` pipeline, `refine-plan` → `plan-slice` pipeline, `implement-plan` → `implement` pipeline, `create-slices` → `create-epic` pipeline, `refine-slices` → `create-epic` pipeline, `complete` → `complete-epic`, `onboard-repo` → `init`, `project-status` → `status`, `capture` → `task`, `migrate` → `upgrade`
    - Workflow structure: previously sequential skill invocations (e.g., create-plan then refine-plan) become single pipeline invocations (plan-slice handles both)
    - May require restructuring validation logic, not just renaming

- [ ] **Update `CLAUDE.md`** to reflect renamed and deleted skills:
  - Replace `/project-status` → `/gp:status`, `/create-plan` → `/gp:plan-slice`, `/implement-plan` → `/gp:implement` in Section 2 ("Installed Tools") and throughout
  - Update the Agent SDK Test Harness table: replace `test-onboard.ts` (`/onboard-repo`) with `test-init.ts` (`/gp:init`), replace `test-migrate.ts` (`/migrate`) with `test-renames.ts` (`/gp:upgrade`), and update any other stale skill references in the table
  - Verify no references to the 15 deleted skill names remain in CLAUDE.md after updates

- [ ] Update `tools/dogfood/test-plugin-skills.ts` — update the `expectedSkills` array to the 12 new skill names: `audit`, `complete-epic`, `create-epic`, `create-side-quest`, `explore`, `implement`, `init`, `plan-slice`, `start-epic`, `status`, `task`, `upgrade`. Update both the count assertion and the name list.

- [ ] Run `bun tools/dogfood/test-plugin-skills.ts` to verify all 12 skills are discovered
- [ ] Run `bun test` to verify no test breakage from deletions

### Verification

- `bun run build:plugin` succeeds with exactly 12 skills and all agents (assert agent count: `ls agents/reviewer-*.md | wc -l` returns 20, plus non-reviewer agents)
- `bun tools/dogfood/test-plugin-skills.ts` discovers all 12 skills with `/gp:` namespace
- `bun test` passes — no regressions from deleted skills
- `ls skills/ | grep -v _shared | wc -l` — returns exactly 12
- `ls skills/` shows only: `_shared`, `audit`, `complete-epic`, `create-epic`, `create-side-quest`, `explore`, `implement`, `init`, `plan-slice`, `start-epic`, `status`, `task`, `upgrade`
- No old skill names appear in `dist/gp-plugin/skills/`
- No old skill names appear in `skills/_shared/references/*.md`
- `scripts/install-skills.sh` no longer exists
- `tools/dogfood/test-onboard.ts`, `tools/dogfood/generate-onboard-fixture.sh`, and `tools/dogfood/test-migrate.ts` no longer exist
