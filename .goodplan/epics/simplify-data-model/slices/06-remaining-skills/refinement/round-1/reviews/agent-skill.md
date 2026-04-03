# Agent Skill Review — Remaining Skills + Cleanup

## Issues

**[CRITICAL]** Phase 1 create-side-quest: Quest lifecycle has no explore phase
The plan's Phase 2 assumes quests support `exploring`/`explored` status transitions and `start-explore --quest <name>` CLI command. Neither exists. The quest state machine goes directly from `created` to `planning` (via `BEGIN_QUEST_PLAN`). The CLI commands `start-explore`, `submit-explore`, and `epic:explore` are all epic-scoped only. The 4-phase pipeline (goal capture, explore, plan Q&A, plan draft) must be redesigned as a 3-phase pipeline that omits the explore phase, OR the plan must explicitly add new quest explore transitions and CLI commands as prerequisite work — which would be a state machine change outside this slice's scope.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Phase 1 create-side-quest: `gp start-explore --quest <name>` does not exist
Task says "Use `gp start-explore --quest <name> --inline --json` for explore-phase context." The `start-explore` command only accepts `--epic`, not `--quest`. This would cause a runtime CLI error. If Phase 2 (explore) is kept, the CLI must be extended first; if explore is dropped, remove this task entirely.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5: Reviewer count discrepancy — plan says 12 new / 18 total but lists 14 new / 20 total
The overview states "Twelve new reviewer agent definitions complete the reviewer infrastructure (matching the 18-domain architecture spec)." However:
- The architecture spec (`skill-model-api.md`) lists 20 reviewer domains (6 existing + 14 new).
- Phase 5's task list enumerates 14 new reviewers (python, rust, backend, frontend, data-layer, devops, ci-github-workflows, ux-ia, api-contract, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io).
- The Expected Behavior section says `ls agents/reviewer-*.md | wc -l` returns 18, which should be 20.
All three numbers in the overview (12, 18, 18) and the verification assertion need updating to (14, 20, 20). The Phase 6 cleanup assertions may also need updating if they reference total counts.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 init skill: `test-init.ts` does not currently exist
The Expected Behavior "Before" section states `ls tools/dogfood/test-init.ts` "exists but tests old skill. New version needed." The file `tools/dogfood/test-init.ts` does not exist. The existing test files for the old skills are `test-onboard.ts` and `test-migrate.ts`. The task should say "file does not exist" (not "exists but tests old skill") and clarify that the new `test-init.ts` replaces `test-onboard.ts` functionality.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 create-side-quest: Re-entry status table missing from plan
The `create-epic` and `plan-slice` skills both include explicit status-to-phase mapping tables for re-entry detection (e.g., "if status is `exploring`, resume Phase 2"). The create-side-quest phase only says "Implement re-entry logic: query `gp quest:show --quest <name> --json`, check `status`, offer continue/go-back for each phase" without defining the actual mapping. The skill needs an explicit table mapping each quest status (`created`, `planning`, `plan-created`, `refining`, `plan-refined`) to the correct pipeline resume point, following the established pattern from create-epic SKILL.md (Step 2).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 create-side-quest: Missing context discipline section
Both create-epic and plan-slice include an explicit "Context Discipline" section that constrains the orchestrator to CLI output + sub-agent returns + user Q&A only (no Read calls on artifact content). The create-side-quest tasks mention "context discipline" briefly ("Implement context discipline: orchestrator reads only CLI status + sub-agent return values") but this should be formalized as a required section in the SKILL.md, not just a code practice. Without it, the skill definition is incomplete relative to the established pattern.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 audit skill: Agent tool access specification missing
The audit-architecture-phase, audit-docs-phase, and audit-tests-phase agents need explicit `allowedTools` and `disallowedTools` specifications. The existing agent pattern (e.g., explore-phase, architecture-phase) always specifies these. The plan says agents "return structured JSON" but doesn't specify whether they need Write access for intermediate files, or whether they're read-only like reviewers. Based on the description (agents scan the codebase and produce findings), they likely need `allowedTools: ["Read", "Grep", "Glob"]` and `disallowedTools: ["Agent"]` — but this should be explicit.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 audit: Shared reference injection paths not validated
Task says "Inject relevant shared references via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/`" for audit-conventions and maturity-conventions. Neither `audit-conventions.md` nor `maturity-conventions.md` exists in `skills/_shared/references/` currently. The plan doesn't include creating these files. Either these files need to be created (add a task), or the reference names need to match existing files (e.g., there may be existing convention references that serve this purpose).
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 4 renames: Missing `user-invocable: true` on source skills
The plan correctly adds `user-invocable: true` to all three renamed skills. However, none of the source skills (capture, migrate, project-status) currently have this field. This isn't a bug per se since adding it is correct, but it's worth noting that the renames are also upgrading frontmatter, not just copying it. The plan should mention this as intentional to avoid confusion during implementation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 renames: upgrade skill should copy references directory
The plan says "Copy reference files from `skills/migrate/references/` if needed" with a tentative "if needed." The migrate skill has `references/migration-heuristics.md` which contains core logic. The upgrade skill will definitely need this file. Make the task definitive: "Copy `skills/migrate/references/migration-heuristics.md` to `skills/upgrade/references/`" and similarly for project-status's `references/status-logic.md` to `skills/status/references/`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6 cleanup: Skill count 12 may depend on Phase 5 resolution
If the reviewer count issue is resolved (14 new instead of 12), it doesn't affect the skill count since reviewers are agents, not skills. However, the Phase 6 verification `bun run build:plugin` should also assert the agent count (e.g., "Packaged 20 agents" after adding 14 new reviewers to the existing 12 non-reviewer agents). The plan only asserts the skill count (12), not the agent count.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1: Version check and GP binary path not specified
The create-epic and plan-slice skills both start with an explicit "Step 0 -- Version Check" using `GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"`. The create-side-quest plan doesn't mention this. This is implied by "following the proven pattern from create-epic" but should be explicit in the task list since it's a required step in every pipeline skill.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

Two critical issues block implementation: the create-side-quest pipeline assumes quest explore support that doesn't exist in the CLI or state machine, and the reviewer counting is wrong throughout the plan. These aren't minor corrections -- the explore issue requires redesigning a core phase of the pipeline skill. The remaining important issues are straightforward fixes to align the plan with established patterns and actual codebase state. Fixing the two critical issues and the important issues would bring this to 8+. Cleaning up minors would reach 9.

## Summary
- Critical: 2
- Important: 6
- Minor: 4
