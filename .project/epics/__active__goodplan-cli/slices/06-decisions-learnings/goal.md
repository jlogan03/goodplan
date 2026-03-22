# Decisions, Learnings & Full Status

## What We're Building
Cross-cutting features that span entity types: decision management (create/update with status lifecycle), the manual `learning:rollup` command (explicitly promote learnings from slice/quest level to epic/project level via ROLLUP_LEARNINGS event — distinct from learnings-at-completion which is handled automatically by the state machine during COMPLETE_SLICE/COMPLETE_QUEST in slices 04-05), the full `status` command (replaces the tracer bullet stub with tree-based artifact counting and recommendations), full `--query` support (arbitrary jq expressions on any JSON output, not just status), and the `schema` command for stdin shape discovery (exercises INV-006).

## Behavior
1. `goodplan decision:create` (with stdin JSON: id, domain, title, summary) creates a decision entry in decisions.jsonl. State machine validates and appends.
2. `goodplan decision:update` (with stdin JSON: id, changes) updates an existing decision — supports status transitions (active → revisiting → active, active → superseded).
3. `goodplan learning:rollup --from slices/01-auth --to project` is the manual/explicit rollup command — filters learnings with matching rollupTo targets and appends them to the target learnings.jsonl. This triggers the ROLLUP_LEARNINGS state event. Distinct from learnings-at-completion (slices 04-05) where the state machine automatically handles rollupTo during COMPLETE_SLICE/COMPLETE_QUEST.
4. `goodplan status --json` now shows full artifact counts (architecture files, research files, completed/total slices, decisions, learnings), active entity details with status/phase, and context-aware recommendations.
5. `goodplan status` human-readable: structured display with sections for active work, progress, artifacts, and recommendations.
6. `--query` works on any command that outputs JSON — applies jq expression to the output. Full error handling for invalid expressions, empty results, multiple results.

## Success Criteria
- [ ] `goodplan decision:create --json` with valid stdin — creates entry in decisions.jsonl
- [ ] `goodplan decision:update --json` — updates status, supersededBy fields
- [ ] Decision lifecycle: create (active) → update to revisiting → update back to active; create → update to superseded
- [ ] `goodplan learning:rollup --from slices/01-auth --to project --json` — filters and appends matching learnings
- [ ] `goodplan status --json` after full setup (project + epic + slice + decisions + learnings) — returns comprehensive StatusResult with all artifact counts populated
- [ ] `goodplan status` — human-readable output with sections, colors, recommendations
- [ ] `goodplan epic:list --json --query '.items[0].name'` — jq works on any command output
- [ ] `goodplan schema --json` — returns full command hierarchy
- [ ] `goodplan schema --command epic:create --json` — returns the expected stdin schema for the command (informational, helps LLM sub-agents)
- [ ] `goodplan schema --command slice:complete --json` — returns stdin schema with verificationPassed, deferred, learnings, architectureDelta fields
- [ ] `goodplan status --query '.project.name'` (without `--json`) returns `"test-project"` — `--query` auto-implies `--json` for the intermediate representation
- [ ] Binary: compile and test decision + learnings + status commands

## Verification
1. Initialize project, create epic, activate, create slices, walk one slice through lifecycle with learnings.
2. Create two decisions. Update one to superseded.
3. Roll up learnings from slice to project level. Verify project-level learnings.jsonl has the expected entries.
4. Run `goodplan status --json` — verify all artifact counts, active pointers, recommendations.
5. Run `goodplan status` — verify human-readable formatting.
6. Test `--query` on multiple commands: `epic:list --json --query '.items[0].name'`, `status --json --query '.project.name'`.
7. Test `schema` command: `goodplan schema --json` (full hierarchy), `goodplan schema --command epic:create --json`, `goodplan schema --command slice:complete --json`.
8. Compile and test against binary.

## Scope Boundaries
**In scope:** decision:create, decision:update, learning:rollup (manual/explicit rollup via ROLLUP_LEARNINGS event) commands and state machine transitions. Full status command (replacing tracer bullet stub — needs quest information from slice 05). Full --query on all JSON-outputting commands. `schema` command for stdin shape discovery (exercises INV-006, cross-cutting introspection).
**Out of scope:** Skills migration (slice 07), integration tests (slice 08). Epic completion command (handled within epic lifecycle transitions in slice 03). Learnings-at-completion (handled by state machine in slices 04-05).
