# Orchestrator Context Patterns

Researched: 2026-04-01 | Source: web search, Claude Code docs, codebase analysis

---

## 1. Context Budget Analysis: create-epic Scenario

### Token Cost Model

With Opus 4.6 on a 1M context window, here is a per-turn breakdown for an orchestrator that coordinates 6 phases, each spawning 1-3 sub-agents.

**Fixed overhead per orchestrator turn:**

| Component | Tokens (est.) |
|---|---|
| System prompt (CLAUDE.md, skill content, tool definitions) | 15,000-25,000 |
| Conversation history (accumulated) | grows per turn |
| Tool call + response framing | ~500 per call |

**Per sub-agent spawn (Task tool round-trip):**

| Component | Tokens (est.) |
|---|---|
| Task tool call (prompt + instructions) | 2,000-5,000 |
| Sub-agent return value (summary) | 200-500 |
| Total per spawn in orchestrator context | 2,500-5,500 |

**Key insight**: Sub-agents get their own context windows. The orchestrator only sees the spawn prompt + return value. File reads, tool calls, and intermediate reasoning inside a sub-agent do NOT accumulate in the orchestrator's context.

### create-epic Projection

Modeling a create-epic workflow with 6 phases, each spawning 2 sub-agents on average:

| Phase | Orchestrator activity | Tokens added to context |
|---|---|---|
| System prompt + skill load | Read refs, load context | ~25,000 (one-time) |
| Phase 1: scope resolution | CLI calls, 2 sub-agents | ~8,000 |
| Phase 2: architecture Q&A | User interaction, 2 sub-agents | ~12,000 |
| Phase 3: slice definition | 2 sub-agents | ~8,000 |
| Phase 4: dependency analysis | 3 sub-agents (parallel) | ~10,000 |
| Phase 5: plan generation | 2 sub-agents | ~8,000 |
| Phase 6: review + finalize | 3 sub-agents (parallel) | ~10,000 |
| **Running total** | | **~81,000** |

Add orchestrator reasoning tokens between phases (~2,000 per phase = ~12,000), and user messages (~500 per phase = ~3,000):

**Estimated total: ~96,000 tokens after all 6 phases.**

This is well within a 1M window (~9.6% utilization). Even a 200K window handles this comfortably (~48% utilization). The orchestrator stays thin because sub-agent internals are invisible.

### Where it breaks down

The danger is not the orchestrator loop itself but **context pollution**:

- Orchestrator reads files directly instead of delegating: each file read adds 1,000-10,000 tokens
- Orchestrator reads merged feedback files instead of passing paths: 5,000-20,000 tokens per read
- Orchestrator re-reads plan between phases: 3,000-8,000 tokens per read

**Measured from implement-plan**: The current skill explicitly says "Do NOT read merged.md yourself -- pass its path to the next agent." This is the correct pattern. One accidental file read in the orchestrator can cost more than an entire sub-agent spawn.

### Cost comparison: orchestrator reads vs. delegates

| Pattern | Tokens in orchestrator context |
|---|---|
| Orchestrator reads 5 files, reasons, spawns agent | ~35,000 |
| Orchestrator spawns agent with file paths, gets summary | ~5,000 |
| Savings | **~30,000 tokens (86% reduction)** |

## 2. Existing Patterns and Prior Art

### Orchestrator-Worker (most common)

The dominant pattern in production multi-agent systems. An orchestrator decomposes work, routes subtasks to specialized workers, and synthesizes results. Used by: Claude Code's Task tool, LangGraph, CrewAI, Google ADK.

**Key properties:**
- Orchestrator maintains overall plan state
- Workers are stateless (receive full context per invocation)
- Workers cannot spawn other workers (single-level delegation)
- Orchestrator controls iteration (decide when to re-run, when to stop)

Source: [Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns), [Arize AI comparison](https://arize.com/blog/orchestrator-worker-agents-a-practical-comparison-of-common-agent-frameworks/)

### Thin Orchestrator / Coordinator

A refinement where the orchestrator is deliberately minimal:
- Does NOT read large files or do substantive reasoning
- Only decides: what sub-agent to spawn next, with what inputs
- Only processes: structured summaries from sub-agents (scores, status, file lists)
- All heavy lifting delegated to sub-agents

Source: [Ronie Uliana, "The Orchestrator Pattern"](https://ronie.medium.com/the-orchestrator-pattern-managing-ai-work-at-scale-a0f798d7d0fb)

**Our implement-plan skill already follows this pattern.** It spawns implementation agents, review agents, and synthesis agents, only processing their structured return values.

### Plan-and-Execute

A two-phase variant: first generate a plan (sub-agent), then execute each step (sub-agents). The orchestrator is a state machine that tracks plan progress.

Source: [Vercel AI SDK Workflows](https://ai-sdk.dev/docs/agents/workflows)

### Agent Teams (Claude Code experimental)

Built-in multi-agent where one session is "team lead" coordinating via shared task list. Teammates run in their own context windows and can communicate directly. Uses ~7x more tokens than single-agent due to coordination overhead. Not yet production-ready.

Source: [Claude Code docs](https://code.claude.com/docs/en/agent-teams)

### Repository Map (Aider)

Not an orchestration pattern but a context management technique: tree-sitter parses code into AST, extracts signatures, builds dependency graph, ranks by PageRank, fits within token budget. Reduces the need to read full files.

Source: [Addy Osmani, "The Code Agent Orchestra"](https://addyosmani.com/blog/code-agent-orchestra/)

## 3. Context Management Strategies

### 3a. Sub-Agent Isolation (primary strategy)

Each sub-agent gets its own context window. Only the return value enters the orchestrator's context. This is the single most effective strategy for keeping orchestrator context small.

**Claude Code specifics:**
- Task tool spawns get their own 1M context window
- `context: fork` in skill frontmatter creates isolated execution
- Sub-agents cannot spawn other sub-agents (flat hierarchy)
- Only the final message returns to parent

Source: [Claude Code sub-agents docs](https://code.claude.com/docs/en/sub-agents)

### 3b. File-Based Handoffs (secondary strategy)

Instead of passing data through context, write to files and pass paths:
- Implementation agent writes report to `{run_dir}/phase-{N}/report.md`
- Review agents write to `{run_dir}/phase-{N}/iteration-{M}/reviews/*.md`
- Synthesis agent reads reviews, writes `merged.md`
- Orchestrator passes `merged.md` path to next implementation agent

**The orchestrator never reads these files.** It only handles paths and structured summaries.

Our implement-plan already does this correctly. The pattern should be generalized to all multi-phase skills.

### 3c. Observation Masking (JetBrains research)

After the model processes a tool output, replace it with a placeholder. The model has already "seen" the content -- it doesn't need it sitting in context for subsequent turns.

**Research finding (NeurIPS 2025, JetBrains):** Simple observation masking matched or beat LLM summarization in 4 of 5 test settings, was 52% cheaper on average, and actually improved solve rates by 2.6% with large models. LLM summaries can smooth over signals that would otherwise help the agent stop appropriately.

Source: [JetBrains Research Blog](https://blog.jetbrains.com/research/2025/12/efficient-context-management/), [arxiv paper](https://arxiv.org/html/2508.21433)

**Implication for goodplan**: Claude Code doesn't expose observation masking directly, but we can approximate it by:
1. Delegating all file reads to sub-agents (they mask automatically by returning only summaries)
2. Having orchestrator request only structured data, not raw file contents
3. Using `context: fork` for skills that do heavy codebase exploration

### 3d. Context Compaction (built-in, last resort)

Claude Code auto-compacts at ~95% of context window. For 1M, this triggers around 950K tokens. Compaction summarizes the conversation and discards details.

**Problem**: Compaction is lossy. It creates a "context cliff" where the agent loses ability to reference earlier work. For orchestrators, this means losing track of which phases completed, what scores were, and what decisions were made.

**Mitigation**: Keep orchestrator state in files (plan checkboxes, run directory structure) so it can be reconstructed after compaction. Our implement-plan does this by marking checkboxes in the plan file and structuring iteration artifacts on disk.

### 3e. Structured Return Values

Sub-agents should return machine-parseable summaries, not prose:

```
## Implementation Status: SUCCESS
## Changed Files: src/foo.ts src/bar.ts
## Score: 9/10
## Critical: 0, Important: 0, Minor: 1
```

The orchestrator parses these for loop decisions without needing to understand the full context of what happened.

## 4. Failure Modes

### 4a. Context Overflow (silent degradation)

When context fills up, the model doesn't crash -- it silently degrades. Outputs become generic, lose connection to specific patterns, and miss details. The orchestrator may "forget" earlier phases or repeat work.

**Mitigation**: Monitor context usage. Keep orchestrator lean. Delegate aggressively.

Source: [Redis blog](https://redis.io/blog/context-window-overflow/), [Augment Code](https://www.augmentcode.com/guides/why-multi-agent-llm-systems-fail-and-how-to-fix-them)

### 4b. Information Loss at Handoff Boundaries

Every sub-agent handoff is a compression point. Critical details can be lost when:
- Sub-agent summary omits context needed by the next phase
- File paths are relative and resolve differently in sub-agent context
- Sub-agent errors are swallowed (crash = no return value)

**Mitigation**: Structured return formats (enforce with prompt templates). Absolute file paths always. Error detection in orchestrator (check for missing/malformed returns).

Source: [GitHub Engineering Blog](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/)

### 4c. Coordination Failures (inter-agent misalignment)

The single most common failure mode in production multi-agent systems. Agents working on related subtasks make contradictory decisions because they lack shared context.

**Mitigation**: File-based shared state (agents read the same architecture files, plan files). Orchestrator enforces sequencing (Phase N completes before Phase N+1 starts). Review agents see implementation agent's output via git diff, not via messages.

Source: [arxiv paper on multi-agent failures](https://arxiv.org/html/2503.13657v1)

### 4d. Stall Loops

Implementation and review agents disagree, scores don't improve across iterations, tokens burn without progress. Our implement-plan already detects this (stall detection at iteration >= 3, max 12 iterations).

### 4e. Sub-Agent Quality Degradation

Using cheaper models for sub-agents saves tokens but can reduce output quality. Research agents on Sonnet may miss nuances. Implementation agents on Haiku may produce lower-quality code.

**Our approach**: Use Opus by default, downgrade to Sonnet only when all scores are 8+ and only MINOR issues remain. This is well-calibrated.

## 5. Claude Code Specific Best Practices

### From official docs:

1. **`context: fork`** in skill frontmatter creates isolated sub-agent execution. The skill content becomes the prompt. Results are summarized and returned. Use for skills that do heavy codebase exploration.

2. **Sub-agents cannot spawn sub-agents.** Flat hierarchy only. If a workflow needs nested delegation, chain from the orchestrator.

3. **Task tool** spawns get their own context window. The orchestrator sees only the spawn prompt and return value.

4. **Compaction triggers at ~95% of context window.** For 1M, this is ~950K tokens. Pre-compaction token count is logged in `compact_boundary` events.

5. **`MAX_THINKING_TOKENS`** environment variable can limit reasoning token budget per turn.

### From community experience:

1. **50K token overhead per sub-agent turn** is common when MCP tools are loaded (10-20K for tool descriptions alone). Minimize MCP tool surface in sub-agents.

2. **Agent Teams uses ~7x tokens** compared to single-agent. Not recommended for production orchestration.

3. **File-based state is compaction-safe.** After compaction, the orchestrator can reconstruct state from disk (plan checkboxes, run directory structure, git log).

## 6. Recommendations for goodplan Skills

### Design principles for orchestrator skills:

1. **Never read large files in the orchestrator.** Delegate all file reading to sub-agents. Pass paths, receive structured summaries.

2. **File-based handoffs between phases.** Write artifacts to disk, pass paths. The orchestrator's context should contain only: phase list, current phase, scores/status from last iteration, and file paths.

3. **Structured return contracts.** Every sub-agent must return a parseable summary (status, scores, file lists, blockers). The orchestrator makes loop decisions from these summaries.

4. **State on disk, not in context.** Plan checkboxes, iteration artifacts, review files -- all on disk. If compaction happens, the orchestrator can reconstruct state by reading the run directory.

5. **Flat delegation.** Sub-agents don't spawn sub-agents. The orchestrator is the only coordinator. This keeps the architecture predictable and debuggable.

6. **Model tiering for cost.** Opus for implementation and initial reviews. Sonnet for subsequent reviews when scores are high. Never Haiku for code-touching tasks.

7. **Observation masking approximation.** Don't read file contents "just to check" -- delegate a sub-agent to check and report back. Every file read in the orchestrator is permanent context pollution.

### Estimated context budget for a merged create-then-refine skill:

| Phase | Sub-agents | Orchestrator tokens |
|---|---|---|
| Context load + scope resolution | 1 (codebase scan) | ~8,000 |
| Interactive Q&A (create phase) | 0 (direct user interaction) | ~15,000 |
| Draft generation | 1 (writer) | ~5,000 |
| Review iteration 1 | 3 (reviewers) + 1 (synthesis) | ~12,000 |
| Review iteration 2 | 2 (re-review) + 1 (synthesis) | ~10,000 |
| Finalization | 1 (apply fixes) | ~5,000 |
| **Total** | ~9 sub-agent spawns | **~55,000 tokens** |

At 55K tokens, a merged create-refine skill uses ~5.5% of a 1M window. Even running 3 such skills back-to-back in a single session uses only ~16.5%. There is no context pressure concern for orchestrator skills if they follow the delegation discipline.

---

## Sources

- [Addy Osmani - The Code Agent Orchestra](https://addyosmani.com/blog/code-agent-orchestra/)
- [Microsoft Azure - AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [GitHub Blog - Multi-agent workflows that don't fail](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/)
- [Augment Code - Why Multi-Agent Systems Fail](https://www.augmentcode.com/guides/why-multi-agent-llm-systems-fail-and-how-to-fix-them)
- [JetBrains Research - Cutting Through the Noise](https://blog.jetbrains.com/research/2025/12/efficient-context-management/)
- [JetBrains - The Complexity Trap (NeurIPS 2025)](https://arxiv.org/html/2508.21433)
- [Ronie Uliana - The Orchestrator Pattern](https://ronie.medium.com/the-orchestrator-pattern-managing-ai-work-at-scale-a0f798d7d0fb)
- [Redis - Context Window Overflow](https://redis.io/blog/context-window-overflow/)
- [LangChain - Context Engineering for Agents](https://blog.langchain.com/context-engineering-for-agents/)
- [LangChain - Context Management for Deep Agents](https://blog.langchain.com/context-management-for-deepagents/)
- [Claude Code Docs - Sub-agents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Docs - Skills](https://code.claude.com/docs/en/skills)
- [Claude Code Docs - Cost Management](https://code.claude.com/docs/en/costs)
- [Arxiv - Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/html/2503.13657v1)
- [DEV.to - 50K Token Sub-Agent Overhead](https://dev.to/jungjaehoon/why-claude-code-subagents-waste-50k-tokens-per-turn-and-how-to-fix-it-41ma)
- [Anthropic - 1M Context GA](https://claude.com/blog/1m-context-ga)
- [claudefa.st - Context Buffer Management](https://claudefa.st/blog/guide/mechanics/context-buffer-management)
- [Mike Mason - AI Coding Agents 2026](https://mikemason.ca/writing/ai-coding-agents-jan-2026/)
