# Phase 1: Decisions Convention

Create the shared reference file that defines the `.project/decisions/` file format, naming convention, decision threshold, status lifecycle, and confirmation requirement.

### Tasks

- [ ] Create `~/.claude/skills/_shared/references/decisions-format.md` with the following sections:

  **Directory**: `.project/decisions/` — created on first write (skills should `mkdir -p` before writing)

  **File naming**: `<YYYY-MM-DD>-<slug>.md` (e.g., `2026-03-17-adopt-event-sourcing.md`). Slug is kebab-case, 2-5 words.

  **File format**:
  ```
  # Decision: <Title>

  **Status**: active | superseded by [<link>] | revisiting
  **Date**: <YYYY-MM-DD>
  **Context**: <phase/skill that prompted this, e.g., "define-architecture for project X">

  ## Decision
  <What was decided — one clear statement>

  ## Rationale
  <Why this, not the alternatives. Include alternatives considered.>

  ## Consequences
  <What this decision enables or constrains going forward>
  ```

  **Decision threshold** — what qualifies as a "durable decision":
  - Reversing it would require changes across multiple files or phases
  - It constrains or enables future work (e.g., tech stack choices, API contracts, data models)
  - Examples of decisions: "Use PostgreSQL for persistence", "Event-driven communication between services", "Monorepo structure"
  - Examples of NOT decisions: "Name this variable X", "Use a helper function here", "Refactor this loop"

  **Status lifecycle**:
  - `active` — current, should be followed
  - `superseded by [<link>]` — replaced by a newer decision. Link points to the replacement file. Agent follows the link, not the old decision.
  - `revisiting` — under active reconsideration. Agent should flag this status when loading.

  **Confirmation requirement**: Agent must always propose decision text and get user confirmation via AskUserQuestion before writing to `.project/decisions/`. Never auto-write decisions.

  **Who writes**: `/explore`, `/define-architecture`, `/define-slices`, `/create-plan`, `/complete-slice`
  **Who reads**: All interactive skills load active decisions as context alongside architecture files

### Verification

- File exists at `~/.claude/skills/_shared/references/decisions-format.md`
- Contains all sections: directory convention, file naming, file format template, decision threshold with examples, status lifecycle, confirmation requirement, writer/reader lists
- Format is clear enough that an implementing agent could create a correctly-formatted decision file from it alone
