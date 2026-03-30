# Next Commands

## What We're Building
Implement the `nextCommands` feature: a `commandMetadata` registry at the RPC layer that maps `(entityType, status)` pairs to available CLI commands, a `computeNextCommands()` function that derives available commands after each mutation, and Commands layer integration that includes `nextCommands` in every mutation response's JSON output.

## Behavior
1. `commandMetadata` registry at the RPC layer maps each `(entityType, status)` to an array of `{ template, description, userFacing }` entries
2. Registry is derived from the Commands API's command-to-event mapping — the state machine remains pure
3. `computeNextCommands(entityType, entityName, newStatus, parentEpic?)` returns `{ entity: CommandEntry[], other: CommandEntry[] }`
4. Entity section: commands for the entity just acted on (reads + mutations), filtered by `userFacing: true`, with `{name}` and `{epic}` interpolated
5. Other section: curated creation commands from other entity types (`gp epic:create`, `gp quest:create`, `gp task:create`)
6. Completed entities do not include sibling suggestions
7. Non-interpolated flags use angle-bracket placeholders: `--reason "<reason>"`
8. Commands layer calls `computeNextCommands()` after receiving the RPC mutation result, merges into JSON output
9. `nextCommands` only included in mutation responses with `--json` — not in read-only commands
10. `nextCommands` is an approximation — guards may prevent some listed commands

## Verification
- [ ] `echo '{"name":"test","goal":"..."}' | gp epic:create --json` — response includes `nextCommands.entity` with `gp epic:explore --epic test` and `gp epic:show --epic test`
- [ ] `echo '' | gp epic:explore --epic test --json` — response includes `nextCommands.entity` with `gp submit-explore --epic test`
- [ ] `nextCommands.other` includes `gp quest:create` and `gp task:create` (but not `gp epic:create` since we just acted on an epic)
- [ ] `gp epic:show --epic test --json` — response does NOT include `nextCommands` (read-only command)
- [ ] `gp status --json` — response does NOT include `nextCommands` (read-only command)
- [ ] Every command in the Commands API that triggers a state transition has a corresponding `commandMetadata` entry (fitness function)
- [ ] `bun run test` — all tests pass, new `computeNextCommands` tests pass

Create a temp project, run through a full lifecycle (`gp init` → `gp epic:create` → `gp epic:explore` → `gp submit-explore`), and verify each mutation response includes correct `nextCommands` with properly interpolated entity names. Verify read-only commands (`show`, `list`, `status`) do not include `nextCommands`. Check that `nextCommands.other` excludes the entity type just acted on.

## Scope Boundaries
**In scope:** `commandMetadata` registry, `computeNextCommands()`, Commands layer integration, fitness function for registry completeness
**Out of scope:** Guard evaluation in `nextCommands` (documented as approximation), plugin packaging, CI/CD
