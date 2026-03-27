# Learnings: 04-skills-update

## Grep-based verification counts must account for dual-path references

Plan estimated ~10-12 remaining `.project/slices/` references after migration, but the actual count was 33 because dual-path mentions (where both flat and epic-nested paths appear on the same line) still match the flat-path grep. Verification patterns for path migration plans should distinguish between standalone stale references and intentional co-occurrences, or use a more specific grep pattern that excludes lines containing both old and new path patterns.

## Skill path migrations need per-file change-type classification

Three distinct change types emerged during refinement: (1) simple replacement (e.g., `$SLICES_DIR` default), (2) dual-path expansion (e.g., completion scanning globs), and (3) conditional logic insertion (e.g., `explore/SKILL.md` which lacks `$SLICES_DIR`). The Agent Skill reviewer initially scored 5/10 because the plan treated all changes as find-and-replace. Future cross-skill migration plans should classify each file's change type upfront during planning.

## Condensed reference files must be verified against their source after updates

`create-plan/references/guidance.md` fell out of sync with `create-plan/SKILL.md` after path updates — the SKILL.md got conditional epic-awareness logic but guidance.md kept the old unconditional scan order. Implementation review caught this as 2 IMPORTANT issues. When updating a skill's SKILL.md, always verify its `references/guidance.md` (if one exists) reflects the same logic.
