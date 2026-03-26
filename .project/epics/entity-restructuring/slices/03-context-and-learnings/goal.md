# Context and Learnings

## What We're Building

Update the context bundling layer to use nested slice paths. Remove direct `.project/learnings.md` writes from the `/complete` skill — `learnings.jsonl` via CLI is the sole structured source of truth.

## Behavior

1. `resolveScope()` returns `epics/<epic>/slices/<name>` for slices
2. `priorities.ts` string literals updated: `epics/overview.json`, `epics/${target.epic}/slices/${target.name}`, nested directory references
3. `learnings.ts` scope paths use nested format
4. `/complete` skill Step 5 no longer writes to `.project/learnings.md`
5. `/complete` skill Step 5 still includes learnings in the CLI `quest:complete`/`slice:complete` payload (learnings.jsonl rollup is unchanged)

## Verification

- [ ] `tsc --noEmit` — passes
- [ ] `bun test tests/unit/context/` — context tests pass with nested paths
- [ ] `grep "learnings.md" skills/complete/SKILL.md` — zero matches for direct write operations (read references for historical context are OK)
- [ ] `grep -r '"slices/' src/core/context/` — no flat slice path references remain

Run context unit tests. Verify the `/complete` skill SKILL.md no longer has instructions to write `.project/learnings.md`.

## Scope Boundaries

**In scope**: `src/core/context/`, `skills/complete/SKILL.md`, `skills/complete/references/guidance.md`, context unit tests
**Out of scope**: Other skill files (slice 4), migration (slice 5)
