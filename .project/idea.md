# Project Idea

## Problem

Managing a multi-session AI-assisted development workflow manually is tedious and error-prone. The developer must act as a message bus between an orchestrator session, a plan-writer session, and throwaway implementation sessions — shuttling context between them, managing memory across session limits, and manually deciding what to do next.

## Desired Outcome

A suite of Claude Code skills and supporting files that implement the development workflow defined in `workflow.md` — so that any session can pick up where a previous one left off, the right context is always available, and the developer only needs to make decisions, not manage state.

## Scope

A set of standalone skills (no plugin required initially), a CLAUDE.md that wires them together with references to `.project/` context, and the supporting `.project/` file conventions — all designed to work together as a coherent workflow.

### Skills to Build

| Skill | Phase | Purpose |
|---|---|---|
| `/start-project` | 1 | Initialize `.project/` filesystem, capture idea, ask clarifying questions to flesh it out |
| `/explore` | 2 / 5 | Brainstorming & research loop for either the whole project or a specific slice/quest — iterates until the user decides enough has been captured. Handles research (spawns sub-agents), brainstorming (interactive), and prototyping (interactive). Writes to the appropriate scope's `research/` and `brainstorm/` directories. |
| `/define-architecture` | 3 | Use goal + exploration output to interactively drive architecture decisions until `architecture/` is fully populated and the user is satisfied. Also captures project conventions (`conventions.md`) and updates `CLAUDE.md` with references to architecture files. |
| `/define-slices` | 4 | Look at current repo state and define an ordered set of vertical slices with concrete, verifiable success criteria — success defined not just by tests but by actually running code (scripts, functions, web apps in browser, etc.). Writes `vertical-slices/sequencing.md` and each slice's `goal.md`. |
| `/create-plan` | 6 | Take a slice/quest goal and produce a plan document compatible with `/refine-plan` and `/implement-plan`. Reads all available context (exploration, architecture, conventions, learnings, other slice goals). Asks the user questions to fill gaps before writing. |
| `/complete-slice` | 10 | After implementation and any QA: roll up learnings to `completion/learnings.md` and top-level `learnings.md`; propose architecture updates based on what was learned; review remaining slices to see if goals need updating or new work is warranted; ask about cleanup/refactor pass. No git automation — branching, pushing, and PRs are handled conversationally. |
| `/project-status` | any | Read `state.md`, `flow-log.jsonl`, and the `.project/` filesystem to determine what was last done and what should happen next. Present a clear status summary and recommended next skill to run. |
| `/refine-architecture` | any | Iteratively review and improve `.project/architecture/` files using specialized review sub-agents. Evaluates module depth, subsystem boundaries, API surfaces, and alignment with decisions. |
| `/audit-architecture` | any | Compare intended architecture against actual code, evaluate whether the target architecture should evolve, and propose side quests for gaps and improvements. Run before `/refine-architecture`. |

### Reusing Existing Skills

- `/refine-plan` — used as-is to iteratively refine a slice/quest plan until all specialist reviewers score it ≥9
- `/implement-plan` — used as-is to implement a refined plan phase by phase with implementer + reviewer sub-agents

### Out of Scope (handled conversationally, not automated)

- **Git workflow** — `/implement-plan` already commits after each passing phase. Branch creation, pushes, and PRs are requested conversationally as needed.
- **QA & polish** — after implementation, the user tries things out and works with Claude interactively to fix issues. No skill needed.
- **Retrospective** — handled conversationally after all slices are done.
- **Side quest creation** — when a side quest is identified, the user asks Claude to create it (write `goal.md`, set up the directory).
- **Abandonment** — the user asks Claude to write `abandoned.md` when needed.
- **`interrupted.md` lifecycle** — managed conversationally when a side quest takes over mid-slice.

### Cross-Cutting Conventions (applied consistently across all skills)

- **`state.md`** — read at skill start for fast resume context; write current phase/step/scope on completion so the next session can orient immediately.
- **`flow-log.jsonl`** — append a JSONL entry at each significant transition. Format: `{"ts":"...","phase":"...","scope":"...","status":"...","summary":"..."}`. Detail files in `flow-log/` only for retries, failures, or circuit breaker events.
- **`CLAUDE.md` project context section** — maintained incrementally by skills as new files are created (see below).

### `/explore` Invocation

`/explore` uses Option C: reads `state.md` to infer the active scope, announces what it's about to explore, and asks for confirmation before starting. Can be overridden explicitly: `/explore slice/user-auth` or `/explore quest/setup-test-infra`.

- No argument + no active scope in `state.md` → explores project-level
- No argument + active slice/quest in `state.md` → explores that slice/quest
- Explicit argument → uses that scope regardless of `state.md`

The skill announces its inferred scope at the start: "Exploring [project-level / slice: user-auth]. Correct?" so the user can redirect if needed.

### CLAUDE.md Project Context Section

CLAUDE.md is the primary mechanism for ensuring sub-agents (spawned by `/refine-plan` and `/implement-plan`) load the right context without explicit prompting. It's also how fresh sessions orient quickly.

Sub-agents get CLAUDE.md loaded automatically but receive minimal explicit prompting. Without this index, reviewer and implementer sub-agents would miss architectural conventions and learnings — degrading review quality and implementation consistency.

The Project Context section is written incrementally by skills as files are created:

- `/start-project` → adds `idea.md`
- `/define-architecture` → adds `conventions.md`, `architecture/` references, `sequencing.md`
- `/complete-slice` → updates if new architecture files were added during the slice

**Final format:**

```markdown
## Project Context

Read these before doing any significant work in this repo:

- `.project/idea.md` — project goal, scope, constraints
- `.project/conventions.md` — tech stack, repo structure, coding style
- `.project/architecture/_overview.md` — system architecture
- `.project/architecture/conventions.md` — architectural patterns
- `.project/learnings.md` — accumulated learnings across completed slices
- `.project/vertical-slices/sequencing.md` — slice ordering and rationale

Also check if relevant to your task:
- `.project/brainstorm/` — project-level brainstorming output
- `.project/research/` — project-level research findings
- `.project/prototypes/` — exploratory prototypes
- `.project/side-quests/` — deferred and in-progress side quests
```

## Constraints

- Skills must be standalone files that work without a plugin system
- Each skill should be focused and small enough to avoid "lost in the middle" degradation (~10–15KB max)
- The workflow should feel conversational, not rigid — the user can redirect at any time
- Skills must leave state in `.project/` files so any fresh session can resume
- The full workflow (explore → architecture → slices → plan → refine → implement → complete) must be coherent: output from each skill is valid input to the next

## Open Questions

- What's the exact plan document format expected by `/refine-plan` and `/implement-plan`? Need to inspect those skills before writing `/create-plan`.
- Should `/define-slices` write `sequencing.md` in the format `workflow.md` specifies, or something simpler to start?
