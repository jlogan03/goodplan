# SendMessage Availability

Researched: 2026-04-01 | Source: web search, Claude Code docs

---

## Key Finding

SendMessage requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` flag. Not available by default.

## Details

| Tool | Purpose | Available when |
|---|---|---|
| `SendMessage` | Message teammates or resume subagents | Agent teams enabled (experimental flag) |
| `SendUserMessage` | Agent surfaces output to user | `--brief` flag (internal/SDK use) |
| `--continue` / `--resume` | Resume a prior CLI session | Always (CLI only, resumes main session) |

## Decision

Use continuation files instead of SendMessage for sub-agent context preservation. Sub-agent writes its working state to a file before yielding; the orchestrator re-spawns with the continuation file path. No experimental flags required.
