# Holistic Review — Remaining Skills + Cleanup

## Issues

**[CRITICAL]** Phase 5 reviewer count mismatch: overview says "12 new" / "18-domain", but architecture spec has 20 domains and Phase 5 lists 14 new reviewers
The overview states "12 new reviewer agent definitions complete the reviewer infrastructure (matching the 18-domain architecture spec)." However, `architecture/skill-model-api.md` lists exactly 20 reviewer domains (holistic, software-architecture, typescript, python, rust, backend, frontend, data-layer, devops, ci-github-workflows, tui-cli, repo-tooling, ux-ia, api-contract, agent-skill, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io). With 6 existing, that requires 14 new — which is exactly what the Phase 5 task list contains. The overview, the Phase 5 title, and Phase 5 expected-behavior assertions (`ls agents/reviewer-*.md | wc -l` expecting 18) are all wrong. Fix: update overview to "14 new reviewer agent definitions complete the reviewer infrastructure (matching the 20-domain architecture spec)" and Phase 5 expected behavior to assert 20 reviewer agents and 20 review criteria files.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 agent placement: plan puts audit agents in `agents/` but no other skill's phase agents live there
The plan creates `agents/audit-architecture-phase.md`, `agents/audit-docs-phase.md`, and `agents/audit-tests-phase.md` directly in the `agents/` directory. The existing `agents/` directory is for shared infrastructure agents (explore-phase, plan-phase, implement-phase, refinement-coordinator, reviewer-*, synthesis, editor) reused across multiple skills. The audit agents are single-purpose — only `/gp:audit` uses them. The architecture overview says agents/ is for "phase-level sub-agents that need full instruction sets" — it does not restrict to shared agents. However, placing mode-specific agents here alongside shared infrastructure agents muddies the directory's purpose. Consider whether these should follow a different convention (e.g., `agents/audit/` subdirectory) or whether this is intentional. The current approach will work but may create confusion as more single-skill agents accumulate.
Resolution: USER_INPUT

**[IMPORTANT]** Phase 3 `test-init.ts` expected-behavior says it "exists but tests old skill" — but there is no existing `test-init.ts`
Phase 3 expected behavior states `ls tools/dogfood/test-init.ts — exists but tests old skill. New version needed.` However, the dogfood directory has `test-onboard.ts` and `test-migrate.ts`, not `test-init.ts`. The plan should reference the correct existing file (`test-onboard.ts`) and clarify whether it gets replaced, renamed, or kept alongside the new test.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 renames: no test harness coverage for task, upgrade, or status skills
Phases 1-3 each include test harness scripts (test-create-side-quest.ts, test-audit.ts, test-init.ts). Phase 4 creates three renamed skills (task, upgrade, status) but includes no test scripts. The existing `test-migrate.ts` and `test-onboard.ts` test the old skills being replaced. At minimum, the plan should include basic smoke tests verifying each renamed skill loads and responds to its trigger phrases via the plugin discovery mechanism — `test-plugin-skills.ts` covers discovery but not invocation.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 6 cleanup: no mention of updating or deleting old test harness files
When the 15 old skill directories are deleted, the corresponding dogfood test files become stale: `test-onboard.ts` (tests onboard-repo, replaced by init), `test-migrate.ts` (tests migrate, replaced by upgrade). The plan should include a task to delete or update these files. Similarly, `validate.ts` may reference old skill names.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 re-entry test expected behavior is underspecified
The re-entry test says "create a quest at `explored` status, invoke skill, verify it starts at plan Q&A phase, not goal capture." The "starts at plan Q&A phase" check needs a concrete observable — what CLI status or output proves it started at phase 3 vs phase 1? Without this, the test assertion is subjective.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 references `gp task:create` but the CLI command namespace may not exist yet
The task in Phase 4 says `skills/task/SKILL.md` content uses "same CLI commands (`gp task:create`), same flow." The existing capture skill uses `gp task:create`, so this is fine — but the plan should clarify that the CLI command name (`task:create`) already exists and does not change, only the skill name changes from `capture` to `task`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6 git log verification is not automatable
Phase 6 includes "Verify sub-ordering discipline: `git log --oneline` shows build-phase commits (phases 1-5) before cleanup-phase commits (phase 6)." This is a manual visual check. Either remove it (since the implementer will naturally commit in order) or specify a concrete grep-based assertion.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured, follows the established orchestrator pattern, and has clear phasing. The critical reviewer count mismatch would cause Phase 5 verification to fail. The missing test coverage for renamed skills and stale test file cleanup are significant gaps. To reach 9+: fix the count mismatch, add test harness tasks for renamed skills, add stale test cleanup to Phase 6, and fix the test-init.ts reference.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
