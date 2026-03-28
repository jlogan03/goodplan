# Plan: `/start-project` Skill

## Overview

Build the `/start-project` Claude Code skill and establish the cross-cutting file format conventions that all skills in this suite will follow.

The skill initializes a new project's `.project/` filesystem, captures the idea through an interactive conversation, and writes the initial CLAUDE.md project context section.

This is also the right time to lock down `state.md` and `flow-log.jsonl` formats — every subsequent skill depends on them being consistent.

## Important Context

**Skills are directories, not flat files.** A Claude Code skill lives at `~/.claude/skills/<name>/SKILL.md`. When invoked with `/<name>`, Claude Code loads `SKILL.md` and Claude follows its instructions in the current session. The directory can also contain `references/`, `scripts/`, and `assets/` subdirectories for supporting material.

`SKILL.md` must have YAML frontmatter with `name` and `description` fields — the description is the primary triggering mechanism and must explain both what the skill does and when to use it.

Skills must be:
- Written as imperative instructions Claude follows step by step
- Self-contained — Claude has only the skill file and CLAUDE.md as guaranteed context
- Conversational — skills guide a dialogue with the user, not a mechanical form-filling exercise
- Under ~500 lines for the SKILL.md body to avoid instruction-following degradation

**The skill runs in target project repos, not in the goodplan repo.** Anything the skill needs at runtime (file formats, templates) must be embedded in the skill's own `references/` directory — it cannot reference files in `.project/` at runtime since those only exist here.

**Reference artifacts in this repo (for implementer context only, not for the skill at runtime):**
- `workflow.md` — the full workflow this skill suite implements; canonical reference for file structure
- `.project/idea.md` — real example of a well-structured idea.md
- `.project/flow-log.jsonl` — real example of flow-log entries
- `.project/state.md` — real example of state format
- `.project/vertical-slices/01-start-project/goal.md` — the full goal for this skill

---

## Phase 1: Document Cross-Cutting Conventions

Before writing any skill that produces `state.md` or `flow-log.jsonl` entries, lock down their exact formats. Write a compact reference document at `.project/skill-conventions.md` — this serves as the authoritative reference when building subsequent skills in this repo.

### Tasks
- [x] Review the existing `.project/state.md` and `.project/flow-log.jsonl` in this repo — these are the working examples to formalize
- [x] Define the canonical `state.md` format: required fields, optional fields, how to represent active scope (project-level vs. slice vs. side quest), how to represent the work stack, how to write resumption hints
- [x] Define the canonical `flow-log.jsonl` entry format: required fields (`ts`, `phase`, `scope`, `status`, `summary`), optional fields (`detail` for path to a detail file), when to create detail files vs. inline summary only
- [x] Define how skills determine the active scope (read `state.md` → check work stack → check for active slice/quest marker)
- [x] Write `.project/skill-conventions.md` capturing all of the above — keep it under 1.5KB. **Note: this is an intermediate artifact consumed only by Phase 2 when writing `references/formats.md`. The authoritative runtime format lives in the skill's `references/formats.md` — not here.** Specify the timestamp format as `YYYY-MM-DDTHH:mm:ssZ` (UTC, seconds precision, Z suffix, e.g., `2026-03-15T14:19:12Z`).

### Success Criteria
- `skill-conventions.md` exists with unambiguous, copy-paste-ready formats for `state.md` and `flow-log.jsonl`
- Any implementation sub-agent reading it would produce files compatible with any other
- The documented formats are consistent with the existing `state.md` and `flow-log.jsonl` in this repo (the convention formalizes what already exists; if the examples reveal a better format, update `skill-conventions.md` to match — not the other way around)

### Verification
- `cat .project/skill-conventions.md` — read and confirm formats are unambiguous
- `cat .project/state.md` — confirm it is consistent with the documented state.md format
- `cat .project/flow-log.jsonl` — confirm each line is valid JSONL consistent with the documented entry format

---

## Phase 2: Write the `/start-project` Skill

Write the skill at `~/.claude/skills/start-project/SKILL.md`. The skill guides Claude through an interactive session that sets up a new project's `.project/` filesystem and captures the project idea.

### Tasks

#### Create references file

- [x] Create `~/.claude/skills/start-project/references/formats.md` with all formats the skill needs at runtime. Derive from Phase 1's `skill-conventions.md`. Include:
  - **state.md format** — exact template with field names and descriptions
  - **flow-log.jsonl entry format** — example line with all fields
  - **idea.md template** — sections: `# Project Idea`, `## Problem`, `## Desired Outcome`, `## Scope`, `## Constraints`, `## Open Questions`; one-sentence guidance on what belongs in each section
  - **CLAUDE.md Project Context section format** — exact markdown to write:
    ```markdown
    ## Project Context

    Read these before doing any significant work in this repo:

    - `.project/idea.md` — project goal, scope, constraints
    ```
    Note: Additional file references are appended by later skills as those files are created.

#### Write SKILL.md

- [x] Create `~/.claude/skills/start-project/SKILL.md` with YAML frontmatter:
  - `name: start-project`
  - `description:` covering what the skill does AND when to invoke it. Avoid internal terminology like "goodplan workflow" — a user in a fresh project won't know what that means. E.g., "Set up structured project planning for a new development project. Creates the .project/ directory structure and captures the project idea through conversation. Use at the very start of a new project, before any exploration or architecture work."
- [x] Write Step 1 — pre-flight check: if `.project/` already exists, list its contents and ask the user to confirm before proceeding (never silently overwrite)
- [x] Write Step 2 — create directory structure. Use this exact command:
  ```bash
  mkdir -p .project/{research,brainstorm,prototypes,architecture,side-quests,retrospectives,flow-log,vertical-slices}
  ```
  All directories are under `.project/`. Nested subdirectories (e.g., `architecture/ui-mock/`) are created by later skills — do not create them here.
- [x] Write Step 3 — gitignore: check if `.project/state.md` already appears in `.gitignore`; if not, append it on its own line (ensure a trailing newline before appending if the file already exists); create `.gitignore` if it doesn't exist
- [x] Write Step 4 — idea capture: instruct Claude to start with an open question like "What are you trying to build?" or "What problem are you solving?", then follow threads and ask one or two follow-up questions at a time rather than running through a list. Include a **mental coverage checklist** Claude tracks internally (not shown to the user) — the five areas to cover before wrapping up: problem, desired outcome, scope (including what's out of scope), constraints, and open questions. Include a **wrap-up heuristic**: if 3+ exchanges have passed without substantive new information, and all five areas have been touched, offer to summarize and move on. If the user wants to wrap up early ("that's enough" / "just write what you have"), proceed immediately — all five areas need not be covered. Continue until the user confirms the idea feels well-captured.
- [x] Write a transition before Step 5: read `references/formats.md` once here using the Read tool. Reference "the formats loaded here" in Steps 5–8 rather than re-reading the file each time.
- [x] Write Step 5 — write `idea.md` using the idea.md template from `references/formats.md`. Write substantive content synthesized from the conversation — not placeholder text.
- [x] Write Step 6 — initialize `flow-log.jsonl` using the entry format from `references/formats.md`. Generate the current UTC timestamp by running `date -u +%Y-%m-%dT%H:%M:%SZ`. Write one line: `{"ts":"<timestamp>","phase":"capture-idea","scope":"project","status":"complete","summary":"<one-sentence summary of the idea>"}`. This is a routine completion — do not create a detail file in `flow-log/`.
- [x] Write Step 7 — write `state.md` using the format from `references/formats.md`. Set: phase = `capture-idea complete`, active scope = none, work stack = empty, next step = `/explore` (skippable if sufficient context already exists).
- [x] Write Step 8 — update CLAUDE.md using the Project Context format from `references/formats.md`:
  - If no CLAUDE.md: create it with the Project Context section
  - If CLAUDE.md exists but no `## Project Context` section: append the section at the end
  - If `## Project Context` section exists: check if `.project/idea.md` is already listed; if so, skip; if not, add it under the section header (idempotent)
- [x] Review SKILL.md size: must be under 500 lines. Move any verbose content to `references/formats.md`.

### Success Criteria
- `~/.claude/skills/start-project/SKILL.md` exists with valid YAML frontmatter (name + description)
- `~/.claude/skills/start-project/references/formats.md` exists with all four format definitions
- Reading SKILL.md linearly, each step is unambiguous — a different Claude session following it produces the same file outputs
- Step 8 (CLAUDE.md update) handles all three cases: missing file, existing file without section, existing file with section
- SKILL.md is under 500 lines

### Verification
- `wc -l ~/.claude/skills/start-project/SKILL.md` — confirm under 500 lines
- `head -6 ~/.claude/skills/start-project/SKILL.md` — confirm valid YAML frontmatter with name and description
- `ls ~/.claude/skills/start-project/references/` — confirm formats.md exists
- Read SKILL.md top-to-bottom and trace through it mentally — would following it produce correct, consistent output files in a fresh project?

---

## Phase 3: Manual End-to-End Test

<!-- Implementation paused at Phase 3 — manual test required. Resume by running the skill in a fresh directory as described below. -->

**This phase is a manual test run by the developer, not an autonomous implementation task.** The implementer delivers the skill files in Phase 2; this phase verifies they work correctly by running the skill interactively.

### How to run

1. `mkdir /tmp/test-goodplan-skill && cd /tmp/test-goodplan-skill && git init`
2. Open a new Claude Code session in that directory
3. Invoke `/start-project` and have a real conversation — answer questions about a simple but concrete project idea
4. Verify every output file
5. `rm -rf /tmp/test-goodplan-skill`

### What to verify
- [ ] `.project/` directory structure matches `workflow.md` specification (all top-level dirs present, no premature nested dirs)
- [ ] `idea.md` reflects the conversation content — not generic filler
- [ ] `flow-log.jsonl` has exactly one entry, valid JSONL, matching `skill-conventions.md` format
- [ ] `state.md` matches `skill-conventions.md` format and correctly describes phase as `capture-idea complete`
- [ ] `CLAUDE.md` has a `## Project Context` section containing only the `.project/idea.md` reference
- [ ] `.gitignore` includes `.project/state.md`
- [ ] The conversation felt natural — not like filling out a form

### Verification commands
- `ls -la /tmp/test-goodplan-skill/.project/` — confirm directory structure
- `python3 -c "import json; [json.loads(l) for l in open('/tmp/test-goodplan-skill/.project/flow-log.jsonl')]" && echo "VALID"` — confirm valid JSONL (prints VALID if all lines parse; prints traceback if any line is malformed)
- `grep "Project Context" /tmp/test-goodplan-skill/CLAUDE.md` — confirm section present
- `grep "\.project/state\.md" /tmp/test-goodplan-skill/.gitignore` — confirm gitignore entry

### Success Criteria
- All output files exist with correct, non-placeholder content
- `flow-log.jsonl` and `state.md` match `skill-conventions.md` exactly
- No step in the skill needed manual correction mid-run
