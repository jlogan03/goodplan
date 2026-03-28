# Plan: `/define-architecture` Skill

## Overview

Build the `/define-architecture` Claude Code skill — an interactive dialogue that drives architecture decisions from project idea to a fully populated `architecture/` directory. The skill reads `idea.md` and any exploration output, then walks through two phases (conventions, then architecture) via structured Q&A, writing files incrementally as each area is settled.

This skill is re-entrant: it detects what's already been written and focuses on gaps.

## Important Context

**Skills are self-contained.** All logic the skill needs at runtime must be embedded in its own `references/` directory.

**Two phases:**
1. **Project Conventions** — tech stack, language/framework choices, repo structure, dependency management, file naming, code style, testing approach → writes `.project/conventions.md`
2. **Architecture** — system overview, subsystems and their boundaries, data model, key flows, information architecture, UI/UX direction (if applicable), subsystem API contracts → writes `architecture/` files

**Context loading order:**
1. `.project/idea.md` — primary source of truth (required)
2. `.project/brainstorm/`, `.project/research/`, `.project/prototypes/` — exploration artifacts (read files if present)
3. `.project/conventions.md` and `.project/architecture/` — existing files (for re-entry detection)

**File applicability guidance:**
- `conventions.md` and `architecture/_overview.md` and `architecture/conventions.md` — always write
- `architecture/data-model.md` — write if the system has persistent storage or a notable data schema
- `architecture/flows.md` — write if there are multi-step processes, user journeys, or async flows worth documenting
- `architecture/information-architecture.md` — write for IA-heavy apps: content platforms, docs sites, complex dashboards
- `architecture/ui-ux.md` — write if the project has a frontend
- `architecture/<subsystem>-api.md` — write one per named subsystem with non-trivial API contract; ask the user what subsystems exist before deciding

**Re-entrancy:** Detect which files already exist. Offer to skip those areas or revisit them. If only gaps remain, focus there.

**CLAUDE.md update:** On completion, update the `## Project Context` section in CLAUDE.md to reference all newly created files. Only include files that actually exist. The "Also check" block lists exploration directories that exist.

**Reference artifacts in this repo (implementer context only):**
- `.project/idea.md` — the project being built (goodplan itself)
- `~/.claude/skills/start-project/SKILL.md` — style reference (Step 8 shows CLAUDE.md handling pattern)
- `~/.claude/skills/explore/SKILL.md` — style reference
- `.project/skill-conventions.md` — state.md and flow-log formats
- `.project/vertical-slices/04-define-architecture/goal.md` — full goal for this skill

---

## Phase 1: Write Reference Files

Create `~/.claude/skills/define-architecture/references/` and write:
- `architecture-logic.md` — templates for every output file, applicability table, CLAUDE.md format, and conversation guidance
- `formats.md` — state.md and flow-log formats (self-contained copy, same as explore skill)

### Tasks

- [ ] Create directory: `mkdir -p ~/.claude/skills/define-architecture/references/`

- [ ] Create `~/.claude/skills/define-architecture/references/architecture-logic.md` containing:

  **File applicability table:**
  | File | Write when |
  |---|---|
  | `.project/conventions.md` | Always |
  | `.project/architecture/_overview.md` | Always |
  | `.project/architecture/conventions.md` | Always |
  | `.project/architecture/data-model.md` | System has persistent storage or notable data schema |
  | `.project/architecture/flows.md` | Multi-step processes, user journeys, or notable async flows |
  | `.project/architecture/information-architecture.md` | Content platform, docs site, complex dashboard (heavy IA) |
  | `.project/architecture/ui-ux.md` | Project has a frontend |
  | `.project/architecture/<subsystem>-api.md` | Named subsystem with non-trivial API contract (ask user) |

  **conventions.md template:**
  ```markdown
  # Project Conventions

  ## Tech Stack
  <Language, frameworks, runtimes — specific versions if known>

  ## Repo Structure
  <Directory layout and what goes where>

  ## Dependency Management
  <Package manager, lockfile policy, monorepo tooling if any>

  ## Code Style
  <Linter, formatter, naming conventions, file naming>

  ## Testing
  <Test framework, test types (unit/integration/e2e), coverage expectations>

  ## Other Conventions
  <Logging, error handling, environment variables, other cross-cutting conventions>
  ```

  **architecture/_overview.md template:**
  ```markdown
  # Architecture Overview

  ## System Summary
  <One paragraph: what the system does, main subsystems, and how they relate>

  ## Subsystems
  <Named subsystems and their responsibilities>

  ## Key Dependencies
  <External services, libraries, or systems the product depends on>

  ## Deployment Model
  <How the system is deployed and run>
  ```

  **architecture/conventions.md template:**
  ```markdown
  # Architectural Conventions

  ## Patterns and Abstractions
  <Key patterns: layered architecture, event-driven, CQRS, etc.>

  ## Module and Boundary Rules
  <How subsystems are separated; what can depend on what>

  ## Cross-Cutting Concerns
  <Error handling strategy, logging, observability, auth, config injection>
  ```

  **architecture/data-model.md template:**
  ```markdown
  # Data Model

  ## Entities
  <Core entities and key fields>

  ## Relationships
  <How entities relate>

  ## Storage
  <Database(s), schema migration approach, caching layer if any>
  ```

  **architecture/flows.md template:**
  ```markdown
  # Key Flows

  ## <Flow Name>
  <Step-by-step description: actors, systems, data>

  ## <Flow Name>
  ...
  ```

  **architecture/information-architecture.md template:**
  ```markdown
  # Information Architecture

  ## Content Model
  <Types of content and how they are structured>

  ## Navigation Structure
  <Primary and secondary navigation patterns>

  ## Route Structure
  <How routes are organized>
  ```

  **architecture/ui-ux.md template:**
  ```markdown
  # UI/UX Direction

  ## Design Philosophy
  <Guiding principles: minimal, data-dense, opinionated, etc.>

  ## Layout Patterns
  <Key layout choices and recurring UI patterns>

  ## Component Model
  <How UI is decomposed; shared component library if any>

  ## Interaction Patterns
  <Navigation, forms, feedback patterns>
  ```

  **architecture/<subsystem>-api.md template:**
  ```markdown
  # <Subsystem> API

  ## Purpose
  <What this subsystem does and who consumes it>

  ## Interface
  <Key types, functions, or endpoints exposed>

  ## Contracts
  <Invariants, preconditions, error conditions>

  ## Dependencies
  <What this subsystem depends on>
  ```

  **CLAUDE.md Project Context section format:**
  ```markdown
  ## Project Context

  Read these before doing any significant work in this repo:

  - `.project/idea.md` — project goal, scope, constraints
  - `.project/conventions.md` — tech stack, repo structure, coding style
  - `.project/architecture/_overview.md` — system architecture
  - `.project/architecture/conventions.md` — architectural patterns
  <!-- Add learnings.md line if that file exists -->
  <!-- Add sequencing.md line if that file exists -->

  Also check if relevant to your task:
  <!-- Add lines below only for directories that exist -->
  - `.project/brainstorm/` — project-level brainstorming output
  - `.project/research/` — project-level research findings
  - `.project/prototypes/` — exploratory prototypes
  - `.project/side-quests/` — deferred and in-progress side quests
  ```

  Note: The CLAUDE.md format embeds all comments as instructions to the skill — the actual output should not include comment lines.

  **Conversation guidance:**
  - For the conventions phase, ask one or two questions at a time — not a list. Start by presenting a full draft based on idea.md and exploration output, then iterate.
  - For each architecture file, present a draft first. Ask "What needs correcting or adding?" Iterate until user says it's good.
  - If the user is unsure about file applicability (e.g., does the system have a frontend?), ask directly before committing to the file list.
  - Write each file with the Write tool before moving to the next area — do not batch writes.

- [ ] Check if `architecture-logic.md` fits under 4KB. If not, move the CLAUDE.md format and conversation guidance to a separate `guidance.md`.

- [ ] Create `~/.claude/skills/define-architecture/references/formats.md` — copy the same content as `~/.claude/skills/explore/references/formats.md` (state.md 4-section format + flow-log entry format + sync comment)

### Success Criteria
- `references/architecture-logic.md` exists with all templates, applicability table, CLAUDE.md format, and conversation guidance
- `references/formats.md` exists with state.md and flow-log formats
- All templates are complete and usable
- Each file is under 4KB

### Verification
- `wc -c ~/.claude/skills/define-architecture/references/architecture-logic.md` — under 4096 bytes
- Read the file: could an implementer follow it to write every output file correctly?

---

## Phase 2: Write SKILL.md

Write the skill at `~/.claude/skills/define-architecture/SKILL.md`.

### Tasks

- [ ] Create `~/.claude/skills/define-architecture/SKILL.md` with YAML frontmatter:
  - `name: define-architecture`
  - `description:` — third person, covers what it does AND when to invoke it, with trigger phrases. E.g., "Drives architecture decisions through structured Q&A until `architecture/` is fully populated and conventions are captured. Run after `/explore` (or directly if you already know your approach). Common triggers: 'let's define the architecture', 'what's our tech stack', 'I want to start on architecture', 'define architecture', 'set up conventions'."

- [ ] Write the skill body with these steps:

  **Step 1 — Load references**
  Use the Read tool to load `references/architecture-logic.md`. Use the templates, applicability table, and CLAUDE.md format from this file throughout.

  **Step 2 — Load context**
  Read the following:
  1. `.project/idea.md` — if absent, tell the user to run `/start-project` first and stop
  2. Check for exploration output: `ls .project/brainstorm/ .project/research/ .project/prototypes/ 2>/dev/null` — read any files found
  3. Check for existing architecture: `ls .project/conventions.md .project/architecture/ 2>/dev/null`

  Present a one-line summary: "Found: idea.md [+ N brainstorm files, M research files]. Existing architecture files: [list or 'none']."

  **Step 3 — Re-entry check**
  If any architecture files exist (`.project/conventions.md` or files in `.project/architecture/`):
  - List what was found
  - Use AskUserQuestion to ask: "Want to continue where we left off, or revisit all areas? (Existing files won't be deleted either way.)"
  - "Continue" → skip areas where files already exist; offer "Want to revisit <file>?" for each existing file before skipping
  - "Start fresh" → treat all areas as incomplete

  If no existing files, proceed directly to Step 4.

  **Step 4 — Conventions phase**
  Goal: produce `.project/conventions.md`. Skip if this file already exists and user chose "Continue".

  1. Create directory: `mkdir -p .project/` (already exists, no-op)
  2. Using the `conventions.md` template, draft content from idea.md and exploration output
  3. Present the draft and ask: "What needs correcting or adding?"
  4. Iterate — apply corrections, re-present relevant sections — until user says it's good
  5. Write `.project/conventions.md` with the Write tool

  **Step 5 — Architecture phase**
  At the start of this phase:
  1. Based on idea.md and the applicability table, propose which architecture files to write. For uncertain cases (e.g., is there a frontend?), ask the user directly with AskUserQuestion before finalizing the list.
  2. Present the file list: "I'll write these files: [list]. Anything missing?"

  Then, for each file in order (`_overview.md`, `architecture/conventions.md`, then optional files, then subsystem APIs):
  - Skip if the file already exists and user chose "Continue" (offer to revisit)
  - Draft content based on idea.md, exploration output, and conventions decisions made in Step 4
  - Present the draft and ask: "What needs correcting or adding?"
  - Iterate until satisfied
  - `mkdir -p .project/architecture/` before the first file write
  - Write the file with the Write tool before moving on

  For subsystem API files: first ask "What are your main subsystems?" then write one `<subsystem>-api.md` per subsystem the user confirms has a non-trivial contract.

  **Step 6 — CLAUDE.md update**
  Using the Project Context section format from `references/architecture-logic.md`:
  1. Check which optional files actually exist (brainstorm/, research/, prototypes/, learnings.md, sequencing.md)
  2. Build the Project Context section content, including only entries for files that exist
  3. Read CLAUDE.md (or note it doesn't exist)
  4. Update:
     - No CLAUDE.md: create it with Project Context as the only content
     - CLAUDE.md with no `## Project Context` section: append the section
     - CLAUDE.md with existing `## Project Context` section: replace that section (from the `## Project Context` line through the end of the section) using the Edit tool

  **Step 7 — Write back state**
  Use the Read tool to load `references/formats.md` for state.md and flow-log formats.
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

- [ ] Review SKILL.md size — must be under 500 lines

### Success Criteria
- `~/.claude/skills/define-architecture/SKILL.md` exists with valid YAML frontmatter
- Re-entry correctly detects existing files and offers skip vs. revisit
- Files are written incrementally (each file written before moving to the next area)
- CLAUDE.md is updated with references to all files that now exist
- state.md and flow-log are updated on completion
- SKILL.md is under 500 lines

### Verification
- `wc -l ~/.claude/skills/define-architecture/SKILL.md` — confirm under 500 lines
- `head -6 ~/.claude/skills/define-architecture/SKILL.md` — confirm valid YAML frontmatter
- `ls ~/.claude/skills/define-architecture/references/` — confirm both reference files exist
- Read SKILL.md top-to-bottom: does each step unambiguously tell Claude what to do?

---

## Phase 3: Manual End-to-End Test

**This phase is a manual test run by the developer — not an autonomous task.**

### How to run

Test in `goodplan-2/` (or a fresh test project with `idea.md` and exploration output).

**Test 1 — Full run with exploration output:**
- Ensure `idea.md` exists and at least one brainstorm or research file is present
- Run `/define-architecture` with no args
- Verify context summary is presented before proceeding
- Go through conventions phase: verify it drafts from context, takes feedback, writes `conventions.md`
- Go through architecture phase: verify it proposes relevant files, writes each before moving on
- Verify CLAUDE.md is updated with correct Project Context section
- Verify state.md and flow-log updated correctly

**Test 2 — Re-entry on partial architecture:**
- Delete `architecture/data-model.md` and `architecture/flows.md` (if they were written)
- Run `/define-architecture` again
- Verify it lists existing files and asks continue vs. start fresh
- Choose "Continue" — verify it offers to revisit existing files and focuses on missing ones

**Test 3 — No exploration output:**
- Run on a project with only `idea.md` (no brainstorm/research files)
- Verify it proceeds gracefully with just idea.md as context
- Verify the "Also check" entries for brainstorm/research are omitted from CLAUDE.md if those directories are empty

### What to verify
- [ ] Context summary is shown before any Q&A begins
- [ ] Conventions phase produces specific, actionable `conventions.md` (not vague placeholders)
- [ ] Architecture files are written incrementally (each file written before the next begins)
- [ ] File applicability is inferred from idea.md and confirmed with user for ambiguous cases
- [ ] CLAUDE.md Project Context section is correct — no phantom entries for nonexistent files
- [ ] Re-entry detects existing files and focuses on gaps
- [ ] state.md and flow-log updated on completion
- [ ] `/project-status` after completion recommends `/define-slices`

### Verification commands
- `cat .project/conventions.md` — specific content, not placeholders
- `ls .project/architecture/` — correct files for this project type
- `cat CLAUDE.md` — Project Context section lists existing files only
- `tail -3 .project/flow-log.jsonl` — define-architecture entry present
