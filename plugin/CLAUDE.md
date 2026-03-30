# goodplan Plugin

Use the `gp` CLI for all `.goodplan/` state mutations. Never manually edit `.goodplan/` state files (`.json`, `.jsonl`) — the CLI owns JSON/JSONL, the LLM owns markdown.

## CLI Usage

The `gp` binary is bundled with this plugin at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. Use this full path for all invocations — the binary is not installed on PATH.

- Always use `--json` for structured output when parsing results
- Pipe stdin for input commands (e.g., `echo '{"key":"value"}' | "${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp" command --json`)
- Use `"${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp" --help` to discover available commands
- Use `"${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp" status --json` to check current project state
