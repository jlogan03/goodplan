# goodplan

**Build bigger, better software with Claude.**

A workflow that keeps Claude on track across sessions, branches, and features.

Claude Code is great for small tasks. But on real projects — multi-week, multi-session, architecturally complex — things fall apart. Context evaporates between sessions. Claude applies patterns inconsistently, leaving your codebase fragmented. You become the verification bottleneck, manually checking work Claude could check itself. Discoveries get dropped. The same mistakes repeat. And Claude always wants to jump straight into code instead of thinking first.

goodplan is a structured development workflow for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that fixes this. It keeps project state — architecture, decisions, conventions, and learnings — in your repo, and proactively delivers the right context to Claude at each phase of the workflow. The result: you can take on ambitious, long-lived projects without the codebase falling apart.

## Install

```bash
# Add the goodplan marketplace:
claude plugin marketplace add https://github.com/ian97531/goodplan.git

# Install the plugin:
claude plugin install goodplan
```

Then start Claude Code in your project directory and run `/create-epic` to get started, or `/onboard-repo` to add goodplan to an existing codebase.

## Features

### Getting Oriented

- **Multi-session continuity** — project state lives in git and is designed for merging. Pick up where you left off, on any branch, in any session.
- **Always know where you are** — see recent completions, current work, and recommended next steps. Reorient in seconds after any break.
- **Next-action recommendations** — after each state transition, the workflow suggests what to do next based on current project state.
- **Interrupted work detection** — the workflow knows when work was partially completed and offers to resume from where you left off.
- **Onboard existing repos** — scan an existing codebase to extract conventions, architecture, and subsystem structure without starting from scratch.

### Exploring & Designing

- **Interactive exploration** — research libraries and APIs, brainstorm options with pros/cons analysis, or prototype ideas — all with findings captured as persistent artifacts.
- **Prototyping before commitment** — build throwaway spikes to validate ideas before they become architecture. Keep what works, discard what doesn't.
- **Interactive architecture definition via design trees** — systematically explore the design space so you make deliberate choices, not default ones. Covers subsystems, API surfaces, data models, and integration points.
- **Convention capture** — record tech stack choices, naming conventions, code style, and testing practices as project-level guidance that informs all future work.
- **Architectural invariants** — define system-wide constraints (error handling, data integrity, security, performance) that must hold across all work.

### Breaking Work into Deliverable Pieces

- **Tracer bullet approach** — the first piece of work cuts end-to-end through every layer to prove the architecture works, even if each layer is minimal.
- **Front-loaded risk** — known unknowns, logging, and observability ship early so later work is debuggable.
- **Interactive planning** — structured Q&A walks through each phase's outcomes, implementation approach, and verification before committing to a plan.
- **Automated plan refinement** — parallel automated reviewers score plans on multiple dimensions. Plans iterate until quality thresholds are met — fully automated, no human involvement needed.
- **Stale assumption detection** — plans flag when architecture has changed since goals were written and update before proceeding.
- **Dependent research** — external libraries and APIs mentioned in plans are researched during planning, not discovered during implementation.

### Building

- **Test-driven implementation** — red-green TDD with verifiable success criteria, so the agent can iterate autonomously and produce complex implementations.
- **Phased execution** — plans are implemented phase-by-phase with automated review after each phase, not all at once.
- **Automated review cycles** — parallel specialist reviewers (generalist + domain-specific) provide feedback after each implementation phase.
- **Checkpoint and resume** — implementation progress is recorded per-phase. Interrupt and resume without re-doing completed work.
- **Verification at every step** — lint, build, and test after each phase, plus plan-specified integration checks. Nothing ships unchecked.
- **Atomic commits** — each phase produces a commit with a summary and plan reference, keeping git history clean and traceable.
- **Side quests** — unplanned work that comes up mid-build gets the same plan/refine/implement discipline without derailing your epic.

### Learning & Improving

- **Learning accumulation** — learnings captured per-slice and per-side-quest, rolled up to epic and project levels. When Claude starts new work, it has access to everything learned before.
- **Quick capture** — jot down bugs, ideas, and improvements mid-flow without losing context. Promote to side-quests or epics later.
- **Deferred work routing** — work identified during implementation that belongs in a future piece of work gets captured and routed automatically.
- **Current and target architecture** — project-level architecture tracks current reality. Each epic defines its own target architecture — the desired end state. Deltas reconcile on completion.
- **Decisions with revisit triggers** — decisions are tracked artifacts that get re-evaluated when their assumptions change.
- **Subsystem maturity tracking** — tracks which subsystems have stable APIs that other parts depend on versus which are new, experimental, and expected to change. Planning adapts accordingly — mature subsystems require more care and migration steps, while experimental ones expect iteration.
- **Architecture auditing** — compare intended architecture against actual code to find drift, gaps, and improvement opportunities.
- **Documentation and test auditing** — find stale docs, undocumented APIs, coverage gaps, and fragile test patterns.

## How It Works

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
    └── Convertible to side-quests or epics
```

### Skills

Each step produces artifacts that persist across sessions. Use `/project-status` at any time to see where you are and what to do next.

**Getting started:**
- `/onboard-repo` — Scaffold goodplan onto an existing codebase
- `/migrate` — Migrate project state after CLI updates

**Status and capture:**
- `/project-status` — See where you are, what to do next
- `/capture` — Quick-capture a bug, idea, or improvement without breaking flow

**Defining an epic:**
- `/create-epic` — Define a body of work with goals and constraints
- `/explore` — Research, brainstorm, or prototype before committing
- `/create-architecture` — Drive architecture decisions through a design tree
- `/refine-architecture` — Iteratively improve architecture files
- `/create-slices` — Break work into ordered slices using tracer bullet approach
- `/refine-slices` — Refine slice definitions and sequencing

**Building an epic slice or side-quest:**
- `/create-plan` — Produce a detailed implementation plan
- `/refine-plan` — Iteratively improve plans with automated reviewers
- `/implement-plan` — Execute plans phase-by-phase with built-in review
- `/complete` — Synthesize learnings, update architecture, archive

**Auditing:**
- `/audit-architecture` — Compare intended architecture against actual code
- `/audit-docs` — Find stale docs, undocumented APIs, inconsistencies
- `/audit-tests` — Analyze test quality, coverage gaps, fragile patterns

### The CLI

Behind the scenes, goodplan includes a compiled CLI (`gp`) that the skills use to manage project state. You won't interact with it directly — the skills handle that — but it's what makes the workflow reliable:

- **State machine** — enforces valid transitions between phases, so work can't skip steps or get into an inconsistent state
- **Context bundling** — assembles the right architecture docs, decisions, conventions, and learnings for each phase, so Claude gets what it needs without you having to find and paste it
- **Deterministic state management** — all reads and writes go through validated schemas with atomic writes, so project state doesn't corrupt even across concurrent sessions

## Design Principles

- **CLI owns state, LLM owns judgment.** Deterministic mechanics (state transitions, validation, context bundling) live in the CLI. Creative work (planning, reviewing, implementing) stays with Claude.
- **Everything in git.** Architecture, decisions, learnings, and progress travel with your branches. Each branch reflects its own reality.
- **Multi-session continuity.** Any Claude Code session can resume where the last one left off. No context lost.
- **Structured but not rigid.** Skip phases for trivial changes. Go back to planning mid-implementation. The workflow adapts to the work.

## License

MIT
