# Phase 5: Cross-Skill Verification & Fixes

Final verification pass: cross-skill grep, convention doc review, and resolution of any deferred friction items. This phase operates on the GOODPLAN repo (not the dogfood repo).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Cross-skill grep may return hits from skills not yet migrated or edge cases

**After implementation** (should pass / show presence):
- [ ] Cross-skill grep returns zero hits for direct structured state access (excluding `_shared/references/` which contains documentation examples)
- [ ] Convention doc (`skills/_shared/references/cli-interaction.md`) reflects actual patterns observed during dogfooding
- [ ] All friction log items resolved or explicitly deferred with rationale

### Tasks

#### Cross-Skill Grep
- [ ] **Run the verification grep** (excluding `_shared/references/` and `start-epic/` which is un-migrated): `grep -rn --exclude-dir='_shared' --exclude-dir='start-epic' 'Read.*\.project/.*\.json\|\.project/.*\.jsonl\|state\.md\|echo.*activity-log' skills/`. Note: hits in `start-epic/` are expected since that skill was not exercised or migrated.
- [ ] **Run broader grep**: Check for additional direct-access patterns that should use CLI commands:
  ```bash
  grep -rn --exclude-dir='_shared' --exclude-dir='start-epic' \
    -e 'cat .project/' \
    -e 'Write.*\.project/.*\.json' \
    -e 'jq .* .project/' \
    -e 'ls -d.*__active__' \
    -e 'mkdir -p .project/\(epics\|slices\|quests\)' \
    skills/
  ```
  Note: `mkdir -p .project/` is scoped to entity directories only — `mkdir -p .project/architecture/` etc. may be valid skill operations. Manually inspect all results before marking as failures.
- [ ] **Fix any remaining hits**: Migrate leftover direct access patterns to CLI equivalents
- [ ] **Verify**: Re-run all greps, confirm zero hits (outside `_shared/references/`)

#### Convention Doc Review
- [ ] **Read convention doc**: `skills/_shared/references/cli-interaction.md`
- [ ] **Compare against dogfood experience**: Did any CLI patterns observed during Phases 1-4 differ from what the convention doc describes?
- [ ] **Update convention doc**: Fix discrepancies, add patterns that were needed but undocumented
- [ ] **Check error handling section**: Were there CLI errors during dogfooding that the error handling patterns didn't cover?

#### Friction Resolution
- [ ] **Review friction log**: Read all entries from Phases 1-4
- [ ] **Fix deferred items**: For each unresolved friction item, either:
  - Fix it (CLI code change, skill update, or convention doc update)
  - Defer with explicit rationale (too large, out of scope, needs design)
- [ ] **CLI fixes**: If any CLI code changes were needed, run `bun test` to verify no regressions
- [ ] **Skill fixes**: If any skill files were updated, run `bun run install:skills` to update installed copies

#### Final Verification
- [ ] **Run `bun test`**: Confirm all existing tests pass (test count >= baseline at phase start)
- [ ] **Run `bun run install:skills`**: Reinstall all skills (script confirmed in package.json)
- [ ] **Verify installed skills match**: `diff -r skills/ ~/.claude/skills/` — this verifies user-level install in the goodplan repo (not the dogfood repo)
- [ ] **Exit code spot-check**: Verify a few commands return exit code 0 on success and 3 with structured error JSON on invalid transitions (per INV-007)

### Verification

1. Cross-skill grep returns zero hits for direct structured state access (excluding reference docs)
2. Convention doc updated with any new patterns from dogfooding
3. All friction log items resolved or documented as deferred
4. `bun test` passes
5. Skills installed successfully
