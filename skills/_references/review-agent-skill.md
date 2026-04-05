# Agent & Skill Review Criteria

Domain-specific evaluation criteria for the agent/skill reviewer. Evaluates the design and structure of agent definitions (agents/*.md) and skills (SKILL.md files, references, workflows). Does NOT evaluate the correctness of code that agents/skills instruct an agent to write — language and domain reviewers handle that.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Existing agent definitions in `agents/` — frontmatter patterns, body structure, `@` reference usage
- Existing skill structure: directory layout, SKILL.md format, references/ organization
- How `skills/_references/` files are organized and cross-referenced
- Install scripts or packaging that copies/transforms skills and agents for deployment
- Project configuration files (CLAUDE.md) for conventions
- Orchestrator skills that spawn agents — how they pass context and parse returns

## Evaluation Criteria

1. **Triggering accuracy** (skills only): Will the skill trigger when it should and stay silent when it shouldn't?
   Consider: the `description` field is the primary trigger mechanism — it must include BOTH what the skill does AND when to use it. Descriptions should be specific enough to avoid false triggers on adjacent tasks.

2. **Context discipline**: Does the agent/skill manage context efficiently?
   Consider: orchestrator skills should never read full artifact content — only CLI status and sub-agent return summaries. Agent definition bodies should be under ~500 lines (pre-`@`-expansion). Reference files loaded via `@` references, not Read calls. Sub-agents should be self-contained — reading just the agent prompt should be sufficient to understand the task.

3. **Prompt quality**: Are instructions clear, complete, and well-sequenced?
   Consider: use imperative form. Explain reasoning behind instructions — LLMs respond better to reasoning than rigid MUST/NEVER directives. Define output formats explicitly for structured output. If spawning sub-agents, their prompts should be self-contained. Include exit conditions and iteration limits for loops.

4. **`@` reference correctness**: Are shared content references properly formed?
   Consider: references must use `@${CLAUDE_PLUGIN_ROOT}/path` format (not bare paths or `@./` relative paths). Referenced files must exist at the specified path. Do NOT use `skills:` frontmatter for plugin-to-plugin injection (issue #25834). Each `@` reference file should start with a self-identifying header for spot-checking in logs.

5. **Sub-agent return format**: Do agents return structured JSON matching the standard format?
   Consider: `{ status, summary, filesWritten, score?, reviewers?, triggeredConditions?, questions?, researchTopics?, continuationFile? }`. Status must be SUCCESS, PARTIAL, or FAILED. Orchestrator parses this to decide next steps.

6. **Flat hierarchy**: Is the sub-agent hierarchy flat (no sub-sub-agents)?
   Consider: sub-agents must not spawn their own sub-agents. The orchestrator is the only spawner. Sub-agents cannot use AskUserQuestion — all user interaction happens in the orchestrator.

7. **Tool restrictions**: Are tool allowlists appropriate for each agent type?
   Consider: reviewer agents should be read-only (Read, Grep, Glob). Editor and synthesis agents need Write. No agent should have Agent tool access (enforces flat hierarchy). Orchestrator defines allowedTools/disallowedTools when spawning.

8. **Continuation file usage** (if PARTIAL status is supported): Does the agent write a well-structured continuation file?
   Consider: continuation files should contain what was accomplished, decisions made, artifacts written, pending questions/research, and resume instructions. Target under ~2K lines.

9. **Error handling**: Does the agent handle failure gracefully?
   Consider: agents should return FAILED status with a clear summary when hitting unrecoverable errors. They should not silently swallow errors or return SUCCESS when work is incomplete.

10. **Verification approach appropriateness**: Do the Expected Behavior items use the most direct verification method? (e.g., skill phases should invoke the skill end-to-end, not just check file existence; agent definitions should be tested via the dogfood harness)
