# Architecture Updates — 07-quality-validation

## Changes Made

1. **Plugin binary distribution**: Architecture now describes `bin/gp` launcher script for cross-platform binary dispatch. Previously documented as `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` (platform-specific).

2. **Test harness isolation model**: Architecture now describes the `createTestEnv()` whitelist pattern (PATH filtered, HOME, USER only) and `settingSources: []` + `plugins: [{ type: "local" }]` isolation. Previously undocumented.

3. **Expertise tracking storage**: Moved from `~/.claude/CLAUDE.md` to `${CLAUDE_PLUGIN_DATA}/expertise.md`. Architecture files updated to reflect plugin-scoped storage with guard pattern for unresolved variables.

## Changes Declined

None.

## Flagged as Tech Debt

1. **start-epic skill uses direct file operations** — needs full rewrite to use CLI commands (task captured: `start-epic-uses-direct-file-ops`)
2. **complete-epic learnings rollup incomplete** — orchestrator only submits 1 of 7+ learnings (task captured: `complete-epic-learnings-rollup`)
3. **Stale skill name references in shared docs** — `status-logic.md`, `output-templates.md`, `iteration-loop.md` reference old 19-skill names (scoped for slice 08)
