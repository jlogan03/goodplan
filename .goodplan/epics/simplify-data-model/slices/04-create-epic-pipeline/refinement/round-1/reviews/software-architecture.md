# Software Architecture Review — Create-Epic Pipeline Plan

## Issues

**[IMPORTANT] Context bundling commands exist but are bypassed — manual file path assembly duplicates CLI responsibility**
The plan has the orchestrator manually assembling file paths (epic goal, research paths, conventions) and passing them to agents in Phase 2 (explore), Phase 4 (architecture draft), and Phase 6 (slices draft). However, the CLI already provides `gp start-explore --epic <name>`, `gp start-architecture --epic <name>`, and `gp start-slices --epic <name>` commands that return structured `ContextBundle` JSON with prioritized inline content and reference paths. The plan-slice orchestrator (slice 02) DOES use `gp start-plan` for context assembly (SKILL.md line 150-165). This plan deviates from that proven pattern without justification, creating a shallow orchestrator that pushes context assembly responsibility onto the skill author. Using `start-*` commands would deepen the CLI's context module (it already knows the priority tables from `transition-tables.md` § "Epic Context Returns") and keep the orchestrator thin.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 4 hardcodes architecture file destination path instead of using CLI response**
The plan says "Copy architecture files from temp dir to `.goodplan/epics/<name>/architecture/`" in Phase 4. The research file (`_codebase-context.md`) explicitly flags this: "the `epic:define-architecture` response includes a `paths.architecture` field that should be used instead." While the current `define-architecture` command doesn't return a paths field (verified in source — it returns `entity`, `previousStatus`, `newStatus`), the `submit-architecture` command likely does, and hardcoding paths violates the principle that the CLI owns filesystem layout. The orchestrator should extract the target path from a CLI response rather than constructing it.
Resolution: CODEBASE_EXPLORATION
Research: Verify what `submit-architecture` returns (check `src/commands/subagent/submit-architecture.ts` and the RPC `begin()` response). If it includes `paths.architecture` or `filesWritten`, use that. If not, add it as a task — the path should come from the CLI.

**[IMPORTANT] Plan references `reviewers-language.md` for TypeScript reviewer source material, but this file does not exist**
Phase 2 Task 1 says: "Source: adapt from existing `reviewers-language.md` § 'TypeScript and JavaScript Reviewer' in the installed refine-plan skill." The research file flags this discrepancy: "Plan Phase 2 references 'existing `reviewers-language.md`' for TypeScript reviewer source material, but this file does not exist in `_shared/references/`." A search confirms no `reviewers-language.md` exists anywhere in the repo. The TypeScript reviewer content may live in the installed plugin at a different path, or it may need to be written from scratch. The plan task is not actionable as written.
Resolution: CODEBASE_EXPLORATION
Research: Search the installed plugin cache at `~/.claude/plugins/cache/goodplan-marketplace/goodplan/1.0.3/skills/` for files containing "TypeScript" reviewer criteria. Check `refine-plan/references/reviewer-registry.md` and any `reviewers-language*` files.

**[IMPORTANT] Phase 6 slice creation uses incorrect stdin format — missing `--epic` flag context**
Phase 6 says: "Create slices via CLI: `gp slice:create --epic <name> --json` for each slice with stdin `{"name":"<name>","goal":"<goal>"}`." Verified against `src/commands/slice/create.ts`: the command requires `--epic` flag AND stdin with `{name, goal}`. The stdin format is correct, but the plan doesn't clarify that `<name>` in stdin is the slice name (not the epic name). More critically, the plan doesn't specify where the slice names and goals come from — the `slices-phase` agent returns `filesWritten` (sequencing.md + goal.md paths), but the orchestrator would need to parse file contents to extract slice names and goals. This violates context discipline (orchestrator shouldn't read artifact content). The plan needs a mechanism for the slices-phase agent to return structured slice metadata (name + goal pairs) in its return JSON, not just file paths.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] PARTIAL status handling is over-specified and inconsistent with plan-slice's proven approach**
The plan specifies elaborate PARTIAL handling for all autonomous phases: "If sub-agent returns PARTIAL with `questions`: present to user... If PARTIAL with `researchTopics`: spawn research agents in parallel... If PARTIAL with both: handle questions and research in parallel, then re-spawn." However, the plan-slice orchestrator (the proven pattern) explicitly defers PARTIAL handling: "For this PoC, log the questions and stop with message to user." The create-epic plan should follow the same incremental approach — implement basic PARTIAL handling (log and stop) first, then enhance. Over-specifying PARTIAL handling in this plan adds complexity without a validated pattern to follow, and the explore-phase's PARTIAL usage (user-controlled exit) is a different mechanism that should be clearly distinguished from error/input-needed PARTIAL.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 architecture Q&A "broad + deep passes" lacks structural specification**
Phase 3 says "Run design tree Q&A: Broad pass (ask about subsystems), Deep pass (for each subsystem, ask about API surfaces, data models)." This is underspecified for an implementation plan — the implementer needs to know: How many questions per pass? What triggers moving from broad to deep? How is the Q&A structured into `architecture-qa.md`? The existing `create-architecture` skill has concrete structure (conventions-first ordering, re-entrant file detection). The plan should reference the existing skill's Q&A structure or specify its own.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `reconsiderWhen`/`validUntil` condition loading uses wrong CLI commands**
The plan says to load conditions via `gp decision:list --json` and `gp learning:list --json`. But these are project-level commands. For epic-scoped work, the conditions should be filtered by entity path (using the `entityPath` field from the data model changes in slice 03). The plan doesn't specify filtering, which means every decision/learning in the project would be passed to agents — potentially noisy. Since slice 03 added `entityPath`, the plan should filter by relevant entity path.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Test harness fixture setup contradicts itself**
Phase 5 says: "Setup: `createMinimalFixture()` with `activateEpic: false` (we're creating a NEW epic)... Actually: create a bare project via `gp init`, no epic yet." The self-correction is good but the original instruction should be removed to avoid confusion during implementation. Additionally, the test creates an epic from scratch but the re-entry test needs an epic at `explored` status — the plan says "fast-track to explored" without specifying how (which CLI commands to run in sequence).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Agent count assertion is fragile**
Phase 4 asserts "Packaged 13 agents" and "ls dist/gp-plugin/agents/*.md | wc -l → 13". This hardcodes the count, which will break if any other slice adds agents before this one is implemented. The verification should check that all expected agents exist by name rather than asserting a total count.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan follows the proven orchestrator pattern from plan-slice and correctly maps to the CLI's transition table. The phase decomposition is sound — separating interactive Q&A from autonomous drafting/refinement is architecturally clean. However, there are several structural issues that would cause implementation friction: bypassing existing context bundling commands (deepening opportunity missed), hardcoded paths instead of CLI-derived paths, a missing source file for the TypeScript reviewer, context discipline violations in Phase 6's slice creation, and over-specified PARTIAL handling that diverges from the incremental approach proven in plan-slice. To reach 9+: (1) use `start-*` context bundling commands consistently, (2) have the slices-phase agent return structured metadata (not just file paths), (3) fix the missing `reviewers-language.md` reference, (4) simplify PARTIAL handling to match plan-slice's approach, and (5) specify the architecture Q&A structure concretely.

## Summary
- Critical: 0
- Important: 5
- Minor: 4
