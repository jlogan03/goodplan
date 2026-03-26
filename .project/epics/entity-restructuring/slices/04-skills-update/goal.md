# Skills Update

## What We're Building

Update all 16 skill files that reference `.project/slices/` to use the nested path `.project/epics/<epic>/slices/<name>/`. Also absorb the `/complete` skill learnings.md change from slice 03 (remove direct `.project/learnings.md` writes). These are content changes to SKILL.md and reference files — no TypeScript code changes.

## Behavior

1. All skill files use `epics/<epic>/slices/<name>/` path convention
2. Skills that resolve slice scope derive the epic from `goodplan status --json` → `.activeEpic.name`
3. Scope resolution variables (`$SLICES_DIR`) point to `epics/<epic>/slices/`
4. `explore-logic.md` scope path mapping table updated
5. `cli-interaction.md` examples updated
6. `/complete` skill Step 5 no longer writes to `.project/learnings.md` (learnings.jsonl via CLI is the sole structured source of truth)
7. `/complete` skill Step 5 still includes learnings in the CLI `quest:complete`/`slice:complete` payload (learnings.jsonl rollup unchanged)

Skill files to update (all 16, verified via `grep -rl 'slices/' skills/`):
- `skills/_shared/references/cli-interaction.md`
- `skills/_shared/references/epic-conventions.md`
- `skills/_shared/references/state-and-activity-formats.md`
- `skills/complete/SKILL.md`
- `skills/complete/references/guidance.md`
- `skills/create-plan/SKILL.md`
- `skills/create-plan/references/guidance.md`
- `skills/create-slices/SKILL.md`
- `skills/create-slices/references/guidance.md`
- `skills/explore/SKILL.md`
- `skills/explore/references/explore-logic.md`
- `skills/migrate/SKILL.md`
- `skills/migrate/references/migration-heuristics.md`
- `skills/project-status/SKILL.md`
- `skills/project-status/references/status-logic.md`
- `skills/refine-slices/SKILL.md`

## Verification

- [ ] `grep -r '\.project/slices/' skills/` — zero matches (all converted to epic-scoped paths)
- [ ] `grep -r '"slices/' skills/` — zero matches for flat state tree references
- [ ] `grep "learnings.md" skills/complete/SKILL.md` — zero matches for direct write operations
- [ ] `bun run install:skills` — installs successfully
- [ ] `grep -r '.project/slices/' ~/.claude/skills/` — no stale paths in installed copies
- [ ] `bun test` — no regressions
- [ ] Read each updated skill and verify path references are consistent
- [ ] Runtime smoke test: after `bun run install:skills`, run `goodplan status --json` in a project with an active epic+slice and confirm the JSON output contains nested slice paths matching what skills expect (e.g., `epics/<epic>/slices/<name>`)

Install skills and verify installed copies reflect new paths. Run a runtime smoke test to confirm skills see correct paths end-to-end (grep checks catch string literals but not semantic errors like unresolved variables).

## Scope Boundaries

**In scope**: All 16 skill files listed above, `/complete` skill learnings.md removal
**Out of scope**: TypeScript source changes (already done in slices 01-03), migration
