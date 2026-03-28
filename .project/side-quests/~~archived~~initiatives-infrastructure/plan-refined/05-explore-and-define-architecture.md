# Phase 5: `/explore` + `/define-architecture` + `/refine-architecture` + `/audit-architecture` Updates

Scope all four skills to work within initiative directories. `/define-architecture` writes to initiative architecture. `/refine-architecture` and `/audit-architecture` resolve to initiative architecture when an active initiative exists. Top-level gets a scaffold for the first initiative.

### Tasks

**`/explore`:**

- [x] **Update scope resolution**: When active scope is an initiative (detected from state.md or argument), use the initiative's `research/`, `brainstorm/`, `prototypes/` directories instead of project-level ones. Read `initiative-conventions.md` for directory structure.

- [x] **Update `explore-logic.md`**: Add an "Initiative" row to the scope resolution table in `explore-logic.md`. The skill loads this file as its authoritative scope path reference, so it must include initiative-scoped paths for `research/`, `brainstorm/`, and `prototypes/`.

- [x] **Reject initiative slice paths in scope validation**: Update `/explore` scope validation to reject paths matching `initiatives/*/vertical-slices/*`. If a user passes an initiative slice path (e.g., `initiatives/__active__foo/vertical-slices/02-bar`), respond with a message directing them to explore at the initiative level instead. Per-slice exploration is not supported for initiative slices — all exploration happens at the initiative level.

- [x] **Update explore markers**: Write `explore-complete.md` or `explore-skipped.md` to the initiative directory (not project root).

- [x] **Update state.md Next Step**: After explore completes for an initiative, suggest `/define-architecture` (the skill derives the output path from state.md).

**`/define-architecture`:**

- [x] **Update architecture output location**: The skill reads `state.md` to detect the active initiative and derives the output path by looking up the initiative type in `initiative-conventions.md`:
  - **First initiative** (name is `initial`): writes to `initiatives/__active__initial/architecture/`. Also writes top-level `.project/architecture/_overview.md` as a scaffold containing: a `<!-- scaffold -->` marker comment, a pointer to the active initiative's architecture ("Architecture is being defined in the active initiative. See `initiatives/__active__initial/architecture/` for the current target."), and a `## Subsystem Maturity` header with an empty table. No maturity data is populated until the first slice completes via `/complete`.
  - **Subsequent initiative**: writes to `initiatives/<name>/architecture-proposal/`. This is a proposal — not committed until `/start-initiative` approves it.
  - **No active initiative**: defaults to `.project/architecture/` (legacy/side-quest-only projects).
  - The skill contains initiative-type detection logic (delegated to convention file lookup) — implementer should note this dependency.

- [x] **Update CLAUDE.md Project Context step**: For first initiative, add references to initiative architecture. For subsequent initiatives, note that architecture is a proposal pending approval.

- [x] **Reference `initiative-conventions.md`**: Load in Step 0 for directory structure awareness.

- [x] **Update SKILL.md `description` fields**: Update frontmatter descriptions for both `/explore` and `/define-architecture` to reflect initiative awareness. Remove stale references like "Run after `/start-project`".

- [x] **Update state.md Next Step**: After define-architecture for first initiative: `/define-slices`. For subsequent: `/start-initiative` (to review and approve the proposal).

**`/refine-architecture`:**

- [x] **Update path resolution for initiative-scoped architecture**: Currently hardcoded to `.project/architecture/`. Detect the active initiative (scan `initiatives/__active__*/`). When an active initiative exists, operate on `initiatives/__active__<name>/architecture/` instead of top-level. Fall back to `.project/architecture/` for side quests and project-level work (no active initiative). Reference `initiative-conventions.md` for path resolution.

- [x] **Detect scaffold marker on top-level fallback**: When falling back to `.project/architecture/` (no active initiative), check whether `_overview.md` contains the `<!-- scaffold -->` marker (written by `/define-architecture` for the first initiative). If so, warn the user that top-level architecture is a scaffold pointing to the active initiative's architecture, and direct them to run `/define-architecture` first or operate on the initiative architecture directly. Do not treat the scaffold as real architecture. (Consistent with Phase 7 stale detection skipping scaffold files.)

- [x] **Update run and backup directory paths for initiative scope**: The skill currently creates `.project/architecture-refining/` (run dir) and `.project/architecture-backup-<timestamp>/` (backup dir) hardcoded to the project root. When operating on initiative architecture, use:
  - Run directory: `initiatives/__active__<name>/architecture-refining/`
  - Backup directory: `initiatives/__active__<name>/architecture-backup-<timestamp>/`
  This ensures artifacts land alongside their architecture and the resume detection logic (which scans for `architecture-backup-*`) does not pick up the wrong backup across scopes.

- [x] **Update flow-log scope value**: Step 4 writes `"scope":"project"` hardcoded to `flow-log.jsonl`. When operating on initiative architecture, write `"scope":"initiatives/<name>"` instead. Use the detected initiative name. This is required for `/project-status` interrupted-work traceability.

- [x] **Update SKILL.md `description` field**: Reflect initiative-scoped architecture awareness.

**`/audit-architecture`:**

- [x] **Update architecture glob path**: Currently globs `.project/architecture/**/*.md`. Detect the active initiative. When one exists, glob `initiatives/__active__<name>/architecture/**/*.md` instead. Fall back to `.project/architecture/` when no active initiative. Reference `initiative-conventions.md` for path resolution.

- [x] **Update flow-log scope value**: Step 7 writes `"scope":"project"` hardcoded to `flow-log.jsonl`. When operating on initiative architecture, write `"scope":"initiatives/<name>"` instead. Use the detected initiative name. This is required for `/project-status` interrupted-work traceability.

- [x] **Update SKILL.md `description` field**: Reflect initiative-scoped architecture awareness.

### Verification

- Read all four updated SKILL.md files. Confirm:
  - `/explore` uses initiative directories for research/brainstorm/prototypes and rejects initiative slice paths
  - `/define-architecture` writes to initiative's `architecture/` (first) or `architecture-proposal/` (subsequent)
  - Top-level scaffold is created for first initiative
  - State.md next steps are correct for both cases
  - `/refine-architecture` resolves to initiative architecture when active initiative exists; detects scaffold marker on fallback
  - `/refine-architecture` uses initiative-scoped run and backup directories when operating on initiative architecture
  - `/audit-architecture` globs initiative architecture when active initiative exists
  - Both `/refine-architecture` and `/audit-architecture` write `"scope":"initiatives/<name>"` to flow-log when operating on initiative architecture
  - All four skills fall back to top-level `.project/architecture/` when no active initiative
  - **Smoke test fallback**: with no `initiatives/__active__*/` directory present, confirm `/refine-architecture` reads `.project/architecture/` and `/audit-architecture` globs `.project/architecture/**/*.md`
