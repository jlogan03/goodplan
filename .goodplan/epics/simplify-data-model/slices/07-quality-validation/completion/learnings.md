# Learnings — 07-quality-validation

## 1. Test harness shortcuts mask real skill bugs

The E2E harness had multiple shortcuts that hid real issues: MAX_ITERATIONS capped at 1 (refinement essentially skipped), "Do not ask the user to confirm" bypassed all interactive phases, fallback CLI invocations papered over skill failures, and auto-abandoning unfinished slices before complete-epic prevented the guardrail from firing. Removing these revealed that start-epic uses direct file operations instead of CLI commands, and complete-epic only rolls up 1 of 7+ learnings.

## 2. Simulated users must have domain knowledge, not scripted answers

"When asked about X, say Y" patterns produce unrealistic test behavior — the LLM recites scripts instead of reasoning. Replacing these with domain knowledge ("You know the project has four modules...") produces natural responses that exercise the same code paths real users would hit. The simulated user should know the project, not have a cheat sheet.

## 3. Environment isolation requires explicit whitelist, not filtered spread

`...process.env` leaks installed plugin paths, CLAUDE_* vars, and other host state into test sessions. The minimum env for Agent SDK auth is PATH (filtered to remove `~/.claude/plugins/` entries), HOME, and USER — experimentally verified. TMPDIR, SHELL, TERM, and all CLAUDE_* vars are unnecessary and create pollution vectors.

## 4. Plugin bin/ directory is auto-added to PATH by Claude Code

Claude Code automatically adds `<plugin-root>/bin/` to PATH for all installed plugins. No SessionStart hook needed. A cross-platform launcher script at `bin/gp` can detect platform via `uname` and exec the correct binary, making skills platform-agnostic (bare `gp` instead of `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`).

## 5. ${CLAUDE_PLUGIN_DATA} does not resolve for local plugins in Agent SDK

For marketplace-installed plugins, `${CLAUDE_PLUGIN_DATA}` resolves to `~/.claude/plugins/data/{id}/`. For local plugins loaded via `plugins: [{ type: "local" }]`, it does NOT resolve — the literal string remains. Skills must guard against this with a literal-string check before writing expertise data.

## 6. Fixture biome config must match fixture file conventions

The fixture setup writes JSON with 2-space indentation but biome defaults to tabs. This caused all fixture files to fail lint — not because the LLM wrote bad code, but because the fixture itself was misconfigured. Biome config must set `indentStyle: "space"` and exclude `.goodplan/` and `dist/` from linting.

## 7. start-epic skill was never updated for the consolidation

start-epic still uses v1.0.3 patterns: `ls -d` for file-existence checks, `mv` for directory renaming, direct writes to `activity-log.jsonl`. These bypass the CLI's state model, causing `verifyEntityStatus` to fail because `gp epic:show` can't find the epic. This cascades to plan-slice failure. Must be fixed in slice 08 to use `gp epic:activate`.
