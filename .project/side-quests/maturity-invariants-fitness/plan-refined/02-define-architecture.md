# Phase 2: `/define-architecture` Update

Add steps to create initial maturity table, invariants.md, and fitness function candidates.

### Tasks

- [ ] **Update `references/architecture-logic-templates.md`**: Add a `## Subsystem Maturity` section template to the `_overview.md` template. All subsystems start at "Experimental" with empty Dependents, "—" for Fitness Functions, and a brief note. Use the format from `maturity-conventions.md`. Also add a `## Fitness Functions` section template to the `<subsystem>-api.md` template (after Dependencies), so the section header exists before Step 8h populates it with candidates. Without this, audit-architecture Step 3b will find no section to audit if Step 8h was never reached.

- [ ] **Add Step 8f — Create Maturity Table**: After all architecture files are written (Steps 8b-8d), add a step that populates the `## Subsystem Maturity` section in `_overview.md`. For each subsystem defined in the architecture, create a row with Maturity: Experimental, Dependents derived from the architecture's dependency graph, Fitness Functions: "—", Notes: brief description. Present to user for review via AskUserQuestion. Reference `~/.claude/skills/_shared/references/maturity-conventions.md` for format.

- [ ] **Add Step 8g — Create Invariants**: After maturity table, interactively define system-wide invariants. Read `~/.claude/skills/_shared/references/maturity-conventions.md` for format and examples. Ask the user: "What constraints must hold across all future work? Think about error handling, data integrity, security, performance." Draft `architecture/invariants.md` from the conversation. If the user has nothing yet, create a stub file with the format header, examples section, and a note to add invariants as the project matures. The `architecture/` directory already exists at this point (created during Step 8b).

- [ ] **Add Step 8h — Identify Fitness Function Candidates**: For each subsystem, identify architectural properties that should eventually be tested (when the subsystem matures). Add these as "candidate" entries in a `## Fitness Functions` section of the relevant `<subsystem>-api.md` file (the canonical location per `maturity-conventions.md`). The maturity table's Fitness Functions column should contain a summary pointer to these entries. Present to user and accept after one round of user feedback — this is a starting point, not a final specification. This is lightweight — a few bullet points per subsystem, not full test specs. Reference `maturity-conventions.md` for the candidate format.

  **Note on step numbering**: The existing Step 9b (Expertise Check) retains its current position and number — no collision since the new steps are 8f/8g/8h, inserted before Step 9 (CLAUDE.md Update). This ensures all new artifacts exist when CLAUDE.md is generated, so `invariants.md` and fitness function entries appear in CLAUDE.md's "Also check" entries.

- [ ] **Update graceful stop cases** in define-architecture SKILL.md: Add handling for interruption during Steps 8f/8g/8h. Insert between existing Step 8e cases and Step 9 cases in the graceful stop section. Use the existing `<!-- partial — interrupted during ... -->` marker pattern:
  - Step 8f: `<!-- partial — interrupted during maturity table creation — completed: [list of subsystems added] -->`
  - Step 8g: `<!-- partial — interrupted during invariant definition — state: [drafted/stub/not started] -->`
  - Step 8h: `<!-- partial — interrupted during fitness function candidate identification — completed: [list of subsystems with candidates] -->`

- [ ] **Update `references/guidance.md`** (define-architecture's): Add a "Maturity, Invariants, and Fitness Functions" section covering: maturity table creation guidance, invariant definition tips (think about error handling, data integrity, security, performance as categories), and fitness function candidate identification approach (what properties matter for each subsystem type).

### Verification

- Read updated SKILL.md, architecture-logic-templates.md, and guidance.md. Confirm:
  - Steps 8f/8g/8h exist with clear instructions, inserted between Step 8e and Step 9
  - The existing Step 9b (Expertise Check) is still present and unchanged
  - All new steps execute before Step 9 (CLAUDE.md Update), so new artifacts are included in CLAUDE.md's Project Context
  - The `_overview.md` template includes the Subsystem Maturity section
  - Guidance covers all three new concepts
  - Each step references `maturity-conventions.md` for format
  - Invariant creation handles both "user has ideas" and "user has nothing yet" cases
  - Graceful stop cases cover interruption during Steps 8f/8g/8h
