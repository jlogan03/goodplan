# Exploration Summary: Workflow Bug Fixes Epic

## What Was Explored

Starting from dogfooding pain points, we designed the ideal goodplan workflow from first principles -- phases, mechanisms, events, invariants, CLI commands, reviewers, skills, and agents. The design went through seven iterations (01 through 07, with 02-07 superseded) before converging on a full implementation spec (08), validated through user journey walkthroughs (09), a north star overview (10), and a domain-by-domain delta analysis against the current codebase (11).

## Key Decisions

- **Event-driven architecture**: Skills emit structured events; CLI and hooks react to them rather than relying on imperative skill-to-skill handoffs
- **Enriched slice-land**: Slices carry enough context (acceptance criteria, constraints, phase objectives) that implement can run autonomously without re-reading the epic
- **One person per epic**: Simplifies state management and concurrency; no multi-user locking needed
- **Embedded structured extraction (Option B)**: Artifacts use YAML frontmatter + fenced `yaml extract` blocks, parsed deterministically by CLI using gray-matter + remark -- no separate extractor LLM pass
- **Permissive agents with review gates**: Agents have broad tool access but quality is enforced through automated reviewer passes at phase boundaries
- **CLI as state authority**: All `.goodplan/` mutations go through the CLI with HMAC integrity; skills never write state directly
- **ID model**: Short human-readable IDs (epic slugs, slice numbers) rather than UUIDs

## Ready for Architecture

The exploration is complete. The delta document (11-delta.md) maps every change needed from the current codebase to the v2 spec across all seven domains (CLI, state model, skills, agents, reviewers, hooks, extractors), with all domain scores at 9+. This is ready to be translated into architecture and sliced for implementation.
