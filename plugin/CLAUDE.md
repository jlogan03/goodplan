# goodplan Plugin

Use the `gp` CLI for all `.goodplan/` state mutations. Never manually edit `.goodplan/` state files (`.json`, `.jsonl`) — the CLI owns JSON/JSONL, the LLM owns markdown.

## CLI Usage

- Always use `--json` for structured output when parsing results
- Pipe stdin for input commands (e.g., `echo '{"key":"value"}' | gp command --json`)
- Use `gp --help` to discover available commands
- Use `gp status --json` to check current project state
