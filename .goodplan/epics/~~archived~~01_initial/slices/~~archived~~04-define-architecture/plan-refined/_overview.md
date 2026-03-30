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
2. `.project/explore-complete.md` (or `explore-skipped.md`) — exploration summary (read first, then individual files only if needed)
3. `.project/brainstorm/`, `.project/research/`, `.project/prototypes/` — exploration artifacts (read summary/first 50 lines if more than 5 files)
4. `.project/conventions.md` and `.project/architecture/` — existing files (for re-entry detection)

**File applicability guidance:**
- `conventions.md` and `architecture/_overview.md` and `architecture/conventions.md` — always write
- `architecture/data-model.md` — write if the system has persistent storage or a notable data schema
- `architecture/flows.md` — write if there are multi-step processes, user journeys, or async flows worth documenting
- `architecture/information-architecture.md` — write for IA-heavy apps: content platforms, docs sites, complex dashboards
- `architecture/ui-ux.md` — write if the project has a frontend
- `architecture/<subsystem>-api.md` — write one per named subsystem with non-trivial API contract; ask the user what subsystems exist before deciding

**Re-entrancy:** Detect which files already exist. Offer to skip those areas or revisit them. If only gaps remain, focus there.

**CLAUDE.md update:** On completion, read CLAUDE.md first, then update the `## Project Context` section to reference all newly created files. Only include files that actually exist. The "Also check" block lists exploration directories that exist and contain files. `sequencing.md` and `learnings.md` are written by later skills — only reference them if they already exist.

**Reference artifacts in this repo (implementer context only):**
- `.project/idea.md` — the project being built (goodplan itself)
- `~/.claude/skills/start-project/SKILL.md` — style reference (Step 8 shows CLAUDE.md handling pattern)
- `~/.claude/skills/explore/SKILL.md` — style reference
- `.project/skill-conventions.md` — state.md and flow-log formats
- `.project/vertical-slices/04-define-architecture/goal.md` — full goal for this skill

## Phases

- `01-reference-files.md` — Phase 1: Write Reference Files (architecture-logic.md + architecture-logic-templates.md if needed + guidance.md + formats.md)
- `02-skill-md.md` — Phase 2: Write SKILL.md
- `03-manual-test.md` — Phase 3: Manual End-to-End Test
