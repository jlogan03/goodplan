# Development Workflow

This document describes the structured development process for building software with AI assistance. State lives in `.project/` files managed by the `goodplan` CLI — any session can pick up where a previous one left off by querying the CLI.

---

## Core Principles

### The CLI Is the State Owner
All `.project/` state is owned by the `goodplan` CLI. Skills interact with state exclusively through CLI commands — never by directly reading or writing JSON/JSONL files. Skills do write LLM-owned markdown (plans, architecture docs, research) directly to paths provided by the CLI.

### Single Entry Point
One `/project-status` command. It queries the CLI, knows where we are, what's been done, what's next. Stops after each step, presents a summary, waits for input before continuing.

### Learning Loop
- Learnings captured after both plan refinement and implementation.
- Written as individual markdown files in per-scope `learnings/` directories, tracked in `learnings.jsonl`.
- Rolled up from slice/quest → epic → project via `goodplan learning:rollup`.
- Future planning explicitly loads and applies past learnings via context bundling.
- Architecture updated based on implementation discoveries (with confirmation for breaking changes).
- **Intervention logging** captures every instance where the human steps in to override, correct, or unblock the LLM. These are tracked separately from learnings because they target different feedback loops — learnings improve the *product*, interventions improve the *workflow*.

### Expertise Tracking
Two-layer system calibrates communication depth to the user's skill profile:
- **`~/.claude/CLAUDE.md` `## Expertise` section** — structured categories (comfortable with / less familiar with / actively learning). Visible to all skills automatically.
- **Auto memory files (`expertise_<domain>.md`)** — detailed observations that persist across conversations.

`/create-epic` calibrates expertise for domains the project touches. All interactive skills (`/explore`, `/create-architecture`, `/create-slices`, `/create-plan`, `/complete`) check for new expertise signals after each run and update silently when observed.  `/project-status` displays the current expertise summary.

### Conversational Jumping and Side Quests
- Redirect to any phase at any time ("actually, let's update the architecture").
- Side quests can interrupt a vertical slice and emerge from:
  - User redirect mid-slice ("we need to set up testing infrastructure first")
  - Sub-agent recommendation during implementation/review
  - Standalone, outside of any slice work
- Implementation or review output can include a `## Recommendations` section proposing new side quests or epics. These are presented for confirmation before any new work is created.

### Failure Modes Are Expected, Not Exceptional
The workflow anticipates specific failure patterns and prescribes responses for each. When the system detects a failure mode, it stops, identifies the pattern, and follows the prescribed response — it does not simply retry with the same approach. Non-convergence is a signal to change strategy, not to try harder.

### Autonomy Is Earned Per Scope
The human's involvement level is not fixed — it adjusts based on demonstrated reliability within each area of the codebase. Well-understood leaf modules with a track record of clean completions earn reduced oversight. Core abstractions and novel work get close attention. The system tracks this and modulates behavior accordingly.

---

## How Work Is Organized

All work falls into one of three containers, based on scale:

| Container | Scale | Has exploration? | Has architecture proposal? | Has its own slices? |
|---|---|---|---|---|
| **Task** | Tiny — a captured note (bug, idea, improvement) | No | No | No — converts to quest or epic when acted on |
| **Quest** | Small — fits within existing architecture | Optional (research during planning) | No | No — single unit of work |
| **Epic** | Large — needs exploration, may change architecture | Yes | Yes (if touching architecture) | Yes |

**Tasks** are lightweight captures — bugs noticed during work, ideas for improvements, things to revisit later. They snapshot context (active epic/slice/quest, git branch) and can be converted to quests or epics via `goodplan task:convert`.

**Quests** are self-contained work items — small features, bug fixes, refactors, infrastructure improvements, tooling. They go through the same plan→refine→implement→complete flow as slices but don't need their own exploration or architectural thinking. Quests may optionally run a research/brainstorm loop before planning.

**Epics** are substantial bodies of work that expand the software's capabilities in a new direction. They need their own research, brainstorming, and prototyping, may propose changes to the architecture, and decompose into multiple vertical slices. The initial project build (from idea through first set of slices) is the first epic.

### Choosing Between Them

Ask: "Does this need exploration or architectural thinking?" If yes → epic. If it fits cleanly within existing architecture → quest. If it's just a note to revisit later → task.

If a quest starts to feel bigger than expected — especially if it touches a maturing or foundational subsystem — that's a signal to re-scope it as an epic.

---

## The CLI

The `goodplan` CLI is a compiled TypeScript binary that serves as the single interface to `.project/` state for both humans and LLMs. It owns all deterministic workflow mechanics — state management, transition validation, file I/O, context bundling, and activity logging — while the LLM retains ownership of judgment-driven work (interviewing users, writing content, reviewing, scoring).

### Architecture

Four-layer stack with strict unidirectional dependencies:

```
Commands → RPC Layer → State Machine + Data Layer → Filesystem
```

- **Commands** — Thin CLI layer (citty). Argument parsing, output formatting (`--json`, `--quiet`), routing.
- **RPC Layer** — Workflow orchestration. Coordinates state machine and data layer for complete operations. Assembles context bundles. Appends to activity log on every transition.
- **State Machine** — Pure rules engine, no I/O. Reducer pattern: `(state, event) → new state | error`. Manages lifecycle for all entity types.
- **Data Layer** — Entity CRUD and all filesystem I/O. JSON/JSONL with Zod schema validation. Deterministic key ordering for git-friendly diffs. Atomic file operations.

### Command Surface

Commands are organized into namespaces:

**Global:** `init`, `migrate`, `schema`, `state`, `status`

**Entity CRUD + Lifecycle:**
| Namespace | Commands |
|---|---|
| `epic:` | `create`, `list`, `show`, `explore`, `define-architecture`, `refine-architecture`, `define-slices`, `refine-slices`, `activate`, `add-verification`, `update-verification`, `complete`, `abandon` |
| `slice:` | `create`, `list`, `show`, `plan`, `refine-plan`, `implement`, `complete`, `abandon` |
| `quest:` | `create`, `list`, `show`, `plan`, `refine-plan`, `implement`, `complete`, `abandon` |
| `task:` | `create`, `list`, `show`, `drop`, `convert` |
| `decision:` | `create`, `list`, `show`, `update` |
| `learning:` | `list`, `rollup` |
| `intervention:` | `create`, `list`, `show` |

**Sub-Agent Phases** (start/submit pairs for LLM-driven phases):
`start-plan` / `submit-plan`, `start-refinement` / `submit-refinement`, `start-implementation` / `submit-implementation`, `start-explore` / `submit-explore`, `start-architecture` / `submit-architecture`, `start-slices` / `submit-slices`, `start-refine-architecture` / `submit-refine-architecture`, `start-refine-slices` / `submit-refine-slices`

All commands support `--json` output and `--quiet` mode. Sub-agent `start-*` commands return context bundles; `submit-*` commands accept content via stdin and advance state.

### RPC API

Skills interact with the CLI through three core operations:

- **`begin(phase, target)`** — Start a phase. Transitions entity state, returns path references and context bundle. Skills write content to the returned paths.
- **`submit(phase, target, content)`** — Submit phase results. Validates content, transitions state. For refinement phases, includes scores.
- **`complete(target, payload)`** — Complete an entity. Accepts verification results, learnings, architectureDelta[], deferred work items, and interventions[]. Handles learning rollup and architecture propagation.

### Context Bundling

The CLI automatically assembles relevant context for each phase using per-phase priority tables:

| Phase | Priority Content (highest first) |
|---|---|
| `plan` | entity goal, current architecture, target architecture, conventions, autonomy context |
| `refinement` | plan, entity goal, current architecture, target architecture, conventions |
| `implementation` | refined plan, entity goal, current architecture, target architecture, conventions |
| `complete` | entity goal, slices overview, current architecture, target architecture |
| `explore` | epic goal, research, brainstorm, conventions, completed epics/quests |
| `architecture` | epic goal, research, brainstorm, conventions, existing architecture |
| `slices` | epic goal, architecture, conventions |

Context bundles include:
- **Inline content** — highest-priority markdown inlined up to a byte budget (default 20 KB)
- **References** — paths to additional content beyond the budget
- **Decisions** — active and revisiting decisions
- **Learnings** — relevant learnings with category, tags, and source
- **Autonomy context** — current autonomy level for the target scope, recent convergence history, relevant intervention patterns

#### Context Budget Strategy

Beyond the byte budget for inlining, skills should observe strategic allocation guidance for what types of information deserve context space. These are not hard limits but heuristics for context-constrained situations:

| Activity | Spec/Goal | Source Code | Learnings/Decisions | Architecture | Reserve for Output |
|---|---|---|---|---|---|
| Planning | 30% | 20% | 15% | 15% | 20% |
| Refinement | 20% | 30% | 10% | 15% | 25% |
| Implementation | 15% | 45% | 10% | 10% | 20% |
| Review | 15% | 50% | 5% | 10% | 20% |
| Architecture | 10% | 15% | 10% | 30% | 35% |

"Reserve for Output" is headroom for the LLM's response. Never fill context to capacity — degraded output quality is the result.

When a phase's context bundle exceeds the budget, cut in this order (last cut first):
1. Learnings from distant scopes (project-level before scope-level)
2. Architecture files for subsystems not touched by this work
3. Source code for modules not directly modified
4. Never cut: entity goal, active decisions, scope-level learnings

---

## Entity Model

### Entities (JSON)

Each entity is stored as a JSON file with explicit status tracking:

**Project** (`project.json`)
- `name`, `version`, `activeEpic`, `activeSlice`, `activeQuest`, `created`, `updated`

**Epic** (`epic.json`)
- Status: `created` → `exploring` → `explored` → `defining-architecture` → `architecture-defined` → `refining-architecture` → `architecture-refined` → `defining-slices` → `slices-defined` → `refining-slices` → `slices-refined` → `activated` → `completed` | `abandoned`
- Fields: `name`, `status`, `goal`, `verifications[]`, `refinement`, `created`, `activated`, `updated`

**Slice** (`slice.json`)
- Status: `created` → `planning` → `plan-created` → `refining` → `plan-refined` → `implementing` → `implementation-complete` → `completed` | `abandoned`
- Fields: `name`, `epic`, `status`, `goal`, `deferred[]`, `refinement`, `autonomyLevel`, `created`, `updated`

**Quest** (`quest.json`)
- Status: same as Slice (`created` → ... → `completed` | `abandoned`)
- Fields: `name`, `status`, `goal`, `refinement`, `autonomyLevel`, `created`, `updated`

**Task** (`task.json` — lightweight)
- Status: `open` → `converted` | `dropped`
- Fields: `name`, `title`, `status`, `description?`, `context` (snapshot: activeSlice, activeQuest, activeEpic, gitBranch, capturedDuring), `convertedTo?`, `droppedReason?`

### Records (JSONL — append-only)

**Activity Log** (`activity-log.jsonl`)
- Each line: `{ts, phase, scope, status, summary, ...}`
- Optional detail files in `activity-log/` for notable events

**Learnings** (`learnings.jsonl` at each scope)
- Fields: `category` (domain/worked/didnt-work/do-differently), `summary`, `file` (path to .md), `tags[]`, `source`, `rollup`, `rollupTo[]`, `recurrenceCount`

**Decisions** (`decisions.jsonl`)
- Fields: `id`, `status` (active/superseded/revisiting), `domain`, `title`, `summary`, `date`, `supersededBy`, `revisitTrigger`

**Architecture Deltas** (`architecture-deltas.jsonl` per scope)
- Fields: `subsystem`, `type` (add/modify/remove), `description`, `ts`

**Interventions** (`interventions.jsonl`)
- Fields: `ts`, `scope` (epic/slice/quest name), `phase` (planning/refinement/implementation/review), `systemState` (what the LLM had produced or was about to do), `signalsPresent` (what information was available that should have indicated a problem), `humanAction` (what the human decided), `outcome` (what happened after), `ruleCandidate` (can this become a rule? what would it be?), `automated` (has this been converted to a deterministic check?)

### Indexes (JSON)

**Overview files** provide fast hierarchical queries without filesystem traversal:
- `epics/overview.json` — all epics with nested slice status and completion timestamps
- `quests/overview.json` — all quests with status and completion timestamps

---

## The Project Lifecycle

### Getting Started (First Epic)

Every project begins with the same sequence. `/create-epic` creates the first epic (auto-named "initial") as `epics/__active__initial/`. All exploration, architecture, and slices live inside this epic.

```
1. Capture Idea              (interactive — user conversation)
   → Creates epics/__active__initial/goal.md (derived from idea)
   → Calibrates user expertise for domains the project touches
2. Explore Loop              (iterate until confident enough to define architecture; skippable)
   2a. Research               (autonomous — research sub-agents in parallel)
   2b. Brainstorm             (interactive — user conversation, captures output to brainstorm/)
   2c. Prototype              (interactive — user conversation)
   Any combination, any order, as many iterations as needed. Exit when ready.
   → Scoped to the epic: epics/__active__initial/research/, brainstorm/, prototypes/
   → Loads existing decisions as context; writes new decisions (with confirmation)
   → Checks for expertise signals after each run
3. Define Architecture        (interactive — structured decisions)
   3a. Project Conventions    (repo structure, tech stack, coding conventions)
   3b. Architecture Patterns  (data modeling, communication, error handling patterns)
   → Writes to epic architecture: epics/__active__initial/architecture/
   → Top-level .project/architecture/ gets a scaffold (populated as slices complete)
   → No architecture proposal or approval gate — first epic is approved by definition
   → Loads existing decisions as context; writes new decisions (with confirmation)
   → Checks for expertise signals after each run
4. Plan Vertical Slices       (interactive — user conversation)
   → Writes to epics/__active__initial/slices/
   → Loads existing decisions as context; writes new decisions (with confirmation)
   → Checks for expertise signals after each run
4b. Refine Slices             (optional — iterative review of slice goals)
```

After the first epic's slices are defined, work enters the continuous lifecycle.

### Continuous Lifecycle

After the first epic, the project enters ongoing evolution. Multiple epics can be explored simultaneously, but only one is actively being built at a time.

```
┌─────────────────────────────────────────────────────────┐
│                   CONTINUOUS FLOW                        │
│                                                         │
│  Epics (phases 1-3 can run in parallel):                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Epic A   │  │ Epic B   │  │ Epic C   │              │
│  │ Explore  │  │ Explore  │  │ Proposal │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                       │                                  │
│                  Pull trigger                            │
│                  (one at a time)                          │
│                       ▼                                  │
│              ┌─────────────────┐                         │
│              │ __active__ Epic │                         │
│              │  Define slices  │                         │
│              │  Execute slices │                         │
│              │  Complete       │                         │
│              └─────────────────┘                         │
│                       │                                  │
│              Quests can happen                            │
│              anytime alongside                           │
│                       │                                  │
│              Tasks captured anytime                       │
│              (converted to quests/epics                   │
│               when ready to act)                         │
│                       │                                  │
│              ┌─────────────────┐                         │
│              │  Retrospective  │  ← periodic, not        │
│              │  (recommended)  │    terminal              │
│              └─────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

### Epic Lifecycle

1. **Capture** — define goal, scope, and motivation
2. **Explore** — research, brainstorm, prototype, scoped to this epic
3. **Define target architecture** (first epic) / **Architecture proposal** (subsequent epics) — the first epic defines the architecture directly in its `architecture/` directory. Subsequent epics describe how they want to change or extend the top-level architecture. Proposals don't modify the top-level architecture until approved.
4. **Pull the trigger** (subsequent epics only) — deliberate decision to approve the architectural changes and commit them to the top-level architecture. Directory renamed to `__active__<n>/`. Only one active epic at a time. The first epic skips this — it starts as `__active__initial/`.
5. **Define slices** — break the epic into vertical slices
6. **Execute slices** — plan → refine → implement → QA → complete per slice. As each slice completes, top-level architecture is updated to reflect current reality.
7. **Complete epic** — retrospective, learnings rollup, reconcile target architecture against top-level reality, promote broadly useful research/brainstorm/prototype artifacts to top-level directories. Directory renamed to `~~archived~~NN_<n>/`.

### Per-Slice Lifecycle

Within an epic, each slice follows this flow:

```
For each slice (and quests follow the same flow):
  1. Write Plan               (interactive — reads all context + learnings + decisions + maturity, user conversation)
     → Writes new decisions (with confirmation); checks for expertise signals
     → Loads architectural maturity context; flags changes to maturing+ subsystems
     → Autonomy level determines gate depth (see Autonomy Progression)
  2. Refine Plan              (autonomous — specialist reviewers score the plan, iterate until all ≥9)
     → reviewers write to plan-refining/round-N/, produces plan-refined.md
     → captures plan-learnings-and-feedback.md
     → reviewers check plans against system invariants and fitness functions
     → circuit breaker: stops if scores decline, oscillate, or after max rounds — presents options to user
     → enhanced convergence tracking: net-improvement scoring per round
  3. Implement Plan           (autonomous — implementer + reviewer loop per phase)
     → RED-GREEN verification cycle: before-checks (RED) → implement → after-checks (GREEN)
     → implementer/reviewer write to implementation/phase-N/
     → max 5 iterations per phase before escalating to user
     → commits after each passing phase; rolls back uncommitted changes on failure
     → existing fitness functions must continue to pass
     → failure mode detection: stuck, oscillation, regression, scope creep (see §Failure Mode Detection)
  4. Human QA & Polish        (interactive — human tries implementation, works with agent
                               to fix bugs and make small improvements)
     → captures after-implementation-fixes-and-polish.md
     → if larger issues found: new quest or full plan→refine→implement cycle
  5. Complete & Propagate    (interactive — on the branch before push)
     → captures learnings in completion/learnings.md
     → captures any interventions that occurred during this scope
     → rolls up learnings to top-level learnings.md
     → proposes updates to architecture — approved changes written to top-level architecture (current reality)
     → proposes updates to idea/goals if learnings warrant it
     → writes decisions surfaced during the slice (with confirmation)
     → reviews remaining unimplemented slices: do goals need updating? new slices needed? quests needed?
     → suggests maturity promotions if subsystems have stabilized
     → evaluates autonomy level adjustments based on this scope's performance
     → asks if cleanup/refactor pass is needed before next slice
     → checks for expertise signals
     → all of this committed on the branch, then pushed and PR created
```

Exploration happens at the epic level, not per-slice. If a slice needs narrow research (e.g., which library to use for a specific task), that happens during plan creation.

### Epic Completion

When the last slice in an epic completes:
- Epic-level retrospective: what worked, what didn't, what would we do differently
- Learnings rolled up from all slices to epic-level and top-level
- Reconcile epic target architecture against top-level current architecture — surface any gaps between what was planned and what was built
- Review epic's `research/`, `brainstorm/`, and `prototypes/` directories — promote anything broadly useful to the top-level project directories (copy, don't move — the epic is a historical record)
- Epic verification criteria evaluated (pass/fail)
- Review interventions across all slices — are there clusters that suggest a workflow gap? (see §Intervention Analysis)
- Review learning recurrence — any learnings with `recurrenceCount ≥ 2` are candidates for promotion to deterministic checks
- Directory renamed from `__active__<n>/` to `~~archived~~NN_<n>/` (NN = completion order)

### Retrospectives

Retrospectives are periodic, not terminal. Recommended after:
- Epic completion
- `/project-status` detects signals (many slices since last retro, architectural drift, recurring QA issues)
- Intervention cluster detected (3+ similar interventions across recent scopes)

Not a hard gate — a nudge from `/project-status`.

---

## Architectural Maturity

As the project evolves, subsystems accumulate confidence, investment, and dependents. Maturity tracking prevents casual changes to battle-tested foundations while keeping new areas free to evolve.

### The Maturity Spectrum

| Level | Description | Change protocol |
|---|---|---|
| **Experimental** | New, actively being shaped, might be replaced entirely. Few or no dependents. | Changes are free |
| **Developing** | Design direction is clear but still filling out. Some dependents. | Changes expected but should be deliberate |
| **Maturing** | Well-used, most edge cases handled, multiple dependents. | Changes need justification and impact awareness |
| **Foundational** | Battle-tested, deeply relied upon, generic enough for future needs. | Changes are rare — require serious justification, migration planning, fitness function updates |

Most subsystems live in the developing-to-maturing range for a long time. Foundational is reserved for things where: the API is generic enough for future needs, edge cases have been thoroughly handled, active development builds *on top of it* rather than changing *it*, and many parts of the system depend on it.

### What Maturity Captures
- How broadly the subsystem is used (number and importance of dependents)
- How much investment has gone into edge cases, error handling, hardening
- How generic and well-modularized the design is
- How confident we are it meets future needs without major overhaul

### The Maturity Table

Lives in `architecture/_overview.md`:

```markdown
## Subsystem Maturity

| Subsystem | Maturity | Dependents | Fitness Functions | Notes |
|---|---|---|---|---|
| Job system | Foundational | auth, billing, notifications, reports | job-system.test.ts | Generic task runner. Edge cases well-covered. |
| API contract | Maturing | all client-facing code | api-contract.test.ts | Schema validation solid. Pagination evolving. |
| Auth | Developing | API layer, admin UI | — | Core auth works. RBAC being extended. |
| Notifications | Experimental | — | — | Exploring channel abstractions. |
```

### How Maturity Flows Through the Workflow

Maturity is not a gate — it's a signal that scales the level of caution at every decision point.

**Epic architecture proposals:** Load the maturity table. If the proposal touches maturing+ subsystems, require justification (why current design is insufficient), migration plan (what dependents need to change), and updated fitness functions.

**Slice planning (`/create-slices`):** Slices that touch maturing+ subsystems are flagged in their `goal.md` with a reference to the epic's architecture proposal justification.

**Plan creation (`/create-plan`):** Loads maturity context. Plans involving maturing+ subsystems must reference the architecture proposal, include fitness function update steps, and include migration steps for dependents if the contract changes.

**Quest planning:** If a quest touches a maturing+ subsystem, flag it: "This quest modifies a [maturing/foundational] subsystem. Should this be scoped as an epic instead?"

**Plan refinement:** Reviewers receive maturity context. For maturing+ subsystems, they specifically check: are fitness functions being updated? Are invariants preserved? Is the migration plan complete? Does the justification hold?

**Implementation:** Existing fitness functions must continue to pass (or be deliberately updated per the plan). Reviewer sub-agents check that maturing+ subsystem changes match the plan — no ad-hoc changes.

**Slice/epic completion:** Did this work stabilize any subsystems enough to suggest a maturity promotion? Were fitness functions written/updated as planned?

**The core purpose:** Prevent casual changes to subsystems that are deeply relied upon or that represent significant investment in edge case handling and hardening. Maturity context tells the AI: this subsystem is foundational — don't propose changes lightly.

### Graduating Maturity

Promotions are suggested by `/complete` and `/audit-architecture` when they observe stability, fitness functions in place, multiple dependents, and generic-enough design. But the promotion is always a human decision, captured as a decision record.

### Fitness Functions

Automated tests that verify architectural properties — not business logic, but structural guarantees.

Examples:
- "All API endpoints validate input against their schema before processing"
- "No module in the data layer imports from the UI layer"
- "Every async job type has a timeout and a failure handler"
- "Database queries go through the repository layer, never direct"

Fitness functions live as actual tests in the codebase but are documented in the architecture files so the intent is clear.

**Where they enter the workflow:**
- `/create-architecture` and epic architecture proposals identify candidates: "when this subsystem matures, these properties should be tested"
- `/create-plan` for slices that graduate a subsystem includes writing fitness functions as plan steps
- `/complete` checks: did this slice graduate any subsystems? Are fitness functions in place?
- Plan refinement reviewers check that plans don't violate existing fitness functions
- `/audit-architecture` compares fitness functions against actual code

### System Invariants

Documented constraints that must hold across all feature additions. Different from fitness functions (which are automated) — invariants are human-readable rules that plan refinement reviewers verify against.

Live in `architecture/invariants.md`.

Examples:
- "All user-facing errors must include an actionable message"
- "No synchronous request handler blocks for more than 200ms"
- "Every state mutation is auditable"
- "Sensitive data is never logged"

**Where they enter the workflow:**
- Defined during `/create-architecture`, refined over time
- Plan refinement reviewers explicitly check plans against invariants
- Epic architecture proposals must state which invariants they preserve and justify any amendments
- `/audit-architecture` checks if invariants are being respected in practice

---

## Failure Mode Detection and Response

The workflow anticipates specific failure patterns documented from iterative LLM-based development. Each has a detection mechanism and a prescribed response. Skills and the CLI share responsibility: the CLI detects mechanical signals (score trajectories, iteration counts, regression in checks); skills detect semantic signals (stuck approaches, scope creep, specification gaps).

### Getting Stuck

**What it looks like:** The LLM finds a partially working solution and keeps making small adjustments. Successive iterations produce only cosmetic changes. Net improvement is near zero.

**Detection:**
- CLI: net improvement ≤ 0 for 2+ consecutive implementation iterations within a phase
- Skill: diffs between iterations are small and touch the same lines repeatedly

**Prescribed response:**
1. Stop iterating immediately.
2. LLM generates 2–3 fundamentally different approaches (use high temperature / diverse sampling if available).
3. LLM evaluates each approach against the plan's acceptance criteria.
4. Present alternatives to the human with tradeoff analysis.
5. Human selects an approach or provides direction.
6. Restart the phase with the selected approach. Reset the phase iteration count.
7. Log as intervention if human input was required.

### Oscillation

**What it looks like:** Corrections are too aggressive — each fix introduces a new problem that the next round tries to fix. Scores or check results alternate between better and worse. The same file is modified in contradictory ways in consecutive rounds.

**Detection:**
- CLI (refinement): aggregate score alternated direction across 3+ rounds
- CLI (implementation): a test alternates between passing and failing across consecutive iterations
- Skill: the same code region is modified, then reverted, then modified again

**Prescribed response:**
1. Stop iterating.
2. Identify the conflicting constraints causing the oscillation. Present explicitly: "Constraints X and Y appear to be in tension. Satisfying X requires A, but Y requires B."
3. Human resolves the conflict: which constraint takes priority, or provides a creative resolution that satisfies both.
4. Update the plan with the clarified constraint.
5. Resume with the clarified plan. If in refinement, adjust reviewer weights to align with the resolution.
6. Record the conflict and resolution as a decision.

### Regression

**What it looks like:** An iteration fixes one thing but breaks something that was previously working. Tests that passed before the current round now fail.

**Detection:**
- CLI: a previously-passing check fails after a round of changes, and the failure is in code modified during that round
- Implementation: git diff shows changes to files that the current phase shouldn't have touched

**Prescribed response:**
1. Revert to the pre-round commit immediately (this is mechanical, not a judgment call).
2. Analyze: what did the failing check verify, and why did the change break it?
3. Re-attempt the round with an additional explicit constraint: "Must not modify [the regressed behavior]."
4. If this constraint makes the phase's goal impossible, it reveals a genuine design tension — escalate per the Oscillation response.
5. If regression happens twice in the same phase, escalate to the human.

### Building the Wrong Thing

**What it looks like:** Human review or QA reveals that the implementation doesn't match what they actually wanted, despite matching the plan. The plan was wrong.

**Detection:**
- Human: during QA & Polish, the implementation works as specified but isn't what the user needs
- Skill: during `/complete`, the user rejects the implementation despite all checks passing

**Prescribed response:**
1. Don't try to fix it inline. The problem is upstream.
2. Structured debrief: What did the plan say? What did the human actually want? Where did the gap emerge? Was it in the epic goal, the slice goal, or the plan itself?
3. Capture the gap as a learning: "When specifying [this kind of thing], also specify [the missing aspect]."
4. Depending on the gap's location:
   - Plan wrong → create a new plan, re-enter refinement
   - Slice goal wrong → update slice goal, re-plan
   - Epic goal wrong → update epic goal, review all remaining slices
5. Consider adding a prototype step before full implementation for similar work in the future.
6. Log as intervention with high detail — this is the most expensive failure mode.

### Architectural Drift

**What it looks like:** Each small change is locally reasonable but the cumulative effect is a system that's incoherent. Patterns are applied inconsistently. Module boundaries are violated.

**Detection:**
- Fitness functions fail (detected during implementation or refinement)
- `/audit-architecture` surfaces inconsistencies between documented architecture and actual code
- Code review reveals patterns inconsistent with conventions
- Stale assumption detection triggers (architecture files newer than goals)

**Prescribed response:**
1. If detected by automated fitness functions: the implementation phase blocks. Fix the violation before proceeding. If the violation is intentional, it requires an architecture update (with confirmation for maturing+ subsystems).
2. If detected by review: don't fix it as a side effect of the current work. Create a quest for the realignment.
3. If drift is chronic: the architecture may need to evolve to match reality rather than the other way around. Surface this at the next retrospective.
4. Check whether conventions or architecture docs need clarification — drift often signals ambiguity in the governing documents.

### Lost Learnings

**What it looks like:** The same mistakes are repeated across different scopes because experience from earlier work isn't being applied.

**Detection:**
- CLI: `recurrenceCount` on learning entries reaches 2+
- Skill: during refinement or implementation, an issue arises that matches an existing learning (reviewer should check learnings context)
- Retrospective: patterns of repeated issues across multiple scopes

**Prescribed response:**
1. `recurrenceCount` reaches 2: the learning is ineffective in its current form. Rewrite with a more specific concrete example and a more actionable preventive rule. Verify the learning was actually loaded into context when the recurrence happened — if not, fix context bundling priority.
2. `recurrenceCount` reaches 3: escalate to a deterministic check. Write a fitness function, linter rule, or test pattern that catches this class of error mechanically. Mark the learning as `automated: true` once the check is in place.
3. If the learning was in context but ignored: the learning may be too abstract. Add a concrete before/after code example.

### Scope Creep

**What it looks like:** A fix during implementation requires changes outside the current scope's declared boundaries. What started as a small change expands to touch unrelated modules.

**Detection:**
- Skill: implementation needs to modify files outside the plan's declared scope
- Implementation sub-agent proposes changes to subsystems not listed in the plan
- The slice or quest starts to feel like it should be an epic

**Prescribed response:**
1. Stop the out-of-scope change.
2. If the change is required for the current scope to work: capture it as a new task or quest. Declare a dependency if the current scope is blocked without it.
3. If the current scope can be completed without the change: note it as a deferred item and continue.
4. If the scope is fundamentally wrong: return to planning. The decomposition was incorrect.

### Context Overload

**What it looks like:** LLM output quality degrades despite good plans. The LLM misses instructions that are present in context. Responses become generic rather than specific to the codebase.

**Detection:**
- Skill: LLM produces output that contradicts information in its own context bundle
- Refinement rounds increase without score improvement
- Implementation produces code that ignores conventions present in the context

**Prescribed response:**
1. Reduce context aggressively. Remove files that aren't directly relevant to the current phase.
2. Move supplementary information to reference paths rather than inlining it.
3. If the scope genuinely requires more context than fits: the scope is too large. Decompose into smaller phases or split the slice.
4. Consider whether the plan is trying to do too much in a single phase. Phases should be small enough that their full context fits comfortably.

### Premature Commitment

**What it looks like:** Implementation reveals that an early architectural decision was wrong, but significant code depends on it. The cost of change is high because the decision was treated as settled too early.

**Detection:**
- Implementation struggles in a way that traces back to an architectural choice
- Multiple slices work around the same architectural limitation
- A decision's `revisitTrigger` condition is met

**Prescribed response:**
1. Don't fix it inline. Document the issue clearly: what's wrong, what we know now that we didn't know before, what would be different if we could redo it.
2. Evaluate the cost of living with it vs. the cost of changing it.
3. If change is warranted: create a dedicated quest or epic with a migration plan. The plan must include the migration strategy for all dependents.
4. Record as a decision update with the explanation of what we learned.
5. Learning: identify what spike or prototype during the explore loop would have revealed this earlier. Add to the explore loop checklist for future epics.

### Constraint Conflicts

**What it looks like:** Two requirements are genuinely in tension but this isn't detected until refinement or implementation fails to converge. Reviewers give contradictory feedback.

**Detection:**
- Refinement: two reviewers consistently score low on contradictory criteria
- Implementation: satisfying one acceptance criterion causes another to fail
- The LLM explicitly reports that it cannot satisfy all constraints simultaneously

**Prescribed response:**
1. The LLM enumerates the conflicting constraints explicitly: "Constraint A requires X. Constraint B requires Y. X and Y are mutually exclusive because Z."
2. Present to the human for resolution. The human decides which constraint to relax, or provides a creative resolution.
3. Update the plan (and potentially the epic goal or architecture) with the resolution.
4. Record as a decision — constraint conflicts reveal real tradeoffs that should be documented for future reference.
5. Resume refinement/implementation with the clarified constraints.

### Low-Information Iterations

**What it looks like:** Rounds of feedback and correction that don't meaningfully improve the output. Changes between rounds are trivial. No metrics change.

**Detection:**
- CLI: net improvement is exactly 0 (no checks change status) for a round
- Refinement: scores don't change between rounds
- Skill: diffs between iterations are noise — whitespace, comment changes, variable renames

**Prescribed response:**
1. Stop iterating.
2. Determine whether the work is actually done (remaining issues are acceptable) or whether the feedback is insufficiently specific.
3. If done: accept and move to the next phase. Not everything needs to score 10/10.
4. If feedback is the problem: the reviewers need more specific criteria. Convert vague feedback to concrete, testable assertions before resuming.
5. If a single reviewer is blocking with non-actionable feedback: escalate to the human. The reviewer's criteria may need adjustment.

---

## Autonomy Progression

The human's involvement level adapts based on demonstrated reliability. This is tracked per scope (subsystem/module area, not globally) because the LLM's reliability varies by domain — it may handle well-understood patterns autonomously while needing close guidance for novel architecture.

### Autonomy Levels

| Level | Description | Human Involvement |
|---|---|---|
| **Supervised** | LLM proposes, human approves every step | Every phase transition |
| **Guided** | LLM executes, human reviews at gates | Plan approval, refinement review (if circuit breaker triggers), final review |
| **Delegated** | LLM executes and self-reviews, human spot-checks | Plan approval, periodic spot-check of completed work |
| **Autonomous** | LLM handles end-to-end, human reviews aggregate results | Batch review of completed scopes |

### Default Levels

New projects start at **Guided**. Within a project:
- Slices touching **experimental** subsystems: Guided
- Slices touching **developing** subsystems: Guided (can be promoted to Delegated)
- Slices touching **maturing** subsystems: Guided (changes are significant; oversight warranted even if the LLM is reliable)
- Slices touching **foundational** subsystems: Supervised (changes are rare and high-impact)
- Quests within established patterns: matches the subsystem's earned level
- Quests establishing new patterns: Guided regardless of subsystem maturity

### Promotion Criteria

Promotion happens per-subsystem and is tracked in the autonomy context:

- **Guided → Delegated**: 5+ scopes completed touching this subsystem with ≤1.5 average refinement rounds, no regressions, and no "building the wrong thing" interventions.
- **Delegated → Autonomous**: 10+ scopes completed at Delegated level with no missed defects in spot-checks, no regressions, and the subsystem is at Developing+ maturity.

### Demotion Triggers

- A defect reaches QA that should have been caught: drop one level for that subsystem.
- A regression is not caught by self-review: drop one level.
- 3+ consecutive scopes require >2 refinement rounds: drop one level.
- A "building the wrong thing" failure: drop to Guided regardless of current level.

### How Autonomy Modulates the Workflow

| Phase | Supervised | Guided | Delegated | Autonomous |
|---|---|---|---|---|
| Plan creation | Human co-writes | Interactive, human reviews | LLM writes, human approves | LLM writes, human spot-checks |
| Refinement | Human reviews each round | Autonomous with circuit breaker | Autonomous with circuit breaker | Autonomous with circuit breaker |
| Implementation | Human reviews each phase | Autonomous, human reviews final | Autonomous, LLM self-reviews final | Autonomous, batch review |
| QA & Polish | Always interactive | Always interactive | Interactive if issues found | Human tries the feature, files issues |
| Completion | Always interactive | Always interactive | LLM proposes, human confirms | LLM completes, human reviews at retrospective |

QA & Polish is always at least partially interactive — the human trying the implementation is irreplaceable signal regardless of autonomy level.

### Autonomy Context in CLI

The CLI tracks autonomy state in `autonomy.json`:

```json
{
  "subsystems": {
    "auth": {
      "level": "guided",
      "scopesCompleted": 3,
      "averageRefinementRounds": 1.3,
      "regressionCount": 0,
      "lastDemotion": null,
      "lastPromotion": null
    },
    "api-contract": {
      "level": "delegated",
      "scopesCompleted": 8,
      "averageRefinementRounds": 1.1,
      "regressionCount": 0,
      "lastDemotion": null,
      "lastPromotion": "2025-04-10T..."
    }
  },
  "globalDefault": "guided"
}
```

`/project-status` includes the current autonomy profile. `/complete` evaluates whether any promotion or demotion criteria have been met and presents recommendations (promotions require human confirmation; demotions are automatic).

---

## Intervention Logging

Every time the human steps in to override, correct, or unblock the LLM during any phase, it should be captured as an intervention. This is distinct from learnings: learnings capture what the *project* needs to know going forward; interventions capture what the *workflow* failed to handle autonomously.

### When to Log

- Human corrects the LLM's output during an interactive phase (plan creation, QA, completion)
- Human provides information the LLM should have had but didn't
- Human overrides a decision the LLM made
- Circuit breaker triggers and human resolves the situation
- Human redirects the workflow (e.g., "this should be an epic, not a quest")
- Human rejects a completed scope during review

### Intervention Structure

```markdown
## Intervention — [scope] during [phase]

**System state**: What the LLM had produced or was about to do
**Signals present**: What information was available in context that should have indicated a problem
**Human action**: What the human decided or provided
**Outcome**: What happened after the intervention
**Rule candidate**: Can this be turned into a rule? What would the rule be?
**Category**: [missing-context | wrong-approach | spec-gap | scope-mismatch | quality-miss | novel-situation]
```

### Intervention Analysis

Interventions are reviewed at two cadences:

**Per-scope (at `/complete`):** Were there interventions during this scope? If so, briefly assess: was this a one-off or a pattern?

**Per-epic (at epic completion and retrospectives):** Cluster interventions by category. Look for:
- **Missing-context clusters**: The context bundling priorities may need adjustment. Specific types of information may need to be added to the priority tables.
- **Wrong-approach clusters**: The LLM may need additional guidance in the skill instructions, or the plan refinement reviewers may need an additional specialist.
- **Spec-gap clusters**: The plan creation skill may need additional probing questions, or the epic's explore loop may not have been thorough enough.
- **Scope-mismatch clusters**: The decomposition heuristics may need adjustment.

**Rule promotion:** When 3+ interventions in the same category share a common pattern, evaluate whether the pattern can become:
- A deterministic check (fitness function, linter rule)
- A reviewer criterion (added to the refinement reviewer registry)
- A plan creation prompt (added to the skill's probing questions)
- A context bundling adjustment (added to the priority tables)

Mark the intervention as `automated: true` once the rule is in place. Track whether the rule actually prevents recurrence.

---

## Skill Patterns

Skills are the LLM-driven counterpart to the CLI. They handle judgment work (interviewing, writing, reviewing, scoring) while the CLI handles deterministic mechanics. Skills are versioned in the repo (`skills/`) and installed to `~/.claude/skills/` via `bun run install:skills`.

### CLI Interaction Protocol

Skills follow a strict protocol for CLI interaction:
- **State queries:** `goodplan status --json`, `goodplan slice:show --json`, `goodplan state --json --query '<jq>'`
- **Phase transitions:** `goodplan start-<phase>` returns paths + context → skill writes content → `goodplan submit-<phase>` advances state
- **Completion:** `goodplan slice:complete` / `goodplan quest:complete` with structured JSON payload (verificationPassed, learnings[], architectureDelta[], deferred[], interventions[])
- **Error codes:** 0 (success), 1 (internal), 2 (validation), 3 (state machine violation)
- **Path references:** Mutation responses include a `paths` object — skills write content to these paths, never create directories manually

### Shared Iteration Loop

Refinement skills (`refine-plan`, `refine-architecture`, `refine-slices`) share an orchestration pattern:

1. **Create working copy** — fork the file being refined (e.g., `plan.md` → `plan-refining/working-plan.md`) to preserve the original
2. **Spawn parallel reviewers** — select from a reviewer registry, run all in parallel (foreground, not background)
3. **Synthesize feedback** — merge reviewer output into prioritized categories: CRITICAL, IMPORTANT, MINOR, DIRECTLY_ACTIONABLE, RESEARCH_NEEDED, CONTRADICTIONS, UNRESOLVED
4. **Handle each category** — user input for ambiguities, research agents for unknowns, direct edits for actionable items
5. **Apply fixes** and repeat
6. **Exit criteria:**
   - **Full pass:** All reviewers score 9+, no CRITICAL/IMPORTANT
   - **Early exit:** Min iterations reached, all score 8+, no CRITICAL/IMPORTANT
   - **Max iterations:** Stop and present remaining issues
7. **On completion** — rename working copy to final name (e.g., `plan-refined.md`), submit to CLI

Round artifacts are preserved in `<thing>-refining/round-N/reviews/<reviewer>.md` and `round-N/merged.md` for audit trail.

**Circuit breaker** (stops the loop and presents situation to user):
- **Decline:** aggregate score decreased from the previous round
- **Oscillation:** aggregate score alternated direction across 3+ rounds
- **Max rounds:** configurable limit reached without all scores meeting threshold

**Enhanced convergence tracking:** In addition to aggregate score direction, track per-round net improvement:

```json
{
  "round": 2,
  "scoresBy reviewer": { "security": 8, "performance": 9, "codebase": 7 },
  "aggregateScore": 8.0,
  "issuesFixed": 4,
  "issuesIntroduced": 1,
  "netImprovement": 3,
  "previousAggregate": 7.0
}
```

The net-improvement metric catches a failure mode that aggregate scores miss: the LLM fixing one reviewer's concerns while breaking something another reviewer previously approved. If `netImprovement ≤ 0` for 2 consecutive rounds despite stable or improving aggregate scores, trigger the circuit breaker — the refinement is churning, not converging.

### RED-GREEN Implementation Cycle

`/implement-plan` uses a verification-driven approach per phase:

1. **RED checks** — run "before implementation" verification commands; confirm they fail (expected state)
2. **Implement** — execute the phase's implementation steps
3. **GREEN checks** — run "after implementation" verification commands; confirm they pass
4. **Review** — parallel specialist reviewers examine the implementation
5. **Commit** on pass; iterate (max 5) or escalate on failure

RED state categories: RED-CONFIRMED (expected failure), RED-INFRASTRUCTURE (environment issue), UNEXPECTED-PASS (test passes before implementation), AGENT-BLOCKED (can't run check).

**Failure mode awareness during implementation:** The implementation skill should actively monitor for the failure modes described in §Failure Mode Detection. Specifically:

- After each iteration: compute net improvement (checks newly passing minus checks newly failing). Log this. If ≤ 0 for 2 consecutive iterations, stop and diagnose before continuing.
- After each phase: verify that files modified are within the plan's declared scope. Flag any out-of-scope modifications.
- If a phase exceeds 3 iterations: before the 4th attempt, the LLM should generate an alternative approach rather than refining the same approach further.

### Graceful Stop and Resume

All skills support interruption and re-entry:
- **Resume detection:** On invocation, skills check for partial artifacts (working copies, round directories, `<!-- partial — interrupted` markers) and offer to resume or start fresh
- **Idempotent re-entry:** Re-running a skill picks up where it left off
- **Cleanup on completion:** Working copies and run directories are preserved for audit but clearly marked as complete

---

## Plan Refinement Detail

Refinement runs multiple specialist reviewers in parallel. Each writes a score (1–10) and detailed feedback. Refinement completes when all scores meet the threshold.

Reviewers are selected from a registry and cover domains like: codebase alignment, technical design, security, performance, reliability, testing, docs & accessibility, observability, and migration/rollout.

Reviewers also check:
- Plans don't violate existing fitness functions
- Plans don't violate system invariants (from `architecture/invariants.md`)
- Changes to maturing+ subsystems are justified and include migration plans

**Circuit breaker** (stops the loop and presents situation to user):
- **Decline:** aggregate score decreased from the previous round
- **Oscillation:** aggregate score alternated direction across 3+ rounds
- **Max rounds:** limit reached without all scores meeting threshold
- **Net-improvement stall:** `netImprovement ≤ 0` for 2 consecutive rounds (new)

Options when circuit breaker triggers: break the plan into smaller plans, address specific conflicting feedback manually, accept the current plan and proceed, or (new) identify the conflicting constraints and resolve them explicitly before resuming.

**Feedback quality requirement:** Reviewer feedback must be directional — stating what's wrong AND what "right" looks like. Non-directional feedback ("this could be better") produces low-information iterations. Reviewer instructions should mandate: "For each issue, state (a) what is wrong, (b) why it matters, (c) what the fix should look like."

### Post-Implementation QA & Polish

After implementation completes:
- The human tries out the implementation
- Works interactively to fix bugs and make small improvements (no formal plan needed)
- `after-implementation-fixes-and-polish.md` captures what was found and fixed (a log, not a plan)
- If something larger is discovered, it either becomes a new quest or gets a full plan→refine→implement cycle
- Any issues that *should* have been caught by refinement or implementation review are noted — these inform reviewer improvements

---

## Interaction Model

- Run `/project-status`
- It queries the CLI (`goodplan status --json`), presents current status, autonomy context, recommended next step, and any pending signals (intervention clusters, learning recurrence, stale assumptions)
- Say "continue" (follows recommendation) or redirect conversationally
- After each step: summary, opportunity for questions/changes, wait before continuing
- If context gets long: checkpoint to files, start fresh session, `/project-status` picks up

---

## Git Workflow

### Branch Per Slice/Quest
- Each vertical slice and quest gets its own branch: `slice/<slug>` or `quest/<slug>`
- Commits at natural boundaries: plan written, refinement complete, each implementation phase, fixes/polish, completion
- The Complete & Propagate step happens on the branch: learnings rolled up, architecture updated, remaining slices reviewed
- Then the branch is pushed and a PR is created

### Abandoned Branches
- Abandoned branches still get merged so `.project/` state (including `abandoned.md` and learnings) makes it back to main
- A final commit on the branch reverts all changes outside of `.project/` that were made during implementation
- The `.project/` history is preserved: we know the work was attempted, why it was abandoned, and what was learned

### Gitignored
- `.project/.state-cache.json` — mtime cache for fast state detection, not shared

### Merge Conflict Strategy
- Slice-specific files won't conflict — each branch works on its own directory
- Global files (`learnings.jsonl`, `architecture/` files, `activity-log.jsonl`, `interventions.jsonl`) may conflict when branches complete concurrently, but each entry is independent — resolve by keeping all additions
- JSONL files are append-only with independent lines — conflicts resolve by keeping all lines
- `overview.json` files may need manual merge if concurrent completions modify the same index

### CLAUDE.md Integration
Skills add a "Project Context" section to the repo's `CLAUDE.md` with references to key `.project/` files (`idea.md`, `architecture/`, `conventions.md`, `architecture/conventions.md`, `learnings/`). Written incrementally: `/create-epic` adds the `idea.md` reference, `/create-architecture` adds the rest.

---

## Diagnostic Framework

When the workflow underperforms, it helps to diagnose *which function* is weak rather than treating all problems as "the model isn't good enough." Five functions are necessary (adapted from viable systems theory):

| Function | What It Does | Symptoms When Weak |
|---|---|---|
| **Execution** | The LLM produces reasonable output | Output is wrong, incomplete, or low-quality despite good plans and context |
| **Coordination** | Activities are sequenced and managed without conflicts | Work steps on itself, state becomes inconsistent, scope bleeds between phases |
| **Optimization** | Feedback loops improve output toward the goal | Refinement doesn't converge, iteration counts are high, same issues recur |
| **Monitoring** | The system detects when things go wrong | Problems discovered late (QA, production), fitness function gaps, silent drift |
| **Direction** | The system knows what "good" looks like | Technically correct but strategically wrong output, user frequently rejects work |

### Using the Framework

When `/project-status` or a retrospective surfaces a problem:

1. Classify it by function. Most problems map cleanly to one.
2. Address the function, not the symptom.

**Weak Execution** → The model needs better context, or the scope is too large for single-pass quality. Response: reduce scope, improve context bundling, add technical guidance to plans.

**Weak Coordination** → The CLI's state machine may have gaps, or skills are not following the CLI interaction protocol correctly. Response: audit state transitions, check that skills use start/submit pairs, verify file existence signals.

**Weak Optimization** → Reviewers aren't providing actionable feedback, or circuit breakers aren't calibrated correctly. Response: improve reviewer instructions (mandate directional feedback), adjust circuit breaker thresholds, check that convergence tracking is working.

**Weak Monitoring** → Failure modes aren't being detected early enough. Response: add fitness functions for the missed property, add a reviewer specialization, improve the detection criteria in §Failure Mode Detection.

**Weak Direction** → The specification pipeline isn't extracting enough information from the human. Response: add probing questions to the plan creation skill, extend the explore loop, require prototypes before committing to architecture for novel work.

Each function can be evaluated and improved independently. The diagnostic framework helps avoid the trap of treating every problem as a model capability issue when it might be a coordination, monitoring, or direction problem.

---

## Evaluation and Metrics

Data captured in `activity-log.jsonl` and `interventions.jsonl` to evaluate workflow reliability and effectiveness.

### Metrics (per slice/quest/epic)
- Refinement: number of rounds, scores per round (trajectory — improving, declining, oscillating), net-improvement per round
- Implementation: iterations per phase, blocker frequency, sub-agent failure/retry count
- QA: number of issues found, severity, whether they should have been caught by refinement or review
- Quests spawned: count, whether they were anticipated or surprises
- Fitness function violations caught during planning vs during implementation
- Subsystem maturity promotions over time
- Time from plan to completion (rough, from git timestamps)
- Interventions: count, category distribution, rule-promotion rate
- Autonomy: current levels per subsystem, promotions/demotions over time
- Learning recurrence: count of learnings with `recurrenceCount ≥ 2`, rate of promotion to deterministic checks

### Signals of Workflow Health
- Later slices complete with fewer refinement rounds (learning is working)
- QA finds fewer issues over time (review quality is improving)
- Quests decrease over time (architecture is stabilizing)
- Refinement scores improve monotonically within a round (no oscillation)
- Fitness functions catch architectural violations during planning, not implementation
- Subsystems graduate from experimental to foundational over the life of the project
- Interventions decrease over time within a subsystem (autonomy is earned)
- Intervention rule-promotion rate is positive (workflow gaps are being closed)
- Learning `recurrenceCount` rarely exceeds 1 (learnings are effective)
- Autonomy promotions outnumber demotions (reliability is improving)

### Signals of Workflow Problems
- Refinement scores declining or oscillating (plans too large, conflicting requirements)
- Same types of QA issues recurring despite learnings (learnings not being applied)
- Frequent quests late in the project (architecture was wrong)
- Sub-agent failures increasing (instruction files need improvement)
- Fitness function violations discovered during implementation (plans not being checked thoroughly)
- Mature subsystems needing frequent changes (maturity was premature or design wasn't generic enough)
- Interventions increasing in a subsystem despite accumulated experience (something changed, or the autonomy level is too high)
- Interventions clustering in a single category (systematic workflow gap)
- Learning recurrence rate increasing (learning system is failing — learnings are too abstract, not in context, or should be deterministic checks)
- Net-improvement frequently ≤ 0 during refinement (reviewers are giving contradictory or non-actionable feedback)

The retrospective phase analyzes these metrics across all slices. The orchestrator can also do lighter-weight checks after each autonomous phase ("refinement took 8 rounds — last slice took 3, worth discussing?").

---

## Decision Lifecycle

Decisions are first-class entities with lifecycle management. Unlike learnings (which capture experience), decisions capture *choices* — the option selected, the alternatives considered, and the conditions under which the choice should be reconsidered.

### Decision States

| State | Meaning |
|---|---|
| **Active** | This decision is in effect. All planning and implementation should respect it. |
| **Revisiting** | The decision's revisit trigger has been met. The decision still holds but should be actively reconsidered. |
| **Superseded** | This decision has been replaced by a newer decision. Preserved for history. |

### Revisit Triggers

Every non-trivial decision should include a `revisitTrigger` — a concrete condition under which the decision should be reconsidered:

```json
{
  "id": "dec-007",
  "status": "active",
  "domain": "data-layer",
  "title": "Use PostgreSQL for session storage",
  "summary": "Postgres over Redis because we don't have Redis in the stack and session volume is low.",
  "revisitTrigger": "Session lookup p99 > 20ms or session volume > 1k/s",
  "date": "2025-03-15"
}
```

Revisit triggers are checked:
- During plan creation: if the plan's context includes metrics that match a trigger condition, the decision is flagged as `revisiting`
- During retrospectives: review active decisions against current system state
- `/project-status` surfaces any decisions in `revisiting` state

### Where Decisions Enter the Workflow

All interactive skills load active and revisiting decisions as context. Five skills write them (with user confirmation): `/create-plan`, `/explore`, `/create-architecture`, `/create-slices`, and `/complete`.

When a decision is superseded, the new decision references the old one and captures why the original choice no longer holds.

---

## File Structure

```
.project/
├── project.json                          # Central state: activeEpic/Slice/Quest, version, timestamps
├── .state-cache.json                     # GITIGNORED — directory mtime cache for fast state detection
├── activity-log.jsonl                    # Append-only JSONL log of all steps taken (audit trail)
│                                         #   Each line: {"ts","phase","scope","status","summary",...}
├── activity-log/                         # Detail files referenced by activity-log.jsonl entries
│   └── <phase>-<scope-slug>-<YYYYMMDDTHHmmss>.md
├── idea.md                               # Structured idea (problem, outcome, scope, constraints, open questions)
├── conventions.md                        # Project setup: mono repo vs not, language, frameworks,
│                                         #   dependencies, directory structure, file naming,
│                                         #   code style, testing approach
├── learnings.jsonl                       # Top-level learning registry (metadata for rollup tracking)
├── learnings/                            # Individual learning markdown files
│   └── <learning-slug>.md
├── decisions.jsonl                       # Decision records (active/superseded/revisiting)
├── interventions.jsonl                   # Intervention records (append-only, with category and rule-candidate)
├── autonomy.json                         # Per-subsystem autonomy levels and tracking metrics
├── project-health.md                     # Project health and quality profile
├── research/                             # Project-level (curated — includes promoted epic research)
│   └── <topic>.md
├── brainstorm/                           # Project-level (curated — includes promoted epic brainstorms)
│   └── <topic>.md
├── prototypes/                           # Project-level (curated — includes promoted epic prototypes)
│   └── <n>/
│       ├── <prototype files>
│       └── summary.md
├── architecture/                         # Current reality — what the repo looks like right now
│   ├── _overview.md                      # System overview + subsystem maturity table
│   ├── invariants.md                     # System-wide invariants that must hold across all changes
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
├── decisions/                            # Individual decision markdown files (optional, for long-form)
│   └── <YYYY-MM-DD>-<slug>.md
├── retrospectives/
│   └── <YYYY-MM-DD>.md
├── tasks/                                # Lightweight task captures
│   └── <task-name>.json                  #   status, title, context snapshot, convertedTo/droppedReason
├── epics/
│   ├── overview.json                     # Hierarchical index of all epics + nested slice status
│   ├── __active__<epic-name>/            # The one epic currently being built (only one at a time)
│   ├── ~~archived~~NN_<epic-name>/       # Completed/superseded/abandoned (NN = completion order)
│   └── <epic-name>/                      # Epics in exploration/proposal phase
│       ├── epic.json                     # Epic entity: status, goal, verifications, refinement, timestamps
│       ├── goal.md
│       ├── abandoned.md                  # If present, epic is abandoned
│       ├── research/
│       ├── brainstorm/
│       ├── prototypes/
│       ├── explore-complete.md
│       ├── explore-skipped.md
│       ├── architecture/                 # Target architecture — where this epic is headed
│       │   ├── _overview.md
│       │   └── ...                       # Same structure as top-level architecture/
│       ├── architecture-proposal/        # For subsequent epics: proposed changes to top-level
│       │   ├── _overview.md              # Summary of proposed changes
│       │   ├── <subsystem>-changes.md
│       │   └── new-<subsystem>.md
│       ├── architecture-proposal-skipped.md  # If no arch changes needed
│       ├── approved.md                   # "Trigger pulled" — proposal accepted, arch changes committed
│       ├── slices/
│       │   ├── sequencing.md
│       │   └── <NN-slice-name>/
│       │       ├── slice.json            # Slice entity: status, goal, deferred[], refinement, autonomyLevel, timestamps
│       │       ├── goal.md
│       │       ├── abandoned.md
│       │       ├── interrupted.md
│       │       ├── plan.md
│       │       ├── plan-refined.md
│       │       ├── plan-learnings-and-feedback.md
│       │       ├── after-implementation-fixes-and-polish.md
│       │       ├── learnings.jsonl        # Slice-level learning registry
│       │       ├── learnings/             # Individual learning markdown files
│       │       ├── architecture-deltas.jsonl  # Architectural changes from this slice
│       │       ├── plan-refining/         # Refinement working directory
│       │       │   ├── working-plan.md
│       │       │   ├── round-1/
│       │       │   │   ├── reviews/
│       │       │   │   │   ├── <reviewer>.md
│       │       │   │   │   └── ...
│       │       │   │   ├── merged.md
│       │       │   │   └── convergence.json  # Net-improvement tracking for this round
│       │       │   └── round-2/
│       │       │       └── ...
│       │       ├── implementation/
│       │       │   ├── phase-1/
│       │       │   │   ├── result.md
│       │       │   │   ├── review.md
│       │       │   │   └── iteration-2/
│       │       │   │       ├── result.md
│       │       │   │       └── review.md
│       │       │   └── phase-2/
│       │       │       └── ...
│       │       └── completion/
│       │           ├── learnings.md
│       │           ├── architecture-updates.md
│       │           └── interventions.md   # Interventions during this scope
│       ├── learnings.jsonl               # Epic-level learning registry
│       ├── learnings/                    # Epic-level learning files
│       └── completion/
│           ├── learnings.md
│           ├── architecture-updates.md
│           └── intervention-analysis.md  # Clustered intervention analysis for this epic
└── quests/                               # Non-slice work: small features, refactors, infra, tooling
    ├── overview.json                     # Index of all quests with status and timestamps
    ├── ~~archived~~<quest-name>/         # Completed/superseded/abandoned quests
    └── <quest-name>/                     # Same internal structure as slices
        ├── quest.json                    # Quest entity: status, goal, refinement, autonomyLevel, timestamps
        ├── goal.md
        ├── abandoned.md
        ├── explore-complete.md
        ├── explore-skipped.md
        ├── research/
        ├── brainstorm/
        ├── plan.md
        ├── plan-refined.md
        ├── plan-refining/                # Refinement working directory (same as slices)
        ├── learnings.jsonl
        ├── learnings/
        ├── architecture-deltas.jsonl
        ├── implementation/
        └── completion/
            ├── learnings.md
            ├── architecture-updates.md
            └── interventions.md
```

### Two-Layer Architecture

Architecture lives in two places with distinct purposes:

- **Top-level `.project/architecture/`** = **current reality** — what the repo looks like right now. Updated incrementally as slices and quests complete.
- **Epic `architecture/`** = **target state** — where the epic is headed when all its slices complete. Stays focused on what the epic set out to do; not updated when quests change the top-level.

Quests read both layers: top-level for planning against current reality, active epic architecture for compatibility with the future direction. `/complete` writes approved architecture updates to the top-level after each slice or quest, keeping it in sync with reality. Epic completion reconciles the two: any gaps between target and reality are surfaced as incomplete work or intentional scope reductions.

For the first epic, `/create-architecture` writes to the epic's `architecture/`. Top-level starts as a scaffold ("no architecture built yet — see active epic") and gets populated incrementally as slices complete.

**Stale assumption detection:** `/create-plan` and `/refine-plan` compare git commit dates of architecture files vs the scope's `goal.md`. If an architecture file is newer than the goal, the user is prompted to verify whether the goal or plan needs updating. (Skipped when top-level `_overview.md` has `<!-- scaffold -->` marker.)

### Key Distinctions
- **research/** — investigating unknowns (external APIs, libraries, domain knowledge)
- **brainstorm/** — captured output from brainstorming sessions (ideas explored, options considered, decisions made)
- **prototypes/** — exploratory, try multiple ideas (UI or non-UI: algorithms, system designs, integrations). Project-level only.
- **research + brainstorm + prototypes** form the "explore loop" — iterate in any order until ready to create architecture or propose architectural changes
- **architecture/ui-mock/** — canonical UI reference, only updated when a deliberate decision is made to change it
- **architecture/invariants.md** — system-wide constraints that all plans are checked against
- **decisions.jsonl** — durable project decisions that outlive individual slices. All interactive skills load decisions as context; five skills write them (with user confirmation).
- **interventions.jsonl** — append-only log of human interventions, categorized for workflow improvement
- **autonomy.json** — per-subsystem autonomy levels and tracking metrics
- **epics/** — large bodies of work with their own exploration, architecture proposals, and slices
- **quests/** — small self-contained work (features, refactors, infra, tooling) within existing architecture
- **tasks/** — lightweight captures (bugs, ideas, improvements) that can be converted to quests or epics
- **epics/\<name\>/slices/** — end-to-end slices delivering testable user value, scoped to their epic
- **plan.md vs plan-refined.md** — before/after refinement; if plan-refined.md exists, it's what gets implemented
- **plan-refining/** — working directory during refinement; contains round history, working copy, and convergence tracking
- **project.json** — central state tracking (active epic/slice/quest, version). Read first on every invocation.
- **overview.json** — hierarchical indexes for fast querying of epics and quests without filesystem traversal
- **activity-log.jsonl** — how we got here (append-only audit trail of all steps)
- **.project/conventions.md** — project-level tech stack, repo structure, coding conventions. Read by all implementers and reviewers.
- **architecture/conventions.md** — architectural patterns applied across all subsystems. Read by plan writing, review, and implementation for architectural consistency.

### Directory Prefixes

| Sort order | Prefix | Meaning | Used for |
|---|---|---|---|
| First | `__active__` | Currently being built | Epics only (one at a time) |
| Middle | *(no prefix)* | Pending or in exploration | All containers |
| Last | `~~archived~~NN_` | Completed, superseded, or abandoned | Epics (NN = completion order). Quests optionally numbered. |

### Shared Skill References
Shared reference files consumed by multiple skills live at `skills/_shared/references/`. Contains convention definitions (decisions format, CLI interaction protocol, iteration loop, maturity conventions, epic conventions, expertise tracking protocol, failure mode response table, autonomy level protocol) and other cross-cutting guidance that must stay consistent across skills.

---

## State Machine

The CLI's state machine is a pure reducer with no I/O: `(state, event) → new state | error`. All timestamps are injected by the RPC layer, not generated inside the reducer. State events are strongly typed (90+ event types) with explicit error codes.

### Entity Status Transitions

**Epic:**
```
created → exploring → explored → defining-architecture → architecture-defined
  → refining-architecture → architecture-refined → defining-slices → slices-defined
  → refining-slices → slices-refined → activated → completed
Any state → abandoned
```

**Slice / Quest:**
```
created → planning → plan-created → refining → plan-refined
  → implementing → implementation-complete → completed
Any state → abandoned
```

**Task:**
```
open → converted | dropped
```

### Guards and Constraints

- **Activation gate:** Only one active epic at a time. `ACTIVATE_EPIC` fails if another epic is active.
- **Sequential enforcement:** Slices within an epic execute in sequence (configurable).
- **Circuit breakers:** Refinement rounds track score history and net-improvement; the reducer detects decline, oscillation, net-improvement stall, and max-round conditions.
- **Refinement scores:** Stored on the entity (`refinement.scoreHistory[]`) for trajectory analysis.
- **Convergence data:** Stored per round (`refinement.convergenceHistory[]`) for net-improvement tracking.

### State Errors

Strongly typed error codes: `STATE_ALREADY_INITIALIZED`, `STATE_INVALID_TRANSITION`, `STATE_EPIC_ALREADY_ACTIVE`, `STATE_ENTITY_NOT_FOUND`, etc. Each error includes the attempted event and current state for debugging.

### File Existence as Supplementary Signal

While the JSON entity status is canonical, file existence provides supplementary state signals:

- `explore-complete.md` / `explore-skipped.md` — marks end of explore loop
- `architecture-proposal-skipped.md` — epic doesn't need architecture changes
- `approved.md` — architecture proposal accepted
- `abandoned.md` — entity abandoned (also reflected in JSON status)
- `interrupted.md` — slice paused for a quest (contains quest name and phase when interrupted)
- `completion/learnings.md` — entity complete (also reflected in JSON status)
- `completion/interventions.md` — intervention log for this scope

Skills use these markers for re-entry detection and resume logic. The CLI uses JSON status as the source of truth for state transitions.

---

## Learning System Detail

### Learning Structure

Each learning entry follows this format:

```markdown
### [Short title]
**Context**: What was being built, what subsystem, what pattern.
**What happened**: Concrete description of the problem or success.
**Root cause**: Why it happened.
**Resolution**: What fixed it or what the right approach was.
**Concrete example**: A before/after code snippet or spec snippet.
**Preventive rule**: A reusable statement that future scopes can apply.
  Can this be automated? [yes/no] If yes, what check?
```

The **concrete example** is mandatory. Abstract learnings ("be careful with async") are nearly useless. Specific examples ("when using Promise.allSettled for batch operations, always check individual result statuses — don't just check that the outer promise resolved") are actionable.

### Learning Promotion Pipeline

Learnings follow a promotion path from prose to deterministic enforcement:

1. **Captured**: Written as a markdown file with a concrete example. `recurrenceCount: 0`.
2. **Validated**: Applied successfully in 2+ subsequent scopes without recurrence. The learning is working.
3. **Promoted**: If the learning has been applied 3+ times successfully, evaluate whether it can become:
   - A fitness function (architectural property test)
   - A linter rule or type constraint
   - A reviewer criterion (added to the refinement reviewer registry)
   - A plan template section (added to the plan creation skill)
   - A code generation pattern
4. **Automated**: Once promoted to a deterministic check, mark `automated: true`. The learning is preserved for context but the check now does the enforcement. Track whether the check actually prevents recurrence.

If `recurrenceCount` reaches 2 despite the learning existing: rewrite with a more specific example. If it reaches 3: promote immediately — the learning format isn't working and the enforcement needs to be mechanical.

### Learning Scopes and Rollup

| Scope | Stored in | Loaded when | Rolled up to |
|---|---|---|---|
| Slice-specific | `slices/<name>/learnings/` | Working on slices in the same epic | Epic-level |
| Quest-specific | `quests/<name>/learnings/` | Working on related quests | Project-level |
| Epic-specific | `epics/<name>/learnings/` | Working on slices in this epic | Project-level |
| Project-wide | `learnings/` | Every session (via context bundling) | — |

Rollup happens during `/complete` via `goodplan learning:rollup`. It surfaces slice/quest learnings to the appropriate higher scope, deduplicating and summarizing where learnings overlap.
