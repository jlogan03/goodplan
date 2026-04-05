# Sub-Agent Prompt File Loading

Researched: 2026-04-01 | Source: Agent SDK types, Claude Code docs, GitHub issues, web search

---

## Question

Can we define sub-agent prompts as files in the plugin directory and have Claude Code load them directly (bypassing the Read permission issue), similar to how SKILL.md content is loaded at invocation time?

## Answer: Yes, via the `agents/` directory -- but with caveats

Claude Code has **two** file-based mechanisms that load prompts automatically without requiring Read tool calls:

1. **Agent definition files** in `agents/` directories
2. **Skill files with `context: fork`** that become sub-agent prompts

Neither mechanism supports referencing an arbitrary external prompt file from within an agent or skill definition. The prompt must be the markdown body of the file itself.

---

## Mechanism 1: The `agents/` Directory (Primary Finding)

### How it works

Agent definition files are Markdown files with YAML frontmatter, stored in `agents/` directories. The **markdown body becomes the system prompt** -- loaded automatically by Claude Code at session start, no Read tool call needed.

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

### Where agent files are discovered (priority order)

| Location | Scope | Priority |
|---|---|---|
| `--agents` CLI flag (JSON) | Current session | 1 (highest) |
| `.claude/agents/` | Current project | 2 |
| `~/.claude/agents/` | All user projects | 3 |
| Plugin's `agents/` directory | Where plugin enabled | 4 (lowest) |

### Supported frontmatter fields

All fields from `AgentDefinition` in the SDK, plus file-only additions:

| Field | Description |
|---|---|
| `name` | Unique identifier (required) |
| `description` | When Claude should delegate (required) |
| `tools` | Allowed tools (inherits all if omitted) |
| `disallowedTools` | Tools to deny |
| `model` | Model alias or full ID |
| `maxTurns` | Max agentic turns |
| `skills` | Skills to preload into agent context |
| `memory` | Persistent memory scope: `user`, `project`, `local` |
| `background` | Run as background task |
| `effort` | Effort level override |
| `isolation` | `worktree` for git worktree isolation |
| `permissionMode` | Permission mode (NOT supported in plugins) |
| `hooks` | Lifecycle hooks (NOT supported in plugins) |
| `mcpServers` | MCP servers (NOT supported in plugins) |
| `initialPrompt` | Auto-submitted first turn (for `--agent` mode) |

### Plugin agent restrictions

For security, plugin-shipped agents do **not** support:
- `hooks`
- `mcpServers`
- `permissionMode`

These fields are silently ignored when loading agents from a plugin.

### `${CLAUDE_PLUGIN_ROOT}` substitution

Both `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are substituted inline in **agent content** (confirmed in docs). This means agent markdown bodies in plugins can reference plugin-bundled scripts and files.

### How agents are invoked

Claude delegates to agents automatically based on description match, or explicitly via:
- Natural language: "Use the code-reviewer agent..."
- @-mention: `@"code-reviewer (agent)" look at auth changes`
- Session-wide: `claude --agent code-reviewer`
- Programmatic: via the Agent/Task tool with `agent_type` parameter

---

## Mechanism 2: Skills with `context: fork` + `agent:`

### How it works

A skill with `context: fork` in its frontmatter runs in an isolated sub-agent context. The **SKILL.md content becomes the task prompt** for the sub-agent.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

### The `agent:` field

Specifies which sub-agent configuration to use for the forked context:
- Built-in: `Explore`, `Plan`, `general-purpose`
- Custom: any agent defined in `.claude/agents/` or plugin `agents/`
- Default: `general-purpose` if omitted

### Relationship between skills and agents

| Approach | System prompt | Task |
|---|---|---|
| Skill with `context: fork` | From agent type | SKILL.md content |
| Agent with `skills` field | Agent's markdown body | Claude's delegation message |

### Known bug: `context: fork` may not work

**GitHub issue [#16803](https://github.com/anthropics/claude-code/issues/16803)** (state: OPEN, labeled `bug`, `has repro`): `context: fork` in skill frontmatter doesn't work -- skill still runs inline. Issue [#17283](https://github.com/anthropics/claude-code/issues/17283) was closed as duplicate of this.

**Impact**: Until this bug is fixed, skills with `context: fork` may execute in the main conversation context rather than spawning a sub-agent. The docs describe the feature as working, but real-world behavior may differ.

---

## Mechanism 3: Agent SDK `AgentDefinition` (Programmatic)

### SDK type signature

```typescript
type AgentDefinition = {
    description: string;
    prompt: string;           // <-- inline string only
    tools?: string[];
    disallowedTools?: string[];
    model?: string;
    mcpServers?: AgentMcpServerSpec[];
    criticalSystemReminder_EXPERIMENTAL?: string;
    skills?: string[];
    maxTurns?: number;
};
```

The `prompt` field is `string` -- **no file path variant exists**. When using the SDK programmatically (via `agents` option in `query()`), prompts must be inline strings.

### The `skills` field on agents

The `skills` field injects **full skill content** into the agent's context at startup. This is the closest thing to "loading a prompt from a file" in the SDK:

```yaml
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
---
```

The skill content is injected, not just made available for invocation. Sub-agents don't inherit skills from the parent -- you must list them explicitly.

---

## What Does NOT Exist

1. **No `prompt_file` or `promptPath` field** on `AgentDefinition` -- confirmed by SDK type inspection
2. **No file path variant for the `prompt` field** -- it's `string` only, not `string | { file: string }`
3. **No `agents/` directory auto-loading from the Task/Agent tool** -- the Task tool accepts inline `prompt` text, not file references
4. **No way for a skill to reference an external prompt file** that gets auto-loaded -- supporting files require a Read tool call

---

## Implications for goodplan

### Current approach (skills with inline sub-agent prompts)

Our implement-plan and refine-plan skills construct sub-agent prompts by reading template files (`references/sub-agent-prompts.md`) via the Read tool and filling placeholders. This works but requires Read permissions and consumes orchestrator context.

### Could we use `agents/` directory files instead?

**Partially.** We could define reviewer agents, implementation agents, etc. as files in the plugin's `agents/` directory. Benefits:

| Benefit | Detail |
|---|---|
| Auto-loaded at session start | No Read tool call needed |
| `${CLAUDE_PLUGIN_ROOT}` substituted | Can reference plugin scripts |
| Discoverable by Claude | Delegates based on description |
| File-based prompts | Natural markdown editing |

**Limitations that block full adoption:**

| Limitation | Detail |
|---|---|
| No dynamic placeholders | Agent prompts are static -- can't fill `{plan_path}`, `{phase}`, `{iteration}` at spawn time |
| No per-invocation prompt customization | The Task tool passes a `prompt` (task description), but the agent's system prompt is fixed from the file |
| Plugin restrictions | No hooks, mcpServers, or permissionMode in plugin agents |
| Static system prompt | Can't inject review context, diff data, or phase-specific instructions into the system prompt |

### The `skills` field as a workaround

Define reference content as skills (e.g., `shared-preamble`, `maturity-legend`) and list them in the agent's `skills:` frontmatter. The full skill content is injected at startup without a Read call. However, this still doesn't solve dynamic per-invocation context.

### Recommended hybrid approach

1. **Use `agents/` files for static agent personas** -- the reviewer personality, expertise description, and general instructions that don't change per invocation
2. **Use the `skills:` field on agents** to preload reference content (shared preamble, maturity legend, coding conventions) without Read calls
3. **Pass dynamic context via the Task tool's `prompt` parameter** -- plan path, phase number, iteration count, diff data, merged feedback path
4. **The agent reads its own dynamic context** -- since agents have Read tool access, they can read the merged feedback file, plan file, etc. The orchestrator just passes the paths

This separates static persona (auto-loaded from file) from dynamic context (passed as task prompt + file paths).

---

## Sources

- [Create custom subagents -- Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Plugins reference -- Claude Code Docs](https://code.claude.com/docs/en/plugins-reference)
- [Extend Claude with skills -- Claude Code Docs](https://code.claude.com/docs/en/skills)
- [GitHub issue #16803: context: fork doesn't work](https://github.com/anthropics/claude-code/issues/16803)
- [GitHub issue #17283: Skill tool should honor context: fork](https://github.com/anthropics/claude-code/issues/17283)
- Agent SDK types: `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` (AgentDefinition type)
