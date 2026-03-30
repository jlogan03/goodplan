# Epic Conventions

Single source of truth for epic structure. Consumed by all epic-aware skills.

## How to Load This File

Skills that need epic awareness should read this file (`epic-conventions.md` in the `_shared/references/` directory). Load it when:
- Determining epic state (state machine lookup)
- Creating or modifying epic directory structures
- Planning transitions between epic phases

## Contents

- [Directory Structure](#directory-structure)
- [`__active__` Prefix Convention](#active-prefix-convention)
- [Epic State Machine](#epic-state-machine)
- [State Transition Table](#state-transition-table)
- [First Epic Special Cases](#first-epic-special-cases)
- [Two-Layer Architecture Model](#two-layer-architecture-model)
- [Rollback / Unapproval](#rollback--unapproval)
- [Archive Numbering](#archive-numbering)
- [Stale Assumption Detection Algorithm](#stale-assumption-detection-algorithm)
- [Consumer Guide](#consumer-guide)

---

## Directory Structure

### First Epic

Created by `/create-epic` as `__active__initial/` — starts active, no approval gate.

```
.goodplan/epics/
└── __active__initial/
    ├── goal.md
    ├── explore-complete.md          # or explore-skipped.md
    ├── research/                    # explore loop artifacts
    │   └── <topic>.md
    ├── brainstorm/
    │   └── <topic>.md
    ├── prototypes/
    │   └── <name>/
    │       ├── <prototype files>
    │       └── summary.md
    ├── architecture/                # target architecture (written directly, no proposal)
    │   ├── _overview.md
    │   ├── invariants.md
    │   ├── conventions.md
    │   ├── data-model.md
    │   ├── <subsystem>-api.md
    │   ├── flows.md
    │   ├── information-architecture.md
    │   ├── ui-ux.md
    │   └── ui-mock/
    │       ├── index.html
    │       ├── styles.css
    │       ├── script.js
    │       └── summary.md
    ├── learnings/                   # per-learning .md files (CLI-managed)
    │   └── <slug>.md
    ├── slices/
    │   ├── sequencing.md
    │   └── <NN-slice-name>/         # per-slice state machine applies here
    │       ├── goal.md
    │       ├── learnings/           # per-learning .md files (CLI-managed)
    │       │   └── <slug>.md
    │       └── ...                  # same structure as side quests
    └── completion/
        ├── learnings.md             # re-entry detection artifact (LLM-owned)
        └── architecture-updates.md
```

### Subsequent Epics

Created by `/create-epic`. Starts without `__active__` prefix. Renamed to `__active__<name>/` by `/start-epic` upon approval.

```
.goodplan/epics/
├── __active__<name>/                # one active epic at a time (pre-CLI convention)
└── <name>/                          # all epics use bare names; status via CLI
    ├── goal.md
    ├── abandoned.md                 # if present, epic is abandoned
    ├── explore-complete.md          # or explore-skipped.md
    ├── research/
    ├── brainstorm/
    ├── prototypes/
    ├── architecture-proposal/       # proposed changes to top-level architecture
    │   ├── _overview.md             # summary of proposed changes
    │   ├── <subsystem>-changes.md
    │   └── new-<subsystem>.md
    ├── architecture-proposal-skipped.md  # if no arch changes needed
    ├── approved.md                  # trigger pulled — proposal accepted
    ├── architecture/                # target architecture (created by /start-epic from proposal upon approval)
    │   └── ...                      # same structure as first epic
    ├── learnings/                   # per-learning .md files (CLI-managed)
    │   └── <slug>.md
    ├── slices/
    │   ├── sequencing.md
    │   └── <NN-slice-name>/
    │       ├── learnings/           # per-learning .md files (CLI-managed)
    │       │   └── <slug>.md
    │       └── ...
    └── completion/
        ├── learnings.md             # re-entry detection artifact (LLM-owned)
        └── architecture-updates.md
```

---

## `__active__` Prefix Convention

- Only **one** active epic at a time.
- First epic: created as `__active__initial/` by `/create-epic` (auto-active, no approval gate).
- Subsequent epics: activation is handled by the `epic:activate` CLI command when the architecture proposal is approved. **Skills should not rename directories** — the CLI manages this internally.
- The `__active__` prefix is a legacy convention that the CLI may use internally. Skills should use `gp status --json` (`.activeEpic`) to detect the active epic rather than relying on directory naming.
- Indicates the epic is approved and being built (slices defined, execution in progress).

---

## Epic State Machine

File-existence states. Check in order — **first match wins** (same pattern as per-slice state machine in `status-logic.md`).

### Shared States (all epics)

| # | Condition | State |
|---|---|---|
| 1 | `abandoned.md` exists | Abandoned |
| 2 | `completion/learnings.md` exists | Complete |
| 3 | `slices/sequencing.md` exists AND at least one slice directory exists AND all slices complete, no `completion/` | Needs epic completion |
| 4 | `slices/sequencing.md` exists, slices in progress | Executing slices |

> `abandoned.md` is row #1 (structural precedence via first-match-wins) — intentional difference from workflow.md which lists it later with a parenthetical "(takes precedence)." First-match-wins ordering is clearer and matches `status-logic.md` convention.

### First Epic (`__active__initial/`)

Auto-active, no approval gate. `/create-architecture` writes directly to `architecture/`.

| # | Condition | State |
|---|---|---|
| 5 | `architecture/_overview.md` exists (not just empty dir), no sequencing | Needs slice planning |
| 6 | `explore-complete.md` or `explore-skipped.md`, no `architecture/_overview.md` | Needs architecture |
| 7 | `research/` or `brainstorm/` exists, no explore marker | Exploring |
| 8 | Only `goal.md` | Ready for exploration |

### Subsequent Epics (require `/start-epic` approval)

| # | Condition | State |
|---|---|---|
| 5 | `approved.md` or `architecture-proposal-skipped.md`, no sequencing | Needs slice planning |
| 6 | `architecture-proposal/` exists, no `approved.md` | Proposal pending review |
| 7 | `explore-complete.md` or `explore-skipped.md`, no proposal | Needs architecture proposal (or skip) |
| 8 | `research/` or `brainstorm/` exists, no explore marker | Exploring |
| 9 | Only `goal.md` | Ready for exploration |

---

## State Transition Table

### First Epic Transitions

| From State | Trigger | To State | Skill |
|---|---|---|---|
| (none) | `/create-epic` | ready-for-exploration | `/create-epic` |
| ready-for-exploration | `/explore` | exploring | `/explore` |
| ready-for-exploration | user skips explore | needs-architecture | writes `explore-skipped.md` |
| exploring | user marks done | needs-architecture | `/explore` writes `explore-complete.md` |
| needs-architecture | `/create-architecture` | needs-slice-planning | `/create-architecture` writes to `architecture/` |
| needs-slice-planning | `/create-slices` | executing-slices | `/create-slices` |
| executing-slices | all slices complete | needs-completion | automatic |
| needs-completion | `/complete` | complete | `/complete` |
| any | user abandons | abandoned | writes `abandoned.md` |

### Subsequent Epic Transitions

| From State | Trigger | To State | Skill |
|---|---|---|---|
| (none) | `/create-epic` | ready-for-exploration | `/create-epic` |
| ready-for-exploration | `/explore` | exploring | `/explore` |
| ready-for-exploration | user skips explore | needs-architecture-proposal | writes `explore-skipped.md` |
| exploring | user marks done | needs-architecture-proposal | `/explore` writes `explore-complete.md` |
| needs-architecture-proposal | `/create-architecture` | proposal-pending | `/create-architecture` writes to `architecture-proposal/` |
| needs-architecture-proposal | user skips proposal | needs-slice-planning | writes `architecture-proposal-skipped.md` |
| proposal-pending | `/start-epic` | needs-slice-planning | `/start-epic` writes `approved.md`, renames to `__active__` |
| needs-slice-planning | `/create-slices` | executing-slices | `/create-slices` |
| executing-slices | all slices complete | needs-completion | automatic |
| needs-completion | `/complete` | complete | `/complete` |
| any | user abandons | abandoned | writes `abandoned.md` |

---

## First Epic Special Cases

- Auto-named `initial`. Created as `__active__initial/` (starts active — no approval gate).
- Skips `architecture-proposal/` and `approved.md`.
- `/create-architecture` writes directly to epic's `architecture/`, not `architecture-proposal/`.
- No `/start-epic` step required.

---

## Two-Layer Architecture Model

Architecture lives in two places with distinct purposes:

| Layer | Location | Purpose | Updated by |
|---|---|---|---|
| **Top-level** | `.goodplan/architecture/` | Current reality — what the repo looks like now | `/complete` after each slice/quest |
| **Epic** | `epics/<name>/architecture/` | Target state — where the epic is headed | `/create-architecture` (first init) or `/start-epic` (subsequent) |

### Who reads/writes each layer

| Skill | Top-level (current reality) | Epic architecture (target) |
|---|---|---|
| `/create-architecture` | Reads (context) | **Writes** (first init: `architecture/`) |
| `/create-architecture` | Reads (context) | **Writes** (subsequent: `architecture-proposal/`) |
| `/start-epic` | Reads (baseline) | Reads proposal, **writes** `approved.md` |
| `/create-slices` | Reads (context) | Reads (target) |
| `/create-plan` | Reads (current state) | Reads (target) |
| `/refine-plan` | Reads (context) | Reads (target) |
| `/implement-plan` | Reads (current state) | Reads (target) |
| `/refine-architecture` | Reads and **updates** | Reads and **updates** |
| `/audit-architecture` | Reads, proposes side quests | Reads (comparison) |
| `/complete` (slice) | **Writes** approved updates | Reads (reconciliation) |
| `/complete` (epic) | **Writes** final reconciliation | Reads (gaps check) |
| `/explore` | Reads (context) | N/A (explore precedes arch) |
| Side quest planning | Reads (plan against reality) | Reads active epic arch (compatibility) |

### Key rules

- Epic architecture does **not** change when side quests update top-level.
- `/complete` updates top-level incrementally as slices land.
- Epic completion reconciles the two layers — gaps between target and reality are surfaced as incomplete work or intentional scope reductions.
- For the first epic, top-level starts as a scaffold and gets populated as slices complete.

---

## Rollback / Unapproval

There is no "unapprove" transition. If an approved epic's architecture turns out wrong, the path is abandonment (`abandoned.md`).

Since top-level architecture is only updated by `/complete` as slices land (not at approval time), abandoning an epic leaves top-level intact — no architectural rollback is needed.

---

## Archive Convention (REMOVED)

Completed epics keep their original directory names. Directory renaming (the former `~~archived~~NN_<name>` convention) has been removed because it breaks CLI path resolution — the CLI uses entity names to construct paths (`epics/<name>/epic.json`). Completed entities are identified by `status === "completed"` via CLI queries.

---

## Stale Assumption Detection Algorithm

Architecture files may change after a scope's `goal.md` is written — due to other slices completing, architecture refinement, or side quest outcomes. Plans built on stale assumptions lead to rework.

**Detection**: For each architecture file relevant to the scope, compare git commit dates:

```
git log -1 --format="%ai" -- <architecture-file>
git log -1 --format="%ai" -- <scope>/goal.md
```

If the architecture file is newer than `goal.md`, the goal was written against an older version.

**Fallback**: If `git log` returns nothing (file never committed), use filesystem modification time via `stat -f %m` (macOS) or `stat -c %Y` (Linux).

**Skip when**:
- The architecture file has never been committed and has no git history — use `stat` fallback for comparison only
- The top-level `_overview.md` contains a `<!-- scaffold -->` marker (placeholder scaffold, not real content). Note: epic-level `architecture/_overview.md` is always authored explicitly and is never a scaffold — do not skip staleness checks on it.

---

## Consumer Guide

Which skills create, read, or update epic artifacts:

| Artifact | Created by | Read by | Updated by |
|---|---|---|---|
| `goal.md` | `/create-epic` | All epic-aware skills | `/complete` (if learnings warrant goal updates) |
| `research/`, `brainstorm/`, `prototypes/` | `/explore` | `/create-architecture`, `/create-plan` | `/explore` |
| `explore-complete.md`, `explore-skipped.md` | `/explore`, user skip | State machine checks | — |
| `architecture/` (first init) | `/create-architecture` | `/create-slices`, `/create-plan`, `/refine-plan`, `/implement-plan`, `/refine-architecture`, `/audit-architecture` | `/refine-architecture` |
| `architecture-proposal/` (subsequent) | `/create-architecture` | `/start-epic` | `/refine-architecture` |
| `architecture-proposal-skipped.md` | User skip | State machine checks | — |
| `approved.md` | `/start-epic` | State machine checks | — |
| `architecture/` (subsequent init) | `/start-epic` (from proposal upon approval) | Same as first init | `/refine-architecture` |
| `slices/` | `/create-slices` | `/create-plan`, `/refine-slices`, `/project-status` | `/refine-slices`, `/complete` |
| `abandoned.md` | User action | State machine checks, `/complete` (learnings) | — |
| `completion/` | `/complete` | `/project-status`, future epic planning | — |

> **Note**: During epic completion, `/complete` may also copy artifacts from epic `research/`, `brainstorm/`, `prototypes/` to project-level directories (`.goodplan/research/`, etc.) via the artifact promotion step. This is a copy (originals preserved in the archived epic).
