# Repo & Tooling Review — Remaining Skills + Cleanup

## Issues

**[CRITICAL]** Phase 5 reviewer agent count is inconsistent with overview and architecture spec
The overview says "12 remaining reviewer agent definitions" matching an "18-domain architecture spec." Phase 5's Expected Behavior says `ls agents/reviewer-*.md | wc -l` returns 18 (6 existing + 12 new). However, the Phase 5 task list enumerates **14** new reviewer agents (python, rust, backend, frontend, data-layer, devops, ci-github-workflows, ux-ia, api-contract, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io). That would produce 6 + 14 = 20, not 18. Meanwhile, the reviewer registry (`skills/implement/references/reviewer-registry.md`) lists **21** distinct reviewer domains (including C++, Background Jobs & Task Processing, and the "holistic" agent which exists but has no registry entry). The plan must reconcile: (a) exactly how many new agents to create, (b) which registry domains are covered vs deliberately omitted, and (c) update the Expected Behavior assertions to match.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 does not account for reviewer registry updates
The reviewer registry at `skills/implement/references/reviewer-registry.md` (and duplicates in `skills/refine-plan/references/`, `skills/refine-slices/references/`, `skills/refine-architecture/references/`) currently references prompt files in `reviewers-language.md`, `reviewers-scientific.md`, `reviewers-web.md`, and `reviewers-ai-tooling.md` that are **section-based lookups** into monolithic reference files. The new model uses individual agent `.md` files per reviewer with separate criteria files in `skills/_shared/references/review-*.md`. Phase 5 creates the new agents and criteria files but has no task to update the reviewer registry to point at the new agent/criteria file paths. Since Phase 6 deletes old skills (refine-plan, refine-slices, refine-architecture) which contain the old-style registries, and the new `implement` skill also has a registry, this needs updating. Add a task to Phase 5 (or Phase 6) to update the reviewer registry in `skills/implement/references/` to reference the new agent-based reviewer infrastructure.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 (init) onboard-phase agent has a ~500-line target but source is 613 lines
The plan tasks say "Keep under ~500 lines by moving stable reference content to shared files." The current `skills/onboard-repo/SKILL.md` is 613 lines, and it references 5 reference files in `skills/onboard-repo/references/` totaling ~43K bytes. The plan needs to specify which reference files will be preserved (moved to `skills/_shared/references/` or bundled via `@` references in the agent) vs. which content will be inlined. Without this, the implementer will either exceed the 500-line target or lose important reference content. Add specific tasks for which onboard-repo reference files (architecture-extraction.md, convention-heuristics.md, expertise-profiling.md, migration-detection.md, repo-scanning.md) are migrated to shared references vs. inlined.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 (renames) does not address reference file migration for upgrade and status
The plan says "Copy reference files from `skills/migrate/references/` if needed" and "Copy reference files from `skills/project-status/references/` if needed." These files exist: `skills/migrate/references/migration-heuristics.md` (3.5K) and `skills/project-status/references/status-logic.md` (6.7K). The "if needed" is ambiguous — the implementer needs a clear decision. Since Phase 6 deletes the old directories, any reference files not explicitly copied will be lost. Change "if needed" to a concrete task: copy both reference files to the new skill's `references/` directory, or move them to `skills/_shared/references/` if they will be shared.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 6 `package.json` update is vague — `install:skills` script still references deleted file
Phase 6 says "Update `package.json` if it has an `install:skills` script — remove or update it." The script exists: `"install:skills": "bash scripts/install-skills.sh"`. Since `install-skills.sh` is being deleted, this script will break if left in place. The task should be definitive: remove the `install:skills` script from `package.json`, not conditional.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6 Expected Behavior uses `ls skills/ | wc -l` which includes `.` and `..`
The assertion `ls skills/ | wc -l` returns more than the number of actual directories because `ls` with `-l` style (used in the earlier exploration) can include `.` and `..`. The plan should use `ls -1 skills/ | grep -v _shared | wc -l` or `find skills/ -maxdepth 1 -type d | grep -v _shared | wc -l` for an accurate count. Actually, plain `ls` without `-a` does not include `.` and `..`, so this is correct in the basic case. However, the before-implementation check says "returns more than 13" while there are currently 21 skills + _shared = 22 items, which plain `ls` would list. The assertion is correct but the threshold of 13 is oddly specific (12 + _shared) — it would be clearer to assert `grep -v _shared | wc -l` equals exactly 21 for the "before" state to be more precise.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 test harness re-entry test assumes ability to create a quest at specific status
The re-entry test says "create a quest at `explored` status, invoke skill, verify it starts at plan Q&A." Creating a quest directly at `explored` status requires either: (a) running the full pipeline up to that point (expensive in a test), or (b) directly manipulating CLI state. The test should clarify the approach — likely `gp quest:create` + `gp quest:transition --status explored` or similar CLI commands, following the pattern from `test-create-epic.ts`. Check if such transition commands exist.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** No explicit task to verify `bun run build:plugin` works after Phase 5 (reviewer agents)
Phase 5's verification says `bun run build:plugin` passes, but the phase's task list does not include an explicit build verification step. Since Phase 5 adds 12-14 new agent files with `@` reference paths, and `build-plugin.sh` validates these references, an explicit verification task would ensure issues are caught before the destructive Phase 6. Add "Run `bun run build:plugin` and verify all new agents pass frontmatter and reference validation" as a task.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10
The plan is structurally sound and follows the established orchestrator pattern well. The skill consolidation scope is clear and the phase ordering (build before delete) is correct. However, the reviewer agent count discrepancy is a blocking issue — the numbers in the overview, Phase 5 task list, Expected Behavior assertions, and the existing reviewer registry are all inconsistent. The reference file migration for renamed/consolidated skills needs concrete tasks rather than "if needed" hedging. Fixing the count discrepancy, adding reviewer registry update tasks, and clarifying reference file handling would bring this to 9+.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
