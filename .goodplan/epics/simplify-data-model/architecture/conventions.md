# Architectural Conventions — Simplify Data Model Epic

Patterns and rules that apply across all work in this epic. These supplement the project-level `.goodplan/conventions.md` (tech stack, repo structure, coding style) with architecture-specific patterns for the skill consolidation.

## Orchestrator Conventions

### Context Discipline

The orchestrator (pipeline skill SKILL.md) relies primarily on CLI status and sub-agent return summaries. It operates on:
- CLI status output (`gp status --json`, `gp epic:show --json`, etc.)
- Sub-agent return summaries (structured JSON: status, scores, file paths)
- User Q&A during interactive phases
- Lightweight summary files when user-facing context is needed (re-entry summaries, error details from failed sub-agents)

The orchestrator **never reads full artifact content** (architecture files, plans, source code). Any content-level decision (which reviewers to spawn, whether a draft is good enough, what feedback to apply) is delegated to a sub-agent.

**Fitness function (dogfood harness):** orchestrator context should contain only CLI output, sub-agent return values, user Q&A, and lightweight summary files — flag any Read calls on full artifact files as violations.

### Sub-Agent Return Format

All sub-agents return a structured JSON summary as their final message. The orchestrator parses this to decide next steps.

```
{
  "status": "SUCCESS" | "PARTIAL" | "FAILED",
  "summary": "one-line description of what happened",
  "filesWritten": ["path1", "path2"],

  // Optional fields — present based on agent type and status
  "score": 8,                            // reviewers
  "reviewers": ["reviewer-holistic"],    // refinement-coordinator

  // Triggered validity/reconsider conditions (present when agent evaluates conditions)
  "triggeredConditions": [
    { "entityType": "decision" | "learning", "title": "...", "condition": "..." }
  ],

  // PARTIAL status — sub-agent needs help before it can finish
  "questions": [                         // questions for the user (0 or more)
    { "question": "...", "context": "why this matters" }
  ],
  "researchTopics": [                    // topics to research (0 or more)
    { "topic": "...", "context": "what to look for and why" }
  ],
  "continuationFile": "path"             // always present when PARTIAL
}
```

**Status meanings:**
- `SUCCESS` — sub-agent completed its task. Orchestrator advances to next step.
- `PARTIAL` — sub-agent made progress but needs user answers and/or research before it can finish. `questions` and `researchTopics` may both be present — the orchestrator handles all of them in parallel, then re-spawns the sub-agent with everything resolved.
- `FAILED` — sub-agent hit an unrecoverable error (CLI failure, invalid state). Orchestrator surfaces the error to the user. Rare in practice.

The orchestrator checks `status` first, then reads the relevant fields.

### `reconsiderWhen` / `validUntil` Evaluation

**Ownership:** Three phase agents evaluate conditions — `architecture-phase`, `plan-phase`, and `completion-phase`. Reviewers and coordinators do NOT evaluate conditions (they focus on artifact quality, not decision/learning validity).

**Orchestrator responsibility:** Before spawning these phase agents, the orchestrator loads active conditions via CLI:
```bash
gp decision:list --json   # filter for entries with non-empty reconsiderWhen
gp learning:list --json   # filter for entries with non-empty validUntil
```
The orchestrator includes the filtered conditions in the agent's task prompt alongside the current epic/slice goal text.

**Agent responsibility:** The phase agent evaluates each condition against the current context using judgment. If any condition is triggered, the agent includes it in `triggeredConditions` in its return JSON. The orchestrator surfaces triggered conditions to the user: "Decision [title] should be reconsidered — condition triggered: [condition]."

**Not evaluated by:** the orchestrator itself (no deterministic checking), reviewer agents (wrong scope), or the CLI (conditions require LLM judgment).

### Continuation File Format

When a sub-agent returns PARTIAL, it writes a continuation file:

```markdown
---
type: continuation
version: 1
phase: <phase-name>
agent: <agent-name>
---

# Continuation: <phase-name>

## Completed
- <what was accomplished>
- <decisions made and reasoning>

## Artifacts Written
- <file paths>

## Learnings
- <insights discovered during this run that the next instance should know>

## Pending
- <questions for the user, with context for why each matters>
- <research topics, with what to look for and why>

## Resume Instructions
<what the next instance should do with the answers/research to finish the task>
```

The orchestrator passes this file path to the re-spawned sub-agent alongside the resolved answers and research output paths.

**Size guidance:** Continuation files should target under ~2K lines. If a sub-agent is re-spawned multiple times, each instance should summarize the prior continuation's "Completed" and "Learnings" sections rather than appending verbatim, to prevent unbounded growth.

### Phase Detection

Phase detection uses the CLI exclusively — no filesystem artifact checks.

```bash
gp status --json     # .activeEpic.status tells the current phase
gp epic:show --epic <name> --json   # detailed status + artifacts
gp slice:show --slice <name> --json  # slice-level status
```

The CLI status field maps directly to pipeline phases:

| CLI Status | Pipeline Phase |
|---|---|
| `created` | Goal capture |
| `exploring` | Explore |
| `explored` | Explore complete, ready for architecture |
| `defining-architecture` | Architecture |
| `architecture-defined` | Architecture complete, ready for slices |
| `defining-slices` | Slice definition |
| `slices-defined` | Slices complete, ready for refinement/activation |
| `activated` | Epic active, slices ready for planning/implementation |

Each pipeline skill queries CLI status and resumes from the corresponding phase.

Quest statuses map to `create-side-quest` phases:

| CLI Status | Pipeline Phase |
|---|---|
| `created` | Goal capture |
| `exploring` | Explore |
| `explored` | Explore complete, ready for plan Q&A |
| `planning` | Plan Q&A |
| `plan-created` | Plan draft complete |
| `plan-refined` | Plan refined, ready for implementation |

## Agent Definition Conventions

### Size Guidance

Agent definition files should stay under ~500 lines. If a definition grows beyond this:
- Move stable reference content (rubrics, format specs, convention lists) into separate `.md` files in `skills/_shared/references/` and inject via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/<file>.md` in the agent body
- Keep dynamic, context-sensitive instructions in the agent body
- This keeps each agent focused on its specific role while sharing common content across agents

### File Naming

Agent definitions in `agents/` follow these patterns:
- Phase agents: `<phase>-phase.md` (e.g., `explore-phase.md`, `architecture-phase.md`)
- Reviewers: `reviewer-<domain>.md` (e.g., `reviewer-holistic.md`, `reviewer-typescript.md`)
- Utility agents: `<function>.md` (e.g., `synthesis.md`, `editor.md`, `refinement-coordinator.md`)

### Frontmatter Standards

```yaml
---
name: <agent-name>
description: <when this agent should be used — used by Claude for auto-matching>
model: opus
---
```

- Default model is `opus` for all agents. We may downgrade specific agents to `sonnet` or `haiku` later based on evidence from the quality validation slice, but start with the highest quality to establish a baseline.
- Do not restrict tools by default — sub-agents inherit all parent tools and should be trusted to use what they need (including Write for continuation files, WebSearch for research, etc.).
- **Do NOT use `skills:` frontmatter** for plugin-to-plugin skill injection — it silently fails (issue #25834). Instead, use `@${CLAUDE_PLUGIN_ROOT}/path` references in the agent's markdown body to inject shared content at load time. This is verified to work in plugin agent definitions (prototype tested 2026-04-01).

### Reviewer Agent Conventions

Each reviewer agent's markdown body contains:
1. Shared review preamble via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-preamble.md` (output format, severity levels, score rubric)
2. Domain-specific review criteria via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-<domain>.md`
3. Instructions to adapt focus based on review context (architecture, slices, plan, implementation, audit findings)

This keeps each reviewer agent's body small (~20 lines of glue) while the substance lives in shared reference files. The `@` references inject content at load time — no Read permissions needed. The orchestrator passes the specific artifact path and review context in the task prompt.

**`review_context` values** (closed set — use exact strings):

| Value | When Used | Reviewer Focus |
|---|---|---|
| `architecture-proposal` | create-epic architecture refinement | Structural soundness, subsystem boundaries, API surfaces |
| `slice-definitions` | create-epic slice refinement | Scope clarity, ordering, dependencies, verifiability |
| `implementation-plan` | plan-slice / create-side-quest refinement | Implementability, phasing, risk, completeness |
| `code-implementation` | implement review loops | Code quality, test coverage, architecture alignment |
| `audit-findings` | audit skill | Accuracy of findings, false positives, completeness |

Reviewer agents must produce output in the standard format:
- `## Issues` section with severity tags and resolution tags
- `## Score: X/10` with justification
- `## Summary` with severity counts

## Skill Conventions

### Pipeline Skill Structure

Pipeline skills (create-epic, plan-slice, create-side-quest, implement) follow this SKILL.md structure:

1. **Frontmatter** — name, description, user-invocable: true
2. **Phase table** — lists all phases with type (interactive/autonomous) and CLI status mapping
3. **Re-entry logic** — query CLI status, offer continue/go-back based on current phase
4. **Phase instructions** — for interactive phases: Q&A scripts. For autonomous phases: which agent to spawn, what context to pass, how to interpret the return.
5. **Exit criteria** — when the pipeline is complete
6. **Early exit** — how to handle the user wanting to stop at a specific phase

### Front-Loaded Interaction

Interactive phases come first in the pipeline wherever possible. Collect all user context upfront, then run autonomous phases uninterrupted.

If a later phase surfaces something that needs user input (via sub-agent PARTIAL status), the orchestrator:
1. Handles all `questions` and `researchTopics` from the return — asks user questions via AskUserQuestion, spawns research agents in parallel
2. Once all answers and research are resolved, re-spawns the sub-agent with the continuation file + all resolved inputs
3. Resumes autonomous execution

### Standalone Skill Structure

Standalone skills (start-epic, explore, task, audit, status, upgrade, init) are simpler:
1. **Frontmatter** — name, description
2. **Instructions** — direct execution logic, may use sub-agents for heavy work but no multi-phase pipeline

**Pipeline vs. standalone definition:** A pipeline skill runs sequential phases with CLI status transitions between them (e.g., `created` → `exploring` → `explored` → `defining-architecture`). A standalone skill performs a single logical step, possibly spawning parallel sub-agents for heavy work, but without multi-phase status orchestration.

## Testing Conventions

### Test Tiers

| Tier | Model | Fixture | Purpose | When to run |
|---|---|---|---|---|
| Structural | haiku | Minimal (5-line idea, 2 slices) | File creation, phase advancement, re-entry, CLI state | Every change |
| Pipeline | haiku | Minimal | Full pipeline end-to-end | Pipeline skill changes |
| Quality | opus | Realistic | Architecture quality, reviewer accuracy, decision quality | Pre-release |

### Simulated User Responses

Test harness `canUseTool` interceptor replaces auto-first-option with an LLM call:
- Structural/pipeline tests: haiku generates contextual answers
- Quality tests: sonnet generates contextual answers

The interceptor receives the question text + options + fixture context and returns an appropriate answer.

### Phase Artifact Verification

After each skill run in pipeline tests, verify expected artifacts via CLI status checks:

```typescript
function verifyEntityStatus(gpBin: string, entityType: "epic" | "slice" | "quest", entityName: string, expectedStatus: string): VerifyResult
```

Expected status per phase is defined in the test, not in the skill — the test knows what a successful phase looks like.
