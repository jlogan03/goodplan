# Plan: Rename /complete-slice to /complete

## Overview

Rename the `/complete-slice` skill to `/complete` and extend it to handle initiative completion alongside the existing slice and side quest completion. The skill already handles initiative-scoped slices (from the initiatives-infrastructure quest); this plan adds initiative-level completion as a new scope type.

**Slug**: `complete-rename`

**Approach**: Rename first (Phase 1), then add initiative completion mode (Phase 2), then clean up convention references (Phase 3). The rename is mechanical; the initiative completion mode is the substantive new work.

**Key design decisions**:
- All slices must be complete (archived or abandoned) before initiative completion proceeds
- Artifact promotion (research/brainstorm/prototypes) copies to project-level, originals stay in archived initiative for context
- Archive numbering uses `~~archived~~NN_<name>` with zero-padded two-digit counter

## Phase 1: Rename Directory + Cross-References

Rename `complete-slice/` to `complete/` and update all references across skills and repo files.

### Tasks

- [ ] **Rename skill directory**: `mv ~/.claude/skills/complete-slice ~/.claude/skills/complete`. Update SKILL.md frontmatter: `name: complete`, update description to mention slices, side quests, and initiatives. Add trigger phrases: 'complete initiative', 'finish initiative', 'initiative is done'.

- [ ] **Update references/guidance.md**: Replace any `complete-slice` self-references with `complete`.

- [ ] **Update cross-skill references in `~/.claude/skills/`**: Grep for `complete-slice` and `/complete-slice` (excluding `~~archived~~` dirs). Update:
  - `project-status/references/status-logic.md` — state-to-next-skill mapping
  - `_shared/references/expertise-tracking.md`
  - `_shared/references/decisions-format.md`
  - `_shared/references/system-profile-format.md`
  - `_shared/references/initiative-conventions.md` — Consumer Guide table and transition tables
  - Any other files found by grep

- [ ] **Update repo files**: Grep `/Users/iwhite/Repos/goodplan/` for `complete-slice` and `/complete-slice` (excluding `~~archived~~` dirs). Update:
  - `workflow.md`
  - `CLAUDE.md`
  - `.project/idea.md`
  - Any other non-archived files found

### Verification

- Grep `~/.claude/skills/` for `complete-slice` — should be zero in non-archived files. Acceptable residuals: archived quest artifacts, historical example paths.
- Grep repo for `/complete-slice` — should be zero in non-archived files.
- Read SKILL.md frontmatter — confirm `name: complete` and updated description/triggers.

## Phase 2: Initiative Completion Mode

Extend the skill to handle initiative-level completion: validate all slices done, synthesize initiative-level learnings, reconcile architecture layers, promote artifacts, archive with numbering.

### Tasks

- [ ] **Extend Step 0 — Scope Resolution**: Add `$SCOPE_TYPE = initiative` detection. An initiative scope matches `initiatives/__active__*/` without a trailing `vertical-slices/<slice>/` path. Set `$INITIATIVE_DIR` to the matched path. Load `initiative-conventions.md` for archive numbering and completion conventions.

- [ ] **Extend Step 2 — Determine Scope**: Add initiative to scope resolution. When scope is an initiative:
  - Validate all slices under `$INITIATIVE_DIR/vertical-slices/` are either `~~archived~~`-prefixed or have `abandoned.md`. If any non-complete slices remain, list them and tell the user which need attention. Stop — do not proceed with initiative completion.
  - Auto-detect: when no argument is passed, add `initiatives/__active__*/` to the scan. An initiative is completion-ready if it has `vertical-slices/sequencing.md` AND all slices are archived/abandoned AND no `completion/learnings.md` exists.

- [ ] **Extend Step 3 — Load Artifacts**: For initiative scope, load:
  - All `$INITIATIVE_DIR/vertical-slices/*/completion/learnings.md` (per-slice learnings)
  - All `$INITIATIVE_DIR/vertical-slices/*/completion/architecture-updates.md` (per-slice arch updates)
  - `$INITIATIVE_DIR/goal.md` (initiative goal)
  - `$INITIATIVE_DIR/architecture/` (target architecture)
  - `.project/architecture/` (current reality — top-level)
  - `$INITIATIVE_DIR/research/`, `brainstorm/`, `prototypes/` (for promotion step)
  - `.project/learnings.md` (to avoid duplication in rollup)
  Present: "Initiative [name]: N slices completed, M research files, K brainstorm files, J prototypes."

- [ ] **Extend Step 4 — Synthesize Learnings (initiative variant)**: For initiative scope:
  - Cross-reference per-slice learnings for patterns. What themes recur across slices?
  - Assess the initiative goal: did we achieve what we set out to? What did we learn about the problem domain at the initiative level (beyond individual slices)?
  - What would we do differently if planning a similar initiative?
  - Write `$INITIATIVE_DIR/completion/learnings.md` — initiative-level insights, not a rehash of per-slice learnings.

- [ ] **Extend Step 5 — Roll Up to Top-Level Learnings (initiative variant)**: For initiative scope, roll up initiative-level learnings to `.project/learnings.md` using `_Source: <initiative-name>_` tag. Idempotency check as usual.

- [ ] **Extend Step 6 — Architecture Reconciliation (initiative variant)**: For initiative scope, reconcile the two layers:
  - Compare `$INITIATIVE_DIR/architecture/` (target — what we planned) against `.project/architecture/` (current reality — what we built via per-slice updates).
  - For each divergence: classify as (a) incomplete work, (b) intentional scope reduction, or (c) evolved understanding.
  - Use AskUserQuestion for each: "Mark as incomplete work (propose side quest) / Document as intentional scope reduction / Update top-level architecture to match target / Skip"
  - Write `$INITIATIVE_DIR/completion/architecture-updates.md` with reconciliation results.
  - If "incomplete work" items exist, draft side quest `goal.md` proposals (do NOT auto-create — present for user approval).

- [ ] **Add artifact promotion step** (new Step 6e, after debt evaluation): For initiative scope only:
  - Scan `$INITIATIVE_DIR/research/`, `brainstorm/`, `prototypes/` for files/directories.
  - For each artifact, use AskUserQuestion: "Copy [artifact] to project-level [directory]? / Skip". Present the artifact's topic/name and a one-line summary of its content.
  - Copy approved artifacts (not move — originals stay in the archived initiative for context).
  - Skip this step entirely if no artifacts exist in any of the three directories.

- [ ] **Extend Step 8 — Review Remaining Work (initiative variant)**: For initiative scope, instead of reviewing remaining slices within the initiative (all are done), review the broader project:
  - Are there other initiatives in progress or planned?
  - Did this initiative's completion reveal needs for new side quests or initiatives?
  - Present findings and proposed actions.

- [ ] **Extend Step 10b — Archive with Numbering (initiative variant)**: For initiative scope:
  - Count existing `~~archived~~` directories in `.project/initiatives/` to determine `NN`.
  - Rename `$INITIATIVE_DIR` from `__active__<name>/` to `~~archived~~NN_<name>/` (zero-padded two digits).
  - Verify rename succeeded with `ls`.

- [ ] **Update graceful stop**: Add initiative-specific partial states:
  - **(e) Initiative learnings written, reconciliation pending**: state `complete in-progress — initiative learnings written for <initiative>, architecture reconciliation pending`.
  - **(f) Reconciliation done, artifact promotion pending**: state `complete in-progress — reconciliation done for <initiative>, artifact promotion pending`.

- [ ] **Update guidance.md**: Add "Initiative Completion Protocol" section covering: slice completeness validation, initiative-level learnings synthesis, architecture reconciliation, artifact promotion, archive numbering.

### Verification

- Read updated SKILL.md. Confirm initiative scope detection in Step 0, slice validation in Step 2, reconciliation in Step 6, archive numbering in Step 10b.
- Read guidance.md. Confirm initiative completion protocol section.
- Verify graceful stop cases cover initiative-specific partial states.
- Check that existing slice and side quest completion behavior is unchanged — no regressions to the three existing scope types.

## Phase 3: Convention + State Mapping Cleanup

Update shared references to reflect the rename and remove temporary annotations.

### Tasks

- [ ] **Update `initiative-conventions.md` transition tables**: In both first-initiative and subsequent-initiative transition tables, change `needs-completion → /complete (currently /complete-slice)` to just `needs-completion → /complete`. Remove the parenthetical.

- [ ] **Update `initiative-conventions.md` Consumer Guide**: Change `/complete-slice` → `/complete` in all rows. Add initiative-level completion entries where missing (e.g., `completion/` artifact now also created by `/complete` for initiatives).

- [ ] **Update `status-logic.md` state-to-next-skill**: Remove the parenthetical note about `/complete-slice` naming. Clean reference should just say `/complete`.

- [ ] **Grep for remaining parenthetical notes**: Search `~/.claude/skills/` for patterns like "(currently /complete-slice)", "(currently named /complete-slice)", "(may be renamed)" and remove them.

### Verification

- Grep `~/.claude/skills/` for "currently.*complete-slice" and "may be renamed" — should be zero.
- Read initiative-conventions.md transition tables — confirm clean `/complete` references.
- Read status-logic.md — confirm clean `/complete` reference.
