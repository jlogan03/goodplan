# Exploration & Architecture Skills Migration

## What We're Building

Migrate 5 skills that handle epic lifecycle phases: `explore`, `create-architecture`, `refine-architecture`, `audit-architecture`, and `start-epic`. These exercise epic phase transitions (BEGIN_EXPLORE, COMPLETE_EXPLORE, BEGIN_ARCHITECTURE, etc.), sub-agent context bundling via `start-*`/`submit-*` commands, and state queries for architecture content. Patterns are established from slice 03.

## Behavior

### Common Pattern (all 5 skills)

1. Use `goodplan --version --json` for compatibility check (per convention doc)
2. Use `goodplan status --json` for state orientation
3. Use `goodplan epic:show --epic <name> --json` for entity state and artifacts
4. Use `goodplan state --json --query` for deep context (decisions, learnings, architecture content)
5. Write free-form markdown directly to filesystem paths from CLI responses
6. No direct reads of `.project/*.json`, `.project/*.jsonl`, or `state.md`
7. No direct writes to `activity-log.jsonl` or `state.md`

### explore
- Uses `goodplan epic:explore --epic <name> --json` to begin exploration
- Sub-agents use `goodplan start-explore --epic <name> --inline` for context (`start-*` commands always output JSON; `--json` flag is not needed)
- Uses `goodplan submit-explore --epic <name> --json` to complete

### create-architecture
- Uses `goodplan epic:define-architecture --epic <name> --json` to begin
- Uses `goodplan submit-architecture --epic <name> --json` to complete
- Writes architecture markdown to paths from CLI response

### refine-architecture
- Uses `goodplan epic:refine-architecture --epic <name> --json` to begin
- Sub-agents use `goodplan start-refine-architecture --epic <name> --inline` (always JSON)
- Uses `goodplan submit-refine-architecture --epic <name> --json` with scores

### audit-architecture
- Read-only: uses `goodplan status --json`, `show --json`, and `state --json --query`
- Does not trigger state transitions (audit is observational)

### start-epic
- Uses `goodplan epic:activate --epic <name> --json` for activation
- Uses `goodplan epic:show` to verify prerequisites (architecture, verifications)

## Success Criteria

- [ ] All 5 skill sources contain zero direct reads of `.project/*.json` or `.project/*.jsonl`
- [ ] All 5 skill sources contain zero references to `state.md` or `activity-log.jsonl`
- [ ] `explore` skill uses `epic:explore` and `submit-explore` CLI commands
- [ ] `create-architecture` skill uses `epic:define-architecture` and `submit-architecture`
- [ ] `refine-architecture` skill uses `epic:refine-architecture` and `submit-refine-architecture` with scores
- [ ] `audit-architecture` skill uses only read commands (no mutations)
- [ ] `start-epic` skill uses `epic:activate` for activation
- [ ] All updated skills installed via `bun run install:skills`
- [ ] Convention doc updated with any gaps discovered

## Verification

**Test state setup:** Create a test project via `goodplan init --name test-project` and `goodplan epic:create` to establish the required starting state. Advance the epic through phases as needed using CLI commands.

1. **explore**: On a test epic in `created` status (setup: `goodplan init`, `goodplan epic:create`), run `/explore`. Verify it calls `goodplan epic:explore`, sub-agents get context via `start-explore --inline` (verify context bundle contains relevant content), and completion calls `submit-explore`. Check epic transitions to `explored`.

2. **create-architecture**: On a test epic in `explored` status, run `/create-architecture`. Verify architecture markdown is written to CLI-provided paths and `submit-architecture` transitions to `architecture-defined`.

3. **refine-architecture**: On a test epic in `architecture-defined` status, run `/refine-architecture`. Verify sub-agents get context via `start-refine-architecture --inline` (verify context bundle is relevant) and scores are submitted via `submit-refine-architecture`.

4. **audit-architecture**: On a test epic in `activated` status, run `/audit-architecture`. Verify it uses only read commands (`status --json`, `show --json`, `state --json --query`) and triggers no state transitions.

5. **start-epic**: On a test epic with architecture and verifications defined, run `/start-epic`. Verify it calls `epic:activate` and the epic transitions to `activated`.

6. **Grep check**: `grep -r 'state\.md\|activity-log\.jsonl\|\.project/.*\.json' skills/explore/ skills/create-architecture/ skills/refine-architecture/ skills/audit-architecture/ skills/start-epic/` returns no hits.

## Scope Boundaries

**In scope:**
- Rewrite of 5 skill SKILL.md files and their references
- Convention doc updates for discovered gaps
- Install updated skills

**Out of scope:**
- Planning/execution skills (slice 05)

**Note on CLI changes:** CLI code changes are not expected but are in scope if validation reveals gaps. Track any CLI changes as convention doc updates.
