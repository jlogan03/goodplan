# Phase 1: Initiative Conventions

Create `~/.claude/skills/_shared/references/initiative-conventions.md` — the single source of truth for initiative structure, consumed by all initiative-aware skills.

### Tasks

- [ ] **Create `initiative-conventions.md`** with sections:
  - **Directory Structure**: Full tree from design spec — `initiatives/`, `__active__<name>/`, architecture/, vertical-slices/, research/, brainstorm/, prototypes/, completion/. Include both first-initiative and subsequent-initiative variants.
  - **`__active__` Prefix Convention**: Only one `__active__` initiative at a time. Applied by `/start-initiative` (or automatically for the first initiative by `/create-initiative`). Indicates the initiative is approved and being built.
  - **Initiative State Machine**: File-existence states (check order matters — first match wins, same pattern as per-slice state machine in `status-logic.md`):

    | # | Condition | State |
    |---|---|---|
    | 1 | `abandoned.md` exists | Abandoned |
    | 2 | `completion/learnings.md` exists | Complete |
    | 3 | All slices complete, no `completion/` | Needs initiative completion |
    | 4 | `vertical-slices/sequencing.md` exists, slices in progress | Executing slices |
    | 5 | `approved.md` or `architecture-proposal-skipped.md`, no sequencing | Needs slice planning |
    | 6 | `architecture-proposal/` exists, no `approved.md` | Proposal pending review |
    | 7 | `architecture-proposal-skipped.md` exists | No arch changes needed |
    | 8 | `explore-complete.md` or `explore-skipped.md`, no proposal | Needs architecture proposal (or skip) |
    | 9 | `research/` or `brainstorm/` exists, no explore marker | Exploring |
    | 10 | Only `goal.md` | Ready for exploration |

  - **State Transition Table**: Formal transitions for completeness verification:

    | From State | Trigger | To State | Skill |
    |---|---|---|---|
    | (none) | `/create-initiative` | ready-for-exploration | `/create-initiative` |
    | ready-for-exploration | `/explore` | exploring | `/explore` |
    | ready-for-exploration | user skips explore | needs-architecture-proposal | (writes `explore-skipped.md`) |
    | exploring | user marks done | needs-architecture-proposal | `/explore` (writes `explore-complete.md`) |
    | needs-architecture-proposal | `/define-architecture` | proposal-pending | `/define-architecture` |
    | needs-architecture-proposal | user skips proposal | needs-slice-planning | (writes `architecture-proposal-skipped.md`) |
    | proposal-pending | `/start-initiative` | needs-slice-planning | `/start-initiative` (writes `approved.md`, renames to `__active__`) |
    | needs-slice-planning | `/define-slices` | executing-slices | `/define-slices` |
    | executing-slices | all slices complete | needs-completion | (automatic) |
    | needs-completion | `/complete` | complete | `/complete` |
    | any | user abandons | abandoned | (writes `abandoned.md`) |

  - **First Initiative Special Cases**: Auto-named "initial". Created as `__active__initial/` (starts active — no approval gate). Skips `architecture-proposal/` and `approved.md`. `/define-architecture` writes directly to initiative's `architecture/`, not `architecture-proposal/`.
  - **Two-Layer Architecture Model**: Top-level `.project/architecture/` = current reality. Initiative `architecture/` = target. Side quests read both. `/complete` updates top-level. Initiative architecture doesn't change when side quests update top-level. Include a table showing who reads/writes each layer.
  - **Archive Numbering**: `~~archived~~NN_<name>` with completion-order counter. Count existing `~~archived~~` directories in `initiatives/` to determine next number.
  - **Consumer Guide**: Which skills create/read/update initiative artifacts.

### Verification

- Read the file. Confirm all sections present.
- Verify state machine has no dead-end states (every non-terminal state has at least one outgoing transition).
- Verify transition table covers all states.
- Cross-reference directory structure with design spec.
