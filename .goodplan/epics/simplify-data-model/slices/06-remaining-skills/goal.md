# Remaining Skills + Cleanup

## What We're Building
Consolidate the remaining skills to complete the 19→12 migration. Build the `create-side-quest` pipeline, merge audit skills into one, create the `init` skill (onboard + new project), rename capture→task, migrate→upgrade, project-status→status. Delete all superseded old skill directories. This slice brings the skill count to the target 12.

**Maturity Note:** Commands subsystem at "Developing (modified)" maturity. This slice targets the post-slice-03 CLI API surface.

## Sub-Ordering

This slice has high blast radius (9+ deliverables). Execute in this order with intermediate verification gates:

1. **Build phase:** Build all new/renamed skills (items 1-5 below)
2. **Verify phase:** Run all per-skill test harness scripts, confirm all 12 skills work
3. **Cleanup phase:** Delete old skill directories (item 6), update build/install scripts (items 7-8)
4. **Final verify:** `bun run build:plugin` produces exactly 12 skills, `bun test` passes

Do NOT delete old skills until new skills are fully verified. If cleanup runs before verification completes, revert cleanup commits and re-run verification. Verify ordering was followed by checking git log for commit order (build commits before cleanup commits).

## Behavior
1. Build `create-side-quest` pipeline (`skills/create-side-quest/SKILL.md`):
   - Phase 1 (interactive): Goal capture
   - Phase 2 (autonomous): Explore — spawn `explore-phase` agent
   - Phase 3 (interactive): Plan Q&A
   - Phase 4 (autonomous): Plan draft + refinement — spawn `plan-phase` agent + refinement loop
   - Re-entry via `gp quest:show --quest <name> --json`
2. Build `explore` standalone skill (`skills/explore/SKILL.md`) — thin wrapper that spawns `explore-phase` agent. Pipeline skills (create-epic, create-side-quest) spawn `explore-phase` directly.
3. Build `audit` standalone skill (`skills/audit/SKILL.md`) — mode selection (architecture/docs/tests) at invocation, spawns appropriate reviewer agents. Merges audit-architecture + audit-docs + audit-tests.
4. Build `init` standalone skill (`skills/init/SKILL.md`) — auto-detects mode: if source files exist, runs onboard flow; otherwise new-project flow. Override with `--mode new` or `--mode onboard`. Merges onboard-repo + create-epic Mode A.
5. Rename skills: capture→task, migrate→upgrade, project-status→status. Update descriptions, trigger phrases, and CLI command references.
6. Delete all superseded skill directories (15 old skills listed in architecture skill-model-api.md "What Gets Deleted").
7. Update `build-plugin.sh` and `plugin.json` to reflect the final 12-skill inventory.
8. Update `scripts/install-skills.sh` to map new skill names for local development.
9. Add remaining reviewer agents needed by audit and create-side-quest contexts.

## Verification
- [ ] Run `bun tools/dogfood/test-create-side-quest.ts` — full pipeline completes: goal captured, explore runs, plan Q&A collects input, plan drafted and refined
- [ ] Run `bun tools/dogfood/test-audit.ts` — audit runs in each mode (architecture, docs, tests) and produces findings
- [ ] Run `bun tools/dogfood/test-init.ts` — init detects empty repo (new project) and repo with source (onboard) correctly
- [ ] Run `bun run build:plugin` — dist contains exactly 12 skill directories + agents/ directory
- [ ] Verify old skill directories are deleted from `skills/` — `ls skills/` shows only the 12 target skills + `_shared/`
- [ ] Verify deleted skill names don't collide with new names — invoking an old name (e.g., `/gp:create-plan`) does not match any skill
- [ ] Run `bun tools/dogfood/test-plugin-skills.ts` — all 12 skills are discovered with correct `/gp:` namespace
- [ ] Run `bun test` — all tests pass
- [ ] Verify sub-ordering discipline: git log shows build-phase commits before cleanup-phase commits

Build the plugin and verify the dist contains exactly 12 skills. Run `test-plugin-skills.ts` to confirm all skills are discovered with `/gp:` namespace. Run each new skill's test harness script. Verify that invoking a deleted skill name (e.g., `/gp:create-plan`) does not match — only the new names work. Check that `scripts/install-skills.sh` correctly installs the 12 skills for local development.

## Scope Boundaries
**In scope:** create-side-quest, explore, audit, init, task, upgrade, status skills. Old skill deletion. Build pipeline updates. Install script updates. Per-skill test harness scripts.
**Out of scope:** Quality validation (slice 07). Documentation updates (slice 08). Start-epic skill updates (captured as separate task).
