# Phase 1: Write Reference Files

Create `~/.claude/skills/define-architecture/references/` and write:
- `architecture-logic.md` — templates for every output file + applicability table
- `guidance.md` — CLAUDE.md format, conversation guidance, and UX notes
- `formats.md` — state.md and flow-log formats (self-contained copy from explore skill; keep in sync if that skill's formats change)

## Tasks

- [x] Create directory: `mkdir -p ~/.claude/skills/define-architecture/references/`

- [x] Create `~/.claude/skills/define-architecture/references/architecture-logic.md` containing:

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
  <!-- This file references and builds on decisions from .project/conventions.md. Synthesize project-level conventions into architectural patterns. -->

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

- [x] After writing `architecture-logic.md`, check its size with `wc -c`. If over 4KB, move template content to a second file (`architecture-logic-templates.md`) and add a cross-reference from the main file: `<!-- See architecture-logic-templates.md for file templates. -->` Keep the applicability table in the main file.

- [x] Create `~/.claude/skills/define-architecture/references/guidance.md` containing:

  **CLAUDE.md Project Context section format:**
  ```markdown
  ## Project Context

  Read these before doing any significant work in this repo:

  - `.project/idea.md` — project goal, scope, constraints
  - `.project/conventions.md` — tech stack, repo structure, coding style
  - `.project/architecture/_overview.md` — system architecture
  - `.project/architecture/conventions.md` — architectural patterns
  <!-- Add learnings.md line if that file exists -->
  <!-- Add sequencing.md line if that file exists — this file is written by /define-slices, not this skill -->

  Also check if relevant to your task:
  <!-- Add lines below only for directories that exist AND contain files -->
  - `.project/brainstorm/` — project-level brainstorming output
  - `.project/research/` — project-level research findings
  - `.project/prototypes/` — exploratory prototypes
  - `.project/side-quests/` — deferred and in-progress side quests
  ```

  Note: The CLAUDE.md format embeds HTML comments as instructions to you — do not include them in the actual CLAUDE.md output. `sequencing.md` and `learnings.md` are written by later skills — only reference them if they already exist (e.g., re-entry after slices are defined). For each architecture file written in Step 5, add a reference line under the "Read these before doing any significant work" block (e.g., `- .project/architecture/data-model.md — entities, relationships, storage`). Only include files that actually exist.

  **Conversation guidance:**
  - For the conventions phase, present a full draft based on idea.md and exploration output first. Then ask targeted questions inline (open-ended, not AskUserQuestion) only for gaps the draft couldn't infer. Iterate until user approves. (Reserve AskUserQuestion for structured choices in the architecture phase.)
  - For the conventions phase stopping signal: after iterating on the draft, present it for final approval using AskUserQuestion with options "Looks good — write it" and "I have more corrections". If user gives corrections, apply and re-present only the changed sections. If user gives corrections AND approval in the same message, apply corrections, re-present changed sections, then write — no additional confirmation needed.
  - For each architecture file, present a draft first. Ask "What needs correcting or adding?" Iterate until user says it's good.
  - If the user is unsure about file applicability (e.g., does the system have a frontend?), ask directly before committing to the file list.
  - Write each file with the Write tool before moving to the next area — do not batch writes.
  - After writing each file, show progress: "Written 3 architecture files so far: _overview.md, conventions.md, data-model.md. Next: flows.md."
  - Distinguish the two conventions files when presenting drafts: `.project/conventions.md` is project-level (tech stack, style); `.project/architecture/conventions.md` is architectural (patterns, boundaries).
  - If the user says "that's enough" or "stop here" at any point, write whatever has been completed so far, update CLAUDE.md Project Context to reference only the files actually written, update state.md to in-progress status, and stop cleanly.
  - When presenting the file list in the architecture phase, include a one-line description of each file's purpose and relevance to this project.
  - At the start of the architecture phase, briefly explain the "broad to specific" ordering: overview first, then conventions, then domain-specific files, then subsystem APIs.

- [x] Create `~/.claude/skills/define-architecture/references/formats.md` — copy only the state.md and flow-log.jsonl sections from `~/.claude/skills/explore/references/formats.md` (not the entire file). Add a sync comment at the top: `<!-- Copied from ~/.claude/skills/explore/references/formats.md. Canonical source for these formats is .project/skill-conventions.md — update if either changes. -->`

## Success Criteria
- `references/architecture-logic.md` exists with all templates and applicability table
- `references/guidance.md` exists with CLAUDE.md format and conversation guidance
- `references/formats.md` exists with state.md and flow-log formats (with sync comment)
- All templates are complete and usable
- Each file is under 5KB
- The CLAUDE.md format in guidance.md matches the format described in idea.md (verify the section heading, file entries, and conditional logic are consistent)

## Verification
- `wc -c ~/.claude/skills/define-architecture/references/architecture-logic.md` — under 5120 bytes
- `wc -c ~/.claude/skills/define-architecture/references/guidance.md` — under 5120 bytes (verify content is substantive, not just a stub)
- Read architecture-logic.md: could an implementer follow it to write every output file correctly?
- Read guidance.md: is the CLAUDE.md format consistent with idea.md? Does conversation guidance cover draft-first flow, stopping signals, and progress indication?
