# Epic Goal: simplify-data-model

## What We're Doing

Simplify the goodplan data model and reduce workflow ceremony. The current system has 18 skills, separate markdown files for goals that are effectively set-once structured data, multiple overview JSON files, and globally-scoped decisions. This epic consolidates, merges, and streamlines.

## Key Changes

### 1. Goals Into JSON Entities
Move project idea, epic goal, and quest goal from standalone markdown files (`idea.md`, `goal.md`) into fields on their JSON entities (`project.json`, `epic.json`, `quest.json`). These are set once at creation time and rarely updated — they're structured data, not free-form LLM content. This eliminates separate file reads and makes goals queryable via `--json` output.

### 2. Consolidated Overview Files
Merge `epics/overview.json` and the per-epic `slices/overview.json` into a single overview structure. Reduces the number of files the CLI reads/writes and simplifies state assembly.

### 3. Scoped Decision Rollup
Scope decisions to the entity where they were made (epic, slice, quest) instead of the global `.goodplan/decisions/` directory. Roll up on completion — slice → epic → project — matching the existing learnings rollup pattern. Downstream work sees decisions from earlier slices without global clutter.

### 4. Reduce Skill Count
Merge related skills to reduce the current 18 down to fewer, more capable skills. Candidates for merging: audit-* skills into one, create-architecture + refine-architecture, create-plan + refine-plan. The goal is less cognitive load for users discovering the workflow — fewer skills to learn, each doing more.

## Scope Boundaries

**In scope:** Data model changes, CLI command surface changes, skill merging, migration for existing `.goodplan/` state
**Out of scope:** Feedback from coworker rollout (separate epic/quest), new features, UI changes
