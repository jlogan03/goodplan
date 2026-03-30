# Phase 2: `/define-architecture` Update

Add steps to create initial maturity table, invariants.md, and fitness function candidates.

### Tasks

- [ ] **Update `references/architecture-logic-templates.md`**: Add a `## Subsystem Maturity` section template to the `_overview.md` template. All subsystems start at "Experimental" with empty Dependents, "—" for Fitness Functions, and a brief note. Use the format from `maturity-conventions.md`.

- [ ] **Add Step 9b — Create Maturity Table**: After architecture files are written (Step 9), add a step that populates the `## Subsystem Maturity` section in `_overview.md`. For each subsystem defined in the architecture, create a row with Maturity: Experimental, Dependents derived from the architecture's dependency graph, Fitness Functions: "—", Notes: brief description. Present to user for review via AskUserQuestion. Reference `~/.claude/skills/_shared/references/maturity-conventions.md` for format.

- [ ] **Add Step 9c — Create Invariants**: After maturity table, interactively define system-wide invariants. Read `~/.claude/skills/_shared/references/maturity-conventions.md` for format and examples. Ask the user: "What constraints must hold across all future work? Think about error handling, data integrity, security, performance." Draft `architecture/invariants.md` from the conversation. If the user has nothing yet, create a stub file with the format header, examples section, and a note to add invariants as the project matures. Run `mkdir -p .project/architecture/` before writing.

- [ ] **Add Step 9d — Identify Fitness Function Candidates**: For each subsystem, identify architectural properties that should eventually be tested (when the subsystem matures). Add these as "candidate" entries in the relevant architecture file or as a section in `_overview.md` — whichever is simpler. Present to user. This is lightweight — a few bullet points per subsystem, not full test specs. Reference `maturity-conventions.md` for the candidate format.

- [ ] **Update `references/guidance.md`** (define-architecture's): Add a "Maturity, Invariants, and Fitness Functions" section covering: maturity table creation guidance, invariant definition tips (think about error handling, data integrity, security, performance as categories), and fitness function candidate identification approach (what properties matter for each subsystem type).

### Verification

- Read updated SKILL.md, architecture-logic-templates.md, and guidance.md. Confirm:
  - Steps 9b/9c/9d exist with clear instructions
  - The `_overview.md` template includes the Subsystem Maturity section
  - Guidance covers all three new concepts
  - Each step references `maturity-conventions.md` for format
  - Invariant creation handles both "user has ideas" and "user has nothing yet" cases
