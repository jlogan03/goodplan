# Software Architecture Review

## Issues

**[IMPORTANT]** goal-refining.md [03-data-model]: Overview consolidation scope is underspecified for state machine impact
The slice says "Create a unified overview schema at `.goodplan/overview.json` combining epics (with embedded slices), quests, and tasks" and lists updating `assembleState()` and `commitState()`. However, the current architecture has three separate overview paths with two distinct schemas (`epicOverviewSchema` for epics, `overviewSchema` for quests and tasks) — see `src/core/data/schema-registry.ts` lines 23-25. Merging these into a single `overview.json` requires a new unified schema that combines the epic overview structure (which embeds slices) with the simpler quest/task overview structure. The slice should explicitly name the new schema and note that the `schemaRegistry` entries for `quests/overview.json` and `tasks/overview.json` will be replaced by a single `overview.json` entry. Without this, the implementer may misunderstand the scope of schema changes. Additionally, the state machine transitions that create quests and tasks (which write to their respective overview files) need updating — the "~10-15 test files" estimate feels low given the 3 overview paths being collapsed. The architecture doc (`data-model-changes.md`) calls this out but the slice goal doesn't carry the detail forward.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** goal-refining.md [02-plan-slice-poc]: Contradiction between architecture and slice on `skills:` frontmatter injection
The epic architecture (`_overview.md` lines 42, 69, 135) explicitly says `skills:` frontmatter injection from plugin agents to plugin skills is broken (issue #25834) and to use `@` references instead. However, section on line 69 also says "shared references are injected via `skills:` frontmatter" which contradicts the warning on line 42. The slice goal itself mentions "@ reference injection in plugin agents" which is correct, but the Behavior section point 3 says "Create shared reference files for injection via `@` references" while point 6 mentions verifying "@ references in agent definitions resolve correctly." This is internally consistent in the slice, but the architecture document's own contradiction (lines 42 vs 69) could confuse the implementer. The slice should add a scope boundary note: "Do NOT use `skills:` frontmatter for shared content injection — use `@` references per the verified prototype."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** goal-refining.md [05-implement-pipeline]: Completion-phase agent serves dual scope without clear interface separation
The `completion-phase.md` agent is described as adapting its scope based on "task prompt" — slice-level vs epic-level. This means one agent definition handles two significantly different responsibilities: (1) single-slice learnings synthesis and architecture review, and (2) cross-slice learnings synthesis, architecture reconciliation, and artifact promotion. The architecture overview describes these as distinct operations with different inputs and outputs. A single agent that changes behavior based on task prompt text risks becoming a shallow module — its interface (the task prompt format) carries implicit mode selection that callers must understand. Consider either: (a) documenting the explicit task prompt contract for each mode in the agent definition, or (b) splitting into `slice-completion-phase.md` and `epic-completion-phase.md`. Option (a) is likely sufficient given the agent is just a markdown prompt, but the slice goal should specify what the task prompt looks like for each mode.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** goal-refining.md [06-remaining-skills]: Seven skills built in one slice with no intermediate verification gates
This slice builds 3 new skills (create-side-quest, explore, audit), builds 1 merged skill (init), renames 3 skills, deletes 15 old skills, and updates build/install scripts. That is the largest scope of any slice in the epic. The verification section lists 7 checkboxes but no intermediate gates — if the create-side-quest pipeline fails, does the rest of the slice proceed? The slice would benefit from explicit sub-ordering: (1) build create-side-quest + test, (2) build explore + audit + init + test, (3) rename skills + test, (4) delete old skills + verify counts. This mirrors how slices 04 and 05 are structured as focused units. Without sub-ordering, this is effectively 4 slices packed into 1, which reduces the "independently verifiable" property stated in the confirmed goal.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** goal-refining.md [04-create-epic-pipeline]: `reconsiderWhen` and `validUntil` evaluation introduced without test coverage specification
Behavior point 7 says "Phase agents evaluate `reconsiderWhen` and `validUntil` conditions when provided in task prompt." This is the first slice where these data model fields (added in slice 03) are actually consumed by agents. However, the verification section has no checkbox for validating that this evaluation works correctly. How does the test harness verify that an agent correctly identified a triggered `reconsiderWhen` condition? This is a new behavior pattern that should have at least one explicit test case — e.g., a fixture decision with a `reconsiderWhen` condition that matches the current epic's goal, verified by checking the agent's output mentions it.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** goal-refining.md [01-test-harness]: `verifyEntityStatus()` relies on CLI availability in test environment but doesn't specify which CLI
The function "queries CLI status (`gp <entity>:show --json`)" — but which `gp`? In the test environment, this could be the installed CLI (`~/.local/bin/gp`) or the plugin binary (`${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`). The CLAUDE.md rules say "use installed CLI for .project state mutations" and the test harness runs against fixture repos. The slice should specify that `verifyEntityStatus()` uses the installed CLI (or a configurable CLI path) to avoid ambiguity. The existing harness scripts (`validate.ts`, `test-plugin-skills.ts`) use the Agent SDK which invokes skills via Claude Code — but `verifyEntityStatus()` makes direct CLI calls outside of that context.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** goal-refining.md [07-quality-validation]: No rollback or isolation strategy for bug fixes found during validation
The slice says "Fix any bugs, quality issues, or pattern violations discovered during the run." But bugs found here may require changes to code delivered in slices 01-06. If a fix touches the orchestrator pattern (slice 02) or data model (slice 03), how is that tracked? The slice should note that bug fixes are committed to the same branch with clear commit messages referencing the originating slice, and that significant fixes should be captured as learnings on the affected slice's completion record.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** sequencing-refining.md: Dependency graph allows slice 03 (data-model) and slice 04 (create-epic-pipeline) to start in parallel but slice 04 consumes slice 03 outputs
The sequencing table shows slice 03 depends only on 01, and slice 04 depends on 02. This means they could theoretically execute in parallel. However, slice 04's Behavior point 7 says agents evaluate `reconsiderWhen` and `validUntil` — fields added by slice 03. If slice 04 is implemented before slice 03, the decision and learning schemas won't have these fields yet. The dependency table should add 03 as a dependency of 04, or slice 04 should note that `reconsiderWhen`/`validUntil` evaluation is conditional on those fields existing (which is fine since they're optional, but should be explicit).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** goal-refining.md [08-documentation]: Stale reference grep excludes important renamed skills
The verification grep checks for old names like `create-plan`, `refine-plan`, `create-slices`, etc. but does not check for `capture` (renamed to `task`), `migrate` (renamed to `upgrade`), or `onboard-repo` (merged into `init`). These old names should be included in the stale reference check.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** goal-refining.md [02-plan-slice-poc]: `plugin.json` change may not be needed — agents directory may be auto-discovered
The Behavior says "Update `plugin.json` to include `"agents": "agents/"` field." The architecture overview says "Claude Code discovers all `.md` files within it" and references research confirming agents/ directories are discovered at priority 4. But the current `plugin.json` schema (visible in the built dist) has no `agents` field — only `skills`. If Claude Code auto-discovers `agents/` directories in the plugin root, the `plugin.json` change may be unnecessary. If it IS needed, the implementer should verify with `claude plugin validate` that the field is accepted. The slice should note: "Verify whether `plugin.json` requires an explicit `agents` field or whether Claude Code auto-discovers agents/ — the build script already copies the directory (lines 48-51 of build-plugin.sh)."
Resolution: CODEBASE_EXPLORATION

## Score: 7/10

The slice decomposition follows a sound tracer-bullet strategy (test harness first, POC second, build out from there). The dependency graph is mostly correct and the orchestrator pattern is well-documented in the epic architecture. However, there are several structural issues: slice 06 is doing too much work for a single independently-verifiable unit; the overview consolidation in slice 03 underspecifies the schema merge complexity; and the `reconsiderWhen`/`validUntil` evaluation flow is introduced in slice 04 without test coverage or correct dependency on slice 03. To reach 9+: split slice 06 into at least 2 slices (pipeline skills vs renames+cleanup), add the missing dependency from 04 to 03, specify the unified overview schema name in slice 03, and add explicit test cases for `reconsiderWhen`/`validUntil` evaluation in slice 04.

## Summary
- Critical: 0
- Important: 5
- Minor: 5
