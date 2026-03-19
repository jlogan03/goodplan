# Plan: Rename /complete-slice to /complete

## Overview

Rename the `/complete-slice` skill to `/complete` and extend it to handle initiative completion alongside the existing slice and side quest completion. The skill already handles initiative-scoped slices (from the initiatives-infrastructure quest); this plan adds initiative-level completion as a new scope type.

**Slug**: `complete-rename`

**Approach**: Rename first (Phase 1, including convention cleanup), then add initiative completion mode (Phase 2). The rename is mechanical; the initiative completion mode is the substantive new work.

**Key design decisions**:
- All slices must be complete (archived or abandoned) before initiative completion proceeds
- Artifact promotion (research/brainstorm/prototypes) copies to project-level, originals stay in archived initiative for context
- Archive numbering uses `~~archived~~NN_<name>` with zero-padded two-digit counter

## Phase 1: Rename Directory + Cross-References

Rename `complete-slice/` to `complete/` and update all references across skills and repo files.

### Tasks

- [x] **Rename skill directory**: `mv ~/.claude/skills/complete-slice ~/.claude/skills/complete`. Update SKILL.md frontmatter: `name: complete`, update description to: "Complete a slice, side quest, or initiative. For slices/quests: synthesizes learnings, rolls up to project learnings, updates architecture and system profile, archives scope. For initiatives: validates all slices are done, synthesizes cross-slice initiative learnings, reconciles initiative architecture against project architecture, promotes artifacts, archives with numbering." Add trigger phrases: 'complete initiative', 'finish initiative', 'initiative is done', 'wrap up the initiative', 'close out the initiative', 'initiative complete'. Note: SKILL.md description has a 1024-character limit (proposed text is ~379 chars, well within limit).

- [x] **Update references/guidance.md**: Replace any `complete-slice` self-references with `complete`. Also update flow-log signal tracking filter (Step 6d) to match entries where `phase` is either `"complete-slice"` or `"complete"` — historical entries used the old phase value.

- [x] **Update cross-skill references in `~/.claude/skills/`**: Grep for `complete-slice` and `/complete-slice` (excluding `~~archived~~` dirs). Update:
  - `project-status/references/status-logic.md` — state-to-next-skill mapping
  - `_shared/references/expertise-tracking.md`
  - `_shared/references/decisions-format.md`
  - `_shared/references/system-profile-format.md`
  - `_shared/references/initiative-conventions.md` — Consumer Guide table and transition tables
  - SKILL.md body — all occurrences, including:
    - Step 6, sub-step 5: `Context: complete-slice for <scope>` → `Context: complete for <scope>`
    - Step 6b recency marker text
    - Step 6d flow-log filter: do NOT simply rename `"complete-slice"` to `"complete"` — update the filter to match BOTH `"complete-slice"` (historical entries) AND `"complete"` (post-rename entries) to preserve backward compatibility
    - Step 10 phase strings
    - Graceful stop state strings
  - Any other files found by grep

- [x] **Update repo files**: Grep `/Users/iwhite/Repos/goodplan/` for `complete-slice` and `/complete-slice` (excluding `~~archived~~` dirs). Note: `workflow.md`, `CLAUDE.md`, and `.project/idea.md` already use `/complete` — verify they have no residual references but expect no changes needed. Update:
  - Side quest goal files: `onboard-repo/goal.md`, `refactor-intelligence/goal.md`, `maturity-context-loading/goal.md`, `upgrade-workflow/goal.md`
  - Any other non-archived files found by grep

- [x] **Leave historical provenance markers unchanged**: Do NOT update `_Source: 07-complete-slice_` tags in `.project/learnings.md` or recency markers in `.project/system-profile.md` — these are historical records of which skill version produced the output. Also exclude `.project/vertical-slices/sequencing.md` (historical slice name `07-complete-slice`) and `docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md` (contains "renamed from `/complete-slice`" provenance note). Document this rationale in a code comment or guidance note.

### Convention + State Mapping Cleanup (included in Phase 1)

- [x] **Update `status-logic.md` state-to-next-skill**: Remove the parenthetical note about `/complete-slice` naming. Clean reference should just say `/complete`.

- [x] **Grep for remaining parenthetical notes**: Search `~/.claude/skills/` for patterns like "(currently /complete-slice)", "(currently named /complete-slice)", "(may be renamed)" and remove them.

### Verification

- Grep `~/.claude/skills/` for `complete-slice` — should be zero in non-archived files. Acceptable residuals: archived quest artifacts, historical example paths.
- Grep repo for `/complete-slice` — should be zero in non-archived files. Exclude `.project/side-quests/complete-rename/` (this quest's own files will match).
- Read SKILL.md frontmatter — confirm `name: complete` and updated description/triggers. Verify the skill directory is named `complete/` (directory name must match the `name` field).
- Grep `~/.claude/skills/` for "currently.*complete-slice" and "may be renamed" — should be zero.
- Read initiative-conventions.md transition tables — confirm clean `/complete` references.
- Read status-logic.md — confirm clean `/complete` reference.

## Phase 2: Initiative Completion Mode

Extend the skill to handle initiative-level completion: validate all slices done, synthesize initiative-level learnings, reconcile architecture layers, promote artifacts, archive with numbering.

### Tasks

- [ ] **Extend Step 0 — Scope Resolution**: Add variable setup for initiative scope (Step 2 handles detection). When Step 2 determines `$SCOPE_TYPE = initiative`, set `$INITIATIVE_DIR` to the matched `initiatives/__active__*/` path, `$SLICES_DIR = $INITIATIVE_DIR/vertical-slices/`. Load `initiative-conventions.md` for archive numbering and completion conventions.

- [ ] **Extend Step 2 — Determine Scope**: Add initiative detection to scope resolution (Step 2 detects, Step 0 sets variables). An initiative scope matches `initiatives/__active__*/` without a trailing `vertical-slices/<slice>/` path. When scope is an initiative:
  - Validate all slices under `$INITIATIVE_DIR/vertical-slices/` are either `~~archived~~`-prefixed or have `abandoned.md`. If any non-complete slices remain, list them and tell the user which need attention. Stop — do not proceed with initiative completion.
  - Re-entry detection: check for `$INITIATIVE_DIR/completion/learnings.md` (learnings done) and `$INITIATIVE_DIR/completion/architecture-updates.md` (reconciliation done) to distinguish partial progress states. Note: these are initiative-level files under `$INITIATIVE_DIR/completion/`, distinct from per-slice `completion/` directories. If learnings exist but no architecture-updates, resume at reconciliation. If both exist, resume at artifact promotion.
  - Auto-detect: when no argument is passed, add `initiatives/__active__*/` to the scan after all slices and side quests are scanned (initiative completion is a higher-level operation — only offer it after confirming no remaining slice/quest scopes).
  - **Guardrail**: An initiative is completion-ready ONLY if: (1) it has `vertical-slices/sequencing.md`, AND (2) ALL slices are archived/abandoned, AND (3) no `completion/learnings.md` exists yet. Do not offer initiative completion if any of these conditions fail.

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

- [ ] **Add artifact promotion step** (new Step 6e, after signal tracking): For initiative scope only:
  - Scan `$INITIATIVE_DIR/research/`, `brainstorm/`, `prototypes/` for files/directories.
  - For each artifact, use AskUserQuestion: "Copy [artifact] to `.project/research/` (or `brainstorm/`, `prototypes/`)? / Skip". Present the artifact's topic/name and a one-line summary of its content.
  - Destination directories: `.project/research/`, `.project/brainstorm/`, `.project/prototypes/` — create if they don't exist. If a file with the same name already exists, prefix with `<initiative-name>_`. If the prefixed name also exists, append a numeric suffix (`_2`, `_3`, etc.).
  - Copy approved artifacts (not move — originals stay in the archived initiative for context, preserving full initiative history).
  - Skip this step entirely if no artifacts exist in any of the three directories.

- [ ] **Handle intermediate steps for initiative scope**: Explicit decisions for steps that don't naturally apply:
  - **Step 6b (system-profile update)**: Skip for initiative scope — initiative completion is a meta-operation, not a feature implementation. No Health/Performance/Extensibility entries.
  - **Step 6c (debt evaluation)**: Skip for initiative scope — debt is evaluated per-slice; initiative completion is reconciliation, not implementation.
  - **Step 6d (signal tracking)**: Apply as-is — flow-log query works across scope types. Ensure filter matches both `"complete-slice"` and `"complete"` phase values.
  - **Step 7 (CLAUDE.md update)**: Apply for initiative scope — architecture reconciliation may produce changes that warrant CLAUDE.md updates.
  - **Step 9 (cleanup pass)**: Skip the "next slice" framing for initiative scope — all slices are done. Instead, use AskUserQuestion to present findings: leftover temp files, stale state entries, or dangling references to the initiative. Let the user decide which to address (interactive, not automated).
  - **Step 9b (expertise check)**: Apply as-is — initiative completion is a meaningful skill-use signal.

- [ ] **Extend Step 8 — Review Remaining Work (initiative variant)**: For initiative scope, instead of reviewing remaining slices within the initiative (all are done), review the broader project:
  - Are there other initiatives in progress or planned?
  - Did this initiative's completion reveal needs for new side quests or initiatives?
  - Present observations only. Do not auto-propose initiatives — surface findings for user decision.

- [ ] **Extend Step 10 — State Update + Flow Log (initiative variant)**: For initiative scope:
  - **state.md**: Set Active Slice = "none" (initiative is about to be archived), Next Step = `/project-status` to determine what's next.
  - **Flow-log entry**: Write `"scope":"initiatives/<name>"` (not `__active__` form, per `state-and-flow-formats.md` — also consistent with `initiative-conventions.md` Archive Numbering which uses `<name>` without prefix), `"phase":"complete"`. Use Current Phase string `complete done` (not `complete complete`).

- [ ] **Extend Step 10b — Archive with Numbering (initiative variant)**: For initiative scope:
  - Count existing `~~archived~~` directories in `.project/initiatives/` and set `NN = count + 1` (one-indexed, zero-padded two digits; first archive is `01`).
  - Rename `$INITIATIVE_DIR` from `__active__<name>/` to `~~archived~~NN_<name>/` (zero-padded two digits).
  - Verify rename succeeded with `ls`.

- [ ] **Update graceful stop**: Add initiative-specific partial states. Note: Phase 1's cross-reference update already renamed existing cases (a)-(d) from `complete-slice` to `complete`; these new cases extend the set.
  - **(e) Initiative learnings written, reconciliation pending**: state `complete in-progress — initiative learnings written for initiatives/<name>, architecture reconciliation pending`. Flow-log entry: `"status":"started"`, `"scope":"initiatives/<name>"`. Next Step: `Resume /complete for initiatives/<name> (architecture reconciliation)`.
  - **(f) Reconciliation done, artifact promotion pending**: state `complete in-progress — reconciliation done for initiatives/<name>, artifact promotion pending`. Flow-log entry: `"status":"started"`, `"scope":"initiatives/<name>"`. Next Step: `Resume /complete for initiatives/<name> (artifact promotion)`.

- [ ] **Update guidance.md**: Add "Initiative Completion Protocol" section covering:
  - **Slice completeness validation**: scan algorithm (all entries under `vertical-slices/` must be `~~archived~~`-prefixed or contain `abandoned.md`)
  - **Initiative-level learnings synthesis**: cross-slice pattern synthesis — identify themes that recur across 2+ slices, domain-level insights not visible from any single slice, and retrospective planning observations. This differs from per-slice learnings which are implementation-specific.
  - **Architecture reconciliation**: for each divergence found, present AskUserQuestion with options: "Mark as incomplete work (will draft side quest goal.md proposal)" / "Document as intentional scope reduction (record rationale in architecture-updates.md)" / "Update top-level architecture to match target" / "Skip". Record all decisions in `completion/architecture-updates.md`.
  - **Step skip rationale**: Step 6b (system-profile update) and Step 6c (debt evaluation) are skipped for initiative scope — initiative completion is a meta-operation (reconciliation, not implementation), so no Health/Performance/Extensibility entries or debt evaluations apply.
  - **Artifact promotion**: copy-not-move rationale (archived initiative preserves full history for future reference; project-level copy makes artifacts discoverable without navigating archives). Destinations: `.project/research/`, `.project/brainstorm/`, `.project/prototypes/`.
  - **Archive numbering**: count existing `~~archived~~*` directories in `.project/initiatives/`, set `NN = count + 1` (one-indexed, zero-padded two digits; first archive is `01`), rename `__active__<name>/` to `~~archived~~NN_<name>/`.
  - Also add note: when overwriting system-profile recency markers, match on both `complete-slice` and `complete` patterns to avoid duplicate entries from the rename.

### Verification

- Read updated SKILL.md. Confirm initiative scope detection in Step 2, variable setup in Step 0, slice validation in Step 2, reconciliation in Step 6, archive numbering in Step 10b.
- Read guidance.md. Confirm initiative completion protocol section.
- Verify graceful stop cases cover initiative-specific partial states.
- **Trace-through verification**: Walk through the updated SKILL.md for each scope type (top-level slice, initiative-scoped slice, side quest, initiative) and confirm:
  - (a) Step 0 variables are set correctly for the scope type
  - (b) Step 2 detection matches the correct scope
  - (c) Steps 6b/6c/6d/7/9/9b skip-or-apply decisions are consistent with this plan
  - (d) Step 10 writes correct phase, scope, and status values
- Check that existing slice and side quest completion behavior is unchanged — no regressions to the three existing scope types.
