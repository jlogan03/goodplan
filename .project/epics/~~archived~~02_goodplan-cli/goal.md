# Epic Goal: goodplan-cli

Build a compiled TypeScript CLI (`goodplan`) that becomes the single interface to `.project/` state for both humans and LLMs, and consolidate the current ~12 skills into ~7 with two primary flow skills (`/create-epic`, `/build`) that run multi-phase workflows autonomously.

The CLI owns all deterministic work: state management, transition validation, file I/O, context bundling with progressive disclosure, and learnings rollup. The LLM retains ownership of judgment-driven work: interviewing users, writing content (plans, goals, architecture), reviewing and scoring, and surfacing unexpected issues. This split eliminates dozens of tool calls per skill invocation and dramatically speeds up the workflow.

The data model shifts from markdown-based file-existence state to structured JSON/JSONL for state and metadata, with markdown preserved for content files. The directory structure flattens — slices become top-level (linked to epics via JSON), and status prefixes (`__active__`, `~~archived~~`) are replaced by explicit status fields in JSON. Decisions and learnings use JSONL at all levels for clean git merges across concurrent branches. The CLI enforces deterministic key ordering in JSON files to further reduce merge conflicts.

The consolidated skill surface: `/create-epic` (explore through refine-slices), `/build` (plan through complete, for both slices and quests), `/project-status`, `/audit-architecture`, `/audit-tests`, `/audit-docs`, and `/migrate`. Distribution (`install`/`update`) is deferred to a future epic.

Design spec: `docs/superpowers/specs/2026-03-20-goodplan-cli-and-skill-consolidation-design.md`
