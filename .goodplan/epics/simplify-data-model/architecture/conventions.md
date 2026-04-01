# Architectural Conventions — Simplify Data Model Epic

Patterns and rules that apply across all work in this epic. These supplement the project-level `.goodplan/conventions.md` (tech stack, repo structure, coding style) with architecture-specific patterns for the skill consolidation.

## Orchestrator Conventions

### Context Discipline

The orchestrator (pipeline skill SKILL.md) must never read artifact file contents. It operates on:
- CLI status output (`gp status --json`, `gp epic:show --json`, etc.)
- Sub-agent return summaries (structured JSON: status, scores, file paths)
- User Q&A during interactive phases

Any content-level decision (which reviewers to spawn, whether a draft is good enough, what feedback to apply) is delegated to a sub-agent.

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

### Continuation File Format

When a sub-agent returns PARTIAL, it writes a continuation file:

```markdown
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

## Agent Definition Conventions

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
skills:
  - <skills to inject into context>
---
```

- Default model is `opus` for all agents. We may downgrade specific agents to `sonnet` or `haiku` later based on evidence, but start with the highest quality to establish a baseline.
- Do not restrict tools — sub-agents inherit all parent tools by default and should be trusted to use what they need (including Write for continuation files, WebSearch for research, etc.).
- `skills:` injects shared reference content (review preamble, output format, CLI conventions) at spawn time without Read permissions.

### Reviewer Agent Conventions

Each reviewer agent's markdown body contains:
1. Domain expertise description (what this reviewer specializes in)
2. Evaluation criteria specific to the domain
3. Codebase exploration focus (what to look at before reviewing)
4. Instructions to adapt focus based on review context (architecture, slices, plan, implementation, audit findings)

The review context and shared preamble (output format, severity levels, score rubric) are injected via `skills:` frontmatter. The orchestrator passes the specific artifact path and review context in the task prompt.

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
function verifyPhaseStatus(epicName: string, expectedStatus: string): VerifyResult
```

Expected status per phase is defined in the test, not in the skill — the test knows what a successful phase looks like.
