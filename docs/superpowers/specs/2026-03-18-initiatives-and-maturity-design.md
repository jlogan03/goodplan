# Initiatives, Architectural Maturity, and Post-MVP Workflow

## Problem

The current workflow has a clear path from idea through architecture, vertical slices, and implementation — but it effectively ends at a retrospective. Real projects live for years and go through many cycles of feature expansion. The workflow needs to support:

1. Ongoing evolution after the initial build, with work ranging from small fixes to major new capabilities
2. Architectural maturity tracking so that stable, battle-tested subsystems aren't casually changed
3. Engineering practices (fitness functions, system invariants) that prevent quality degradation as the system grows

## Design

### Initiatives as the Primary Unit of Large Work

An initiative is a scoped body of work large enough to need its own exploration, architectural thinking, and multiple vertical slices. The initial project setup (idea → explore → define architecture → define slices → implement) is retroactively understood as the first initiative.

**Work triage — two containers:**

| Container | Scale | Has exploration? | Has architecture proposal? | Has its own slices? |
|---|---|---|---|---|
| Side quest | Small — fits within existing architecture | No (research during planning only) | No | No — single unit of work |
| Initiative | Large — needs exploration, may change architecture | Yes | Yes (if touching architecture) | Yes |

Side quests cover both infrastructure work and small user-facing features. If something is small enough to not need exploration or architecture changes, it's a side quest regardless of whether it's user-facing.

**Initiative lifecycle:**

1. **Capture** — define goal, scope, and motivation
2. **Explore** — research, brainstorm, prototype, scoped to this initiative
3. **Architecture proposal** — describe how this initiative wants to change or extend the top-level architecture. This is a proposal that lives within the initiative until approved
4. **Pull the trigger** — deliberate decision to approve the architectural changes and commit them to the top-level architecture. This is when the initiative moves from "thinking about it" to "building it"
5. **Define slices** — break the initiative into vertical slices
6. **Execute slices** — plan → refine → implement → QA → complete per slice
7. **Complete initiative** — retrospective, learnings rollup, promote broadly useful research/brainstorm/prototype artifacts to top-level directories

**Multiple initiatives can be explored simultaneously:** Several initiatives can be in phases 1-3 — exploring different directions the software could go. But only one initiative can be approved and actively being built at a time. When an initiative is approved (phase 4), its directory is renamed with an `__active__` prefix (e.g., `__active__realtime-collab/`) to make it immediately visible in the file explorer.

**One active initiative constraint:** This prevents spreading implementation effort across competing architectural changes. Other initiatives stay in exploration/proposal phases until the active one completes or is abandoned.

**Initiative state machine (file existence):**

- Only `goal.md` → ready for exploration (or skip to architecture proposal if no exploration needed)
- `research/` or `brainstorm/` but no `explore-complete.md` → explore in progress
- `explore-complete.md` or `explore-skipped.md` exists, no `architecture-proposal/` and no `architecture-proposal-skipped.md` → needs architecture proposal (or skip if no arch changes needed)
- `architecture-proposal-skipped.md` exists → no arch changes needed, advance to slice planning
- `architecture-proposal/` exists, no `approved.md` → proposal pending review
- `approved.md` or `architecture-proposal-skipped.md` exists, no `vertical-slices/sequencing.md` → needs slice planning
- Slices in progress → same per-slice state machine as today
- All slices complete, no `completion/` → needs initiative completion
- `completion/learnings.md` exists → initiative complete
- `abandoned.md` exists → abandoned (takes precedence over all other states, same as slices/quests)

**Naming conventions:**
- `__active__<name>/` — the one initiative currently being built (only one at a time)
- `__archived__<name>/` — completed, superseded, or abandoned initiatives

The `__archived__` prefix replaces the existing `__done__` prefix across all containers (initiatives, vertical slices, and side quests). "Archived" better captures the range of reasons something is no longer active — completed, abandoned, or superseded.

**`approved.md` contents:** Records the decision rationale — why we're proceeding, any conditions or concerns noted during review, what architectural changes were committed to the top-level architecture, and references to the specific architecture files modified.

### File Structure

```
.project/
├── architecture/              # Top-level: current truth about the system
│   ├── _overview.md           # Includes subsystem maturity table
│   ├── invariants.md          # System-wide invariants
│   └── ...                    # Existing architecture files
├── research/                  # Project-level (curated — includes promoted initiative research)
├── brainstorm/                # Project-level (curated — includes promoted initiative brainstorms)
├── prototypes/                # Project-level (curated — includes promoted initiative prototypes)
├── initiatives/
│   ├── __archived__initial-mvp/   # The first initiative (retroactive)
│   └── <initiative-name>/
│       ├── goal.md
│       ├── abandoned.md       # If present, initiative is abandoned
│       ├── research/
│       ├── brainstorm/
│       ├── prototypes/
│       ├── explore-complete.md
│       ├── explore-skipped.md
│       ├── architecture-proposal/
│       │   ├── _overview.md   # Summary of proposed changes
│       │   ├── <subsystem>-changes.md
│       │   └── new-<subsystem>.md
│       ├── architecture-proposal-skipped.md  # If no arch changes needed
│       ├── approved.md        # "Trigger pulled" — proposal accepted
│       ├── vertical-slices/
│       │   ├── sequencing.md
│       │   └── <NN-slice-name>/       # No explore phase — exploration is initiative-level
│       │       ├── goal.md
│       │       ├── plan.md
│       │       ├── plan-refined.md
│       │       ├── refinement/
│       │       ├── implementation/
│       │       └── completion/
│       └── completion/
│           ├── learnings.md
│           └── architecture-updates.md
├── side-quests/               # Unchanged — small self-contained work
└── vertical-slices/           # Initial MVP slices (part of first initiative retroactively)
```

### Per-Slice Lifecycle (Simplified)

The explore phase is removed from individual slices. All exploration happens at the initiative level. Narrow research needed during slice planning is handled by `/create-plan`'s existing research step.

Per-slice lifecycle: goal → plan → refine → implement → QA → complete.

### Research Promotion During Initiative Completion

When the last slice in an initiative completes, the initiative completion process includes reviewing the initiative's `research/`, `brainstorm/`, and `prototypes/` directories. Anything broadly useful to the project gets copied (not moved — the initiative remains a complete historical record) to the top-level `.project/research/`, `.project/brainstorm/`, or `.project/prototypes/`.

Over time, the top-level directories become a curated library of the project's most broadly useful knowledge.

### Architectural Maturity Spectrum

Each subsystem in the top-level architecture has a maturity designation. Maturity is a spectrum, not a binary — it reflects how much confidence, investment, and usage a subsystem has accumulated.

**Four named levels:**

| Level | Description | Change protocol |
|---|---|---|
| **Experimental** | New, actively being shaped, might be replaced entirely. Few or no dependents. | Changes are free |
| **Developing** | Design direction is clear but still filling out. Some dependents. | Changes expected but should be deliberate |
| **Maturing** | Well-used, most edge cases handled, multiple dependents. | Changes need justification and impact awareness |
| **Foundational** | Battle-tested, deeply relied upon, generic enough for future needs. | Changes are rare — require serious justification, migration planning, fitness function updates |

**What maturity captures:**
- How broadly the subsystem is used (number and importance of dependents)
- How much investment has gone into edge cases, error handling, hardening
- How generic and well-modularized the design is
- How confident we are it meets future needs without major overhaul

**The maturity table** lives in `architecture/_overview.md`:

```markdown
## Subsystem Maturity

| Subsystem | Maturity | Dependents | Fitness Functions | Notes |
|---|---|---|---|---|
| Job system | Foundational | auth, billing, notifications, reports | job-system.test.ts | Generic task runner. Edge cases well-covered. |
| API contract | Maturing | all client-facing code | api-contract.test.ts | Schema validation solid. Pagination evolving. |
| Auth | Developing | API layer, admin UI | — | Core auth works. RBAC being extended. |
| Notifications | Experimental | — | — | Exploring channel abstractions. |
```

**Graduating maturity:** Promotions are suggested by `/complete` and `/audit-architecture` when they observe stability, fitness functions in place, multiple dependents, and generic-enough design. But the promotion is always a human decision, captured as a decision record.

### Maturity Integration Points

Maturity is not a gate — it's a signal that scales the level of caution at every decision point.

**Initiative architecture proposals:** Load the maturity table. If the proposal touches maturing+ subsystems, require justification (why current design is insufficient), migration plan (what dependents need to change), and updated fitness functions.

**Slice planning (`/define-slices`):** Slices that touch maturing+ subsystems are flagged in their `goal.md` with a reference to the initiative's architecture proposal justification.

**Plan creation (`/create-plan`):** Loads maturity context. Plans involving maturing+ subsystems must reference the architecture proposal, include fitness function update steps, and include migration steps for dependents if the contract changes.

**Side quest planning:** If a side quest touches a maturing+ subsystem, flag it: "This side quest modifies a [maturing/foundational] subsystem. Should this be scoped as an initiative instead?"

**Plan refinement:** Reviewers receive maturity context. For maturing+ subsystems, they specifically check: are fitness functions being updated? Are invariants preserved? Is the migration plan complete? Does the justification hold?

**Implementation:** Existing fitness functions must continue to pass (or be deliberately updated per the plan). Reviewer sub-agents check that maturing+ subsystem changes match the plan — no ad-hoc changes.

**Slice/initiative completion:** Did this work stabilize any subsystems enough to suggest a maturity promotion? Were fitness functions written/updated as planned?

**The core purpose:** Prevent Claude from casually recommending changes to subsystems that are deeply relied upon or that represent significant investment in edge case handling and hardening. Maturity context tells it: this subsystem is foundational — don't propose changes lightly.

### Fitness Functions

Automated tests that verify architectural properties — not business logic, but structural guarantees.

Examples:
- "All API endpoints validate input against their schema before processing"
- "No module in the data layer imports from the UI layer"
- "Every async job type has a timeout and a failure handler"
- "Database queries go through the repository layer, never direct"

Fitness functions live as actual tests in the codebase but are documented in the architecture files so the intent is clear.

**Where they enter the workflow:**
- `/define-architecture` and initiative architecture proposals identify candidates: "when this subsystem matures, these properties should be tested"
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
- Defined during `/define-architecture`, refined over time
- Plan refinement reviewers explicitly check plans against invariants
- Initiative architecture proposals must state which invariants they preserve and justify any amendments
- `/audit-architecture` checks if invariants are being respected in practice

### Retrospectives

Retrospectives become periodic rather than terminal. Recommended after:
- Initiative completion
- `/project-status` detects signals (many slices since last retro, architectural drift, recurring QA issues)

Not a hard gate — a nudge.

## What Changes from the Current Workflow

1. **Initiatives** — new first-class concept with directory structure, own explore loop, architecture proposals, and slices
2. **Architecture proposal as staging area** — initiative-scoped architectural thinking that doesn't touch top-level architecture until approved
3. **Architectural maturity spectrum** — subsystems tracked as experimental → developing → maturing → foundational, loaded at every decision point
4. **Fitness functions** — automated tests of architectural properties, written as subsystems mature
5. **System invariants** — documented constraints checked during plan refinement
6. **Explore phase removed from individual slices** — exploration happens at initiative level; narrow research handled by `/create-plan`
7. **Research promotion** — broadly useful initiative research/brainstorm/prototypes promoted to top-level during initiative completion
8. **Retrospectives periodic, not terminal** — recommended by signals, not end-of-project
9. **`__active__` prefix** — the one initiative currently being built is visually distinct in the file explorer
10. **`__archived__` replaces `__done__`** — across initiatives, slices, and side quests. Better captures completed, abandoned, and superseded states
11. **`/complete` renamed to `/complete`** — now handles slices, side quests, and initiatives. Scope inferred from context.

## What Stays the Same

- Side quests — same structure as today, but triage behavior changes: side quests that touch maturing+ subsystems get flagged for potential re-scoping as initiatives
- Per-slice lifecycle — goal → plan → refine → implement → QA → complete (minus explore phase)
- File-existence state machine — extended for initiatives but same principle
- Learning loop — learnings roll up from slices to initiatives to top-level
- Git workflow — branch per slice/quest
- All existing skills — work the same with additional maturity context loaded

## Implementation Scope Notes

- `/audit-architecture` and `/project-status` are referenced as consumers of maturity data and fitness functions. Changes to these skills to support the new concepts are part of this design's implementation scope.
- The retroactive treatment of the initial MVP as the first initiative (creating `__archived__initial-mvp/`) is a migration step — mechanics to be determined during planning.
- The `__done__` → `__archived__` prefix rename applies to all existing slices, side quests, and references in workflow.md and skill files. This is a cross-cutting migration.
- Existing side quest explore phases (in workflow.md) are unaffected — only per-slice explore phases within initiatives are removed.
