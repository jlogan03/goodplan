# Slice 08: Core Skills

## Goal

Rewrite the core Claude Code skills for v2: `workflow-guide` (always-on orientation), `status` (project state query), `init` (project bootstrap), `upgrade` (migration from pre-CLI state), and `task` (lightweight task capture). These skills establish the patterns that all subsequent skills (slices 09-11) will follow.

## In Scope

- `plugin/skills/workflow-guide/SKILL.md` -- rewrite for v2 event-sourced CLI commands
- `plugin/skills/status/SKILL.md` -- rewrite for v2 `gp status --json` output
- `plugin/skills/init/SKILL.md` -- rewrite for v2 `gp init` command
- `plugin/skills/upgrade/SKILL.md` -- rewrite for v2 `gp migrate` command
- `plugin/skills/task/SKILL.md` -- rewrite for v2 task capture
- Establish skill patterns: how skills call `gp` CLI commands, handle errors, present output

## Out of Scope

- Hook updates for `events.jsonl` and spine protection (moved to slice 01-event-engine)
- Epic creation skills (slice 09)
- Slice execution skills (slice 10)
- Supporting skills (slice 11)

## Dependencies

- Slice 05 (epic-lifecycle-commands) -- skills reference epic commands
- Slice 06 (slice-lifecycle-commands) -- skills reference slice commands
- Slice 07a (reviewer-registry-rubrics) -- skills reference reviewer/rubric commands
- Slice 07b (supporting-entity-commands) -- skills reference supporting commands

## Verification

1. `workflow-guide` skill provides correct orientation for v2 CLI commands
2. `status` skill calls `gp status --json` and presents output correctly
3. `init` skill calls `gp init` and bootstraps a project correctly
4. `upgrade` skill calls `gp migrate` and handles v1 detection
5. `task` skill captures lightweight tasks using v2 commands
6. All 5 skills follow consistent patterns for CLI invocation, error handling, and output

## Verification Tier

**Tier: Agent SDK harness tests**

Create `tools/dogfood/test-core-skills-v2.ts` exercising each skill through the Agent SDK harness. Pattern: `query()` with `permissionMode: "bypassPermissions"`, `plugins: [{ type: "local", path: PLUGIN_DIR }]`, `settingSources: []`, `env: createTestEnv(PLUGIN_DIR)`.

At minimum, cover:
- `/gp:init` skill initializes a project in a temp directory (existing `test-init.ts` pattern, adapted for v2 commands)
- `/gp:status` skill returns structured project state
- `workflow-guide` skill provides orientation text referencing v2 commands
- All skills invoke the local `gp` binary (not v1 state mutations) for state changes

## Estimated Sessions

1-2
