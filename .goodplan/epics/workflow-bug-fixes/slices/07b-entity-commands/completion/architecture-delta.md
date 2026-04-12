# Architecture Delta — 07b-entity-commands

## Alignment

The implementation aligns with the architecture overview in these areas:
- Commands follow the CLI Commands subsystem pattern (citty, `--json`, `output()`)
- Event append flow matches: validate -> build envelope -> invariant check -> append
- Derived State Computer extended via reducers (no new standalone compute modules)
- Dependency rules respected: commands import engine/schemas, engine only imports schemas/util

## Modifications

### Engine Layer — Derived State Computer

**Type: modify**

`DerivedStateData` extended with 3 new fields:
- `subsystems: Map<string, SubsystemState>` — project-scope subsystem registry
- `customInvariants: Map<string, CustomInvariantState>` — project-scope custom invariant registry
- `briefings: Briefing[]` — cross-scope briefing history

Reducers fleshed out:
- `reduceSpine` — handles subsystem-registered, subsystem-maturity-updated, subsystem-retired, invariant-proposed, invariant-activated, invariant-deactivated
- `reduceBriefing` — handles briefing-written
- `reduceEntityLifecycle` — handles finding-triaged (for epic-scoped findings)

### Command Layer — New entity namespaces

**Type: add**

6 new command namespaces with 19 commands total:
- `subsystem:register`, `subsystem:list`, `subsystem:show`, `subsystem:update-maturity`, `subsystem:retire`
- `project:show`, `project:set-steering`
- `briefing:write`, `briefing:latest`
- `finding:capture`, `finding:list`, `finding:triage`
- `invariant:propose`, `invariant:activate`, `invariant:deactivate`, `invariant:list`, `invariant:check`
- `events:query`, `events:tail`

### Shared Layer — New utilities

**Type: add**

- `src/commands/_shared/resolve-scope-path.ts` — scope-to-path resolution with exhaustive matching
- `createProjectCommandContext()` in `command-context.ts` — project-scope context factory

### Schemas — New event schemas

**Type: add**

- `src/schemas/events/subsystem.ts` — 3 event payload schemas
- `src/schemas/events/briefing.ts` — 1 event payload schema
- `src/schemas/events/finding.ts` — 1 event payload schema
- `src/schemas/events/invariant.ts` — 3 event payload schemas
- `src/schemas/events/project.ts` — 1 event payload schema (steering preference)
- `src/schemas/commands/` — 5 new command schema files

## Gaps

- `events:query --offset` pagination not yet implemented (documented as deferred)
- `main.ts` lazy-loading for namespace-based command discovery not yet implemented
- No project-scope `beforeAppend` invariant rules specific to subsystems/invariants (uses generic engine rules only)

## Emergent Patterns

- **Cross-scope derived state**: Briefings established the pattern of a single `DerivedStateData` field populated from multiple event log replays. This will likely be reused by other cross-scope entities.
- **Project-scope command context**: `createProjectCommandContext()` is a lighter-weight alternative to the epic-scoped version. Future project-scope commands should use this.
