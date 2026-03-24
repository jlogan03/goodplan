# Codebase Context — Slice 03: Core Skill Validation

## Fresh Documentation

- `skills/create-epic/SKILL.md` (280 lines) — current create-epic with direct .project/ access
- `skills/create-epic/references/templates.md` — idea.md and CLAUDE.md templates
- `skills/complete/SKILL.md` (342 lines) — current complete with multi-step learnings/architecture flow
- `skills/complete/references/guidance.md` (286 lines) — detailed guidance on scope resolution, artifact loading, learnings, architecture updates
- `skills/_shared/references/cli-interaction.md` (563 lines) — shared CLI interaction conventions
- `.project/epics/__active__skills-cli-integration/architecture/cli-interaction-conventions.md` (402 lines) — authoritative epic-specific CLI conventions (newer)
- `.project/epics/__active__skills-cli-integration/architecture/commands-api.md` (150 lines) — complete command inventory
- `.project/epics/__active__skills-cli-integration/architecture/cli-changes.md` — CLI enhancements enabling skill migration
- `.project/architecture/_overview.md` — system architecture (4-layer stack)

## Current Skill Direct Access Patterns

### create-epic (280 lines)
- `mkdir -p .project/{...}` — manual directory tree creation
- `.gitignore` manipulation for `.project/state.md`
- Loads `state-and-activity-formats.md` for state.md format
- Manual `activity-log.jsonl` appending
- Manual `state.md` writes (4-section format)
- `ls -la .project/` for project existence detection
- Mode A/B detection via directory presence

### complete (342 + 286 lines)
- `state.md` reads for active slice detection
- Filesystem scanning for auto-detect of incomplete scopes
- `activity-log.jsonl` reads for signal tracking (last 3 completed scopes)
- Manual `state.md` updates with 6 graceful stop cases
- Manual `activity-log.jsonl` appends
- Direct `decisions/` directory writes
- Direct `learnings.md` editing
- Architecture file direct edits

## CLI Surface Available

**Entity commands:** epic:create/show/list/complete/abandon, slice:create/show/list/complete/abandon, quest equivalents, decision:create/update, learning:rollup
**Global:** init, status (with file arrays from slice 02), state (with --query jq filtering from slice 01), schema, --version --json
**Mutation responses** include `paths` Record<string, string> for LLM markdown writes

## Churn Assessment
- CLI commands: stable (slice 01-02 enrichments landed)
- Skills: NOT YET MIGRATED (this slice does it)
- Convention doc: active development (epic-specific version is authoritative)

## Key Conflicts / Gaps
1. **Graceful stop**: Current complete writes partial state.md; target says "graceful stops produce no state record" — plan handles this via filesystem artifact re-entry detection
2. **Auto-detect filtering**: No `slice:list --filter-by-status` — may need filesystem scanning or `state --json --query` workaround
3. **Filesystem-backed accumulation**: Pattern not yet documented in convention doc — Phase 3 will add it
