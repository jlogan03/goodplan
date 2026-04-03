# TUI & CLI Review — Remaining Skills + Cleanup (Round 2)

## Issues

**[IMPORTANT]** Phase 1 quest exploration transitions not in transition-tables.md
Phase 1 correctly identifies the need to add `exploring`/`explored` to the quest status enum and to extend `start-explore` with `--quest` support. However, the plan's sub-phase A does not mention updating `.goodplan/architecture/transition-tables.md` — the source of truth for all state transitions. The quest lifecycle section (lines 97-116) currently has no `exploring`/`explored` rows. The plan says "Add quest transitions for exploring/explored in the state machine (transition tables)" but this could be interpreted as just the code implementation. The task should explicitly include: (1) add `BEGIN_QUEST_EXPLORE` and `COMPLETE_QUEST_EXPLORE` events to `src/schemas/state-events.ts`, (2) add transition handlers in `src/core/state/transitions/quest-phase.ts` (mirroring `epic-phase.ts` lines 19-48), (3) update `src/core/rpc/begin.ts` and `src/core/rpc/submit.ts` to handle quest-scoped explore, (4) update the transition-tables.md architecture doc. The plan currently groups these under "Add quest transitions" which is too vague for implementation — an implementer might miss the event schema, RPC layer, or architecture doc updates.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 `startContext()` does not support quest-scoped explore
The `startContext()` function in `src/core/context/index.ts` is called by `start-explore` with target `{ type: "epic", name: args.epic }`. The priority table in `src/core/context/priorities.ts` (line 71) only defines explore priorities for epic scope. Phase 1 adds `--quest` to `start-explore` but does not mention updating the context module to support `{ type: "quest", name: ... }` for the explore phase. Without this, `gp start-explore --quest <name> --inline --json` would fail at the context assembly layer, not just at the CLI argument level. The plan should add a task to extend the explore priority table for quest scope and update `startContext()` target resolution.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 missing `submit-explore` quest support
The plan says "Extend `submit-explore` CLI command to support quest exploration submission" but `src/commands/subagent/submit-explore.ts` currently only accepts `--epic`. The plan needs to specify: add `--quest` flag (mutually exclusive with `--epic`), route to a new `COMPLETE_QUEST_EXPLORE` event in the RPC submit layer, and verify the transition. This parallels how `submit-plan`, `submit-refinement`, and `submit-implementation` already handle `--slice|--quest` mutual exclusivity. The current plan task is too terse — without the RPC routing detail, an implementer would write the flag but miss the event dispatch.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 reviewer count still needs reconciliation with architecture spec
Round 1 flagged that the plan enumerates 14 new reviewer agents but claims 12 new (18 total). The plan now lists 14 agents explicitly under the task list (python, rust, backend, frontend, data-layer, devops, ci-github-workflows, ux-ia, api-contract, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io). With 6 existing reviewers (holistic, software-architecture, typescript, tui-cli, repo-tooling, agent-skill), that gives 20 total — not 18. The expected behavior line `ls agents/reviewer-*.md | wc -l — returns 18` is wrong; it should be 20. Similarly, the overview says "12 remaining reviewer agent definitions" but the task list has 14. Either 2 agents should be removed from the task list, or the expected count should be updated to 20. This will cascade to the Phase 6 agent count assertion in `build-plugin.sh`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 audit skill error handling for CLI unavailability is too vague
The plan says "If CLI unavailable or fails, report the error with a helpful message and stop gracefully." For CLI tools, error UX matters significantly. The plan should specify: (1) distinguish between "CLI binary not found" (plugin not installed) vs "CLI returned exit code 1" (state error) vs "CLI returned exit code 2" (usage error — see INV-007 exit code conventions), (2) provide specific error message templates for each case, (3) clarify whether to use `process.exit()` or return a structured error to the caller. The existing pattern from `create-epic/SKILL.md` Step 0 provides a good template ("The gp CLI is required but not found" for binary missing, version mismatch for wrong version), but Phase 2 doesn't reference this pattern.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 init skill missing `--mode` flag in CLI interaction
Phase 3 says the init skill supports `--mode new` or `--mode onboard` as an override argument. But skill SKILL.md files don't have formal CLI flags — they receive their context from the user's natural language prompt or from the orchestrator's task prompt parsing. The plan should clarify how `--mode` is communicated: is it parsed from the user's invocation text (e.g., "/gp:init --mode new"), or is it a positional argument, or does the skill use AskUserQuestion when ambiguous? The existing capture/migrate skills don't use flags — they parse intent from the user's message.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 reference file existence not verified before copy
Phase 4 says "Copy `skills/migrate/references/migration-heuristics.md` to `skills/upgrade/references/`". I confirmed `skills/migrate/` only contains `SKILL.md` (the directory listing shows no `references/` subdirectory). However, `skills/migrate/` might have a `references/` directory not visible in the listing I checked. The plan should include an explicit verification step: `ls skills/migrate/references/` and `ls skills/project-status/references/` before attempting to copy, with a fallback task if the files don't exist. Round 1 flagged this as CODEBASE_EXPLORATION; the revised plan added the copy tasks but not the existence check.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 6 shared reference audit could be more specific
Phase 6 says "Audit `skills/_shared/references/` for files that are only referenced by deleted skills" but doesn't list which files to check. The `skills/_shared/references/` directory contains 26 files. A targeted check would be more implementable: grep each `*.md` in `skills/_shared/references/` for `@` references from all remaining skills and agents, then flag any file with zero references. The plan should list the specific files likely to become orphaned (e.g., `reviewers-cross-cutting.md` which contains the monolithic reviewer definitions that Phase 5 is replacing with individual `review-*.md` files).
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 1's critical issues (quest statuses don't exist, `start-explore --quest` not supported) were addressed by adding the quest schema and CLI extensions as explicit prerequisites in sub-phase A. However, the implementation detail is still insufficient: the plan says "add transitions" without enumerating the specific events, RPC routing, context module updates, and architecture doc changes needed. For a CLI tool, these are not details that can be hand-waved — each is a distinct code change in a distinct subsystem. The reviewer count inconsistency (14 listed vs 12 claimed) persists from round 1. Error handling patterns are improved but still too vague for the audit skill. To reach 9+: (1) enumerate all code touchpoints for quest explore support (events, transitions, RPC begin/submit, context priorities, schema command, transition-tables.md), (2) fix the reviewer count to match the task list (14 new = 20 total), (3) verify reference file existence before Phase 4 copy tasks, (4) add specific orphaned reference file identification to Phase 6.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
