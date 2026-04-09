# Slice 07b: Supporting Entity Commands

## Goal

Implement all remaining CLI commands for supporting entities: side-quests, findings, briefings, decisions, learnings, events, subsystems, invariants, and project-level commands.

## In Scope

- `src/commands/side-quest/` -- `side-quest:create`, `start`, `implement-start`, `land`, `abandon`, `list`, `show`
- `src/commands/finding/` -- `finding:capture`, `triage`, `list`, `show`
- `src/commands/briefing/` -- `briefing:generate`, `list`, `show`
- `src/commands/subsystem/` -- `subsystem:register`, `update-maturity`, `retire`, `list`, `show`
- `src/commands/invariant/` -- `invariant:list`, `show`, `enable`, `disable`, `propose`, `activate`, `deactivate`, `check`
- `src/commands/decision/` -- `decision:record`, `supersede`, `list`, `show`
- `src/commands/learning/` -- `learning:capture`, `promote`, `list`, `show`
- `src/commands/events/` -- `events:list`, `show`, `tail`
- `src/commands/project/` -- `project:show`, `project:set-steering`
- Integration tests in `tests/commands/`

## Out of Scope

- Reviewer/rubric commands and registry (slice 07a -- already done)
- Skills (slices 08-11)
- Migration (slice 12)
- Modifying epic or slice commands (slices 05-06)

## Dependencies

- Slice 01-04 (engine + trust foundation) -- event log, invariants, derived state, refinement loop
- Slice 07a (reviewer-registry-rubrics) -- some entity commands reference reviewers/rubrics

## Verification

1. `gp side-quest:create` through `side-quest:land` works end-to-end with proper invariant enforcement
2. `gp finding:capture` creates a finding, `gp finding:triage` assigns disposition, `gp finding:list` and `show` display correctly
3. `gp briefing:generate` produces a briefing from events, `gp briefing:list` and `show` display correctly
4. `gp subsystem:register` through `subsystem:retire` exercises full lifecycle
5. `gp invariant:propose` through `invariant:check` exercises custom invariant lifecycle
6. `gp decision:record` and `gp decision:supersede` work with correct event emission
7. `gp learning:capture` and `gp learning:promote` work with correct event emission
8. `gp events:tail` streams recent events correctly
9. `gp project:show` displays project state, `gp project:set-steering` updates steering config
10. All invariants enforced (e.g., can't land a side-quest that hasn't started, can't supersede a non-existent decision)

## Estimated Sessions

2-3
