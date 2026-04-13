# goodplan

**Tools that keep coding agents on track across sessions, branches, and features.**

Claude Code changed how I build software. But on real projects — multi-week, multi-session, large and complex — I struggle to keep Claude on track. Context evaporates between sessions. Patterns get applied inconsistently, leaving the codebase fragmented. I become the verification bottleneck, manually checking work Claude could check itself. Discoveries get dropped. The same mistakes repeat. And Claude always wants to jump straight into code instead of thinking first.

I built goodplan to fix this. It's a workflow plugin that keeps project state — architecture, decisions, conventions, and learnings — in your repo, and proactively delivers the right context to the coding agent at each phase of the workflow. The result: you can take on ambitious, long-lived projects without the codebase falling apart.

## Install

### Claude Code

```bash
# Add the goodplan marketplace:
claude plugin marketplace add https://github.com/ian97531/goodplan.git

# Install the plugin:
claude plugin install goodplan
```

Then start Claude Code in your project directory and run `/gp:create-epic` to get started, or `/gp:init` to add goodplan to an existing codebase.

### Codex

Codex supports both a repo-local build and a release-published marketplace branch. The Claude marketplace flow remains unchanged.

```bash
# Build the repo-local Codex plugin.
# Requires Bun on PATH for a real binary build.
bash scripts/build-codex-plugin.sh

# The build writes the plugin to:
#   plugins/goodplan/
#
# And the repo-local marketplace entry already points Codex at:
#   .agents/plugins/marketplace.json
```

To make the plugin available from any repo on the current machine, install it into the home-local Codex marketplace layout:

```bash
bash scripts/install-codex-plugin-home.sh --build
```

That installs the plugin into `~/plugins/goodplan` and adds or updates `~/.agents/plugins/marketplace.json`.

Local builds compile the `gp` binary for the current host platform by default. To pin a specific output during development, set `GOODPLAN_BINARY_PLATFORM` to one of `macos-arm64`, `macos-x64`, `linux-arm64`, or `linux-x64`. To build multiple binaries into one plugin payload, set `GOODPLAN_BINARY_PLATFORMS` to a comma-separated list of those values.

In Codex, goodplan currently loads as namespaced skills in the skills interface, not as slash commands. Use `$goodplan:...` in your prompt or select the skill from the skills UI. For example:

- `$goodplan:init`
- `$goodplan:create-epic`
- `$goodplan:plan-slice`
- `$goodplan:implement`
- `$goodplan:audit`

The underlying workflow content is the same in both hosts. Release builds now publish the full supported binary set, while repo-local builds follow the native platform unless overridden.

## Features

### Getting Oriented — never lose track of where you are

- **Multi-session continuity** — project state lives in git and is designed for merging. Pick up where you left off, on any branch, in any session.
- **Always know where you are** — see recent completions, current work, and recommended next steps. Reorient in seconds after any break.
- **Interrupted work detection** — the workflow knows when work was partially completed and offers to resume from where you left off.
- **Onboard existing repos** — scan an existing codebase to extract conventions, architecture, and subsystem structure without starting from scratch.

### Exploration & Architecture — investigate options, then commit

- **Interactive exploration** — research libraries and APIs, brainstorm options with pros/cons analysis, or prototype ideas — all with findings captured as persistent artifacts.
- **Prototyping before commitment** — build throwaway spikes to validate ideas before they become architecture. Keep what works, discard what doesn't.
- **Interactive architecture definition via design trees** — systematically explore the design space so you make deliberate choices, not default ones. Covers subsystems, API surfaces, data models, and integration points.
- **Convention capture** — record tech stack choices, naming conventions, code style, and testing practices as project-level guidance that informs all future work.

### Planning — set Claude up to succeed before it writes code

- **End-to-end first** — the first piece of work cuts through every layer of the system to prove the architecture works, even if each layer is minimal.
- **Front-loaded risk** — known unknowns, logging, and observability ship early so later work is debuggable.
- **Interactive planning** — structured Q&A walks through each phase's outcomes, implementation approach, and verification before committing to a plan.
- **Automated plan refinement** — parallel automated reviewers score plans on multiple dimensions. Plans iterate until quality thresholds are met.

### Building — automated implementation with built-in quality gates

- **Test-driven implementation** — red-green TDD with verifiable success criteria, so the agent can iterate autonomously and produce complex implementations.
- **Phased execution** — plans are implemented phase-by-phase with automated review after each phase, not all at once.
- **Automated review cycles** — parallel specialist reviewers (generalist + domain-specific) provide feedback after each implementation phase.
- **Checkpoint and resume** — implementation progress is recorded per-phase. Interrupt and resume without re-doing completed work.
- **Verification at every step** — lint, build, and test after each phase, plus plan-specified integration checks. Nothing ships unchecked.
- **Side quests** — unplanned work that comes up mid-build gets the same plan/refine/implement discipline without derailing your epic.

### Learning & Improving — mistakes don't repeat, context doesn't disappear, ideas don't get dropped

- **Learning accumulation** — learnings captured at each step, rolled up to epic and project levels. When Claude starts new work, it has access to everything learned before.
- **Quick capture** — jot down bugs, ideas, and improvements mid-flow without losing context. Promote to side-quests or epics later.
- **Deferred work routing** — work identified during implementation that belongs in a future piece of work gets captured and routed automatically.
- **Current and target architecture** — project-level architecture tracks current reality. Each epic defines its own target architecture — the desired end state. Deltas reconcile on completion.
- **Decisions with revisit triggers** — decisions are tracked artifacts that get re-evaluated when their assumptions change.
- **Subsystem maturity tracking** — tracks which subsystems have stable APIs that other parts depend on versus which are new and expected to change. Planning adapts accordingly.
- **Architecture, documentation, and test auditing** — compare what was intended against what was built to find drift, gaps, stale docs, and coverage holes.

## Reference

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

Each step produces artifacts that persist across sessions. Use `/gp:status` in Claude Code or `$goodplan:status` in Codex at any time to see where you are and what to do next.

**Getting started:**
- Claude: `/gp:init` or Codex: `$goodplan:init` — Initialize a new project or onboard an existing codebase
- Claude: `/gp:upgrade` or Codex: `$goodplan:upgrade` — Migrate project state after CLI updates

**Status and capture:**
- Claude: `/gp:status` or Codex: `$goodplan:status` — See where you are, what to do next
- Claude: `/gp:task` or Codex: `$goodplan:task` — Quick-capture a bug, idea, or improvement without breaking flow

**Defining an epic:**
- Claude: `/gp:create-epic` or Codex: `$goodplan:create-epic` — Define a body of work: goals, architecture, and slices via a 6-phase pipeline
- Claude: `/gp:explore` or Codex: `$goodplan:explore` — Research, brainstorm, or prototype before committing
- Claude: `/gp:start-epic` or Codex: `$goodplan:start-epic` — Review and approve an epic's architecture before activation

**Building an epic slice or side-quest:**
- Claude: `/gp:plan-slice` or Codex: `$goodplan:plan-slice` — Create and refine an implementation plan with automated reviewers
- Claude: `/gp:implement` or Codex: `$goodplan:implement` — Execute plans phase-by-phase with built-in review
- Claude: `/gp:create-side-quest` or Codex: `$goodplan:create-side-quest` — Spin up unplanned work with the same plan/review discipline
- Claude: `/gp:complete-epic` or Codex: `$goodplan:complete-epic` — Synthesize learnings, update architecture, archive

**Auditing:**
- Claude: `/gp:audit` or Codex: `$goodplan:audit` — Compare intended architecture, docs, and tests against actual code

### The CLI

Behind the scenes, goodplan includes a compiled CLI (`gp`) that the skills use to manage project state. You won't interact with it directly — the skills handle that — but it's what makes the workflow reliable:

- **State machine** — enforces valid transitions between phases, so work can't skip steps or get into an inconsistent state
- **Context bundling** — assembles the right architecture docs, decisions, conventions, and learnings for each phase, so Claude gets what it needs without you having to find and paste it
- **Deterministic state management** — all reads and writes go through validated schemas with atomic writes, so project state doesn't corrupt even across concurrent sessions

## License

MIT
