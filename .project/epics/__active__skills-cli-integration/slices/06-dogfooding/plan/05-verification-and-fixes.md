# Phase 5: Cross-Skill Verification & Fixes

Final verification pass: cross-skill grep, convention doc review, and resolution of any deferred friction items. This phase operates on the GOODPLAN repo (not the dogfood repo).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'Read.*\.project/.*\.json\|\.project/.*\.jsonl\|state\.md\|echo.*activity-log' skills/` — may return hits from skills not yet migrated or edge cases

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'Read.*\.project/.*\.json\|\.project/.*\.jsonl\|state\.md\|echo.*activity-log' skills/` — returns zero hits (all direct structured state access eliminated)
- [ ] Convention doc (`skills/_shared/references/cli-interaction.md`) reflects actual patterns observed during dogfooding
- [ ] All friction log items resolved or explicitly deferred with rationale

### Tasks

#### Cross-Skill Grep
- [ ] **Run the verification grep** from goal.md: `grep -rn 'Read.*\.project/.*\.json\|\.project/.*\.jsonl\|state\.md\|echo.*activity-log' skills/`
- [ ] **Fix any remaining hits**: Migrate leftover direct access patterns to CLI equivalents
- [ ] **Run broader grep**: Also check for `state-and-activity-formats`, `ls -d.*__active__`, and any `mkdir -p .project/` patterns that should use CLI commands
- [ ] **Verify**: Re-run all greps, confirm zero hits

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
- [ ] **Run `bun test`**: Confirm all 941+ tests pass
- [ ] **Run `bun run install:skills`**: Reinstall all skills
- [ ] **Verify installed skills match**: `diff -r skills/ ~/.claude/skills/` for key skills

### Verification

1. Cross-skill grep returns zero hits for direct structured state access
2. Convention doc updated with any new patterns from dogfooding
3. All friction log items resolved or documented as deferred
4. `bun test` passes
5. Skills installed successfully
