# Documentation

## What We're Building
Update all documentation to reflect the verified 12-skill model. This is the final slice — written after quality validation confirms the system works correctly. Documentation covers the README, CLAUDE.md, architecture files, and any user-facing guides.

## Behavior
1. Update `README.md`:
   - Reflect the 12-skill inventory with correct `/gp:` invocation names
   - Update the workflow overview to show the consolidated pipeline flow
   - Update any installation or usage instructions affected by skill renaming
2. Update `CLAUDE.md`:
   - Update the "Read these" list if any architecture files were added/removed/renamed
   - Update any skill invocation references (old names → new names)
   - Update the repo structure section in conventions to reflect agents/ directory
3. Update `.goodplan/architecture/_overview.md`:
   - Update skill references throughout
   - Update subsystem maturity levels based on epic outcomes
   - Add agents/ as a described component
4. Update `.goodplan/conventions.md`:
   - Update repo structure to include `agents/` directory
   - Update skill development conventions for the new model
   - Update the install script reference if changed
5. Update any other architecture files that reference old skill names or the 19-skill model.
6. Review and update `docs/` directory if it exists and contains affected content.
7. Verify no stale references remain: grep for old skill names across the repo.

## Verification
- [ ] Fitness test `tests/fitness/stale-skill-references.test.ts` passes — primary automated check for stale skill name references across the repo (context-aware, preferred over grep)
- [ ] Run `grep -r "create-plan\|refine-plan\|create-slices\|refine-slices\|implement-plan\|audit-architecture\|audit-docs\|audit-tests\|project-status\|onboard-repo\|capture\|migrate" --include="*.md" .` — quick secondary check; note this will produce false positives (e.g., "capture learnings", "migrate" as English words) — filter results manually and use the fitness test as the definitive verdict
- [ ] Read `README.md` — lists exactly 12 skills with correct names and descriptions
- [ ] Read `CLAUDE.md` — all architecture references point to existing files
- [ ] Read `.goodplan/architecture/_overview.md` — skill count matches 12, agents/ is described, subsystem maturity is updated
- [ ] Read `.goodplan/conventions.md` — repo structure includes `agents/`, skill development section is current

Read through each updated document to verify accuracy. Run the grep check for stale skill name references — fix any found. Verify that a new Claude Code session loading CLAUDE.md would get correct, current information about the skill system.

## Scope Boundaries
**In scope:** README.md, CLAUDE.md, .goodplan/architecture/_overview.md, .goodplan/conventions.md, any other .md files referencing old skill names or counts, stale reference cleanup
**Out of scope:** Generating new documentation for features that don't exist yet. Marketing copy or external-facing docs. API documentation (the skills ARE the API; their SKILL.md files are self-documenting).
