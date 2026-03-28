# Phase 2: Write SKILL.md

Write the skill at `~/.claude/skills/define-architecture/SKILL.md`.

## Tasks

- [x] Create `~/.claude/skills/define-architecture/SKILL.md` with YAML frontmatter:
  - `name: define-architecture`
  - `description:` — third person, covers what it does AND when to invoke it, with trigger phrases. Mention key outputs (`conventions.md`, `architecture/` files) and that this skill writes files (not freeform conversation). Note `/start-project` prerequisite (`idea.md` required). Give conventions-related triggers equal weight since the conventions phase is a full half of the skill. E.g., "Drives architecture decisions through structured Q&A, writing `.project/conventions.md` and `architecture/` files. Run after `/start-project` and optionally `/explore`. Common triggers: 'let's define the architecture', 'what's our tech stack', 'I want to start on architecture', 'define architecture', 'set up conventions', 'help me set up project conventions', 'what coding standards should we use', 'define project conventions'."

- [x] Write the skill body with these steps:

  **Step 1 — Load references**
  Use the Read tool to load `references/architecture-logic.md` and `references/guidance.md`. Use the templates and applicability table from architecture-logic.md, and the CLAUDE.md format and conversation guidance from guidance.md throughout.
  Estimated SKILL.md size: ~220-280 lines (limit 500).

  **Step 2 — Load context**
  Read the following:
  1. `.project/idea.md` — if absent, use AskUserQuestion to tell the user to run `/start-project` first (message: "No idea.md found — run /start-project first to capture your project idea."), then stop. If idea.md exists but is thin (fewer than 3 substantive sections or reads as a stub), ask the user a few targeted questions to fill gaps before drafting any files. Suggest running `/start-project` to flesh it out, but don't require it — proceed if the user provides enough context inline.
  2. Check for exploration output: `ls .project/brainstorm/ .project/research/ .project/prototypes/ 2>/dev/null`. If found, read `.project/explore-complete.md` (or `explore-skipped.md`) first as the summary. Then read individual exploration files only if the summary references something needing more detail — if more than 5 files, read only the first 50 lines of each.
  3. Check for existing architecture: `ls .project/conventions.md .project/architecture/ 2>/dev/null`

  Present a one-line summary: "Found: idea.md [+ N brainstorm files, M research files]. Existing architecture files: [list or 'none']."

  **Step 3 — Re-entry check**
  If any architecture files exist (`.project/conventions.md` or files in `.project/architecture/`):
  - List what was found
  - If `architecture/` files exist but `conventions.md` does NOT: treat conventions as incomplete. Write `conventions.md` first (Step 4) before proceeding to architecture files.
  - If `conventions.md` exists but no `architecture/` files: tell the user conventions are done and proceed directly to the architecture phase (Step 5)
  - Otherwise (both exist), use AskUserQuestion (with options) to ask: "Want to continue where we left off, or revisit all areas? (Existing files won't be deleted either way.)"
  - "Continue" → batch the revisit prompt into one question: "These files exist: [list]. Want to revisit any? (List them, or say 'none' to skip to gaps.)"
  - "Start fresh" → treat all areas as incomplete

  If no existing files, proceed directly to Step 4.

  **Step 4 — Conventions phase**
  Goal: produce `.project/conventions.md`. Skip if this file already exists and user chose "Continue".

  1. Using the `conventions.md` template, draft content from idea.md and exploration output
  2. Present the full draft first. Ask targeted questions inline (open-ended, not AskUserQuestion) only for gaps the draft couldn't infer. (Reserve AskUserQuestion for structured choices in Step 5.)
  3. Iterate — apply corrections, re-present only the changed sections
  4. When the draft is ready, present it for approval using AskUserQuestion with two options: "Looks good — write it" and "I have more corrections". If user picks corrections, iterate and re-present. If user approves (or gives corrections AND approval in the same message), apply any final corrections, re-present the changed sections, then write `.project/conventions.md` with the Write tool — no additional confirmation needed.

  **Step 5 — Architecture phase**
  At the start of this phase, briefly explain the "broad to specific" ordering: overview first, then conventions, then domain-specific files, then subsystem APIs.

  1. Based on idea.md and the applicability table, propose which architecture files to write (excluding subsystem API files — those are decided after `_overview.md` is written). For uncertain cases (e.g., is there a frontend?), use AskUserQuestion before finalizing the list.
  2. Present the file list with a one-line description of each file's purpose and relevance to this project. Use AskUserQuestion to confirm: "I'll write these files: [list with descriptions]. Anything missing?"
  3. Draft and write `_overview.md` first (following the per-file flow below).
  4. After `_overview.md` is written (or if it already exists in a re-entry case), derive subsystem candidates from its Subsystems section. Use AskUserQuestion to ask: "These look like your main subsystems: [list]. Which ones have non-trivial API contracts that need documenting?" Acknowledge the selection: "Got it — I'll write X-api.md and Y-api.md. Anything to add or remove?" Write one `<subsystem>-api.md` per confirmed subsystem. After confirming API files, check whether `_overview.md`'s Subsystems section needs revision — if subsystems were added or removed, update `_overview.md` once before continuing (do not re-evaluate the subsystem list after this one-time fixup). Focus subsystem API content on what the subsystem exposes and its key invariants; detailed signatures will be refined during `/create-plan`.
  5. If the user requests a file type not in the applicability table (e.g., `architecture/security.md`), accept it, draft it using the generic subsystem API template format as a starting point, and include it in the file list.

  Then, for each file in order (`_overview.md` first per step 3 above, then `architecture/conventions.md`, then optional files in applicability table order: data-model, flows, information-architecture, ui-ux, then subsystem APIs):
  - Skip if the file already exists and user chose "Continue" (offer to revisit)
  - Draft content based on idea.md, exploration output, and conventions decisions made in Step 4
  - For `architecture/conventions.md`, explicitly synthesize conventions decisions from `.project/conventions.md` into architectural patterns
  - Present the draft and ask: "What needs correcting or adding?"
  - Iterate until satisfied
  - `mkdir -p .project/architecture/` before the first file write
  - Write the file with the Write tool before moving on.
  - After writing each file, show progress: "Written 3 architecture files so far: _overview.md, conventions.md, data-model.md. Next: flows.md."

  **Graceful stop:** If the user says "that's enough" or "stop here" at any point:
  - If no files have been written yet (e.g., stopped during the conventions draft iteration before approval): don't update state.md; tell the user nothing was written and state.md is unchanged.
  - If `conventions.md` was written but no architecture files yet: update state.md with Current Phase: `define-architecture in-progress — stopped after writing conventions.md`; update CLAUDE.md Project Context to reference only conventions.md; stop cleanly.
  - If one or more architecture files have been written (with or without conventions.md): update state.md with Current Phase: `define-architecture in-progress — stopped after writing <list of all files written so far, including conventions.md if written>`; update CLAUDE.md Project Context to reference only the files actually written; stop cleanly.

  **Step 6 — CLAUDE.md update**
  Using the Project Context section format from `references/guidance.md` (the guidance.md format contains HTML comments — these are instructions to you, not content to write into CLAUDE.md):
  1. Check which optional files actually exist (brainstorm/, research/, prototypes/, learnings.md, sequencing.md). Note: `sequencing.md` and `learnings.md` are written by later skills — only reference them if they already exist.
  2. For "Also check" entries, only include directories that exist AND contain files (not empty directories).
  3. Build the Project Context section content, including only entries for files that exist.
  4. Read CLAUDE.md with the Read tool (to avoid overwriting unrelated content).
  5. Update:
     - No CLAUDE.md: create it with the Write tool, Project Context as the only content
     - CLAUDE.md with no `## Project Context` section: append the section using the Edit tool
     - CLAUDE.md with existing `## Project Context` section: Read CLAUDE.md fully, extract the exact text from `## Project Context` through (but not including) the next `## ` heading. The old_string MUST include the `## Project Context` heading line itself for unique matching, and must preserve trailing whitespace/newlines exactly as they appear in the file. If no subsequent `## ` heading exists, use the text from `## Project Context` through end of file as old_string. Replace with the new section content.
  6. For each architecture file written in Step 5, add a reference line under the "Read these before doing any significant work" block (e.g., `- .project/architecture/data-model.md — entities, relationships, storage`). Only include files that actually exist.
  7. After updating, tell the user: "Updated CLAUDE.md so future sessions and sub-agents will automatically load your architecture files."

  **Step 7 — Write back state**
  Use the Read tool to load `references/formats.md` for state.md and flow-log formats. (This is loaded late because the formats are only needed for the final state update, not during the interactive phases.)
  Generate a UTC timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ`
  Update `.project/state.md`. Set:
  - Current Phase: `define-architecture complete — conventions and architecture/* written`
  - Active Slice: unchanged from before (or `none (working at project level)` if project-level)
  - Work Stack: unchanged
  - Next Step: `/define-slices`
  Append to `.project/flow-log.jsonl`:
  ```bash
  echo '{"ts":"<timestamp>","phase":"define-architecture","scope":"project","status":"complete","summary":"<one-sentence summary>"}' >> .project/flow-log.jsonl
  ```

  **Step 8 — Done summary**
  Present a closing summary listing: files written, CLAUDE.md update confirmation, and recommend `/define-slices` as the next step.

  **Error handling:** If a Write tool call fails, retry once. If it fails again, inform the user of the specific file that couldn't be written and continue with the remaining files.

- [x] Review SKILL.md size — must be under 500 lines (estimated ~220-280 lines)

## Success Criteria
- `~/.claude/skills/define-architecture/SKILL.md` exists with valid YAML frontmatter
- Re-entry correctly detects existing files and offers skip vs. revisit
- Files are written incrementally (each file written before moving to the next area)
- CLAUDE.md is updated with references to all files that now exist
- state.md and flow-log are updated on completion
- SKILL.md is under 500 lines

## Verification
- `wc -l ~/.claude/skills/define-architecture/SKILL.md` — confirm under 500 lines
- `head -6 ~/.claude/skills/define-architecture/SKILL.md` — confirm valid YAML frontmatter
- `ls ~/.claude/skills/define-architecture/references/` — confirm all three reference files exist (architecture-logic.md, guidance.md, formats.md)
- Read SKILL.md top-to-bottom: does each step unambiguously tell Claude what to do?
