# Holistic Review — Remaining Skills + Cleanup (Round 2)

## Issues

**[IMPORTANT]** Phase 5 reviewer count still inconsistent with architecture spec — now lists 14 new agents but overview and expected behavior assert 12/18
The Phase 5 task list correctly enumerates 14 new reviewer agents (python, rust, backend, frontend, data-layer, devops, ci-github-workflows, ux-ia, api-contract, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io). With 6 existing agents (holistic, software-architecture, typescript, agent-skill, repo-tooling, tui-cli), that totals 20 reviewer agents. However, the _overview.md still says "Twelve new reviewer agent definitions complete the reviewer infrastructure (matching the 18-domain architecture spec)." Phase 5's expected behavior still asserts `ls agents/reviewer-*.md | wc -l` returns 18. The overview Phase table still says "Add 12 remaining reviewer agent definitions." These all need to read 14 new / 20 total. The reviewer-registry.md in `skills/implement/references/` lists 20 domains, confirming the correct count is 20. Fix: update overview paragraph, overview phase table row, and Phase 5 expected-behavior assertions to 14 new / 20 total.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 lists `reviewer-ml-pipeline.md` but the task list has no corresponding `review-ml-pipeline.md` criteria file listed separately — relies on the implicit "each needs an agent .md + a criteria .md" framing, but `reviewer-data-io.md` + `review-data-io.md` is the last bullet
Scanning the Phase 5 task list: each bullet says `reviewer-X.md + review-X.md`. This is actually fine on close reading — each bullet includes both files. No issue here; I retract this.
Actually, re-reading more carefully, the Phase 5 task list includes: python, rust, backend, frontend, data-layer, devops, ci-github-workflows, ux-ia, api-contract, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io — that is 14 bullets, each specifying both an agent and a criteria file. The count is correct in the task list. The issue is only in the overview and expected-behavior numbers (covered above).

**[IMPORTANT]** Phase 5 reviewer-registry update task is underspecified — four old registries exist, plan only mentions one
The plan's Phase 5 task says: "Update the reviewer registry in `skills/implement/references/reviewer-registry.md`." However, there are at least four reviewer registry files in the codebase: `skills/implement/references/reviewer-registry.md`, `skills/implement-plan/references/reviewer-registry.md`, `skills/refine-architecture/references/reviewer-registry.md`, and `skills/refine-plan/references/reviewer-registry.md`. The latter three live in skills that will be deleted in Phase 6, so they do not need updating. But this should be explicit — either note that the other registries are in skills marked for deletion and will be cleaned up in Phase 6, or move the registry update to Phase 6 where it can be verified alongside the deletion assertions.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 quest state machine changes require transition-table updates but plan does not reference the architecture source of truth
Phase 1 Sub-phase A adds `exploring` and `explored` to the quest status enum and "quest transitions for exploring/explored in the state machine." The current quest transition table in `.goodplan/architecture/transition-tables.md` has no `exploring`/`explored` transitions — the quest lifecycle goes `created` -> `planning` directly. The plan should specify the exact new transition rows (e.g., `created | BEGIN_QUEST_EXPLORE | exploring`, `exploring | COMPLETE_QUEST_EXPLORE | explored`) and require updating `transition-tables.md` as the source of truth. Without this, the implementer must invent the event names and guard conditions. The epic transition table has `BEGIN_EXPLORE`/`COMPLETE_EXPLORE` as precedent — the quest equivalents should be named consistently.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 audit agent return format specified but no schema validation path
Phase 2 specifies the audit agent return format as `{ findings: Array<{ severity, category, description, location, suggestion }>, scores: Record<string, number>, proposedSideQuests: Array<{ title, description }> }`. This is good. However, the orchestrator task (step 5) says "Receive structured JSON findings from agent" but does not address what happens when the agent returns malformed JSON or an unexpected shape. Given the graceful error handling requirement added in round 1, this path needs a task: validate the return shape and surface a clear error if the agent produces unexpected output.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 init skill `--mode` override not reflected in frontmatter trigger phrases
Phase 3 task list specifies `--mode new` and `--mode onboard` overrides, but the frontmatter triggers only list "init", "initialize", "onboard", "new repo", "set up project", "new project". The `--mode` flag is a CLI-style argument that may not match how Claude Code invokes skills. If the intent is for users to say `/gp:init --mode new`, clarify that this is passed as an argument string, not a trigger phrase. If it is meant as an orchestrator-parsed argument from the user's natural language, specify how the orchestrator extracts it.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 does not verify that old skill content is functionally equivalent after rename
Phase 4 creates three new skills adapted from existing ones. The verification section checks frontmatter and trigger phrases but has no assertion that the skill body (the actual instructions) is semantically equivalent to the source. A diff-based check (e.g., "body content differs from source only in name references") would catch accidental content loss during the adaptation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6 does not specify what to do with `skills/_shared/references/reviewers-cross-cutting.md` and other monolithic reviewer files
The shared references directory contains `reviewers-cross-cutting.md` (31KB). Phase 5 creates individual `review-*.md` criteria files for each domain. Phase 6 audits for stale references, but the plan should explicitly state whether the monolithic files (`reviewers-cross-cutting.md`, and any `reviewers-language.md`, `reviewers-scientific.md`, `reviewers-web.md`, `reviewers-ai-tooling.md` referenced in the old registries) should be deleted or retained. Currently these exist in the old `refine-plan/references/` directory (which gets deleted) but `reviewers-cross-cutting.md` is in `_shared/references/` and will survive the cleanup. If no remaining skill or agent `@`-references it after Phase 5, it should be flagged for deletion.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6 `bun test` verification may be unreliable — no indication of what test suite exists
Phase 6 expected behavior includes `bun test — all tests pass`. The plan does not indicate what tests currently exist or whether they reference old skill names. If unit tests import from deleted skill directories or reference old skill names in assertions, they will break. The stale test cleanup task covers dogfood tests but not unit/integration tests in the main test suite. Add: "grep for old skill names in `src/**/*.test.ts` and `tests/`".
Resolution: CODEBASE_EXPLORATION

## Score: 8/10

Significant improvement from round 1. The plan now has re-entry handling, graceful error handling, test harness scripts for renamed skills, stale test cleanup, and the reference file audit task. The reviewer count mismatch (12/18 vs actual 14/20) persists as the most significant remaining issue — it will cause Phase 5 expected-behavior checks to fail. The quest transition table gap could lead to inconsistent event naming. To reach 9+: fix the count mismatch everywhere, specify the exact quest transition rows, and clarify the monolithic reviewer file cleanup.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
