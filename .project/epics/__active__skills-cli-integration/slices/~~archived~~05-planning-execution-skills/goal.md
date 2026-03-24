# Planning & Execution Skills Migration

## What We're Building

Migrate 6 skills that handle slice/quest planning and execution: `create-slices`, `refine-slices`, `create-plan`, `refine-plan`, `implement-plan`, and `migrate`. These exercise slice lifecycle transitions (BEGIN_PLAN, COMPLETE_PLAN, BEGIN_REFINEMENT, etc.), sub-agent content flows, and the orchestrator/sub-agent split pattern. This is mechanical rollout — patterns are well-established from slices 03-04.

## Behavior

### Common Pattern (all 6 skills)

1. Use `goodplan --version --json` for compatibility check
2. Use `goodplan status --json` for state orientation
3. Use CLI entity commands for state queries and mutations
4. Write free-form markdown to CLI-provided paths
5. No direct reads of `.project/*.json`, `.project/*.jsonl`, or `state.md`
6. No direct writes to `activity-log.jsonl` or `state.md`

### create-slices
- Uses `goodplan epic:define-slices --epic <name> --json` to begin
- Uses `goodplan slice:create --epic <name> --json` for each slice (stdin: name + goal)
- Uses `goodplan submit-slices --epic <name> --json` to complete
- Writes sequencing.md and goal.md to filesystem paths from CLI

### refine-slices
- Uses `goodplan epic:refine-slices --epic <name> --json` to begin
- Sub-agents use `goodplan start-refine-slices --epic <name> --inline` (always JSON)
- Uses `goodplan submit-refine-slices --epic <name> --json` with scores

### create-plan
- Uses `goodplan slice:plan --slice <name> --json` (or quest variant) to begin
- Sub-agents use `goodplan start-plan --slice <name> --inline` for context (always JSON)
- Uses `goodplan submit-plan --slice <name> --json` to complete (no content payload — sub-agent writes plan.md directly)

### refine-plan
- Uses `goodplan slice:refine-plan --slice <name> --json` to begin
- Sub-agents use `goodplan start-refinement --slice <name> --inline` (always JSON)
- Uses `goodplan submit-refinement --slice <name> --json` with scores payload

### implement-plan
- Uses `goodplan slice:implement --slice <name> --json` to begin
- Sub-agents use `goodplan start-implementation --slice <name> --inline` (always JSON)
- Uses `goodplan submit-implementation --slice <name> --json` to complete

### migrate
- Stub skill — zero-effort migration (minimal CLI interaction, placeholder for future `goodplan migrate` command). Excluded from active verification scope.

## Success Criteria

- [ ] All 6 skill sources contain zero direct reads of `.project/*.json` or `.project/*.jsonl`
- [ ] All 6 skill sources contain zero references to `state.md` or `activity-log.jsonl`
- [ ] `create-slices` uses `epic:define-slices`, `slice:create`, and `submit-slices`
- [ ] `create-plan` uses `slice:plan` and `submit-plan` (and quest variants)
- [ ] `refine-plan` uses `slice:refine-plan` and `submit-refinement` with scores
- [ ] `implement-plan` uses `slice:implement` and `submit-implementation`
- [ ] Sub-agent skills use `start-*` commands for context bundling
- [ ] All updated skills installed via `bun run install:skills`

## Verification

**Test state setup:** Create a test project via `goodplan init --name test-project`, create an epic via `goodplan epic:create`, and advance through phases using CLI commands to reach the required starting status for each verification step.

1. **create-slices**: On a test epic in `architecture-refined` status (setup: advance through explore, architecture, and refine-architecture phases), run `/create-slices`. Verify it calls `epic:define-slices`, creates slices via `slice:create`, and completes via `submit-slices`.

2. **refine-slices**: On a test epic in `slices-defined` status (setup: complete create-slices first), run `/refine-slices`. Verify sub-agents get context via `start-refine-slices --inline` (verify context bundle is relevant) and scores are submitted via `submit-refine-slices`.

3. **create-plan**: On a test slice in `created` status, run `/create-plan`. The skill should invoke `goodplan slice:plan` to begin planning, then sub-agents get context via `start-plan --inline` (verify context bundle is relevant), write plan.md, and `submit-plan` transitions to `plan-created`.

4. **refine-plan**: On a test slice in `plan-created` status, run `/refine-plan`. Verify reviewer sub-agents get context via `start-refinement --inline` (verify context bundle is relevant) and scores are submitted via `submit-refinement`.

5. **implement-plan**: On a test slice in `plan-refined` status, run `/implement-plan`. Verify sub-agent gets context via `start-implementation --inline` (verify context bundle is relevant) and completion calls `submit-implementation`.

6. **Grep check**: `grep -r 'state\.md\|activity-log\.jsonl\|\.project/.*\.json' skills/create-slices/ skills/refine-slices/ skills/create-plan/ skills/refine-plan/ skills/implement-plan/ skills/migrate/` returns no hits.

## Scope Boundaries

**In scope:**
- Rewrite of 6 skill SKILL.md files and their references
- Convention doc updates for discovered gaps
- Install updated skills

**Out of scope:**
- Dogfooding (slice 06)

**Note on CLI changes:** CLI code changes are not expected but are in scope if validation reveals gaps. Track any CLI changes as convention doc updates.

**Follow-up from slice 03:** The migrated `complete` skill's refactor intelligence step (`skills/complete/references/guidance.md` line 180) still uses `mkdir -p .project/side-quests/<name>/` to create side quest proposal directories directly. This should be replaced with `quest:create` CLI during this slice to maintain the "no direct mkdir in .project/" convention. The current pattern is a draft proposal workflow — the skill creates a `goal.md` and asks the user to approve before formalizing. Migrating to `quest:create` makes this consistent with how slices are created via `slice:create`.
