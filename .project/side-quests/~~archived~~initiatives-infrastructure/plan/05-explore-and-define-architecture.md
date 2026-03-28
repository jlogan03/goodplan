# Phase 5: `/explore` + `/define-architecture` Updates

Scope both skills to work within initiative directories. `/define-architecture` writes to initiative architecture. Top-level gets a scaffold for the first initiative.

### Tasks

**`/explore`:**

- [ ] **Update scope resolution**: When active scope is an initiative (detected from state.md or argument), use the initiative's `research/`, `brainstorm/`, `prototypes/` directories instead of project-level ones. Read `initiative-conventions.md` for directory structure.

- [ ] **Update explore markers**: Write `explore-complete.md` or `explore-skipped.md` to the initiative directory (not project root).

- [ ] **Update state.md Next Step**: After explore completes for an initiative, suggest `/define-architecture <initiative-path>`.

**`/define-architecture`:**

- [ ] **Update architecture output location**: Detect whether scope is an initiative:
  - **First initiative** (`__active__initial`): Write architecture files to `initiatives/__active__initial/architecture/`. Write top-level `.project/architecture/_overview.md` as a scaffold: "Architecture is being defined in the active initiative. See `initiatives/__active__initial/architecture/` for the current target."
  - **Subsequent initiative**: Write to `initiatives/<name>/architecture-proposal/` instead. This is a proposal — not committed until `/start-initiative` approves it.

- [ ] **Update CLAUDE.md Project Context step**: For first initiative, add references to initiative architecture. For subsequent initiatives, note that architecture is a proposal pending approval.

- [ ] **Reference `initiative-conventions.md`**: Load in Step 0 for directory structure awareness.

- [ ] **Update state.md Next Step**: After define-architecture for first initiative: `/define-slices`. For subsequent: `/start-initiative` (to review and approve the proposal).

### Verification

- Read both updated SKILL.md files. Confirm:
  - `/explore` uses initiative directories for research/brainstorm/prototypes
  - `/define-architecture` writes to initiative's `architecture/` (first) or `architecture-proposal/` (subsequent)
  - Top-level scaffold is created for first initiative
  - State.md next steps are correct for both cases
