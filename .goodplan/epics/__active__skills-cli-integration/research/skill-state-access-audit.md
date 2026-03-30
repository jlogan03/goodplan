# Skill State Access Audit

Comprehensive audit of how each goodplan workflow skill interacts with `.project/` state files.

---

## create-epic

### Reads
- `.project/` directory existence (ls check for mode detection)
- `.project/idea.md`, `.project/activity-log.jsonl`, `.project/state.md`, `.project/epics/` (Mode B: checks if established project)
- `.project/epics/__active__*/` (Mode B: checks for active epic)
- `.project/decisions/*.md` (Loading Protocol: glob, skip superseded, flag revisiting)
- `.gitignore` (to check if state.md is excluded)
- `CLAUDE.md` (for Project Context section update)
- `~/.claude/CLAUDE.md` (for Expertise section)

### Writes
- `.project/` directory structure (`mkdir -p .project/{research,brainstorm,prototypes,side-quests,retrospectives,activity-log,decisions,epics/__active__initial}`)
- `.project/idea.md` (Write tool)
- `.project/epics/__active__initial/goal.md` (Mode A: first epic)
- `.project/epics/<name>/goal.md` (Mode B: new epic)
- `.project/state.md` (Write tool)
- `.project/activity-log.jsonl` (append via echo >>)
- `.gitignore` (append `.project/state.md`)
- `CLAUDE.md` (Edit/Write — Project Context section)
- `~/.claude/CLAUDE.md` (Expertise section update)

### Activity log
- Mode A: `echo '{"ts":"...","phase":"capture-idea","scope":"project","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`
- Mode B: `echo '{"ts":"...","phase":"create-epic","scope":"epics/<name>","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`

### State.md
- Mode A: Creates from scratch with Write tool. Sets Current Phase to `capture-idea complete`, Active Slice to `epics/__active__initial`, Work Stack empty, Next Step to explore/create-architecture.
- Mode B: Updates only Next Step field. Does NOT change Active Slice (new epic is not active).

### File-existence checks
- `.project/` existence determines Mode A vs Mode B
- `.project/idea.md`, `.project/activity-log.jsonl`, `.project/state.md`, `.project/epics/` — checks if established project (Mode B Step 10)
- `.project/epics/__active__*/` — checks for active epic (Mode B Step 13)

---

## explore

### Reads
- `.project/state.md` (scope resolution when no argument passed)
- `.project/epics/__active__*/` (scope resolution)
- `.project/slices/`, `.project/side-quests/`, `.project/epics/` (scope resolution)
- `<scope>/explore-complete.md`, `<scope>/explore-skipped.md` (pre-existing exploration check)
- `<scope>/research/`, `<scope>/brainstorm/` (existing artifacts)
- `.project/decisions/*.md` (Loading Protocol)
- `~/.claude/CLAUDE.md` (Expertise section)

### Writes
- `<scope>/research/<topic>.md` (research sub-agents)
- `<scope>/brainstorm/<slug>.md` (brainstorm output)
- `<scope>/prototypes/<name>/` (prototype directory + files + summary.md)
- `<scope>/explore-complete.md` (Write tool — milestone artifact)
- `<scope>/explore-skipped.md` (Write tool — skip case)
- `.project/state.md` (Write/Edit tool)
- `.project/activity-log.jsonl` (append via echo >>)
- `.project/decisions/<date>-<slug>.md` (durable decisions, with user confirmation)
- `~/.claude/CLAUDE.md` (Expertise section update, conditional)

### Activity log
- `echo '{"ts":"...","phase":"explore","scope":"<scope>","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`
- Scope mapping: project-level → `"project"`, slice → `"slices/<name>"`, quest → `"side-quests/<name>"`, epic → `"epics/<name>"`

### State.md
- Reads: Active Slice, Work Stack (for scope resolution)
- Writes: Current Phase → `explore-complete — <summary>`, Active Slice unchanged, Work Stack unchanged, Next Step → context-dependent (`/create-architecture` or `/create-plan`)

### File-existence checks
- `<scope>/explore-complete.md` or `explore-skipped.md` — detects pre-existing exploration
- `<scope>/research/`, `<scope>/brainstorm/` — detects interrupted exploration
- `.project/epics/__active__*/` — epic detection for scope resolution

---

## create-architecture

### Reads
- `.project/epics/__active__*/` (detect active epic, determine output path)
- `.project/idea.md` (required — stops if absent)
- `.project/brainstorm/`, `.project/research/`, `.project/prototypes/` (project-level exploration)
- `<epic>/brainstorm/`, `<epic>/research/`, `<epic>/prototypes/` (epic-level exploration)
- `<epic>/explore-complete.md` or `explore-skipped.md` (exploration summary)
- `.project/conventions.md` (if exists)
- `$ARCH_DIR/` (existing architecture files for re-entry check)
- `.project/decisions/*.md` (Loading Protocol)
- `CLAUDE.md` (for Project Context section update)
- `~/.claude/CLAUDE.md` (Expertise section)

### Writes
- `.project/conventions.md` (Write tool — project-level)
- `$ARCH_DIR/_overview.md` (architecture overview)
- `$ARCH_DIR/conventions.md` (architectural conventions)
- `$ARCH_DIR/data-model.md`, `flows.md`, `information-architecture.md`, `ui-ux.md` (optional architecture files)
- `$ARCH_DIR/<subsystem>-api.md` (subsystem API files)
- `$ARCH_DIR/invariants.md` (system invariants)
- `.project/architecture/_overview.md` (scaffold for first epic — `<!-- scaffold -->` marker)
- `.project/state.md` (Write/Edit tool)
- `.project/activity-log.jsonl` (append via echo >>)
- `.project/decisions/<date>-<slug>.md` (durable decisions)
- `CLAUDE.md` (Edit/Write — Project Context section)
- `~/.claude/CLAUDE.md` (Expertise section update, conditional)

### Activity log
- `echo '{"ts":"...","phase":"create-architecture","scope":"$FLOW_SCOPE","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`
- `$FLOW_SCOPE` = `"epics/<name>"` when epic-scoped, `"project"` otherwise
- Graceful stop: `"status":"started"` instead of `"complete"`

### State.md
- Reads: existing values (unchanged fields preserved)
- Writes: Current Phase → `create-architecture complete — conventions and architecture/* written`, Active Slice unchanged, Next Step → `/create-slices` or `/start-epic`
- Graceful stop: Current Phase → `create-architecture in-progress — <details>`

### File-existence checks
- `.project/epics/__active__*/` — epic detection
- `__active__initial` name check — first vs subsequent epic
- `.project/conventions.md` — re-entry detection (Case B/C/D)
- `$ARCH_DIR/` contents — re-entry detection
- `.project/brainstorm/`, `.project/research/`, `.project/prototypes/` — exploration output detection
- `.project/learnings.md`, `.project/sequencing.md` — only referenced in CLAUDE.md if they exist

---

## refine-architecture

### Reads
- `.project/epics/__active__*/` (path resolution)
- `$ARCH_DIR/` (all architecture files — required, stops if empty)
- `.project/architecture/_overview.md` (scaffold detection — checks for `<!-- scaffold -->` marker)
- `.project/idea.md`, `.project/conventions.md` (Step 1 context)
- `.project/decisions/*.md` (Loading Protocol)
- `$SCOPE_ROOT/architecture-backup-*/` (resume detection)
- `$SCOPE_ROOT/architecture-refining/activity-log.jsonl` (resume detection — separate from main activity-log)
- `~/.claude/CLAUDE.md` (Expertise section)

### Writes
- `$ARCH_DIR/*` (in-place edits to architecture files via editor sub-agents)
- `$SCOPE_ROOT/architecture-backup-<timestamp>/` (backup before refinement)
- `$SCOPE_ROOT/architecture-refining/` (run directory: `goal.md`, `round-N/reviews/`, `round-N/merged.md`)
- `.project/activity-log.jsonl` (append via echo >>)
- `~/.claude/CLAUDE.md` (Expertise section update, conditional)

### Activity log
- `echo '{"ts":"...","phase":"refine-architecture","scope":"$FLOW_SCOPE","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`
- Graceful stop: `"status":"abandoned"`

### State.md
- Does NOT explicitly update state.md in the documented workflow (notable absence — relies on the phase being tracked via activity-log only)

### File-existence checks
- `.project/epics/__active__*/` — epic detection
- `<!-- scaffold -->` in `_overview.md` — scaffold detection (stops if found)
- `$SCOPE_ROOT/architecture-backup-*/` — resume detection
- `$SCOPE_ROOT/architecture-refining/activity-log.jsonl` — checks for `"status":"complete"` to determine if prior run finished

---

## audit-architecture

### Reads
- `.project/epics/__active__*/` (path resolution)
- `$ARCH_DIR/**/*.md` (all architecture files — required, stops if empty)
- `.project/architecture/_overview.md` (scaffold detection)
- `.project/decisions/*.md` (Loading Protocol)
- `.project/learnings.md` (if exists)
- `.project/conventions.md` (if exists)
- `.project/activity-log.jsonl` (last 20 lines — recent context)
- `.project/audits/architecture-*.md` (resume detection — most recent audit)
- `$ARCH_DIR/invariants.md` (invariant compliance check)
- `$ARCH_DIR/_overview.md` (maturity table, fitness functions)
- `$ARCH_DIR/<subsystem>-api.md` (fitness function entries)
- `.project/project-health.md` (if exists, for refresh)
- `~/.claude/CLAUDE.md` (Expertise section)

### Writes
- `.project/audits/architecture-<date>.md` (audit report — `mkdir -p .project/audits`)
- `$ARCH_DIR/_overview.md` (maturity table updates — promotions/demotions)
- `$ARCH_DIR/*` (architecture file edits for approved improvements)
- `.project/side-quests/<name>/goal.md` (side quest proposals — `mkdir -p`)
- `.project/decisions/<date>-<slug>.md` (maturity change decisions, architecture improvement decisions)
- `.project/project-health.md` (refresh — create or update)
- `.project/state.md` (update)
- `.project/activity-log.jsonl` (append via echo >>)
- `~/.claude/CLAUDE.md` (Expertise section update, conditional)

### Activity log
- `echo '{"ts":"...","phase":"audit-architecture","scope":"$FLOW_SCOPE","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`

### State.md
- Writes: Current Phase → `audit-architecture complete`, Next Step → `/refine-architecture` if files updated

### File-existence checks
- `.project/epics/__active__*/` — epic detection
- `<!-- scaffold -->` in `_overview.md` — scaffold detection (stops if found)
- `.project/audits/architecture-*.md` — resume detection (checks for `<!-- partial — interrupted` marker)
- `$ARCH_DIR/invariants.md` existence — skip compliance check if absent
- Fitness function test file existence — classifies as documented-and-present, documented-but-missing, or stale
- `.project/project-health.md` existence — create vs update

---

## create-slices

### Reads
- `.project/epics/__active__*/` (determine slice output location)
- `.project/idea.md` (required — stops if absent)
- `$EPIC_DIR/goal.md` (epic goal, when epic-scoped)
- `.project/conventions.md` (optional context)
- `$EPIC_DIR/architecture/_overview.md` and other files (epic architecture)
- `.project/architecture/_overview.md` (current-reality context)
- `## Subsystem Maturity` table from `_overview.md`
- `.project/learnings.md` (if exists)
- `.project/decisions/*.md` (Loading Protocol)
- `$SLICES_DIR/sequencing.md` (re-entry check)
- `$SLICES_DIR/*/goal.md` (re-entry check)
- `CLAUDE.md` (for Project Context section update)
- `~/.claude/CLAUDE.md` (Expertise section)

### Writes
- `$SLICES_DIR/sequencing.md` (Write tool)
- `$SLICES_DIR/<NN-name>/goal.md` (Write tool, per slice — `mkdir -p` first)
- `.project/decisions/<date>-<slug>.md` (durable decisions)
- `.project/state.md` (Write/Edit tool)
- `.project/activity-log.jsonl` (append via echo >>)
- `CLAUDE.md` (Edit/Write — adds sequencing.md reference)
- `~/.claude/CLAUDE.md` (Expertise section update, conditional)

### Activity log
- `echo '{"ts":"...","phase":"create-slices","scope":"$FLOW_SCOPE","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`
- Graceful stop: `"status":"started"`

### State.md
- Reads: existing values
- Writes: Current Phase → `create-slices complete`, Active Slice unchanged, Next Step → `/create-plan` for first unplanned slice
- Graceful stop: Current Phase → `create-slices in-progress — stopped after writing <files>`
- Creates state.md if it does not exist

### File-existence checks
- `.project/epics/__active__*/` — epic detection
- `$SLICES_DIR/sequencing.md`, `$SLICES_DIR/*/goal.md` — re-entry detection
- `plan.md`, `plan-refined.md`, `refinement/`, `implementation/` inside slice dirs — downstream artifact check before revision

---

## refine-slices

### Reads
- `.project/epics/__active__*/` (scope resolution)
- `$EPIC_DIR/goal.md`, `$EPIC_DIR/architecture/` (when epic-scoped)
- `.project/idea.md`
- `.project/architecture/` (all files)
- `.project/conventions.md`
- `.project/decisions/*.md` (Loading Protocol)
- `.project/learnings.md`
- `$SLICES_ROOT/sequencing.md`
- `$SLICES_ROOT/*/goal.md` (excluding side quests)
- `~/.claude/CLAUDE.md` (Expertise section, implied)

### Writes
- `$SLICES_ROOT/*/goal-refining.md` (working copies alongside originals)
- `$SLICES_ROOT/sequencing-refining.md` (working copy)
- `$SLICES_ROOT/slices-refining/manifest.md`
- `$SLICES_ROOT/slices-refining/round-N/reviews/`, `merged.md` (run directory)
- Final: renames `goal-refining.md` → `goal.md`, `sequencing-refining.md` → `sequencing.md`
- `.project/state.md` (update — not explicitly reading formats ref in documented steps)
- `.project/activity-log.jsonl` (append)

### Activity log
- `{"ts":"...","phase":"refine-slices","scope":"<slices-root relative to .project/>","status":"complete","summary":"..."}`
- Interruption: `"status":"abandoned"`

### State.md
- Writes: Current Phase → `refine-slices complete — slice goals and sequencing refined`, Next Step → `/create-plan`

### File-existence checks
- `.project/epics/__active__*/` — epic detection
- `$SLICES_ROOT/*/goal.md` — discovers slice files
- Side quest exclusion: filters out `.project/side-quests/*/goal.md`

---

## create-plan

### Reads
- `.project/state.md` (scope resolution when no argument)
- `.project/slices/`, `.project/epics/__active__*/slices/`, `.project/side-quests/` (scope scanning)
- `<scope>/goal.md` (required — stops if absent)
- `<scope>/plan.md` or `<scope>/plan/` (re-entry check)
- `<scope>/plan-refined.md`, `plan-refining.md`, `refinement/`, `implementation/` (downstream artifact check)
- `.project/idea.md`
- `.project/conventions.md`
- Epic architecture: `$EPIC_DIR/architecture/` (target) + `.project/architecture/` (current reality)
- `## Subsystem Maturity` table from primary `_overview.md`
- `## Maturity Note` in `goal.md`
- `.project/learnings.md`
- Sequencing: `$EPIC_DIR/slices/sequencing.md` or `.project/slices/sequencing.md`
- Other slice `goal.md` files (dependency context)
- `.project/research/`, `<scope>/research/` (existing research)
- `<scope>/brainstorm/`
- `.project/decisions/*.md` (Loading Protocol)
- `<scope>/explore-complete.md`, `explore-skipped.md` (scope detection fallback)
- Test infrastructure: `test/`, `tests/`, `__tests__/`, `spec/`, config files, `package.json`
- Architecture files (via git log dates — stale assumption detection)
- `~/.claude/CLAUDE.md` (Expertise section)

### Writes
- `<scope>/plan.md` or `<scope>/plan/` (`_overview.md` + numbered phase files)
- `<scope>/research/<topic>.md` (research sub-agents)
- `.project/decisions/<date>-<slug>.md` (durable decisions)
- `.project/state.md` (Write/Edit tool)
- `.project/activity-log.jsonl` (append via echo >>)
- `~/.claude/CLAUDE.md` (Expertise section update, conditional)

### Activity log
- `echo '{"ts":"...","phase":"create-plan","scope":"<scope>","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`

### State.md
- Reads: Active Slice (scope resolution)
- Writes: Current Phase → `create-plan complete — plan written for <scope>`, Active Slice → the scope path, Next Step → `/refine-plan`
- Creates state.md if it does not exist

### File-existence checks
- `<scope>/goal.md` — required (stops if absent)
- `<scope>/plan.md` or `plan/` — re-entry detection
- `<scope>/explore-complete.md`, `explore-skipped.md` — scope detection fallback (slices with goal.md + explore marker but no plan)
- `.project/epics/__active__*/slices/` — epic slice scanning
- Downstream artifacts (`plan-refined.md`, `refinement/`, `implementation/`) — warns before overwrite

---

## refine-plan

### Reads
- Plan file/directory (passed as argument)
- `.project/decisions/*.md` (Loading Protocol)
- `.project/conventions.md` (codebase context)
- `.project/epics/__active__*/architecture/` (epic architecture awareness)
- `.project/architecture/` (top-level architecture)
- Architecture files via git dates (stale assumption detection)
- `<scope>/goal.md` (via stale assumption detection)
- `.project/state.md` (for state update)
- `~/.claude/CLAUDE.md` (Expertise section, implied)

### Writes
- `<plan-name>-refining.md` or `<plan-name>-refining/` (working copy)
- `<plan-name>-refined.md` or `<plan-name>-refined/` (final output)
- `<scope_dir>/refinement/round-N/reviews/`, `merged.md` (run directory)
- `<scope_dir>/research/<topic>.md` (research sub-agents)
- `.project/state.md` (update if exists)
- `.project/activity-log.jsonl` (append if exists)

### Activity log
- `echo '{"ts":"...","phase":"refine-plan","scope":"<scope>","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`
- Scope derived by stripping `.project/` prefix and plan filename from `scope_dir`

### State.md
- Conditional: updates only if `.project/state.md` exists
- Writes: Current Phase → `refine-plan complete — plan refined for <scope>`, Active Slice → scope path, Next Step → `/implement-plan`

### File-existence checks
- `<plan-name>-refining.md` or `<plan-name>-refining/` — resume detection (asks user: resume or start fresh)
- `.project/activity-log.jsonl` existence — conditional append
- `.project/state.md` existence — conditional update

---

## implement-plan

### Reads
- Plan file/directory (passed as argument)
- `.project/conventions.md` (implementation context)
- `.project/decisions/*.md` (Loading Protocol)
- `<scope_dir>/research/` (existing research)
- Architecture files (via codebase context discovery)
- `.project/epics/__active__*/architecture/` (epic architecture awareness)
- `.project/architecture/` (top-level)
- Git state: `git status --porcelain` (clean state check)

### Writes
- Implementation artifacts: `<scope_dir>/implementation/phase-N-*/iteration-N/reviews/`, `merged.md`, `result.md`
- `<scope_dir>/research/<topic>.md` (research sub-agents)
- Plan file updates (checkbox marking, status annotations)
- Codebase changes (actual implementation)
- Git commits per phase
- `.project/activity-log.jsonl` (append if exists)

### Activity log
- `echo '{"ts":"...","phase":"implement-plan","scope":"<scope>","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`
- Scope derived same as refine-plan
- Only appends if `.project/activity-log.jsonl` exists

### State.md
- Does NOT update state.md (notable absence — the skill's Step 4.2 Finalize does not mention state.md update)

### File-existence checks
- `.project/activity-log.jsonl` existence — conditional append
- Plan `[x]` checkboxes, "Complete", "[DONE]" markers — completion status detection
- `<scope_dir>/implementation/` directory structure — resume detection

---

## complete

### Reads
- `.project/state.md` (scope resolution)
- `.project/slices/`, `.project/side-quests/`, `.project/epics/__active__*/slices/*/` (auto-detect scanning)
- `<scope>/plan-refined.md` or `plan-refined/` (verification: implementation exists)
- `<scope>/implementation/` (artifact loading — last iteration's `merged.md`)
- `<scope>/plan-learnings-and-feedback.md`
- `<scope>/refinement/` (last round's `merged.md`)
- `<scope>/research/`
- `<scope>/after-implementation-fixes-and-polish.md`
- `<scope>/completion/learnings.md` (re-entry check)
- `<scope>/completion/architecture-updates.md` (re-entry check)
- `.project/architecture/` (current architecture for comparison)
- `.project/decisions/*.md` (Loading Protocol)
- `.project/learnings.md` (existing learnings — dedup check)
- `.project/conventions.md`
- `.project/project-health.md` (if exists)
- `## Subsystem Maturity` table from `.project/architecture/_overview.md`
- `$ARCH_DIR/<subsystem>-api.md` (fitness function paths)
- For epic slices: `$EPIC_DIR/architecture/` (target architecture)
- For epic scope: all `$EPIC_DIR/slices/*/completion/learnings.md`, `*/completion/architecture-updates.md`
- `$EPIC_DIR/goal.md`, `$EPIC_DIR/research/`, `brainstorm/`, `prototypes/` (epic completion)
- `.project/slices/*/completion/learnings.md`, `.project/side-quests/*/completion/learnings.md`, `.project/epics/__active__*/slices/*/completion/learnings.md`, `.project/epics/~~archived~~*/slices/*/completion/learnings.md` (signal tracking — last 3 completed scopes)
- `.project/activity-log.jsonl` (signal tracking — correlate with completion entries)
- `<scope>/refinement/round-N/` directories (signal tracking — count refinement effort)
- `CLAUDE.md` (for Project Context section update)
- `~/.claude/CLAUDE.md` (Expertise section)

### Writes
- `<scope>/completion/learnings.md` (Write tool — `mkdir -p <scope>/completion/`)
- `<scope>/completion/architecture-updates.md` (Write tool)
- `.project/learnings.md` (Edit tool — new entries at top)
- `.project/architecture/*` (Edit tool — approved architecture updates)
- `.project/architecture/_overview.md` (maturity table updates)
- `.project/decisions/<date>-<slug>.md` (architecture change decisions, maturity change decisions)
- `.project/project-health.md` (create or update)
- `.project/side-quests/<name>/goal.md` (refactor side quest proposals, approved by user)
- `.project/state.md` (Write/Edit tool)
- `.project/activity-log.jsonl` (append via echo >>)
- `CLAUDE.md` (Edit/Write — if architecture files added/renamed)
- `~/.claude/CLAUDE.md` (Expertise section update, conditional)
- Archive rename: `<scope>` → `~~archived~~<scope>` (or `~~archived~~NN_<name>` for epics)
- Epic artifact promotion: copies from `$EPIC_DIR/research/`, `brainstorm/`, `prototypes/` to `.project/research/`, etc.

### Activity log
- `echo '{"ts":"...","phase":"complete","scope":"<scope>","status":"complete","summary":"..."}' >> .project/activity-log.jsonl`
- Graceful stop: `"status":"started"`

### State.md
- Reads: Active Slice (scope resolution), Work Stack (conflict detection for architecture changes)
- Writes (slices/quests): Current Phase → `complete done — learnings and review done for <scope>`, Active Slice → scope path, Next Step → `/create-plan` for next slice
- Writes (epic): Current Phase → `complete done — learnings and review done for epics/<name>`, Active Slice → `none`, Next Step → `/project-status`
- Graceful stop: various `complete in-progress` states

### File-existence checks
- `.project/epics/__active__*/slices/*/` — scope type detection
- `<scope>/plan-refined.md` (or `plan-refined/`) AND `<scope>/implementation/` — implementation verification
- `<scope>/completion/learnings.md` — re-entry detection (already completed)
- `<scope>/completion/architecture-updates.md` — partial re-entry (learnings done, arch pending)
- `<scope>/after-implementation-fixes-and-polish.md` — optional artifact
- `~~archived~~` prefix on directories — already completed (skipped during scanning)
- `<scope>/abandoned.md` — abandoned check
- Epic slices: all slices must be `~~archived~~`-prefixed or contain `abandoned.md` for epic completion readiness
- Fitness function test files — existence check AND assertion content check
- `.project/project-health.md` — create vs update

---

## project-status

### Reads
- `.project/` directory (ls check — stops if absent)
- `.project/state.md` (Current Phase, Active Slice, Work Stack, Next Step)
- `.project/activity-log.jsonl` (last 5 lines via `tail -5`)
- `.project/epics/*/` (all epic directories)
- `.project/epics/__active__*/` (active epic detection)
- `.project/epics/__active__*/slices/` (per-slice state machine)
- `.project/slices/*/` (per-slice state machine)
- `.project/side-quests/*/` (per-quest state machine)
- `<scope>/implementation/*/review.md` (implementation progress — searches for "READY FOR IMPLEMENTATION")
- `.project/slices/*/interrupted.md`, `.project/side-quests/*/interrupted.md`, `.project/epics/__active__*/slices/*/interrupted.md` (interrupted work check)
- `.project/decisions/*.md` (Loading Protocol — counts active/revisiting)
- Sequencing files: epic or top-level `sequencing.md`
- `~/.claude/CLAUDE.md` (Expertise section summary)

### Writes
- `.project/state.md` (Write tool — full rewrite every run)
- `.project/activity-log.jsonl` (append via echo >>)

### Activity log
- `echo '{"ts":"...","phase":"project-status","scope":"project","status":"complete","summary":"Ran /project-status: ..."}' >> .project/activity-log.jsonl`

### State.md
- Reads: all 4 sections
- Writes: full rewrite using Write tool. Refreshes all 4 sections based on file-existence state machine findings. state.md is treated as an optimization hint — file-existence is authoritative.

### File-existence checks
- `.project/` existence — hard stop if absent
- `.project/epics/__active__*/` — active epic detection
- `.project/epics/~~archived~~*/` — archived epics (skip in active scanning, count for display)
- Per-slice state machine: checks `abandoned.md`, `interrupted.md`, `completion/learnings.md`, `after-implementation-fixes-and-polish.md`, `plan-refined.md`, `plan.md`, `plan-refining.md`, `plan-refining/`, `explore-complete.md`, `explore-skipped.md`, `goal.md`, `research/`, `brainstorm/` in first-match-wins order
- Per-epic state machine (from epic-conventions.md): `abandoned.md`, `completion/learnings.md`, `slices/sequencing.md`, `architecture/_overview.md`, `explore-complete.md`, `explore-skipped.md`, `research/`, `brainstorm/`, `goal.md`, `approved.md`, `architecture-proposal/`, `architecture-proposal-skipped.md`
- `implementation/*/review.md` content check — "READY FOR IMPLEMENTATION" string

---

## start-epic

### Reads
- `.project/epics/<name>/` (epic directory existence)
- `.project/epics/*/` (scan for proposal-pending or needs-architecture-proposal epics)
- `.project/epics/__active__*/` (fail-fast check — stops if active epic exists)
- `.project/epics/<name>/goal.md`
- `.project/epics/<name>/architecture-proposal/` (all files)
- `.project/epics/<name>/explore-complete.md`, `explore-skipped.md`
- `.project/epics/<name>/approved.md` (re-entry check)
- `.project/architecture/` (baseline for merging proposal into target)

### Writes
- `.project/epics/<name>/approved.md` (Write tool)
- `.project/epics/<name>/architecture/` (created from proposal + top-level baseline)
- `.project/epics/<name>/architecture-proposal-skipped.md` (skip path)
- Directory rename: `.project/epics/<name>` → `.project/epics/__active__<name>`
- `.project/state.md` (Write/Edit tool)
- `.project/activity-log.jsonl` (append via echo >>)

### Activity log
- `echo '{"ts":"...","phase":"start-epic","scope":"epics/<name>","status":"complete","summary":"Epic <name> approved and activated"}' >> .project/activity-log.jsonl`

### State.md
- Writes: Current Phase → `start-epic complete — <name> approved and activated`, Active Slice → `epics/<name>`, Next Step → `/create-slices`
- Rejection case: only updates Next Step

### File-existence checks
- `.project/epics/<name>/` — epic exists
- `.project/epics/__active__*/` — fail-fast: another active epic blocks activation
- `.project/epics/<name>/architecture-proposal/` — proposal exists
- `.project/epics/<name>/approved.md` — re-entry detection (previously interrupted after approval)
- `.project/epics/<name>/abandoned.md` — abandoned check
- `explore-complete.md`, `explore-skipped.md` — state machine checks
- `architecture-proposal-skipped.md` — skip state check

---

## migrate

Not implemented. Stub skill with no state access.

---

## Cross-Skill Patterns

### 1. Activity Log Append Pattern (all skills except migrate)
Every skill appends to `.project/activity-log.jsonl` via shell:
```bash
echo '{"ts":"<timestamp>","phase":"<skill>","scope":"<scope>","status":"<status>","summary":"<text>"}' >> .project/activity-log.jsonl
```
Timestamp generated via `date -u +%Y-%m-%dT%H:%M:%SZ`. Never overwrites — always appends. Status values: `complete`, `started`, `failed`, `abandoned`.

### 2. State.md Read/Write Pattern (all skills except migrate)
- Read with Read tool; write with Write tool (full rewrite) or Edit tool (field update)
- 4-section format: Current Phase, Active Slice, Work Stack, Next Step
- state.md is an **optimization hint** — file-existence state machine is authoritative
- Some skills create state.md if absent (create-epic, create-slices, create-plan)
- project-status always rewrites the full file
- Notable: implement-plan and refine-architecture do NOT update state.md

### 3. Epic Detection Pattern (all skills except create-epic Mode A, migrate)
```bash
ls -d .project/epics/__active__*/ 2>/dev/null
```
Used to determine: architecture output path (`$ARCH_DIR`), slice location (`$SLICES_DIR`), scope for activity-log (`$FLOW_SCOPE`), and whether to use two-layer architecture.

### 4. Decisions Loading Protocol (all skills except migrate)
```
glob .project/decisions/*.md → skip superseded → flag revisiting → load active
```
Writer skills (explore, create-architecture, create-slices, create-plan, complete, refine-architecture, audit-architecture) also `mkdir -p .project/decisions/` before writing new decisions.

### 5. File-Existence State Machine (project-status, complete, create-plan, explore)
First-match-wins ordered checks on slice/quest/epic directories to infer current state. Key markers:
- `abandoned.md` — takes precedence over everything
- `completion/learnings.md` — complete
- `plan-refined.md` + `implementation/` — in progress
- `explore-complete.md` / `explore-skipped.md` — exploration done
- `goal.md` alone — earliest state
- `~~archived~~` prefix — already completed, skip in active scans

### 6. Scope Resolution from state.md (explore, create-plan, complete, project-status)
When no argument passed:
1. Work Stack top entry
2. Active epic's active slice (via `__active__` detection + per-slice state machine)
3. Active Slice field from state.md
4. Project-level fallback

### 7. CLAUDE.md Project Context Update (create-epic, create-architecture, create-slices, complete)
Three-case logic:
1. No CLAUDE.md → create with Write
2. CLAUDE.md exists, no `## Project Context` → append with Edit
3. `## Project Context` exists → extract old section, replace with Edit (fallback: full Write)

### 8. Expertise Check Pattern (all interactive skills)
Read `~/.claude/CLAUDE.md` `## Expertise` section. If conversation revealed new expertise info, update it and write memory files. If not, skip silently.

### 9. Graceful Stop State Tracking (create-architecture, create-slices, create-plan, complete)
When user stops mid-skill:
- If no files written → don't touch state.md or activity-log
- If partial work done → update state.md with `in-progress` or `started` status, append activity-log with `"status":"started"`
- If all work done → normal completion

### 10. Scaffold Detection (refine-architecture, audit-architecture)
Check for `<!-- scaffold -->` marker in `.project/architecture/_overview.md`. If present, stop — the scaffold is a pointer, not real architecture. Only these two skills check for this.

### 11. Stale Assumption Detection (create-plan, refine-plan)
Compare git commit dates of architecture files vs scope's `goal.md`. If architecture is newer, the goal may be based on outdated assumptions. Alert user before proceeding.

### 12. Two-Layer Architecture Loading (create-plan, refine-plan, implement-plan, complete)
When epic-scoped: load epic `architecture/` as target (primary) and `.project/architecture/` as current reality (secondary). Skills compare plan/implementation against both layers.
