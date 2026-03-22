# Decisions, Learnings & Full Status

## What We're Building
Cross-cutting features that span entity types: decision management (create/update with status lifecycle), learnings rollup (promote learnings from slice/quest level to epic/project level), the full `status` command (replaces the tracer bullet stub with tree-based artifact counting and recommendations), and full `--query` support (arbitrary jq expressions on any JSON output, not just status).

## Behavior
1. `goodplan decision:create` (with stdin JSON: id, domain, title, summary) creates a decision entry in decisions.jsonl. State machine validates and appends.
2. `goodplan decision:update` (with stdin JSON: id, changes) updates an existing decision — supports status transitions (active → revisiting → active, active → superseded).
3. `goodplan learning:rollup --from slices/01-auth --to project` filters learnings with matching rollupTo targets and appends them to the target learnings.jsonl.
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
- [ ] `goodplan schema --command epic:create --json` — returns the expected stdin schema for the command (informational, helps LLM sub-agents)
- [ ] Binary: compile and test decision + learnings + status commands

## Verification
1. Initialize project, create epic, activate, create slices, walk one slice through lifecycle with learnings.
2. Create two decisions. Update one to superseded.
3. Roll up learnings from slice to project level. Verify project-level learnings.jsonl has the expected entries.
4. Run `goodplan status --json` — verify all artifact counts, active pointers, recommendations.
5. Run `goodplan status` — verify human-readable formatting.
6. Test `--query` on multiple commands.
7. Compile and test against binary.

## Scope Boundaries
**In scope:** decision:create, decision:update, learning:rollup commands and state machine transitions. Full status command (replacing tracer bullet stub). Full --query on all JSON-outputting commands. schema command for stdin shape discovery.
**Out of scope:** Skills migration (slice 07), integration tests (slice 08). Epic completion command (handled within epic lifecycle transitions in slice 03).
