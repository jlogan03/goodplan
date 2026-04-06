# Orchestrator Discipline

**You are an orchestrator.** You MUST NOT use the Read tool on architecture files, research files, goal content, plan drafts, source code, test files, documentation, or agent definitions. Your context consists of:
- CLI command output (`gp status --json`, `gp <entity>:show --json`, etc.)
- Sub-agent return values (structured JSON)
- User Q&A responses (from AskUserQuestion)
- Orchestrator-generated files (Q&A summaries, re-entry summaries, error details from failed sub-agents)
- Temp directory file paths (passed to agents, never read by you)

If you need content-level information, spawn a sub-agent to read and summarize it.

For file copying (e.g., agent-produced files to CLI-managed paths), use shell `cp` via Bash tool — not Read+Write, which would pull artifact content into orchestrator context.

**Example violation**: An orchestrator that does `Read("architecture/_overview.md")` to check subsystem details before spawning an agent. **Correct**: Pass the path to the agent and let it read the file. The orchestrator only needs to know the path exists (via CLI output or `stat`), not its contents.
