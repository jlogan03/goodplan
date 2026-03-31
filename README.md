# goodplan

**Stop babysitting Claude. Start shipping.**

goodplan is a structured development workflow for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). It gives your AI assistant project memory, workflow discipline, and multi-session continuity — so you can set direction and let it work, instead of hand-holding every step.

## The Problem

Claude Code is powerful, but on real projects you end up as a human cron job: trigger a task, wait, read output, give the next instruction, repeat. Context gets lost between sessions. Architecture decisions get forgotten. The same mistakes happen twice.

goodplan fixes this by keeping project state in your repo — architecture, decisions, learnings, and progress — and providing a workflow that knows what to do next.

## Features

### Getting Oriented

- **Multi-session continuity** — project state lives in git. Pick up where you left off, on any branch, in any session.
- **Always know where you are** — see recent completions, current work, and recommended next steps. Reorient in seconds after any break.
- **Interrupted work detection** — the workflow knows when work was partially completed and offers to resume from where you left off.
- **Onboard existing repos** — scan an existing codebase to extract conventions, architecture, and subsystem structure without starting from scratch.

### Exploring & Designing

- **Structured exploration** — research libraries and APIs, brainstorm options with pros/cons analysis, or prototype ideas — all with findings captured as persistent artifacts.
- **Prototyping before commitment** — build throwaway spikes to validate ideas before they become architecture. Keep what works, discard what doesn't.
- **Design tree architecture** — systematically explore the design space so you make deliberate choices, not default ones. Covers subsystems, API surfaces, data models, and integration points.
- **Convention capture** — record tech stack choices, naming conventions, code style, and testing practices as project-level guidance that informs all future work.
- **Architectural invariants** — define system-wide constraints (error handling, data integrity, security, performance) that must hold across all work.

### Planning & Slicing

- **Tracer bullet slicing** — first slice cuts end-to-end through every layer to prove the architecture works, even if each layer is minimal.
- **Front-loaded risk** — known unknowns, logging, and observability ship early so later work is debuggable.
- **Interactive planning** — structured Q&A walks through each phase's outcomes, implementation approach, and verification before committing to a plan.
- **Iterative plan refinement** — parallel automated reviewers score plans on multiple dimensions. Plans iterate until quality thresholds are met, before implementation starts.
- **Stale assumption detection** — plans flag when architecture has changed since goals were written and update before proceeding.
- **Dependent research** — external libraries and APIs mentioned in plans are researched during planning, not discovered during implementation.

### Building

- **Test-driven implementation** — red-green TDD with verifiable success criteria, so the agent can iterate autonomously and produce complex implementations.
- **Phased execution** — plans are implemented phase-by-phase with review after each phase, not all at once.
- **Automated review cycles** — parallel specialist reviewers (generalist + domain-specific) provide feedback after each implementation phase.
- **Checkpoint and resume** — implementation progress is recorded per-phase. Interrupt and resume without re-doing completed work.
- **Verification at every step** — lint, build, and test after each phase, plus plan-specified integration checks. Nothing ships unchecked.
- **Atomic commits** — each phase produces a commit with a summary and plan reference, keeping git history clean and traceable.

### Learning & Improving

- **Learning accumulation** — learnings captured per-slice and per-quest, rolled up to epic and project levels. When Claude starts new work, it has access to everything learned before.
- **Two-level architecture** — project-level tracks current reality; epic-level tracks where you're headed. Deltas reconcile on completion.
- **Subsystem maturity tracking** — the system knows which parts of your codebase are well-understood and which need more care.
- **Architecture auditing** — compare intended architecture against actual code to find drift, gaps, and improvement opportunities.
- **Documentation and test auditing** — find stale docs, undocumented APIs, coverage gaps, and fragile test patterns.
- **Maturity-aware planning** — when work touches mature subsystems, the workflow requires fitness function updates and migration steps.

### Staying Organized

- **Quick capture** — jot down bugs, ideas, and improvements mid-flow without losing context. Promote to quests or epics later.
- **Side quests** — unplanned work gets the same plan/refine/implement discipline without derailing your epic.
- **Decisions with revisit triggers** — decisions are tracked artifacts that get re-evaluated when their assumptions change.
- **Git-native and mergeable** — all state is JSON, JSONL, and Markdown with deterministic key ordering, designed for minimal merge conflicts across branches.
- **Next-action recommendations** — after each state transition, the workflow suggests what to do next based on current project state.
- **Deferred work routing** — work identified during implementation that belongs in a future slice gets captured and routed automatically.

## How It Works

goodplan adds two things to Claude Code:

1. **A CLI** (`gp`) that manages all project state
2. **Skills** (slash commands) that guide Claude through the workflow

### The Workflow

```
/create-epic → /explore → /create-architecture → /create-slices
                                                       ↓
              /complete ← /implement-plan ← /refine-plan ← /create-plan
```

Each step produces artifacts that persist across sessions. Use `/project-status` at any time to see where you are and what to do next.

### Project Structure

goodplan keeps a `.goodplan/` directory in your repo — tracked by git, branch-coupled, human-readable:

```
Project
├── Goal & constraints
├── Conventions (tech stack, code style)
├── Architecture (current state of the system)
├── Decisions (active, with revisit triggers)
├── Learnings (accumulated across all work)
│
├── Epics (large bodies of work)
│   ├── Target architecture (where this epic takes the system)
│   ├── Research & brainstorming artifacts
│   └── Slices (ordered, vertically-integrated units of work)
│       ├── Plan → Refined plan
│       ├── Learnings (rolled up to epic and project)
│       └── Architecture deltas (what changed)
│
├── Side Quests (unplanned work — bugs, improvements, detours)
│   ├── Plan → Refined plan
│   └── Learnings
│
└── Tasks (lightweight capture — ideas, bugs, notes)
    └── Convertible to quests or epics
```

### Skills Reference

| Skill | Purpose |
|---|---|
| `/project-status` | See where you are, what to do next |
| `/create-epic` | Define a body of work with goals and constraints |
| `/explore` | Research, brainstorm, or prototype before committing |
| `/create-architecture` | Drive architecture decisions through a design tree |
| `/create-slices` | Break work into ordered slices using tracer bullet approach |
| `/create-plan` | Produce a detailed implementation plan for a slice |
| `/refine-plan` | Iteratively improve plans with automated reviewers |
| `/implement-plan` | Execute plans phase-by-phase with built-in review |
| `/complete` | Synthesize learnings, update architecture, archive |
| `/capture` | Quick-capture a bug, idea, or improvement without breaking flow |
| `/onboard-repo` | Scaffold goodplan onto an existing codebase |
| `/audit-architecture` | Compare intended architecture against actual code |
| `/audit-docs` | Find stale docs, undocumented APIs, inconsistencies |
| `/audit-tests` | Analyze test quality, coverage gaps, fragile patterns |
| `/refine-architecture` | Iteratively improve architecture files |
| `/refine-slices` | Refine slice definitions and sequencing |

### CLI

The CLI owns all project state. Skills read and write state through it, never by editing files directly.

```bash
gp status                    # Project overview
gp epic:list                 # List epics
gp slice:show my-slice       # Slice details with plan status
gp learning:list --json      # Query learnings programmatically
```

## Install

### From Source

Requires [Bun](https://bun.sh) 1.3+.

```bash
git clone https://github.com/ian97531/goodplan.git
cd goodplan
bun install
bun run install:skills
```

This compiles the `gp` binary to `~/.local/bin/` and copies skills to `~/.claude/skills/`. Make sure `~/.local/bin` is in your PATH.

### As a Claude Code Plugin

```bash
claude plugin add goodplan
```

> Plugin distribution is under active development.

## Quick Start

```bash
# In your project directory:
claude

# Then in Claude Code:
> /create-epic
```

The workflow will guide you from there. Use `/project-status` at any time to see where you are and what to do next.

## Design Principles

- **CLI owns state, LLM owns judgment.** Deterministic mechanics (state transitions, validation, context bundling) live in the CLI. Creative work (planning, reviewing, implementing) stays with Claude.
- **Everything in git.** Architecture, decisions, learnings, and progress travel with your branches. Each branch reflects its own reality.
- **Multi-session continuity.** Any Claude Code session can resume where the last one left off. No context lost.
- **Structured but not rigid.** Skip phases for trivial changes. Go back to planning mid-implementation. The workflow adapts to the work.

## Tech Stack

- TypeScript 5.8 (strict mode)
- Bun runtime and compiler
- Single compiled binary (~57 MB per platform)
- macOS (arm64, x64) and Linux (x64)

## Contributing

Contributions welcome. Please open an issue before starting significant work so we can discuss approach.

## License

MIT
