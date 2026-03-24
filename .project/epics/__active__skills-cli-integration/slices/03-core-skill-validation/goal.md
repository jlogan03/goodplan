# Core Skill Validation — create-epic & complete

## What We're Building

Migrate the two skills that exercise the broadest range of CLI interactions: `create-epic` (entity creation, exploration phases, architecture phases, state orientation) and `complete` (completion flows, learnings rollup, architecture deltas, deferred work routing, epic/slice/quest completion). These validate the convention doc against the most complex workflows before mechanical rollout.

## Behavior

### create-epic

1. Uses `goodplan --version --json` at startup for compatibility check
2. Uses `goodplan init --name <name> --json` for project initialization (Mode A)
3. Uses `goodplan epic:create --json` with stdin for epic creation
4. Uses `goodplan status --json` for state orientation
5. Uses `goodplan epic:show --epic <name> --json` to check epic state and artifacts
6. Uses `goodplan state --json --query` for deep context loading (decisions, learnings)
7. Writes free-form markdown (idea.md, goal.md) directly to filesystem paths from CLI responses
8. No direct reads of `.project/*.json`, `.project/*.jsonl`, or `state.md`
9. No direct writes to `activity-log.jsonl` or `state.md`

### complete

1. Uses `goodplan status --json` to determine active entity and phase
2. Uses `goodplan slice:show --slice <name> --json` (or quest/epic) to check entity state
3. Uses `goodplan state --json --query` for cross-scope context (learnings, decisions, architecture deltas)
4. Uses `goodplan slice:complete --slice <name> --json` with stdin payload (verificationPassed, deferred, learnings, architectureDelta)
5. Uses `goodplan epic:complete --epic <name> --json` with stdin payload (verificationResults)
6. Uses `goodplan learning:rollup --json` for learnings promotion
7. Uses CLI response `architecturePaths` to know where to write architecture updates
8. No direct reads/writes of entity JSON, activity-log, state.md, or learnings.jsonl

## Success Criteria

- [ ] `create-epic` skill source contains zero references to direct `.project/*.json` reads
- [ ] `create-epic` skill source contains zero references to `state.md` reads or writes
- [ ] `create-epic` skill source contains zero references to `activity-log.jsonl` appending
- [ ] `create-epic` skill uses `goodplan init` for project initialization
- [ ] `create-epic` skill uses `goodplan epic:create` for epic creation
- [ ] Running `/create-epic` on a fresh directory creates a valid project via CLI commands
- [ ] `complete` skill source contains zero references to direct `.project/*.json` reads
- [ ] `complete` skill source contains zero references to `state.md` or `activity-log.jsonl`
- [ ] `complete` skill uses `goodplan slice:complete` (or quest/epic variants) with correct stdin payloads
- [ ] Running `/complete` on a completed slice produces correct learnings rollup and architecture delta recording via CLI
- [ ] Convention doc updated with any patterns discovered during migration
- [ ] Both updated skills installed via `bun run install:skills`

## Verification

**Test state setup:** For steps 1-2, use an empty temporary directory. For steps 3-4, create a test project via `goodplan init --name test-project`, create an epic via `goodplan epic:create`, and advance through the full lifecycle (explore → architecture → refine-architecture → define-slices → create slice → plan → submit-plan → refine-plan → submit-refinement → implement → submit-implementation) to reach `implementation-complete` status. For step 4 (epic complete), ensure all slices in the epic have reached `completed` status.

> **Note:** If any intermediate CLI command fails during setup, a helper script or direct entity JSON construction is acceptable as a fallback for verification purposes.

1. **create-epic fresh project**: Run `/create-epic` in a new empty directory. Verify it calls `goodplan init`, creates the project, creates an epic via `goodplan epic:create`, and produces a valid `.project/` structure. Check `goodplan status --json` shows the new epic.

2. **create-epic existing project**: Run `/create-epic` in a project that already has `.project/`. Verify it detects the existing project and creates a new epic without re-initializing.

3. **complete slice**: Set up a test slice in `implementation-complete` status. Run `/complete`. Verify it calls `goodplan slice:complete` with the correct stdin payload, learnings are rolled up, and architecture paths are returned for LLM updates.

4. **complete epic**: Set up an epic with all slices completed. Run `/complete`. Verify it calls `goodplan epic:complete` with verification results.

5. **Grep check**: `grep -r 'state\.md\|activity-log\.jsonl\|\.project/.*\.json' skills/create-epic/ skills/complete/` returns no hits (excluding references to the convention doc or architecture files).

## Scope Boundaries

**In scope:**
- Full rewrite of `create-epic` SKILL.md and references to use CLI
- Full rewrite of `complete` SKILL.md and references to use CLI
- Convention doc updates for any gaps discovered
- Install updated skills

**Out of scope:**
- Other skill migrations (slices 04-05)

**Note on CLI changes:** CLI code changes are not expected but are in scope if validation reveals gaps. Track any CLI changes as convention doc updates.

**Note:** The convention doc's `start-complete` worked example may need replacement with `state --json --query` for context loading, or `start-complete` may need to be added as a CLI command if discovered as a gap during `complete` skill migration.

**Optional CLI polish from slice 02 follow-ups:**
- `PathReferences` type (`src/core/rpc/types.ts`) is `Record<string, string>` — consider discriminated union per-phase types (e.g., `PlanPaths`, `ExplorePaths`) if skill migration reveals consumers that need compile-time key guarantees. TODO comment already in place.
- `collectMdFiles` helper in `src/commands/global/status.ts` walks `DirectoryEntry.contents` — could migrate to `src/core/data/tree.ts` if `complete` or `create-epic` skills need similar tree-walking for artifact listing.
