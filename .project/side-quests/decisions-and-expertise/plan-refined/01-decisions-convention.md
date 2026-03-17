# Phase 1: Decisions Convention

Create the shared reference file that defines the `.project/decisions/` file format, naming convention, decision threshold, status lifecycle, and confirmation requirement.

### Tasks

- [x] Create `~/.claude/skills/_shared/references/decisions-format.md` with the following sections:

  **Directory**: `.project/decisions/` — created on first write (skills should `mkdir -p` before writing)

  **File naming**: `<YYYY-MM-DD>-<slug>.md` (e.g., `2026-03-17-adopt-event-sourcing.md`). Slug is kebab-case, 2-5 words.

  **File format**:
  ```
  # Decision: <Title>

  **Status**: active | superseded by [<link>] | revisiting
  **Date**: <YYYY-MM-DD>
  **Domain**: <optional — architecture | slicing | implementation | infrastructure | ...>
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
  - `revisiting` — under active reconsideration. Agent should flag this status when loading. Any skill that encounters a relevant decision can set `revisiting` (with user confirmation). Resolution: either back to `active` with updated rationale, or `superseded` by a new decision. The skill that initiated `revisiting` is responsible for resolving it before completing.

  **Loading protocol**: Glob `.project/decisions/*.md`. Skip files with `Status: superseded` (follow the link to the replacement instead). Flag files with `Status: revisiting` to the user. Load remaining active decisions as context alongside architecture files.

  **Extension policy**: Additive fields (like new optional metadata) are safe to add. Format changes that alter existing fields require updating all consumer skills. Current consumers: all interactive skills listed below.

  **Confirmation requirement**: Agent must always propose decision text and get user confirmation via AskUserQuestion before writing to `.project/decisions/`. Never auto-write decisions.

  **Who writes**: `/explore`, `/define-architecture`, `/define-slices`, `/create-plan`, `/complete-slice`
  **Who reads**: All interactive skills load active decisions as context alongside architecture files — the 5 writers + `/project-status`, `/start-project`, `/refine-plan`, `/implement-plan`

### Verification

- File exists at `~/.claude/skills/_shared/references/decisions-format.md`
- Contains all sections: directory convention, file naming, file format template, decision threshold with examples, status lifecycle, confirmation requirement, writer/reader lists
- Format is clear enough that an implementing agent could create a correctly-formatted decision file from it alone
