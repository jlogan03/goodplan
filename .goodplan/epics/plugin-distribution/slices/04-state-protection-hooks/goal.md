# State Protection Hooks

## What We're Building
Implement two PreToolUse hook scripts that ship with the plugin: `protect-state.sh` blocks Write/Edit on `.goodplan/` state files (JSON/JSONL), and `warn-bash-state.sh` warns when Bash commands reference `.goodplan/`. Hook configuration in `hooks.json` uses Claude Code's three-level nested format. Scripts use `python3` for JSON parsing (no `jq` dependency).

## Behavior
1. `protect-state.sh` receives JSON on stdin with `tool_name`, `tool_input.file_path`, and `cwd`
2. If `file_path` matches `$CWD/.goodplan/**/*.json` or `$CWD/.goodplan/**/*.jsonl` → exit 2, stderr message: "Blocked: direct write to .goodplan/ state file. Use the gp CLI instead."
3. If `file_path` does not match (e.g., `.goodplan/brainstorm/foo.md`) → exit 0 (allow)
4. `warn-bash-state.sh` receives JSON on stdin with `tool_name`, `tool_input.command`, and `cwd`
5. If `.goodplan-dev` sentinel file exists in `$CWD` → exit 0 (skip warning in dev repo)
6. If command contains `.goodplan/` → exit 0, stderr advisory: "⚠ This command references .goodplan/ files..."
7. If command does not contain `.goodplan/` → exit 0
8. `hooks.json` uses three-level nested format: `PreToolUse` → matcher groups (`Edit|Write`, `Bash`) → handler arrays with `type: "command"`
9. `build:plugin` copies scripts from `plugin-hooks/` to `dist/gp-plugin/hooks/`

## Verification
- [ ] `protect-state.sh` with stdin `{"tool_name":"Write","tool_input":{"file_path":"/tmp/test/.goodplan/goodplan.json"},"cwd":"/tmp/test"}` — exits 2 with blocking message on stderr
- [ ] `protect-state.sh` with stdin `{"tool_name":"Write","tool_input":{"file_path":"/tmp/test/.goodplan/brainstorm/foo.md"},"cwd":"/tmp/test"}` — exits 0 (markdown allowed)
- [ ] `protect-state.sh` with stdin `{"tool_name":"Edit","tool_input":{"file_path":"/tmp/test/.goodplan/epics/foo/epic.json"},"cwd":"/tmp/test"}` — exits 2 (nested JSON blocked)
- [ ] `warn-bash-state.sh` with stdin `{"tool_name":"Bash","tool_input":{"command":"cat .goodplan/goodplan.json"},"cwd":"/tmp/test"}` — exits 0 with warning on stderr
- [ ] `warn-bash-state.sh` with stdin `{"tool_name":"Bash","tool_input":{"command":"ls src/"},"cwd":"/tmp/test"}` — exits 0 with no stderr
- [ ] `warn-bash-state.sh` with `.goodplan-dev` sentinel in cwd — exits 0 with no stderr even when command references `.goodplan/`
- [ ] `bun run build:plugin` copies hooks to `dist/gp-plugin/hooks/` and `hooks.json` is valid JSON
- [ ] `claude plugin validate dist/gp-plugin/` passes with hooks configured

Test each hook script by piping synthetic JSON stdin and checking exit codes and stderr output. Test the `.goodplan-dev` sentinel bypass. Run `build:plugin` and verify the hooks are properly copied and `hooks.json` is valid. If possible, start Claude Code with `claude --plugin-dir dist/gp-plugin` and attempt a Write to a `.goodplan/*.json` file — confirm it's blocked.

## Scope Boundaries
**In scope:** `protect-state.sh`, `warn-bash-state.sh`, `hooks.json`, `plugin-hooks/` directory in repo, `build:plugin` hook copying step, `.goodplan-dev` sentinel convention
**Out of scope:** HMAC signatures (slice 3 — already done), CI/CD (slice 7), skill packaging (slice 6)
