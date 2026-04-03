# TUI & CLI Review — Remaining Skills + Cleanup

## Issues

**[CRITICAL]** Phase 1 assumes quest `exploring`/`explored` statuses that do not exist
Phase 1 (create-side-quest pipeline) defines a 4-phase pipeline with Phase 2 transitioning `created` -> `exploring` -> `explored`. However, the quest entity status lifecycle (`src/schemas/entities/quest.ts`) only supports: `created`, `planning`, `plan-created`, `refining`, `plan-refined`, `implementing`, `implementation-complete`, `completed`, `abandoned`. There are no `exploring` or `explored` statuses for quests. The `start-explore` CLI command requires `--epic` and only supports epic-scoped exploration. The plan's phase table, CLI status mapping, and re-entry logic for this skill are all based on a non-existent quest state transition. Either the quest schema and CLI need new transitions (significant scope expansion), or the explore phase must be dropped from the create-side-quest pipeline (reducing it to 2 phases: goal capture + plan draft/refinement), or the exploration must happen without CLI status tracking.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Phase 1 references `gp start-explore --quest <name>` which does not exist
The task "Use `gp start-explore --quest <name> --inline --json` for explore-phase context" calls a CLI command that does not exist. `start-explore` only accepts `--epic <name>` (see `src/commands/subagent/start-explore.ts`). This would cause a runtime failure in the skill.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 reviewer count is internally inconsistent (claims 18 total, lists 14 new, architecture specifies 20)
Phase 5 says "12 remaining reviewer agent definitions to complete the 18-domain reviewer infrastructure" and the expected behavior says `ls agents/reviewer-*.md | wc -l` should return 18 (6 existing + 12 new). However, the task list actually enumerates 14 new reviewer agents (python, rust, backend, frontend, data-layer, devops, ci-github-workflows, ux-ia, api-contract, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io). Meanwhile, the architecture spec (`skill-model-api.md`) lists 20 total reviewer agents. The plan needs to reconcile: is the target 18 or 20? The task list should match the expected behavior count.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 6 expected behavior count will be wrong if Phase 5 adds 14 (not 12) reviewers
Phase 6 says `ls skills/ | grep -v _shared | wc -l` returns exactly 12. This is about skills, not agents, so it's separate from the reviewer count issue. But the overview says "Packaged 12 skills" while Phase 6 references `bun run build:plugin` passing with that exact string. The build script currently outputs `Packaged $SKILL_COUNT skills` without an assertion on the count. The plan says to add `test "$SKILL_COUNT" -eq 12` which is correct for skills, but there's no parallel assertion for agent count. Add an expected agent count assertion to `build-plugin.sh` as well, especially since the reviewer count is already inconsistent.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 renames do not address reference file copying mechanics
The upgrade skill (from migrate) says "Copy reference files from `skills/migrate/references/` if needed" and similarly for status. But the plan doesn't verify whether these reference files exist or specify which ones. `skills/migrate/` has no `references/` subdirectory visible in the repo listing (only `SKILL.md` shown in the directory). Meanwhile `skills/project-status/` also needs checking. The plan should either confirm which reference files exist and need copying, or note that no references exist and the copy step is unnecessary.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** No `--help` or usage text verification for new skills
None of the six phases include verification that the skills produce helpful output when invoked without arguments or with incorrect arguments. For CLI/TUI quality, each new skill should degrade gracefully: clear error message if the CLI is unavailable, helpful "how to use" if invoked with wrong arguments, and meaningful AskUserQuestion prompts that orient the user. The test harness scripts verify happy paths but not error paths.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 test script lacks `--max-iterations` documentation for re-entry test
The test script task says "Accept `--model` and `--max-iterations` flags" and describes a re-entry test ("create a quest at `explored` status, invoke skill, verify it starts at plan Q&A"). Beyond the non-existent `explored` status issue already flagged, the re-entry test description doesn't specify what `--max-iterations` should default to for the re-entry scenario vs the full pipeline scenario. Other test scripts (test-plan-slice.ts, test-create-epic.ts) document their default iteration counts.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 audit skill argument parsing pattern not specified
The audit skill takes a mode argument (`/gp:audit architecture`). The plan says "Parse mode from argument" but doesn't specify how — is it positional (first word after skill name), a `--mode` flag, or parsed from the description text? Existing pipeline skills use the Agent SDK's task prompt mechanism. For CLI consistency, the parsing approach should be explicit and match how other skills handle arguments (e.g., `plan-slice` uses the first argument as slice name).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6 git log verification is not automatable
The last verification item says "Git log confirms build commits precede cleanup commits" and the task says `git log --oneline` shows build-phase commits before cleanup-phase commits. This is a review-time check, not an automated assertion. Consider either dropping it (commit ordering is an implementation concern, not a build assertion) or making it an actual test assertion based on commit message patterns.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

Two critical issues severely impact the plan's feasibility: Phase 1's entire pipeline structure is based on quest statuses that don't exist in the state machine, and it references a CLI command that doesn't accept quest scope. These aren't minor gaps — they invalidate the core design of the create-side-quest skill. The reviewer count inconsistency in Phase 5 is less severe but would cause build assertion failures. To reach 9+: resolve the quest exploration status gap (likely by simplifying create-side-quest to skip exploration or by explicitly scoping the CLI/schema changes needed), fix the reviewer count to match the architecture spec, and add error-path verification.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
