# Sub-Agent Tool Access & Scale

Researched: 2026-04-01 | Source: codebase analysis, web search

---

## 1. Agent Tool Capabilities in goodplan

### How skills spawn sub-agents

Both `implement-plan` and `refine-plan` use the built-in **Task/Agent tool** to spawn sub-agents. The orchestrator (main skill) fills in prompt templates with `{placeholders}` and spawns agents with `model: "opus"` (or `model: "sonnet"` for cost reduction when scores are high).

**implement-plan** spawns these sub-agent types per phase:
- Implementation sub-agent (pure coding, verification, lint/build/test)
- Generalist review sub-agent (code review)
- Domain specialist reviewers (3-5 in parallel, e.g., Software Architecture, TypeScript, TUI/CLI)
- Synthesis sub-agent (merges reviewer outputs into merged.md)
- Research sub-agents (one per topic, parallel, when RESEARCH_NEEDED)
- Codebase context discovery sub-agent (one, pre-implementation)

**refine-plan** spawns:
- Holistic + Software Architecture reviewers (always)
- Domain specialist reviewers (conditional)
- Synthesis sub-agent
- Plan editor sub-agent
- Research sub-agents

### Tool access

Sub-agents **inherit all tools from the parent conversation by default**, including:
- **Bash** (terminal commands, git, builds, tests)
- **Read, Write, Edit** (filesystem operations)
- **Grep, Glob** (code search)
- **WebSearch** (external documentation lookup)
- **MCP tools** (Context7, browser tools, etc.)

Tools can be restricted via `tools` (allowlist) or `disallowedTools` (denylist) in the agent configuration. The goodplan skills do not restrict tools — sub-agents get full access because implementation agents need Bash for builds/tests, reviewers need Read/Grep for code analysis, and research agents need WebSearch/Context7.

### Nested delegation

**Sub-agents CANNOT spawn other sub-agents.** This is a hard architectural constraint in Claude Code. The implement-plan SKILL.md explicitly states: "Sub-agents cannot spawn other sub-agents."

All orchestration must happen from the top-level skill. This means a create-epic skill must be a single orchestrator that manages all phases and all sub-agent spawns directly.

## 2. Scale Validation — Observed Sub-Agent Counts

Analysis of implementation artifacts from the plugin-distribution epic:

| Slice | Phases | Iterations | Review files | Est. sub-agent spawns |
|---|---|---|---|---|
| 01-rename-gp | 2 | 3 | 9 | ~15 (impl + reviewers + synthesis per iteration) |
| 03-hmac-signatures | 4 | 6 | 18 | ~30 |
| 04-state-protection-hooks | 2 | 4 | 13 | ~22 |
| 05-next-commands | 2 | 4 | 6 | ~16 |

**Per iteration**, implement-plan spawns approximately:
- 1 implementation agent
- 3-4 reviewer agents (parallel)
- 1 synthesis agent
- Total: **5-6 sub-agents per iteration**

A typical 4-phase slice with 1-2 iterations per phase spawns **20-30 sub-agents** across the entire run. This already works reliably in production.

## 3. Known Limitations

### No hard maximum on sub-agents per session

No documented maximum number of sub-agents per session. The practical limit is context window consumption and rate limits.

### Parallel agent cap

Up to **7 agents simultaneously** is the practical maximum for parallel sub-agent execution. The explore skill explicitly caps at 5 parallel research agents. The iteration-loop.md pattern spawns all reviewers in a single message for concurrent execution.

### Context window

Each sub-agent gets its own context window (same 200K tokens as the parent). Sub-agents do NOT share context with each other — they share state exclusively through the filesystem.

### File persistence — critical nuance

There is a **known bug** (GitHub issues #4462, #9458, #18995) where **custom subagents** (defined in `.claude/agents/`) fail to persist files written via the Write/Edit tools. However, this does NOT appear to affect the **built-in Task/Agent tool** used by skills — the goodplan codebase has hundreds of review files successfully written by sub-agents spawned via the Task tool (confirmed by examining actual implementation artifacts).

**Evidence**: All review files in `.goodplan/epics/plugin-distribution/slices/*/implementation/*/reviews/` were written by sub-agents and persist correctly. The synthesis agents successfully write `merged.md` files that subsequent agents read.

**Workaround if needed**: Sub-agents can write files via `Bash` tool (`echo "content" > file.md`) instead of the Write tool, or return content as text for the orchestrator to write.

### Token overhead

Multi-agent workflows use roughly **4-7x more tokens** than single-agent sessions. Each sub-agent incurs initialization overhead (loading CLAUDE.md, understanding task context). Over-fragmentation — spawning agents for trivial tasks — wastes tokens.

### Sequential performance

No documented degradation from sequential spawns, but each spawn consumes orchestrator context for the prompt and return value. After many spawns, the orchestrator's context fills up. Context compaction may occur, potentially losing early state.

### Rate limits

Running 5+ parallel agents on the Pro plan can hit rate limits in under 20 minutes. The Max plan has higher limits. This is the primary scaling constraint for parallel research phases.

## 4. The create-epic Scale Model

### Projected sub-agent spawns

| Phase | Sub-agents | Notes |
|---|---|---|
| 1. Goal capture | 0-1 | Mostly interactive; orchestrator handles directly |
| 2. Explore (research) | 3-5 | Parallel research agents (capped at 5) |
| 3. Architecture draft | 1 | Single drafting agent |
| 3b. Architecture review | 3-5 | Parallel reviewers |
| 3c. Architecture synthesis | 1 | Synthesis agent |
| 4. Refine-arch round 1 | 4-6 | Reviewers + synthesis |
| 4b. Refine-arch edit | 1 | Editor agent |
| 4c. Refine-arch round 2 | 4-6 | Reviewers + synthesis |
| 4d. Refine-arch edit | 1 | Editor agent |
| 4e. Refine-arch round 3 (if needed) | 4-6 | Reviewers + synthesis |
| 4f. Refine-arch edit | 1 | Editor agent |
| 5. Slices draft | 1 | Single drafting agent |
| 5b. Slices review | 3-5 | Parallel reviewers |
| 5c. Slices synthesis | 1 | Synthesis agent |
| 6. Refine-slices round 1 | 4-6 | Reviewers + synthesis |
| 6b. Refine-slices edit | 1 | Editor agent |
| 6c. Refine-slices round 2 | 4-6 | Reviewers + synthesis |
| 6d. Refine-slices edit | 1 | Editor agent |
| 6e. Refine-slices round 3 (if needed) | 4-6 | Reviewers + synthesis |
| 6f. Refine-slices edit | 1 | Editor agent |
| **TOTAL** | **~40-65** | Across full create-epic run |

### Feasibility assessment

**YES, 30-50 sub-agent spawns is feasible.** Evidence:

1. **Already proven at scale**: A single implement-plan run on a 4-phase slice already spawns ~30 sub-agents successfully. The hmac-signatures slice (4 phases, 6 iterations + integration) spawned ~30 agents with no reported issues.

2. **No hard limit**: There is no documented maximum on total sub-agent spawns per session. The constraint is context window and rate limits, not spawn count.

3. **Context is the real bottleneck**: After ~40 sub-agent round-trips, the orchestrator's 200K context window will be under pressure. Each spawn adds prompt text + return value to the orchestrator's context. Mitigations:
   - Keep sub-agent return values compact (one-line summaries, not full reports)
   - Pass file paths instead of content between agents
   - The iteration-loop pattern already does this: "Do NOT read merged.md yourself — pass its path to the next agent"
   - Context compaction may trigger mid-run, but the orchestrator's state (current phase, iteration count) is recoverable from the filesystem

4. **Rate limits are manageable**: Parallel phases (3-5 reviewers) stay within the 7-agent parallel limit. Sequential phases space out API calls naturally. Max plan users have sufficient headroom.

### Risk areas

| Risk | Severity | Mitigation |
|---|---|---|
| Context exhaustion mid-run | Medium | Compact return values, pass paths not content, state on filesystem |
| Rate limiting during parallel research | Low-Medium | Cap at 5 parallel, use sonnet for low-stakes agents |
| Context compaction losing orchestrator state | Medium | Keep phase/iteration state in filesystem, re-read on resume |
| Token cost (4-7x multiplier on 40-65 agents) | Medium | Downgrade to sonnet where scores are high, skip re-review of passing reviewers |

### Recommendation

A create-epic skill with 40-65 sub-agent spawns is within proven operational parameters. The existing implement-plan and refine-plan skills demonstrate that the pattern works at 20-30 spawns per session. Scaling to 40-65 requires careful context management (already part of the iteration-loop pattern) but introduces no new architectural risk.

The key design constraint is **no nested delegation** — the create-epic orchestrator must manage all six phases directly, it cannot delegate a phase to a sub-orchestrator. This means the skill's SKILL.md will be larger than implement-plan's, but the orchestration pattern (spawn reviewers in parallel, synthesize, edit, iterate) is well-established and reusable.

## Sources

- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Subagents in the SDK - Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/subagents)
- [Task Tool vs. Subagents - iBuildWith.ai](https://www.ibuildwith.ai/blog/task-tool-vs-subagents-how-agents-work-in-claude-code/)
- [Claude Code Sub-Agents: Parallel vs Sequential Patterns](https://claudefa.st/blog/guide/agents/sub-agent-best-practices)
- [Issue #4462: Sub-agents claim successful file creation but files don't persist](https://github.com/anthropics/claude-code/issues/4462)
- [Issue #9458: Sub-agent Write tool operations don't persist to filesystem](https://github.com/anthropics/claude-code/issues/9458)
- [Issue #19077: Sub-agents can't create sub-sub-agents](https://github.com/anthropics/claude-code/issues/19077)
