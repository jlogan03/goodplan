# Skills Migration

## What We're Building
Copy all existing goodplan workflow skills into the `skills/` directory in the repo, create the install script, and set up `bun run install:skills`. This establishes version control for skills and a controlled deployment mechanism.

## Behavior
1. All goodplan workflow skills are copied from `~/.claude/skills/` to `skills/` in the repo, preserving directory structure.
2. `scripts/install-skills.sh` copies skills from `skills/` to `~/.claude/skills/`, handling both old and new skill names during the transition.
3. `bun run install:skills` in package.json runs the install script.
4. The install script is idempotent — running it twice produces the same result.
5. Only goodplan workflow skills are included — personal/third-party skills are untouched.

## Success Criteria
- [ ] `skills/` directory contains all goodplan skills: create-epic, explore, create-architecture, refine-architecture, create-slices, refine-slices, create-plan, complete, project-status, audit-architecture, refine-plan, implement-plan
- [ ] `skills/_shared/references/` contains all shared reference files
- [ ] `bun run install:skills` copies skills to `~/.claude/skills/` successfully
- [ ] Running `bun run install:skills` twice produces identical results (idempotent)
- [ ] Existing non-goodplan skills in `~/.claude/skills/` are untouched after install
- [ ] Git tracks the full skill file history from this point forward

## Verification
1. Run `bun run install:skills` with `GOODPLAN_SKILLS_DIR` set to a temp directory — verify skills appear there.
2. Modify a skill in `skills/`, run install again to the temp directory, verify the change appears.
3. Verify a non-goodplan skill (e.g., `vercel-react-best-practices`) is unmodified after install.
4. Run `git status` — all skills should be tracked.

**Note:** Verification uses `GOODPLAN_SKILLS_DIR` override (or backup/restore) to avoid modifying the real `~/.claude/skills/` directory during testing.

**Soft dependency:** While this slice has no hard dependency on other slices, skills reference concrete CLI commands. Completing after slice 06 (when the command surface is final) avoids rework. Not a hard block — skills can be migrated early and updated later.

## Scope Boundaries
**In scope:** Copy existing skills to repo, install script with `GOODPLAN_SKILLS_DIR` override support, package.json script, _shared/references.
**Out of scope:** Skill consolidation (transforming old skills into new consolidated skills — that happens as slices within this epic progress), CLI-generated skills (future distribution epic).
