# Agent SDK Research: Test Harness Design

Package: `@anthropic-ai/claude-agent-sdk` v0.2.81
Source: SDK type definitions (`sdk.d.ts`) + official docs (platform.claude.com)

---

## 1. How query() handles skills (Skill tool)

**Skills are NOT automatic.** Two things are required:

1. **`settingSources`** must include `"project"` (and/or `"user"`) to load skills from the filesystem (`.claude/skills/` under cwd or `~/.claude/skills/`).
2. **`"Skill"` must be in `allowedTools`** (or tools must not be restricted) so the model can invoke it.

```typescript
const q = query({
  prompt: "...",
  options: {
    settingSources: ["user", "project"],  // REQUIRED to discover skills
    allowedTools: ["Skill", "Read", "Bash", ...],
  }
});
```

Without `settingSources`, skills silently fail to load -- the `Skill` tool exists but has no skills to invoke. The SDK spawns a CLI subprocess that loads settings from disk; `settingSources` controls which disk paths it reads.

**Verification:** The `SDKSystemMessage` (type `system`, subtype `init`) includes a `skills: string[]` field listing discovered skills. Check this to confirm skills loaded.

```typescript
for await (const msg of q) {
  if (msg.type === "system" && msg.subtype === "init") {
    console.log("Skills loaded:", msg.skills);
  }
}
```

**How the Skill tool works at runtime:** When the model calls the `Skill` tool, it injects the skill's markdown content into the conversation context as a system-reminder. This is handled entirely within the CLI subprocess -- no SDK-side intervention needed. The skill invocation appears as a normal `tool_use` block in `SDKAssistantMessage.message.content`.

---

## 2. How to handle AskUserQuestion

**AskUserQuestion is a regular tool, intercepted via `canUseTool`.** It is NOT an MCP elicitation and NOT a special SDK event.

### Approach A: `canUseTool` callback (recommended for test harness)

```typescript
const q = query({
  prompt: "...",
  options: {
    canUseTool: async (toolName, input) => {
      if (toolName === "AskUserQuestion") {
        // Auto-respond to all questions
        const answers: Record<string, string> = {};
        for (const question of (input as any).questions) {
          answers[question.question] = "Proceed with defaults";
        }
        return {
          behavior: "allow",
          updatedInput: { questions: (input as any).questions, answers }
        };
      }
      return { behavior: "allow", updatedInput: input };
    }
  }
});
```

Key details:
- `canUseTool` receives `(toolName, input, options)` where `options` includes `signal`, `toolUseID`, `agentID` (if subagent), etc.
- Return `{ behavior: "allow", updatedInput: { questions, answers } }` to provide answers.
- Return `{ behavior: "deny" }` to block the question entirely.
- The `input.questions` array has: `header`, `question`, `options[]` (each with `label`, `description`), `multiSelect`.

### Approach B: System prompt append

```typescript
systemPrompt: {
  type: "preset",
  preset: "claude_code",
  append: "NEVER use AskUserQuestion. Make all decisions autonomously."
}
```

This works but is unreliable -- the model may still try to ask. Best used as a belt-and-suspenders alongside `canUseTool`.

### Approach C: `disallowedTools`

```typescript
disallowedTools: ["AskUserQuestion"]
```

Completely removes the tool from the model's context. Use when you never want questions asked.

### MCP Elicitation (separate concern)

`onElicitation` callback and `Elicitation` hook are for MCP server auth flows (form fields, URL-based auth), NOT for AskUserQuestion. Only relevant if MCP servers are configured.

---

## 3. Message types through the stream

`Query` extends `AsyncGenerator<SDKMessage, void>`. The `SDKMessage` union includes:

| Type field | Subtype | What it is |
|---|---|---|
| `assistant` | -- | Model response. `message.content` has `text` and `tool_use` blocks (from Anthropic API `BetaMessage`). `parent_tool_use_id` is set when inside a subagent. |
| `result` | `success` | Turn complete. Has `result` (text), `total_cost_usd`, `num_turns`, `usage`, `structured_output`, `permission_denials`. |
| `result` | `error_*` | Turn failed. Subtypes: `error_during_execution`, `error_max_turns`, `error_max_budget_usd`, `error_max_structured_output_retries`. Has `errors[]`. |
| `system` | `init` | Session started. Has `tools[]`, `skills[]`, `model`, `permissionMode`, `mcp_servers[]`, `slash_commands[]`. |
| `system` | `status` | Status updates (e.g., "thinking"). |
| `system` | `task_started` | Subagent (Task tool) started. Has `task_id`, `description`, `task_type`, `prompt`. |
| `system` | `task_progress` | Subagent progress. Has `task_id`, `last_tool_name`, `summary`, `usage`. |
| `system` | `task_notification` | Subagent completed/failed/stopped. Has `task_id`, `status`, `summary`, `output_file`. |
| `system` | `api_retry` | API retry happening. Has `attempt`, `retry_delay_ms`, `error_status`. |
| `system` | `compact_boundary` | Context compaction occurred. |
| `system` | `elicitation_complete` | MCP elicitation finished. |
| `system` | `files_persisted` | File checkpoints written. |
| `stream_event` | -- | Partial streaming (only if `includePartialMessages: true`). Wraps `BetaRawMessageStreamEvent`. |
| `tool_progress` | -- | Long-running tool updates. Has `tool_use_id`, `tool_name`, `elapsed_time_seconds`. |
| `tool_use_summary` | -- | Collapsed tool use summary. Has `summary`, `preceding_tool_use_ids[]`. |
| `user` | -- | Echo of user messages. |
| `prompt_suggestion` | -- | Suggested next prompt (if `promptSuggestions: true`). |
| `rate_limit_event` | -- | Rate limit info changes. |
| `auth_status` | -- | Auth status changes. |

### Checking `"result" in message`

```typescript
if ("result" in message) {
  // This matches SDKResultSuccess (has .result string field)
  // BUT also matches SDKResultError (no .result field, has .errors[])
  // Better: check message.type === "result"
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result); // final text output
  }
}
```

**Important:** `"result" in message` is truthy for `SDKResultSuccess` (which has a `result: string` property) but NOT for `SDKResultError` (which lacks `result`). So the `"result" in message` idiom effectively filters to successful results only -- but it's fragile. Prefer `message.type === "result"`.

### Are tool_use events visible?

Yes. `SDKAssistantMessage` (type `assistant`) wraps the full Anthropic `BetaMessage`, which includes `content` blocks of type `tool_use` with `name`, `input`, and `id`. You see every tool call the model makes.

```typescript
if (msg.type === "assistant") {
  for (const block of msg.message.content) {
    if (block.type === "tool_use") {
      console.log(`Tool: ${block.name}`, block.input);
    }
  }
}
```

---

## 4. Does `settingSources: ["project"]` load `.claude/skills/`?

**Yes.** `settingSources: ["project"]` loads from the project directory (cwd):
- `.claude/settings.json` -- project settings (permissions, etc.)
- `CLAUDE.md` -- project instructions
- `.claude/skills/` -- project-level skills

To also load user-level skills from `~/.claude/skills/`, include `"user"`:
```typescript
settingSources: ["user", "project"]
```

The `SettingSource` type is: `'user' | 'project' | 'local'`.

- `"user"` -- `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, `~/.claude/skills/`
- `"project"` -- `<cwd>/.claude/settings.json`, `<cwd>/CLAUDE.md`, `<cwd>/.claude/skills/`
- `"local"` -- `<cwd>/.claude/settings.local.json`

**When omitted or empty, no filesystem settings are loaded (SDK isolation mode).** This means no CLAUDE.md, no skills, no settings files.

---

## 5. Gotchas with `bypassPermissions` + skills that spawn sub-agents

### Critical: subagents inherit bypassPermissions

From the official docs:

> **Subagent inheritance:** When using `bypassPermissions`, all subagents inherit this mode and it cannot be overridden. Subagents may have different system prompts and less constrained behavior than your main agent. Enabling `bypassPermissions` grants them full, autonomous system access without any approval prompts.

This means:
- Skills that use the `Agent` tool (Task/TaskCreate) spawn subagents that **also bypass all permissions**.
- Subagents can run arbitrary bash commands, edit any file, etc. without any check.
- There is no way to selectively restrict subagent permissions while the parent has `bypassPermissions`.

### Alternative: use `allowedTools` + `permissionMode: "dontAsk"`

For a test harness, consider:
```typescript
{
  permissionMode: "dontAsk",
  allowedTools: ["Skill", "Read", "Grep", "Glob", "Bash", "Edit", "Write", "Agent"],
  settings: {
    permissions: {
      allow: ["Bash(*)", "Read(*)", "Edit(*)", "Write(*)", "Glob(*)", "Grep(*)"]
    }
  }
}
```

`dontAsk` denies anything not pre-approved, without prompting. This avoids the "full bypass" danger while still being non-interactive.

**However:** for a test harness where we control the cwd and just want things to work, `bypassPermissions` is pragmatically fine -- just be aware of the blast radius.

### Other gotchas

1. **`allowDangerouslySkipPermissions: true` is required** alongside `permissionMode: "bypassPermissions"`. Without it, the SDK throws.

2. **Subagent messages have `parent_tool_use_id` set.** Use this to distinguish main-thread vs subagent messages in the stream.

3. **`maxTurns` applies to the main thread only.** Subagents have their own turn limits (configurable via `AgentDefinition.maxTurns`). A runaway subagent won't be stopped by the parent's `maxTurns`.

4. **`maxBudgetUsd` applies globally.** This IS a safety net for runaway subagents.

5. **Skills can define their own agents.** The `AgentDefinition` type has a `skills?: string[]` field for preloading skills into subagent context. Skills loaded at the project level are available to subagents.

---

## Summary: Recommended test harness configuration

```typescript
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";

const q = query({
  prompt: "Run /create-plan for ...",
  options: {
    cwd: "/path/to/test/project",
    settingSources: ["project"],          // Load .claude/skills/ + CLAUDE.md
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    maxTurns: 50,
    maxBudgetUsd: 5.0,                    // Safety net
    persistSession: false,                // Don't pollute disk
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: "When using skills that ask questions, make reasonable default choices autonomously."
    },
    disallowedTools: ["AskUserQuestion"], // Or handle via canUseTool
  }
});

for await (const msg of q) {
  // init message: verify skills loaded
  if (msg.type === "system" && msg.subtype === "init") {
    console.log("Skills:", msg.skills);
    console.log("Tools:", msg.tools);
  }
  // tool use visibility
  if (msg.type === "assistant") {
    for (const block of msg.message.content) {
      if (block.type === "tool_use") {
        console.log(`[tool] ${block.name}`);
      }
    }
  }
  // subagent lifecycle
  if (msg.type === "system" && msg.subtype === "task_started") {
    console.log(`[subagent] started: ${msg.description}`);
  }
  if (msg.type === "system" && msg.subtype === "task_notification") {
    console.log(`[subagent] ${msg.status}: ${msg.summary}`);
  }
  // final result
  if (msg.type === "result") {
    if (msg.subtype === "success") {
      console.log("Success:", msg.result);
    } else {
      console.log("Error:", msg.subtype, msg.errors);
    }
    console.log(`Cost: $${msg.total_cost_usd}, Turns: ${msg.num_turns}`);
  }
}
```
