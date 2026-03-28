# Codebase Context: Initiatives Infrastructure

Researched: 2026-03-18 | Source: direct file reads

---

## Per-Skill Structural Findings

### `/start-project` (→ `/create-initiative`)

**Steps**: Pre-Flight Check (1), Create Directory Structure (2), Gitignore (3), Idea Capture (4), Expertise Calibration (4b), Transition/Load Formats, Write idea.md (5), Initialize flow-log (6), Write state.md (7), Update CLAUDE.md (8), Done.

**Key structural facts**:
- Step 2 creates: `mkdir -p .project/{research,brainstorm,prototypes,architecture,side-quests,retrospectives,flow-log,vertical-slices}` — the `vertical-slices/` directory is created here and must be removed/replaced with `initiatives/` in Mode A
- Step 7 state.md Next Step is hardcoded to `/explore or /define-architecture` — must change to `/explore` scoped to initiative
- The skill name frontmatter (`name: start-project`) and description both need updating
- Mode B (existing project) is entirely new behavior — the current skill only has "stop if .project/ exists" (with a re-run warning)
- The pre-flight check warning message in Step 1 references `vertical-slices/` as a recognized workflow marker — will need updating

**References to update in this file**: "vertical-slices/" in Step 1 warning text, Step 2 mkdir command, Step 7 Next Step.

---

### `/project-status`

**Steps**: Check .project/ (1), Load Status Logic + Decisions Format (2), Read state.md (3), Read Recent Flow-Log (4), Determine Active Scope (5), Apply File-Existence State Machine (6), Check Interrupted Work (7), Load Expertise Summary (7b), Present Status Summary (8), Write Back State (9), Offer Detail (10).

**Key structural facts**:

- **Step 1** message: "run `/start-project` to set up structured project planning" — needs → `/create-initiative`
- **Step 5** scope resolution: Work Stack → Active Slice → project level. The plan adds two new layers between Work Stack and project level: active initiative's active slice, then active initiative itself. This is a 3-step expansion → 5-step.
- **Step 6** currently only scans `vertical-slices/` and `side-quests/`. Must also scan `initiatives/`.
- **Step 7** checks `ls .project/vertical-slices/*/interrupted.md` and `ls .project/side-quests/*/interrupted.md`. Needs `initiatives/__active__*/vertical-slices/*/interrupted.md` added.
- **Format B** currently shows "Up next (vertical slices)" from `.project/vertical-slices/sequencing.md` — must be rerouted to the active initiative's `vertical-slices/` when one exists.
- `references/status-logic.md` is the authoritative state machine document. Its project-level states reference `vertical-slices/sequencing.md` directly (line 55-56). The State-to-Next-Skill mapping references `/start-project` (line 62). Both need updates.

**`status-logic.md` specific changes needed**:
- Line 5: `/start-project` → `/create-initiative`
- Lines 55-56: project-level state machine references `vertical-slices/sequencing.md` — add initiative-level states before this
- Lines 62-63: `/start-project` → `/create-initiative` in mapping table
- Add entire "Initiative State Machine" section (loaded from convention file, not inlined)

---

### `/explore`

**Steps**: Load Explore Logic + Decisions Format (1), Determine Scope (2), Handle Skip (3), Exploration Loop (4), Write explore-complete.md (5), Expertise Check (5b), Write Back State (6).

**Key structural facts**:

- **Step 2 scope resolution** (argument path): normalizes paths using hardcoded prefixes `vertical-slices/` and `side-quests/`. Example: `ls -d .project/vertical-slices/*"$SHORT_NAME"* .project/side-quests/*"$SHORT_NAME"* 2>/dev/null`. A new `initiatives/` prefix must be added.
- **Step 2 scope resolution** (no argument): reads state.md Work Stack → Active Slice → project level. Initiative scope must be inserted: Work Stack → active initiative scope (if work is initiative-level) → project level.
- **`explore-logic.md` scope path mapping table** has three rows: Project, Slice, Quest. A fourth row for Initiative must be added: research/brainstorm/prototypes inside the initiative directory, `explore-complete.md` inside the initiative directory.
- **Scope value mapping** in flow-log (Steps 3 and 6): currently `"project"`, `"vertical-slices/<name>"`, or `"side-quests/<name>"`. Needs `"initiatives/<name>"` added.
- **Step 4a mode selection**: currently "Project-level: offer Research, Brainstorm, Prototype" — initiative scope should behave the same as project-level (all three modes available).

---

### `/define-architecture`

**Steps**: Load References (1), Load Context (2), Re-entry Check (3), Conventions Phase (4), Design Tree Broad Pass (5), Design-It-Twice [placeholder] (6), Design Tree Deep Pass (7), Architecture Phase (8a-8h), CLAUDE.md Update (9), Expertise Check (9b), Write Back State (10), Done Summary (11).

**Key structural facts**:

- **Step 2 context loading**: reads `.project/idea.md`, then checks `.project/brainstorm/` and `.project/research/`. For initiative-scoped runs, these paths move into the initiative directory. The check for existing architecture files (`ls .project/conventions.md .project/architecture/ 2>/dev/null`) also moves.
- **Step 8b architecture output**: `mkdir -p .project/architecture/` — for the first initiative, this instead goes to `initiatives/__active__initial/architecture/`. For subsequent initiatives, to `initiatives/<name>/architecture-proposal/`.
- **Step 9 CLAUDE.md update**: currently adds references to `.project/architecture/` files. For first initiative, must reference `initiatives/__active__initial/architecture/` instead.
- **Step 10 flow-log**: `"scope":"project"` is hardcoded — no per-initiative scope value here currently.
- **8f Maturity Table**, **8g Invariants**, **8h Fitness Functions**: these write to `_overview.md` and `architecture/invariants.md` — both paths are relative to wherever architecture is written, so they move naturally if the output path changes. No structural surgery needed.
- **Graceful stop cases (Step 8e)**: reference `.project/conventions.md` and `architecture/` — all path-dependent, all need initiative-awareness.
- The description frontmatter says "Run after `/start-project`" — needs updating.

---

### `/define-slices`

**Steps**: Load References (1), Load Context (2), Re-entry Check (3), Propose Slices (4), Three-Lens Evaluation (4b), Write sequencing.md (5), Define Each Slice (6), Finalize sequencing.md (7), CLAUDE.md Update (8), Expertise Check (8b), Write Back State (9), Done Summary (10).

**Key structural facts**:

- **Step 2 slice discovery**: `ls .project/vertical-slices/sequencing.md .project/vertical-slices/*/goal.md 2>/dev/null` — hardcoded to project root. Must become `initiatives/__active__<name>/vertical-slices/`.
- **Step 5**: `mkdir -p .project/vertical-slices/` and writes `sequencing.md` there — must be initiative-scoped.
- **Step 6**: `mkdir -p .project/vertical-slices/NN-slice-name/` — same, must be initiative-scoped.
- **Step 8 CLAUDE.md update**: adds `- .project/vertical-slices/sequencing.md` to Project Context. Will need to reference the initiative's sequencing.md instead (or additionally).
- **`references/guidance.md`**: has its own hardcoded `ls .project/vertical-slices/sequencing.md` check (line 10) and a CLAUDE.md line template (line 39) — both need updating alongside SKILL.md.
- **Context loading (Step 2)**: reads `.project/architecture/_overview.md` — for initiative slices, should prefer initiative architecture. The plan also adds reading the initiative's `goal.md` as context for slice decomposition.
- The description frontmatter says "Requires idea.md from /start-project" — needs updating.
- **Per-slice explore phase**: the plan removes it. Currently in `explore-logic.md`, a "Slice" row exists with paths like `vertical-slices/<name>/research/`. After this change, slices within initiatives no longer have explore phases — only initiative-level exploration exists. Side quest slices (no initiative) retain the existing behavior.

---

### `/create-plan`

**Steps**: Load References (1), Determine Scope (2), Load Context (3), Interactive Planning (4a-4d), Draft and Approve (5), Write Plan (6), Expertise Check (6b), Write Back State (7), Done Summary (8).

**Key structural facts**:

- **Step 2 scope resolution**: searches `vertical-slices/` and `side-quests/` — must also handle `initiatives/<name>/vertical-slices/`. The auto-detect scan (Step 2.3) currently globs `.project/vertical-slices/` — must be extended to the active initiative's `vertical-slices/`.
- **Step 3 context loading**: reads `.project/architecture/` files. For initiative slices, the primary architecture is in `initiatives/<name>/architecture/`. For side quests, must read both top-level (current reality) and initiative architecture (target).
- **Step 3 also reads**: `vertical-slices/sequencing.md` and other slice `goal.md` files. These are now initiative-scoped for initiative slices.
- **`references/guidance.md` context loading** (line 13): duplicates the context list from SKILL.md Step 3. Same updates needed in the reference.
- **Phase 7 stale detection addition**: goes into Step 3 after architecture files are loaded. Uses `git log -1 --format="%ai"` on `.project/architecture/` vs `<scope>/goal.md`. This is new logic with no collision with existing step numbering.
- **Phase 7 two-layer loading**: for side quests, add loading of `initiatives/__active__*/architecture/` alongside top-level. This is a conditional branch within Step 3 context loading.

---

### `/refine-plan`

**Steps**: (not numbered) Load Plan + Working Copy (0), Verify Plan Goal (1), Pre-Review Research (2), Codebase Context Discovery (2b), Refinement Loop (3), Final Verification (4), Completion (5).

**Key structural facts**:

- **Step 2b (Codebase Context Discovery)**: this is where Phase 7's stale assumption check for `/refine-plan` is inserted. The plan says to add the check here and include it in the codebase context summary so reviewers are aware.
- **`references/shared-preamble.md`**: Phase 7 adds initiative architecture loading to the Codebase Exploration section (currently lines 38-44). The addition is: "If `initiatives/__active__*/architecture/` exists, read it alongside top-level architecture. Flag any conflicts between the plan and the active initiative's target architecture." This is purely additive — no existing text changes.
- **Scope resolution**: `/refine-plan` takes an explicit path argument — no implicit scope resolution to change. The `scope_dir = dirname(plan_path)` derivation handles initiative paths automatically.
- **Run directory structure**: `<scope_dir>/refinement/` — initiative slice plans live under `initiatives/__active__<name>/vertical-slices/<slice>/`, so refinement artifacts end up inside the initiative directory naturally.
- No step numbering conflicts. The stale check is additive within Step 2b; the shared-preamble addition is additive.

---

## Cross-Skill Blast Radius: `/start-project` → `/create-initiative`

The rename affects every place where `/start-project` is mentioned as a skill name (command trigger, next-step suggestion, or reader/writer list entry). Full inventory:

| Location | Type | Specific reference |
|---|---|---|
| `~/.claude/skills/start-project/SKILL.md` | Skill itself | `name: start-project` in frontmatter, self-references in Step 1 warning |
| `~/.claude/skills/define-architecture/SKILL.md` | Description + Step 2 | "Run after `/start-project`"; "run /start-project first" in error message |
| `~/.claude/skills/define-architecture/references/guidance.md` | Re-entry guidance | "Suggest `/start-project` to flesh it out" |
| `~/.claude/skills/define-slices/SKILL.md` | Description + Step 2 | "Requires idea.md from /start-project"; "run /start-project first" |
| `~/.claude/skills/project-status/SKILL.md` | Step 1 | "run `/start-project` to set up structured project planning" |
| `~/.claude/skills/project-status/references/status-logic.md` | No-.project message + State-to-Next-Skill table | Two occurrences of `/start-project` |
| `~/.claude/skills/_shared/references/decisions-format.md` | Readers list | `/start-project` in Readers list (line 80) |
| `~/.claude/skills/_shared/references/expertise-tracking.md` | Consumer list | Two references (lines 50, 81) |
| `workflow.md` (repo root) | Workflow docs | Several references expected — not enumerated here |
| `CLAUDE.md` (repo root, goodplan project) | Project context | May reference the skill |

**Estimated touch count**: 10+ files across skills and shared references. The plan's Phase 2 tasks correctly identify grepping for `start-project` across `~/.claude/skills/` as the cleanup step.

---

## Cross-Skill Blast Radius: `vertical-slices/` Path Hardcoding

Every skill that references `.project/vertical-slices/` directly (rather than computing it from scope) will need path-awareness changes. These are structural rather than mere name changes:

| Location | Hardcoded path | Change needed |
|---|---|---|
| `start-project/SKILL.md` Step 1 | `.project/vertical-slices/` (warning text) | Update to `initiatives/` |
| `start-project/SKILL.md` Step 2 | `mkdir -p .project/{...,vertical-slices}` | Replace with `initiatives/` |
| `project-status/SKILL.md` Step 7 | `ls .project/vertical-slices/*/interrupted.md` | Add initiative scan |
| `project-status/SKILL.md` Format B | reads `vertical-slices/sequencing.md` | Route to initiative's sequencing.md |
| `project-status/references/status-logic.md` | Lines 55-56 (project-level states) | Add initiative states above |
| `explore/SKILL.md` Step 2 | `ls -d .project/vertical-slices/*` and `ls .project/vertical-slices/` | Add `initiatives/` variants |
| `explore/references/explore-logic.md` | Scope path mapping table row "Slice" | Still correct for initiative slices, but "Initiative" row needed |
| `define-slices/SKILL.md` Steps 2, 5, 6, 8 | Multiple `.project/vertical-slices/` references | All become initiative-relative |
| `define-slices/references/guidance.md` | Lines 10, 39 | Same |
| `create-plan/SKILL.md` Steps 2, 3 | `vertical-slices/` in scope resolution and context loading | Must handle initiative path |
| `create-plan/references/guidance.md` | Lines 5, 7, 13 | Same |
| `refine-slices/SKILL.md` | `.project/vertical-slices/` in working dir, run dir, manifest, etc. | Entire skill is project-root-scoped; may need initiative awareness in a future quest |
| `complete-slice/SKILL.md` | `vertical-slices/` in scope resolution and glob patterns | Must handle initiative path |
| `_shared/references/state-and-flow-formats.md` | Scope value examples (`vertical-slices/<name>`) | Add `initiatives/<name>/vertical-slices/<name>` as a valid scope value |

**Note**: `refine-slices` is not in the plan's scope. It currently operates entirely on `.project/vertical-slices/` — it will need a separate quest to become initiative-aware.

---

## Areas of Active Churn vs Stability

**High churn (plan directly modifies)**:
- `start-project/SKILL.md` — complete behavioral rewrite (Mode A restructured, Mode B added)
- `project-status/SKILL.md` + `status-logic.md` — new scope resolution layer, new state machine
- `explore/SKILL.md` + `explore-logic.md` — new scope type and path mapping
- `define-architecture/SKILL.md` — new output location branching
- `define-slices/SKILL.md` + `references/guidance.md` — path routing to initiative
- `create-plan/SKILL.md` + `references/guidance.md` — stale detection + two-layer loading + path routing
- `refine-plan/references/shared-preamble.md` — additive only (low risk)

**Stable (not in plan scope)**:
- `refine-plan/SKILL.md` body — loop orchestration, reviewer spawning, editor pattern unchanged
- `complete-slice/SKILL.md` — scope resolution updates needed but not planned here (risk: may break when slices live inside initiatives)
- `refine-slices/SKILL.md` — entirely project-root-scoped, not in scope of this plan
- `_shared/references/iteration-loop.md`, `dependency-research.md`, `codebase-context-discovery.md` — no changes needed
- `_shared/references/decisions-format.md` — only the `/start-project` → `/create-initiative` rename in the Readers list
- `_shared/references/expertise-tracking.md` — only the `/start-project` reference in consumer list

**Recently changed (potential merge conflicts)**:
- `define-architecture/SKILL.md` — Steps 8f/8g/8h (maturity table, invariants, fitness functions) were recently added. Plan's Phase 5 changes Steps 1, 2, 9, 10 — no overlap with 8f-8h. Safe.
- `project-status/references/status-logic.md` — `~~archived~~` prefix recently updated. Plan adds initiative state machine above the per-slice machine — additive, no collision.
- `_shared/references/maturity-conventions.md` — already references "first initiative" in its `/complete` and `/define-architecture` descriptions (lines 81, 143, 183). Plan's changes will need to be consistent with this existing initiative language.

---

## Unplanned Gap: `complete-slice` Initiative Awareness

`complete-slice/SKILL.md` resolves scope by matching `vertical-slices/` or `side-quests/` and globs `vertical-slices/*/completion/learnings.md`. When slices live inside `initiatives/__active__<name>/vertical-slices/`, these globs will miss them. This skill is not in the plan's scope — flag as a follow-up quest.

## Unplanned Gap: `refine-slices` Initiative Awareness

`refine-slices/SKILL.md` is entirely hardcoded to `.project/vertical-slices/`. Its run directory is `.project/vertical-slices/slices-refining/` and its manifest globs that directory. Will not work for initiative slices. Not in plan scope — flag as a follow-up quest.
