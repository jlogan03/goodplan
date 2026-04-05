# Generalist Review — Phase 3: Fix Stale Skill Name References

**Score: 8/10**

## Summary

The rename sweep is thorough across the 9 changed files. All three verification greps from the plan pass clean. The mapping table was applied correctly in status-logic.md, output-templates.md, iteration-loop.md, README.md, explore/SKILL.md, init/SKILL.md, init/references/expertise-profiling.md, and epic-conventions.md. Build passes, stale reference grep returns 0 matches.

Two issues found — one important incorrect rename and one minor set of missed self-references.

## Issues

### IMPORTANT: `/gp:migrate` should be `/gp:upgrade` in migration-heuristics.md

**File**: `skills/upgrade/references/migration-heuristics.md` line 3

The old skill name `/migrate` was renamed to `/gp:migrate`, but the skill is actually named `upgrade` (confirmed via `skills/upgrade/SKILL.md` frontmatter `name: upgrade`). There is no `migrate` skill. The correct rename is `/migrate` -> `/gp:upgrade`.

Current (wrong):
```
Reference for the `/gp:migrate` skill.
```

Expected:
```
Reference for the `/gp:upgrade` skill.
```

### Minor: Two `/explore` self-references in explore skill not updated

**Files**:
- `skills/explore/SKILL.md` line 119: `invokes `/explore skip`` should be `/gp:explore skip`
- `skills/explore/references/explore-logic.md` line 56: `researching a topic for `/explore`` should be `for `/gp:explore``

These are self-references within the explore skill's own files. The plan's primary verification grep catches these (they appear in the `/explore` followed by space/backtick check), but they were not included in the Phase 3 task list. They are low-impact since they are internal to the skill that owns them, but they are technically stale references of the same pattern being fixed everywhere else.

Note: `skills/task/SKILL.md` line 6 also has `(/explore)` but this is inside YAML frontmatter `description:` and is correctly excluded by the plan's grep filter (`grep -v 'SKILL.md:.*description'`).

## Verification

| Check | Result |
|---|---|
| Stale `/`-prefixed skill grep | 0 matches (PASS) |
| Bare-name grep in `_shared/references/` | 0 matches (PASS) |
| `/explore` followed by delimiter grep | 3 matches remain (see Minor issue) |
| `/gp:create-architecture` in init/SKILL.md | 0 (PASS) |
| Build | PASS |

## Verdict

The important issue (`/gp:migrate` -> `/gp:upgrade`) is a correctness bug that should be fixed before merging. The minor explore self-references are low-risk but worth fixing in the same pass.
