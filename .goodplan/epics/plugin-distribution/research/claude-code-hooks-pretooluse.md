# Claude Code Hooks — PreToolUse for State Protection

## Research Summary

Claude Code hooks are shell commands that fire at specific points during a session. A PreToolUse hook can intercept and block tool calls (Write, Edit, Bash, etc.) before they execute, making them the right mechanism for `.project/` state file protection.

---

## 1. Supported Hook Events

| Event | Matcher Support | Description |
|---|---|---|
| **PreToolUse** | Yes | Before a tool call executes; can block or modify |
| **PostToolUse** | Yes | After a tool call succeeds |
| **PostToolUseFailure** | Yes | After a tool call fails |
| **PermissionRequest** | Yes | When Claude requests user permission |
| **UserPromptSubmit** | No | When user submits a prompt |
| **SessionStart** | No | Session begins |
| **SessionEnd** | No | Session ends |
| **Stop** | No | Claude stops generating |
| **SubagentStart** | No | Subagent spawns |
| **SubagentStop** | No | Subagent finishes |
| **PreCompact** | No | Before context compaction |
| **Notification** | No | When a notification fires |
| **Setup** | No | First-time setup |
| **TeammateIdle** | No | Teammate goes idle |
| **TaskCompleted** | No | Task finishes |
| **ConfigChange** | No | Configuration changes |
| **WorktreeCreate** | No | Git worktree created |
| **WorktreeRemove** | No | Git worktree removed |
| **CwdChanged** | No | Working directory changes |

## 2. Hook Configuration Format

Hooks are configured as JSON in settings files. Three levels exist:

- **User-level:** `~/.claude/settings.json` — applies to all projects
- **Project-level:** `.claude/settings.json` — committed to repo, shared with team
- **Local project:** `.claude/settings.local.json` — gitignored, personal overrides

### Settings JSON Structure

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/script.sh"
          }
        ]
      }
    ]
  }
}
```

### Key Fields

- **`matcher`**: Regex string that filters which tool names trigger the hook. `"Edit|Write"` matches either tool. `"*"` or omitting matcher matches all tools.
- **`hooks`**: Array of hook commands to execute.
- **`type`**: Must be `"command"`.
- **`command`**: Shell command to run.

## 3. PreToolUse Hook Mechanics

### Input (stdin)

The hook receives JSON on stdin with the following structure:

```json
{
  "session_id": "abc123",
  "transcript_path": "/home/user/.claude/projects/.../transcript.jsonl",
  "cwd": "/home/user/my-project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/home/user/my-project/.project/project.json",
    "content": "..."
  }
}
```

For **Edit** tool, `tool_input` contains `file_path`, `old_string`, `new_string`.
For **Write** tool, `tool_input` contains `file_path`, `content`.
For **Bash** tool, `tool_input` contains `command`.

### Exit Code Behavior

| Exit Code | Effect | stdout | stderr |
|---|---|---|---|
| **0** | Allow — tool call proceeds | Parsed as JSON for optional modifications | Ignored |
| **2** | **Block** — tool call is cancelled | Ignored | Fed back to Claude as error message |
| Other | Non-blocking error — tool proceeds | Ignored | Shown in verbose mode only |

### Blocking a Tool Call

To block: exit with code 2 and write an explanation to stderr. Claude receives the stderr text as an error message, which it can present to the user or use to adjust its approach.

### Modifying Tool Input (v2.0.10+)

Exit 0 with JSON on stdout to modify the tool's input before execution:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "updatedInput": { "file_path": "/corrected/path", "content": "..." }
  }
}
```

### Providing Context (v2.1.9+)

Exit 0 with `additionalContext` in the JSON output to inject context into the conversation without blocking.

## 4. Shell Script Execution Model

Hooks are shell commands. They can be:

- Inline shell one-liners (e.g., a Python snippet)
- References to external scripts
- Any executable on PATH

The command runs in the project's working directory. stdin provides the JSON input. Multiple hooks for the same event run in parallel.

## 5. Pattern Matching for State Protection

The `matcher` field is a regex on `tool_name`. To match file paths, the hook script must parse the JSON input and inspect `tool_input.file_path`.

### Strategy for `.project/` State Protection

**Matcher:** `"Edit|Write"` — catches file modification tools.

**Script logic:** Parse stdin JSON, extract `file_path` from `tool_input`, check if it matches `.project/*.json` or `.project/*.jsonl`. If so, exit 2 with descriptive stderr.

**Bash tool:** Also needs a matcher for `"Bash"` to catch commands that could write to state files via `echo >`, `cp`, `mv`, `sed -i`, etc. This is harder to make comprehensive — the Bash matcher would need heuristic command parsing.

### Example Protection Script

```bash
#!/bin/bash
# protect-project-state.sh
# Blocks Write/Edit operations on .project/ state files

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# No file path means nothing to check
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Block writes to .project/ state files (JSON and JSONL)
if echo "$FILE_PATH" | grep -qE '\.project/[^/]*\.(json|jsonl)$'; then
  echo "BLOCKED: Direct modification of .project/ state files is not allowed. Use the goodplan CLI instead." >&2
  exit 2
fi

# Also block nested state files like epic.json, slice.json
if echo "$FILE_PATH" | grep -qE '\.project/.+\.(json|jsonl)$'; then
  echo "BLOCKED: Direct modification of .project/ state files is not allowed. Use the goodplan CLI instead." >&2
  exit 2
fi

exit 0
```

## 6. Plugin Hook Distribution

### Plugin Directory Structure

```
.claude-plugin/
  plugin.json          # Plugin metadata
hooks/
  hooks.json           # Plugin hook definitions
  protect-project-state.sh  # Hook scripts
skills/
  ...
commands/
  ...
```

### Plugin hooks/hooks.json Format

Plugin hooks use a wrapper format with an optional `description` field:

```json
{
  "description": "Protects .project/ state files from direct modification",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/protect-project-state.sh"
          }
        ]
      }
    ]
  }
}
```

The `${CLAUDE_PLUGIN_ROOT}` variable resolves to the plugin's installation directory at runtime.

### Discovery

Claude Code discovers plugin hooks from `hooks/hooks.json` in the plugin root. When a user installs a plugin, its hooks are automatically registered. Plugin hooks merge with user and project hooks.

### Precedence

Enterprise policy hooks > plugin hooks > project hooks > user hooks. All matching hooks fire (they don't override each other). A blocking hook from any source blocks the tool call.

## 7. User-Facing Error Messages

When a PreToolUse hook exits with code 2, the stderr text is fed back to Claude as the error message. Claude typically relays this to the user. Best practice: make stderr messages actionable.

Example stderr:
```
BLOCKED: Cannot directly modify .project/project.json.
Use the goodplan CLI instead: goodplan project:update
```

## 8. Performance Impact

- Hooks are shell commands, so they add subprocess overhead to every matched tool call.
- Multiple hooks for the same event run in **parallel**, reducing latency.
- A simple jq-based script adds ~50-100ms per tool call. For PreToolUse on Edit|Write, this is negligible since file I/O is already slower.
- Avoid expensive operations (network calls, large file reads) in hooks that fire frequently.
- Use specific `matcher` regexes to minimize unnecessary hook invocations. `"Edit|Write"` is much better than `"*"` for state protection.

## 9. Existing Examples

### From user's own settings.json

The user already has hooks configured for `UserPromptSubmit`, `Stop`, `PostToolUse`, `PostToolUseFailure`, and `PermissionRequest` — all running notification scripts via the Superset framework.

### Community Examples

- File protection hooks blocking `.env`, `package-lock.json`, `.git/` modifications
- Bash command validation hooks that parse and reject dangerous commands
- Code style enforcement hooks that run linters before allowing writes
- The `everything-claude-code` repo on GitHub has a comprehensive `hooks/hooks.json` example

---

## Design Recommendations for goodplan State Protection

1. **Hook placement:** Ship as plugin hook in `hooks/hooks.json` using `${CLAUDE_PLUGIN_ROOT}` paths. This auto-registers when users install the goodplan plugin.

2. **Matcher scope:** Use `"Edit|Write"` for the primary hook. Consider a separate `"Bash"` matcher with heuristic checking for redirect/pipe operations targeting `.project/` files, but accept this cannot be 100% comprehensive.

3. **Path matching:** Check both `*.json` and `*.jsonl` under `.project/`. Use the project's `cwd` from the hook input to resolve relative paths. Match recursively (nested `epic.json`, `slice.json`, etc.).

4. **Allowlist approach:** Consider allowing writes to specific subdirectories like `.project/epics/*/research/` and `.project/epics/*/refinement/` which contain human-authored content, not CLI-managed state.

5. **Error messages:** Make stderr actionable — tell Claude which CLI command to use instead.

6. **Testing:** Hook scripts can be tested standalone by piping JSON to stdin and checking exit codes.

---

## Sources

- [Hooks Reference — Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Automate Workflows with Hooks — Claude Code Docs](https://code.claude.com/docs/en/hooks-guide)
- [Plugins Reference — Claude Code Docs](https://code.claude.com/docs/en/plugins-reference)
- [Hook Development Skill — anthropics/claude-code](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md)
- [Plugins README — anthropics/claude-code](https://github.com/anthropics/claude-code/blob/main/plugins/README.md)
- [Claude Code Hooks Tutorial — Blake Crosley](https://blakecrosley.com/blog/claude-code-hooks-tutorial)
- [Claude Code Hooks Guide — SmartScope](https://smartscope.blog/en/generative-ai/claude/claude-code-hooks-guide/)
