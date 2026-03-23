# Design-It-Twice Protocol

Detailed protocol for Step 6 (design-it-twice). SKILL.md contains the step summary; this file contains the sub-agent prompt template, comparison framework, philosophy derivation, and skip guidance.

## Deriving Design Philosophies

Do NOT use generic software philosophy labels ("KISS", "YAGNI", "enterprise-grade"). Instead, derive 2-3 meaningfully different philosophies from:

1. **The project's domain** — what trade-offs are inherent in this problem space? (e.g., a real-time system trades throughput for latency; a content platform trades flexibility for consistency)
2. **Constraints from the broad pass** — what did the design tree surface as hard constraints vs flexible choices?
3. **idea.md goals** — what does the user value most? (speed to market, extensibility, correctness, developer experience)

Each philosophy should lead to a genuinely different architecture — not just cosmetic variations. A good test: if two philosophies produce the same interface signatures, they aren't different enough.

**Example derivation** (for a CLI tool suite):
- From domain: CLI tools can be monolithic (one binary, subcommands) or composable (separate tools, unix pipes)
- From constraints: user wants fast startup, low memory
- From goals: developer experience is paramount

Derived philosophies:
1. **Single-entry orchestrator** — one binary dispatches to subcommands; shared initialization, consistent UX, but coupled release cycle
2. **Composable toolkit** — independent tools that pipe data; flexible composition, independent versioning, but more surface area to learn
3. **Library-first with thin CLI** — core logic as importable library, CLI is a thin wrapper; maximizes reuse, but adds an abstraction layer

## Sub-Agent Prompt Template

Use this template when spawning design option sub-agents. Fill in all `{{placeholders}}` before spawning. The prompt must be fully self-contained — the sub-agent will NOT have access to SKILL.md, other reference files, or conversation history.

```
You are designing one option for a specific architectural area. Produce a lightweight design artifact — NOT a full architecture document.

## Project Context

{{paste the relevant sections of idea.md: goal, scope, key constraints}}

## What Has Been Established

{{paste the broad pass summary: subsystem boundaries, communication patterns, key constraints, data ownership}}

## Area To Design

{{name of the architectural area, e.g., "Subsystem communication layer" or "Data access pattern"}}

## Your Design Philosophy

{{the derived philosophy for this option, stated concretely — not a label, but a 2-3 sentence description of the approach and what it optimizes for}}

## Output Format

Produce exactly this structure:

### Design: {{short name}}

**Philosophy**: {{one-sentence restatement}}

**Interface signatures**:
- List every public type, method, or function this design exposes
- Include parameter types and return types
- Be concrete (real names from this project, not "doThing()")

**Usage examples**:
1. {{a typical caller scenario — show the code/pseudocode a consumer would write}}
2. {{an edge case or less obvious usage}}

**Hidden complexity**:
- What does this design handle internally that callers don't see?
- What implementation details are encapsulated?

**Trade-offs**:
- Makes easy: {{what this design optimizes for}}
- Makes hard: {{what this design sacrifices or complicates}}
- Risk: {{the most likely way this design causes pain later}}
```

## Comparison Framework

After all sub-agents return, compare options across these dimensions. Present as a table.

| Dimension | Description |
|---|---|
| Interface simplicity | Method count, parameter count, concept count — fewer is better |
| Depth | How much complexity is hidden behind a small interface — more is better |
| General-purpose vs specialized | Does it handle future use cases, or is it optimized for known ones? |
| Implementation efficiency | How much work to build; ongoing maintenance cost |
| Ease of correct use | Can callers use it correctly without reading docs? |
| Ease of misuse | How easy is it to use incorrectly? (separate from correct use) |

Rate each dimension qualitatively (not numerically): better / neutral / worse relative to the other options.

## Agent Recommendation

The recommendation is REQUIRED, not optional. Structure it as:

> **Recommendation**: Option [N] — {{short name}}
>
> **Rationale**: {{2-3 sentences grounded in the project's specific context. Reference idea.md goals, constraints from the broad pass, and user expertise level. Do NOT give generic advice like "it's simpler" — explain WHY simpler matters for THIS project.}}
>
> **Synthesis note**: {{if elements from other options could be incorporated into the recommendation, name them specifically}}

## Skip Guidance

Not every architectural area needs design-it-twice. Skip when:

- **Only one reasonable approach exists** — the constraints from the broad pass leave no meaningful choice (e.g., "we need a relational database" when the data is highly relational and the team knows PostgreSQL)
- **The area is too small** — a single function or simple config, not a subsystem boundary or API surface
- **The broad pass already resolved it** — the user made a clear choice during the design tree that doesn't benefit from alternatives

When skipping, briefly note why: "Skipping design-it-twice for [area] — [reason]. Proceeding with [approach]."

When in doubt, do NOT skip. The cost of generating options is low; the cost of committing to a suboptimal design is high.

## Model Selection

Use "opus" by default for sub-agents. Use "sonnet" when the broad pass has already narrowed the design space significantly — meaning the options are variations within a chosen approach rather than fundamentally different architectures. This is consistent with refine-plan's cost-conscious model selection policy.
