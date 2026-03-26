# Skills Update

## What We're Building

Update all 11 skill files that reference `.project/slices/` to use the nested path `.project/epics/<epic>/slices/<name>/`. These are content changes to SKILL.md and reference files — no TypeScript code changes.

## Behavior

1. All skill files use `epics/<epic>/slices/<name>/` path convention
2. Skills that resolve slice scope derive the epic from `goodplan status --json` → `.activeEpic.name`
3. Scope resolution variables (`$SLICES_DIR`) point to `epics/<epic>/slices/`
4. `explore-logic.md` scope path mapping table updated
5. `cli-interaction.md` examples updated

## Verification

- [ ] `grep -r '\.project/slices/' skills/` — zero matches (all converted to epic-scoped paths)
- [ ] `grep -r '"slices/' skills/` — zero matches for flat state tree references
- [ ] Read each updated skill and verify path references are consistent

Install skills (`bun run install:skills`) and verify the installed copies at `~/.claude/skills/` reflect the new paths.

## Scope Boundaries

**In scope**: 11 skill files enumerated in architecture/affected-apis.md Skills section
**Out of scope**: TypeScript source changes (already done in slices 1-3), migration
