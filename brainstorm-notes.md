# dev-flow Plugin - Brainstorm Notes

## Origin

Merging two approaches:
1. A "7 phases of AI development" framework (Idea, Research, Prototype, PRD, Kanban, Execute, QA) from a YouTube video
2. The user's existing workflow: system architecture with modular subsystems and API contracts, vertical slices built iteratively, with learnings feeding back into architecture and future slices

## Problem Being Solved

The user currently manages a multi-session development workflow manually, acting as a message bus between:
- An "orchestrator" session (owns architecture, slice sequencing)
- A "plan-writer" session (writes detailed plans per vertical slice)
- Throwaway sessions (plan refinement, implementation)

Context shuttling between sessions is tedious and error-prone. Sessions have context limits requiring manual memory management.

## Core Design Decisions

### Single Entry Point
- One `/project` command that the user interacts with
- It knows where we are, what's been done, what's next
- Claude Code drives the process, not the user figuring out next steps
- Stops after each step, presents summary, waits for user input before continuing

### Files Are the Message Bus
- All state lives in `.project/` files in the repo
- Every invocation reads state from disk, does work, writes state back
- Any fresh session can run `/project` and pick up where things left off
- No persistent sessions needed

### Single Skill, Sub-Agents for All Work
- The `/project` skill is the only entry point. It never invokes other skills.
- For interactive phases (capture idea, brainstorm, define architecture, write plan, QA, complete):
  the skill reads phase-specific instruction files from the plugin and follows them inline in the main session
- For autonomous phases (research, refinement, implementation):
  the skill spawns sub-agents via the Agent tool, giving each:
  - The path to its instruction file in `agent-instructions/`
  - Paths to the relevant `.project/` context files
  - The path where it should write its output
  - A request to return only minimal status (score, verdict, or summary) to keep the main session context clean
- All detailed feedback flows through files on disk (in `.project/vertical-slices/<slice>/refinement/` and `implementation/`)
- This avoids the broken skill-to-skill invocation issue and the sub-agent nesting limitation
- Phase-specific instruction files live in `phase-instructions/`, not `commands/`. The orchestrator reads them on demand.

### Learning Loop
- Feedback/learnings captured after BOTH refinement and implementation
- Learnings written to per-slice files AND accumulated in top-level learnings.md
- Future slice planning explicitly reads and applies past learnings
- Architecture updated based on implementation discoveries (with user confirmation for breaking changes)

### Conversational Jumping and Side Quests
- User can redirect to any phase at any time ("actually, let's update the architecture")
- Side quests can interrupt a vertical slice
- Side quests can emerge from:
  - User redirecting mid-slice ("we need to set up testing infrastructure first")
  - Sub-agent recommendation during implementation/review ("this needs a refactor pass")
  - Standalone, outside of any slice work
- Sub-agent output files (result.md, review.md) can include a `## Recommendations` section. Sub-agents are explicitly told they can recommend new work that should be planned, refined, and implemented — for example, side quests for refactoring, infrastructure improvements, or technical debt they've identified. The main session checks for this section when reading sub-agent outputs and presents recommendations to the user for confirmation before creating a side quest or additional slice.

### state.md — Ephemeral, Not Checked In
`state.md` is gitignored. It serves two purposes:

**1. Work stack (LIFO queue):**
Tracks interrupted work items so we can return to them. Example:
```
- side-quest/setup-test-infra (interrupted vertical-slice/user-auth at implementation phase 1)
```
Usually empty. Items get pushed when work is interrupted (e.g., side quest emerges mid-slice) and popped when that work completes or is abandoned.

**Invariant:** The work stack must be empty before a branch can be pushed and considered mergeable. Everything interrupted must be completed or abandoned first.

**2. Session continuity (survives compaction and new sessions):**
Captures resumption hints so a compacted or fresh session can pick up faster:
- What step of what phase we're in the middle of
- What we were about to do next
- Current refinement round number, or which implementation phase we're on

**Important:** state.md must NOT hold decisions or information that isn't also written to `.project/` files. All decisions must be persisted to the appropriate `.project/` file immediately. state.md is purely an optimization for faster resumption — if it's deleted, the file existence state machine can always derive the next step.

**Why not checked in:**
- A fresh checkout can always derive the next step from the file existence state machine — state.md is an optimization, not a requirement
- state.md tracks ephemeral per-session context that doesn't belong in shared history
- Avoids merge conflicts on a file that's inherently per-session

### File Existence as State Machine
- The orchestrator infers slice/quest status from which files exist in each directory:
  - Only `goal.md` → explore loop or plan writing
  - `goal.md` + files in `research/` or `brainstorm/` but no `explore-complete.md` → explore loop in progress
  - `explore-complete.md` exists (or `explore-skipped.md`), no `plan.md` → needs plan writing
  - `plan.md` exists, no `refined-plan.md` → needs refinement
  - `refined-plan.md` exists, not all implementation phases have passing reviews → needs implementation
  - Some `implementation/phase-N/review.md` exist with passing verdicts → implementation in progress
  - All implementation phases have passing `review.md` files, no `after-implementation-fixes-and-polish.md` → needs QA & polish
  - `after-implementation-fixes-and-polish.md` exists, no `completion/` → needs completion & propagation
  - `completion/learnings.md` exists → complete
  - `interrupted.md` exists → paused, interrupted by a side quest (contains quest name and phase when interrupted)
  - `abandoned.md` exists → abandoned (takes precedence over all other states, including interrupted)
- `sequencing.md` captures slice ordering and dependencies but no status — file existence is the source of truth
- Can't get out of sync with reality

At the project level, the same pattern applies:
  - `idea.md` exists, no `architecture/` → explore loop or architecture definition
  - `explore-complete.md` or `explore-skipped.md` at `.project/` root → project-level explore done
  - `architecture/_overview.md` exists, no `vertical-slices/sequencing.md` → needs slice planning

**Skip and completion markers:**
- `explore-skipped.md` — written when the user explicitly skips the explore loop (contains reason/confirmation)
- `explore-complete.md` — written when the user exits the explore loop (contains summary of what was explored)
- These exist at the project level (`.project/explore-*.md`) and per-slice/quest (`<slice-name>/explore-*.md`)

### Abandonment
- Vertical slices and side quests can be abandoned at any point in their lifecycle
- When abandoned, an `abandoned.md` file is written to the slice/quest directory containing:
  - Reason for abandonment
  - What was learned before abandoning (still valuable — failed approaches teach us things)
  - Any code that was written and whether it should be reverted or kept
  - Whether this work might be revisited later
- Learnings from abandoned work still get rolled up into top-level `learnings.md`
- If the abandoned slice/quest was interrupting something (on the state.md stack), the interrupted work resumes
- The orchestrator skips abandoned items when looking for the next actionable work
- Abandoned items remain in the directory (not deleted) for historical reference

### Skippable Phases
- Not every project needs research or prototyping
- When the orchestrator detects no open questions or prototyping needs, it offers to skip
- The flow should not feel rigid

## .project/ File Structure

```
.project/
├── state.md                              # GITIGNORED — ephemeral work stack + session continuity
│                                         #   Read first on every invocation for fast resume
│                                         #   Not required — file existence state machine is the source of truth
├── flow-log.jsonl                        # Append-only JSONL log of all steps taken (audit trail)
│                                         #   Each line: {"ts","phase","scope","status","summary",...,"detail":"flow-log/file.md"}
├── flow-log/                             # Detail files referenced by flow-log.jsonl entries
│   └── <phase>-<scope-slug>-<YYYYMMDDTHHmmss>.md  # Only created for notable events (retries, failures, etc.)
├── idea.md                               # Structured idea (problem, outcome, scope, constraints, open questions)
├── learnings.md                          # Top-level accumulated learnings across all slices
├── conventions.md                        # Project setup: mono repo vs not, language, frameworks,
│                                         #   dependencies, directory structure, file naming,
│                                         #   code style, testing approach
├── research/
│   └── <topic>.md
├── prototypes/                           # Exploratory - try different approaches (UI or non-UI)
│   └── <name>/
│       ├── <prototype files>
│       └── summary.md
├── architecture/                         # Canonical technical design
│   ├── _overview.md                      # System overview
│   ├── conventions.md                    # Architectural patterns: data modeling conventions,
│   │                                     #   subsystem communication patterns, error propagation,
│   │                                     #   state management, other structural patterns
│   ├── data-model.md
│   ├── <subsystem>-api.md
│   ├── flows.md
│   ├── information-architecture.md
│   ├── ui-ux.md
│   └── ui-mock/                          # Canonical UI reference (not exploratory)
│       ├── index.html
│       ├── styles.css
│       ├── script.js
│       └── summary.md
├── explore-complete.md                   # Written when project-level explore loop is exited (summary)
├── explore-skipped.md                    # Written when project-level explore loop is skipped (reason)
├── side-quests/                          # Non-slice work: refactors, infra, tooling, explorations
│   └── <quest-name>/                     # Same internal structure as vertical slices
│       ├── goal.md
│       ├── abandoned.md
│       ├── explore-complete.md           # Written when quest-scoped explore loop is exited
│       ├── explore-skipped.md            # Written when quest-scoped explore loop is skipped
│       ├── research/                     # Optional — quest-scoped explore loop
│       │   └── <topic>.md
│       ├── brainstorm/                   # Optional — quest-scoped explore loop
│       │   └── <topic>.md
│       ├── plan.md
│       ├── refined-plan.md
│       ├── refinement/
│       │   └── ...
│       ├── implementation/
│       │   └── ...
│       └── completion/
│           ├── learnings.md
│           └── architecture-updates.md
├── retrospectives/                       # Retrospective reports (one per retrospective run)
│   └── <YYYY-MM-DD>.md
├── brainstorm/                           # Captured brainstorming output from exploration loop
│   └── <topic>.md
└── vertical-slices/
    ├── sequencing.md                     # Slice ordering, dependencies, rationale (no status — file existence is truth)
    └── <slice-name>/
        ├── goal.md
        ├── abandoned.md                   # If present, slice is abandoned (reason, learnings, revert info)
        ├── interrupted.md                 # If present, slice is paused (what interrupted it, what phase it was in)
        │                                  #   Written when a side quest takes over, removed when slice resumes
        ├── explore-complete.md            # Written when slice-scoped explore loop is exited
        ├── explore-skipped.md             # Written when slice-scoped explore loop is skipped
        ├── research/                      # Optional — slice-scoped research from explore loop
        │   └── <topic>.md
        ├── brainstorm/                    # Optional — slice-scoped brainstorming from explore loop
        │   └── <topic>.md
        ├── plan.md                       # Initial plan (consumed by refine-plan)
        ├── refined-plan.md               # Plan after refinement (consumed by implement-plan)
        ├── plan-learnings-and-feedback.md  # Written by orchestrator after refinement — what the refinement process revealed about the plan's weaknesses, recurring reviewer concerns, and how the plan evolved
        ├── after-implementation-fixes-and-polish.md   # Log of QA/polish session with human
        ├── refinement/                    # Plan refinement working directory
        │   ├── round-1/
        │   │   ├── codebase-alignment.md  #   Written by reviewer sub-agent
        │   │   ├── technical-design.md
        │   │   ├── security.md
        │   │   ├── performance.md
        │   │   ├── reliability.md
        │   │   ├── testing.md
        │   │   ├── docs-and-accessibility.md
        │   │   ├── observability.md
        │   │   └── migration.md
        │   │   # Each reviewer file includes a numeric score (1-10) at the top
        │   │   # Main session reads just the score from each file — completes when all are ≥9
        │   │   # Reviewers are not told the threshold — they score based on quality alone
        │   ├── round-2/
        │   │   └── ...
        │   ├── working-plan.md            #   Plan-updater writes here between rounds; renamed to refined-plan.md on completion
        │   └── summary.md                #   Written by orchestrator when refinement completes — final scores, rounds taken, key changes made
        ├── implementation/                # Implementation working directory
        │   ├── phase-1/
        │   │   ├── result.md             #   Written by implementer sub-agent
        │   │   ├── review.md             #   Written by reviewer sub-agent
        │   │   └── iteration-2/          #   If review failed, next attempt
        │   │       ├── result.md
        │   │       └── review.md
        │   ├── phase-2/
        │   │   └── ...
        │   #   No status.md — orchestrator counts phase-N/ dirs with passing review.md vs total phases in plan
        └── completion/
            ├── learnings.md              #   Per-slice learnings before rolling up
            └── architecture-updates.md   #   Proposed architecture changes
```

### Key Distinctions
- **research/** = investigating unknowns (external APIs, libraries, domain knowledge)
- **brainstorm/** = captured output from brainstorming sessions (ideas explored, options considered, decisions made)
- **prototypes/** = exploratory, try multiple ideas (UI or non-UI: algorithms, system designs, integrations). Project-level only — per-slice explore loops use research/ and brainstorm/ but not prototypes/.
- **research + brainstorm + prototypes** form the "explore loop" — iterate in any order until ready to define architecture
- **architecture/ui-mock/** = canonical UI reference, only updated when a deliberate decision is made to change it
- **vertical-slices/** = end-to-end slices delivering testable user value
- **side-quests/** = non-slice work (refactors, infra, tooling, explorations) that goes through the same plan→refine→implement→complete flow but isn't a vertical slice. Learnings and architecture updates feed back into the main project just like slices do.
- **plan.md vs refined-plan.md** = before/after refinement; if refined-plan.md exists, it's what gets implemented
- **Per-slice learnings files** = detailed record per slice
- **Top-level learnings.md** = accumulated working summary for future planning
- **state.md** = where we are now (current phase, active slice, jump context). Read first on every invocation so a new session can resume immediately.
- **flow-log.jsonl** = how we got here (append-only audit trail of all steps)
- **.project/conventions.md** = project-level tech stack, repo structure, coding conventions. Read by ALL sub-agents (implementation, review, etc.) for coding style and project setup context.
- **architecture/conventions.md** = architectural patterns applied across all subsystems (data modeling, error propagation, communication patterns). Read by plan writing, review, and implementation sub-agents for architectural consistency.

### Conventions and CLAUDE.md
- The plugin adds a "Project Context" section to the repo's `CLAUDE.md` with relative-path references to key `.project/` files (idea.md, architecture/, conventions.md, architecture/conventions.md, learnings.md)
- Written incrementally: capture-idea adds the idea.md reference, define-architecture adds the rest
- Appends to existing CLAUDE.md if one exists, creates it if not
- User's global `~/.claude/CLAUDE.md` has universal preferences; repo-level one has project-specific references

## Phase Flow

Phases are either **interactive** (the orchestrator handles them in the main session, with user conversation) or **autonomous** (the orchestrator spawns sub-agents and monitors progress via files).

```
/project reads state → determines phase → reads phase instructions → executes or delegates

Phases:
1. Capture Idea              (interactive — user conversation in main session)
2. Explore Loop              (iterate until confident enough to define architecture; skippable)
   2a. Research               (autonomous — spawns research sub-agents in parallel)
   2b. Brainstorm             (interactive — user conversation, captures output to brainstorm/)
   2c. Prototype              (interactive — user conversation)
   Any combination, any order, as many iterations as needed. Exit when ready.
3. Define Architecture        (interactive — grills the user on decisions)
   3a. Project Conventions    (repo structure, tech stack, coding conventions)
   3b. Architecture Patterns  (data modeling, communication, error handling patterns)
4. Plan Vertical Slices       (interactive — user conversation)

For each slice (and side quests follow the same flow):
  5. Explore Loop             (optional — research/brainstorm scoped to this slice; skippable)
     → outputs written to <slice-name>/research/ and <slice-name>/brainstorm/
     → exit when ready to write a plan
  6. Write Plan               (interactive — reads all context + learnings, user conversation)
  7. Refine Plan              (autonomous — spawns reviewer sub-agents, monitors scores)
     → reviewers write to refinement/round-N/, produces refined-plan.md
     → captures plan-learnings-and-feedback.md
  8. Implement Plan           (autonomous — spawns implementer/reviewer sub-agents)
     → implementer/reviewer write to implementation/phase-N/
     → progress inferred from phase-N/ directories with passing review.md files
  9. Human QA & Polish        (interactive — human tries implementation, works with agent
                               to fix bugs and make small improvements)
     → captures after-implementation-fixes-and-polish.md
     → if larger issues found: new side quest or full plan→refine→implement cycle
  10. Complete & Propagate    (interactive — on the branch before push)
     → captures learnings in completion/learnings.md
     → rolls up learnings to top-level learnings.md
     → proposes updates to architecture and idea/goals if learnings warrant it
     → reviews remaining unimplemented slices: do goals need updating? new slices needed? side quests needed?
     → asks if cleanup/refactor pass is needed before next slice
     → all of this is committed on the branch, then pushed and PR created

After all slices:
  11. Retrospective           (review flow effectiveness, propose improvements)
```

## Interaction Model

- User runs `/project`
- Skill reads `.project/` state, presents current status and recommended next step
- User says "continue" (follows recommendation) or redirects conversationally
- After each step: summary, opportunity for questions/changes, wait for user
- For autonomous work (refinement, implementation): spawns sub-agents with file-based instructions, reports results
- If context gets long: checkpoint to files, user starts fresh session, `/project` picks up

## Research Findings

### Skill-to-Skill Invocation is Broken
GitHub issues #17351, #29191: when a skill invokes another skill via the Skill tool, the parent skill loses execution context after the nested skill completes. This invalidates the original design of `/project` invoking `plan-refine.md` and `plan-implement.md` via Skill tool.

### Sub-Agents Can't Spawn Sub-Agents
Architectural constraint of Claude Code. Also applies to agent teams. This means refine/implement logic can't be pushed into sub-agents that then spawn their own review sub-agents.

### Command File Size: ~50KB Practical Limit
Instruction-following degrades with larger files ("lost in the middle" problem). Recommendation: split into focused commands at ~10-15KB each. The existing `/refine-plan` (~52KB) and `/implement-plan` (~36KB) are at or above this limit.

### Phase-Chaining Stop Hook
The ralph-loop plugin demonstrates a pattern: a Stop hook reads state from disk, blocks the stop, and feeds a new prompt back into the session. Could be used to chain phases, but is fragile and removes user control between phases. Decision: use Stop hooks for reminders only, not for control flow.

### Hook Capabilities
9 hook types available: PreToolUse, PostToolUse, Stop, SubagentStop, UserPromptSubmit, SessionStart, SessionEnd, PreCompact, Notification. Can inject system messages, block tools, modify inputs, access transcripts.

## Sub-Agent-via-Files Architecture

### The Problem
The main session needs to orchestrate plan refinement (8 parallel reviewers + plan updater loop) and implementation (implementer + reviewer loop). But:
- Skill-to-skill invocation is broken (can't invoke `/refine-plan` from `/project`)
- Loading 50KB of detailed review instructions into the main session wastes context
- Sub-agents can't spawn sub-agents (can't nest the orchestration)

### The Solution: Files as Message Bus for Sub-Agent Coordination
The main session commands stay lightweight (~3-8KB each, just orchestration logic). Detailed instructions for sub-agents live in separate files in the plugin's `agent-instructions/` directory. Sub-agents read their instructions from these files, not from the main session's context. All feedback flows through files on disk.

**Plan refinement loop (in main session):**
1. Spawn 9 reviewer sub-agents in parallel
   - Each reads: `agent-instructions/review-{type}.md` + the plan file + architecture.md
   - Each writes: `.project/vertical-slices/{slug}/refinement/round-N/{type}.md` (includes numeric score 1-10 at top)
   - Each returns only its score to the main session (minimal context)
   - Reviewers are NOT told the pass threshold — they score honestly based on quality
   - If any sub-agent fails to produce output: retry once, then flag to user
2. Main session checks all 9 scores: refinement completes when all scores are 9 or higher
3. **Circuit breaker** (any of these triggers stops the loop and presents the situation to the user):
   - **Decline:** aggregate score (average across all 9 reviewers) decreased from the previous round
   - **Oscillation:** aggregate score has alternated direction (up-down-up or down-up-down) across 3+ rounds
   - **Max rounds:** 10 rounds reached without all scores ≥9
   Options presented: break the plan into smaller plans, address specific conflicting feedback manually, or accept the current plan and proceed.
4. If not all scores ≥9 and aggregate is improving: spawn plan-updater sub-agent
   - Reads: `agent-instructions/update-plan.md` + all round-N feedback files + the plan
   - Writes: `refinement/working-plan.md` (reads from here on subsequent rounds; renamed to `refined-plan.md` when refinement completes). Original `plan.md` is preserved.
5. Loop to step 1

**Implementation loop (in main session):**
1. Spawn implementer sub-agent
   - Reads: `agent-instructions/implement-phase.md` + plan file + architecture.md
   - Writes: results to `.project/vertical-slices/{slug}/implementation/phase-N/result.md`
2. Spawn reviewer sub-agent
   - Reads: `agent-instructions/review-implementation.md` + changed files + plan
   - Writes: `.project/vertical-slices/{slug}/implementation/phase-N/review.md`
3. If review fails: loop with feedback (max 5 iterations per phase — if still failing, stop and consult user)
4. Move to next phase

**Sub-agent error handling:**
- The orchestrator must always verify expected output files exist and are parseable before proceeding
- If a sub-agent fails to produce output: retry once, then flag to the user with options (retry, skip, abort)
- If an implementer sub-agent fails mid-work: roll back any uncommitted changes (`git checkout .`) and retry. This is safe because the orchestrator commits after each successful phase — uncommitted changes are always from the failed attempt only.
- If a sub-agent writes malformed output: treat as failure, retry once
- General principle: fall back to user consultation when something unexpected happens, never silently proceed with missing data

**Benefits:**
- Main session context stays clean — only orchestration logic and scores
- All detailed review criteria, feedback, and results persist on disk
- Past iteration feedback is always available (not compressed away in session context)
- Any fresh session can pick up a partially-completed refinement or implementation

## Plugin Structure

```
dev-flow/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── project.md                     #   The single user-facing command (/project)
│                                      #   Reads state, determines phase, dispatches to phase instructions
├── phase-instructions/                # Phase-specific instructions read by the orchestrator on demand
│   ├── capture-idea.md                #   ~3-5KB - interactive idea structuring
│   ├── research.md                    #   ~3-5KB - spawn research sub-agents (path-agnostic: orchestrator passes output dir)
│   ├── brainstorm.md                  #   ~3-5KB - interactive brainstorming (path-agnostic: orchestrator passes output dir)
│   ├── prototype.md                   #   ~3-5KB - interactive prototyping (project-level only)
│   ├── define-architecture.md         #   ~5-8KB - interactive architecture design
│   ├── plan-slices.md                 #   ~3-5KB - interactive slice decomposition
│   ├── write-plan.md                  #   ~5-8KB - interactive plan writing (slices and side quests)
│   ├── refine-plan.md                 #   ~3-5KB - orchestration loop for plan refinement
│   ├── implement-plan.md              #   ~3-5KB - orchestration loop for implementation
│   ├── complete.md                    #   ~5-8KB - learnings, propagate to architecture/goals, review remaining work
│   ├── qa-and-polish.md               #   ~3-5KB - generate QA checklist, then interactive fix-it session
│   └── retrospective.md              #   ~3-5KB - analyze flow effectiveness
├── agent-instructions/                # Detailed instructions read BY sub-agents (not main session)
│   ├── review-codebase-alignment.md   #   Reviewer: does plan match codebase patterns?
│   ├── review-technical-design.md     #   Reviewer: architecture, data modeling, API design
│   ├── review-security.md             #   Reviewer: security concerns
│   ├── review-performance.md          #   Reviewer: performance implications
│   ├── review-reliability.md          #   Reviewer: error handling, edge cases, resilience
│   ├── review-testing.md              #   Reviewer: test coverage, test quality, test strategy
│   ├── review-docs-and-accessibility.md #   Reviewer: code comments for agent comprehension (edge cases, error handling, non-obvious logic), API docs, accessibility
│   ├── review-observability.md        #   Reviewer: logging, monitoring, debugging
│   ├── review-migration.md            #   Reviewer: rollout, migration, backwards compat
│   ├── update-plan.md                 #   Plan updater: incorporate feedback, improve plan
│   ├── implement-phase.md             #   Implementer: execute one phase of a plan
│   ├── review-implementation.md       #   Implementation reviewer: check code against plan
│   └── research-topic.md              #   Researcher: investigate a single topic
├── hooks/
│   ├── hooks.json
│   └── check-flow-state.sh            # Stop hook: remind about uncaptured learnings, stale arch
├── templates/                          # Seed templates read by phase instructions at runtime
│   ├── idea.md                        #   Used by capture-idea phase
│   ├── conventions.md                 #   Used by define-architecture phase
│   ├── architecture-overview.md       #   Used by define-architecture phase (seeds architecture/_overview.md)
│   ├── architecture-conventions.md    #   Used by define-architecture phase (seeds architecture/conventions.md)
│   ├── sequencing.md                  #   Used by plan-slices phase (seeds vertical-slices/sequencing.md)
│   ├── goal.md                        #   Used by write-plan phase (seeds <slice>/goal.md)
│   ├── learnings.md                   #   Used by complete phase
│   └── retrospective.md              #   Used by retrospective phase
└── README.md
```

## Integration with Existing Skills

Existing skills (`/refine-plan`, `/implement-plan`, `/implement-phase`, `/review-phase`) are NOT replaced. The plugin's `refine-plan.md` and `implement-plan.md` commands are new, lighter-weight versions that:
- Use the sub-agent-via-files architecture (instructions in `agent-instructions/`, feedback on disk)
- Read/write `.project/` files for state management
- Keep the main session context clean by only tracking scores and orchestration state
- Can coexist with the existing skills for use outside of a `/project` flow

## Post-Implementation QA & Polish

After implementation completes:
- The human tries out the implementation
- Works with the agent interactively to fix bugs and make small improvements (no formal plan needed)
- `after-implementation-fixes-and-polish.md` captures what was found and fixed (a log, not a plan)
- If something larger is discovered, it either becomes a new vertical slice or gets a full plan→refine→implement cycle

## Git Workflow

### Branch Per Slice/Quest
- Each vertical slice and side quest gets its own branch (e.g., `slice/user-auth`, `quest/setup-test-infra`)
- Commits are made at natural boundaries: plan written, refinement complete, each implementation phase, fixes/polish, completion
- The Complete & Propagate step happens on the branch: learnings rolled up, architecture updated, remaining slices reviewed
- Then the branch is pushed and a PR is created
- Merge conflicts on global files (`learnings.md`, `architecture/` files, `flow-log.jsonl`) are possible but manageable since each entry/update is independent — resolve by keeping all additions

### Abandoned Branches
- Abandoned branches still get merged so `.project/` state (including `abandoned.md` and learnings) makes it back to main
- A final commit on the branch reverts all changes outside of `.project/` that were made during implementation
- The `.project/` history is preserved: we know the work was attempted, why it was abandoned, and what was learned

### What Gets Gitignored
- `.project/state.md` — ephemeral per-session state, not shared

### Merge Conflict Strategy
- Slice-specific files (`.project/vertical-slices/<slice-name>/`) won't conflict because each branch works on its own directory
- Same for side quests (`.project/side-quests/<quest-name>/`)
- Global files (`learnings.md`, `architecture/` files, `flow-log.jsonl`) may have merge conflicts when multiple branches complete concurrently, but each entry is independent — resolve by keeping all additions
- `learnings.md` entries are self-contained per-slice blocks (newest first) — conflicts resolve by keeping both blocks
- `flow-log.jsonl` entries are independent log lines — conflicts resolve by keeping all lines

## Evaluation and Metrics

The workflow itself needs to be evaluated for both reliability and effectiveness. Data should be captured in `flow-log.jsonl` to support this analysis.

### Metrics to Track (per slice/quest)
- Refinement: number of rounds, scores per round (track trajectory — improving, declining, oscillating)
- Implementation: iterations per phase, blocker frequency, sub-agent failure/retry count
- QA: number of issues found, severity, whether they should have been caught by refinement or review
- Side quests spawned: count, whether they were anticipated or surprises
- Time from plan to completion (rough, from git timestamps)

### Signals of Workflow Health
- Later slices complete with fewer refinement rounds than earlier ones (learning is working)
- QA finds fewer issues over time (review quality is improving)
- Side quests decrease over time (architecture is stabilizing)
- Refinement scores improve monotonically within a round (no oscillation)

### Signals of Workflow Problems
- Refinement scores declining or oscillating (plans too large, conflicting requirements)
- Same types of QA issues recurring despite learnings (learnings not being applied)
- Frequent side quests late in the project (architecture was wrong)
- Sub-agent failures increasing (instruction files need improvement)

The retrospective phase analyzes these metrics across all slices. The orchestrator can also do lighter-weight checks after each autonomous phase ("refinement took 8 rounds — last slice took 3, worth discussing?").

## Open Design Questions (to resolve during implementation)

1. ~~Exact format of flow-log entries~~ → Resolved: JSONL with optional `detail` field pointing to `.project/flow-log/<phase>-<scope-slug>-<ts>.md`. Detail files only created for notable events (retries, failures, circuit breakers, unusual metrics). Routine completions are just the JSONL line.
2. ~~Hook implementation details~~ → Resolved: Stop hook only (`check-flow-state.sh`). No SessionStart, PreCompact, SubagentStop, or PreToolUse hooks. Add more later if a real gap emerges.
3. ~~Template file contents~~ → Resolved: Templates are runtime artifacts. Phase instructions read from `templates/` and fill in sections. Single source of truth for file formats. Actual template content written during implementation.
4. ~~How retrospective proposes flow improvements~~ → Resolved: Free-form report (`retrospective-{date}.md`) with observations and suggestions. User reads and acts manually. No auto-modifications or structured accept/reject workflow yet — want confidence in evaluation/testing first before automating changes.
5. ~~Whether conventions should auto-generate a repo-level CLAUDE.md~~ → Resolved: No auto-generation. Instead, the plugin adds a "Project Context" section to the repo's `CLAUDE.md` with references to key `.project/` files (idea.md, architecture/, conventions.md, architecture/conventions.md, learnings.md). Written incrementally: capture-idea adds the idea.md reference, define-architecture adds the rest. Appends to existing CLAUDE.md if one exists, creates it if not. Static set of top-level references only — no slice-specific details.
6. ~~Notification strategy~~ → Resolved: Out of scope. Rely on Claude Code's built-in terminal notifications. Users can add their own notification hooks globally if needed.
7. ~~Branch naming conventions and PR template~~ → Resolved: Simple prefixes — `slice/<slug>` and `quest/<slug>`, matching `.project/` directory names. Minimal PR template: Summary (from goal.md), Changes (key files/subsystems), Learnings (brief summary linking to completion/learnings.md). No checkboxes — QA info lives in `.project/` files.
