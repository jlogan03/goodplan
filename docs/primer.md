# goodplan: Structured AI-Assisted Development

## The Problem

You're building something ambitious with an AI coding assistant. The first session goes great. By session three, you're spending more time re-explaining context than writing code. By session ten, you've lost track of what was decided, what was tried, and why the architecture looks the way it does.

AI assistants are powerful collaborators — but they forget everything between sessions. The developer becomes a human message bus: shuttling context, re-establishing decisions, and manually tracking what's done and what's next. The bigger the project, the worse this gets.

And there's a subtler problem: AI assistants are eager to build. Give them a goal and they'll start coding immediately — skipping the research, the brainstorming, the architectural thinking that separates software that lasts from software that collapses under its own weight. The speed that makes AI useful also makes it dangerous without structure.

## The Idea

What if your AI assistant could pick up exactly where it left off — every time, in every session — without you managing the state? And what if the workflow itself guided both you and the AI through the thinking that needs to happen *before* code gets written?

**goodplan** is a structured development workflow backed by a CLI that manages all the state AI assistants need to build large, complex projects across unlimited sessions. It turns the messy reality of multi-session AI development into a disciplined, repeatable process where context is never lost, decisions are traceable, and nothing falls through the cracks.

## The Concepts

goodplan organizes development around seven core concepts. Together they form a system where big ambitions get broken into manageable work, thinking happens before building, and nothing gets dropped.

### Epics

An **epic** is a large body of work — the kind of thing that takes weeks or months and spans many sessions. "Build a real-time collaboration engine." "Migrate from REST to GraphQL." "Add multi-tenant support." An epic carries its own exploration, architecture, slices, and learnings. You work on one epic at a time.

### Exploration

Before committing to any architecture or plan, goodplan encourages you to **explore**. This is a structured loop of research (spawning sub-agents to investigate libraries, patterns, trade-offs), brainstorming (interactive sessions to think through approaches), and prototyping (quick experiments to validate ideas). All output is captured — research findings, brainstorming notes, prototype results — so the thinking behind decisions is preserved, not just the decisions themselves.

This is one of goodplan's most important contributions: it makes the AI *slow down and think* before it builds. The exploration phase produces the raw material that architecture decisions are built on.

### Architecture

**Architecture** is a living set of documents — not a one-time diagram drawn on a whiteboard and forgotten. goodplan drives architecture decisions through structured Q&A, capturing your tech stack, conventions, module boundaries, and API surfaces. These documents are loaded automatically into every planning and implementation session, so the AI always builds according to *your* design.

goodplan maintains architecture at two levels: the **current architecture** (what the code actually looks like today) and the **target architecture** for each epic (where you're headed). When the AI plans a slice or quest, it can see both — understanding not just the rules of the codebase as it exists, but how this particular piece of work contributes to the bigger architectural goal. As slices and epics are completed, the current architecture is updated to reflect the new reality. The target and the actual converge over time, and the system tracks that convergence.

Architecture isn't static. As you complete slices and learn more about the problem, `/audit-architecture` compares your intended architecture against the actual code. Drift is caught early and addressed deliberately — not discovered six months later as tech debt.

### Slices

A **slice** is a vertical, end-to-end deliverable — the smallest unit of work that delivers real, verifiable value. Not "build the database layer" (horizontal), but "users can sign up and log in" (vertical). Each slice has a concrete goal and verification criteria: what would a human do to convince themselves it works?

Slices are ordered deliberately. Each one builds on the last, and the sequence is designed so you're always working on something that can be tested and demonstrated. This is the heartbeat of the project — a steady rhythm of plan, build, verify, learn.

### Side Quests

Real projects don't proceed in a straight line. You're implementing authentication and discover a performance regression in the logging system. You notice a test gap that needs filling. You realize the build pipeline needs a tweak.

These are **side quests** — work that emerges during other work. Without a system to capture them, they either derail your current slice (context switch, lose momentum) or get forgotten entirely (tech debt, dropped balls). goodplan gives side quests their own lifecycle — capture, explore, plan, implement, complete — so they're tracked and addressed without disrupting the main line of work.

### Tasks

A **task** is the lightest-weight capture mechanism — a quick note about a bug, idea, or improvement you notice mid-flow. You don't want to stop what you're doing to research it or plan it. You just want to write it down before it evaporates.

When a task is captured, goodplan also records the context you had at the time — what slice you were working on, what you were doing when you noticed it, why it seemed important. Weeks later, when you come back to the backlog, you're not staring at a cryptic one-liner wondering what you meant. The context is right there, making it easy to decide whether to act on it, convert it, or drop it.

Tasks sit in a backlog. When the time is right, they can be converted into a side quest (if they need real work) or an epic (if they're bigger than expected), or simply dropped if they turn out not to matter. The point is: nothing gets lost because you were in the middle of something else.

### Learnings

Every completed slice, side quest, and epic produces **learnings** — insights about the codebase, the tools, the workflow, the domain. These aren't vague retrospective notes. They're concrete, actionable findings: "citty string-type flags consume the next token — prefer boolean when value isn't needed." "Novel modules need 3-5x more review budget than pattern-following code."

Learnings roll up from slices to epics to the project level. When the AI plans your eighth slice, it has access to everything learned in the first seven. Plans get better over time because the system remembers what went wrong and what worked.

## The Workflow

These concepts connect through a natural progression:

```
Explore → Architecture → Slices → Plan → Refine → Implement → Complete
                                    ↑                            |
                                    └────────────────────────────┘
                                         (next slice)
```

At each phase, the AI assistant uses slash commands (`/explore`, `/create-architecture`, `/create-plan`, etc.) that automatically:

- **Load the right context** — architecture decisions, conventions, learnings from previous slices, the current goal
- **Manage state transitions** — so you can't accidentally skip steps or lose track of where you are
- **Accumulate learnings** — mistakes and insights from completed work feed forward into future planning
- **Bundle context for sub-agents** — spawned agents get exactly the context they need, automatically

The CLI (`goodplan`) owns all the deterministic mechanics — state machines, file I/O, validation, activity logging — while the AI retains ownership of judgment: interviewing you, writing code, reviewing, scoring.

And at any point, when something unexpected comes up: capture it as a task, spin it off as a side quest, or note it for the next epic. The workflow absorbs interruptions without losing them.

## What Makes This Different

**Think before you build.** The exploration phase is baked into the workflow, not optional. Research libraries before picking them. Brainstorm approaches before committing. Prototype the risky parts before planning the whole thing. The AI is guided to do the thinking that produces good software.

**Nothing gets dropped.** Tasks capture fleeting ideas. Side quests track emergent work. Learnings preserve hard-won insights. The system is designed around the reality that important things come up at inconvenient times — and gives you a place to put them that isn't your own memory.

**Context that compounds.** Every completed slice produces learnings that are rolled up and fed into future work. Your AI assistant gets smarter about *your* project over time. By slice 8, the plans account for patterns that took you 7 slices to discover.

**Architecture that stays honest.** `/audit-architecture` compares your intended architecture against actual code. Drift is caught and addressed as side quests, not ignored until it becomes a crisis.

**Plans that survive scrutiny.** `/refine-plan` runs your plan through specialized reviewer agents (security, performance, correctness, architecture) that score it. Plans iterate until they pass. Implementation failures drop dramatically when the plan has already been stress-tested.

**Resumable from anywhere.** Crash mid-implementation? Start a new session tomorrow? Run `/project-status` and get exactly where things stand: what's active, what phase it's in, and what to do next. No archaeology required.

**Fast reorientation.** Whether you've been away from a project for a week or you're juggling three projects and just switched back to this one, goodplan gets you grounded in seconds. `/project-status` reads the full project state and tells you where things stand, what was last completed, and what the natural next step is. No scrolling through chat history, no re-reading git logs — you're back in flow immediately.

**You stay in the loop.** When AI writes most of the code, it's easy to lose track of how your own system works. goodplan actively keeps your mental model current. Architecture documents evolve as decisions are made. Completion summaries explain what changed and why. Learnings surface the non-obvious things. At every stage — exploration, planning, implementation, completion — the workflow produces artifacts that help you understand the system you're building, not just the system the AI is building for you.

## The Shape of a Project

```
.project/
├── project.json              # active pointers, health metrics
├── conventions.md            # tech stack, code style, repo structure
├── learnings.md              # accumulated wisdom across all completed work
├── architecture/             # living architecture docs
├── epics/
│   └── my-epic/
│       ├── epic.json         # lifecycle state, verification criteria
│       ├── architecture/     # epic-specific target architecture
│       ├── research/         # exploration output
│       └── brainstorm/       # brainstorming output
├── slices/
│   └── 01-auth/
│       ├── slice.json        # lifecycle state
│       ├── goal.md           # what "done" looks like
│       ├── plan.md           # refined implementation plan
│       └── learnings.jsonl   # what this slice taught us
├── quests/
│   └── fix-perf-regression/
│       ├── quest.json
│       └── goal.md
└── tasks/
    └── task.jsonl            # lightweight captures — bugs, ideas, improvements
```

Every file is designed for both human readability and machine consumption. JSON for state, Markdown for content, JSONL for append-only logs.

Critically, all of this lives in your repo — checked into git alongside your code. The formats are designed to be merge-friendly: JSON files use deterministic key ordering, JSONL files are append-only, and Markdown is naturally diffable. When two developers are working on different slices, their `.project/` changes merge cleanly. Your project's entire development history — the decisions, the learnings, the architectural evolution — travels with the code.

## Onboarding Existing Projects

You don't need to start from scratch. goodplan includes a migration process that onboards existing projects — the AI walks through your codebase, asks clarifying questions about your current state, and builds the `.project/` structure to match where you actually are. Epics, slices, and quests are inferred from your existing work and captured in the right format with the right lifecycle state.

As the CLI evolves, migrations keep your `.project/` state current. The state machine validates everything, so you're never left with stale or malformed project state after an upgrade.

## Who This Is For

Engineers building projects that are too large for a single AI session but too complex to manage with ad-hoc prompting. The kind of work where you need:

- Dozens of sessions across weeks or months
- Architectural consistency as the codebase grows
- Accumulated knowledge that doesn't evaporate
- Confidence that AI-generated code follows your conventions
- A clear answer to "where are we?" at any point

## The Payoff

With goodplan, the 50th session on your project is as productive as the 5th. Your AI assistant knows what was tried, what worked, what didn't, and why the architecture looks the way it does. Ideas captured mid-flow don't vanish. Architecture decisions are grounded in research, not guesswork. And the hard-won lessons from every slice make the next one better.

You make decisions. The workflow handles the rest.
