# Agent Skill Review — onboard-repo (Round 4)

## Issues

**[IMPORTANT]** Phase 1 test harness task describes a Vitest framework but the existing dogfood tests use plain bun scripts — test architecture mismatch

The plan says "Define the test harness pattern ... Vitest framework, Anthropic Claude SDK session config." But examining `tools/dogfood/test-migrate.ts`, the existing test harness is a plain TypeScript script run with `bun tools/dogfood/test-migrate.ts` — no Vitest, no test runner. It uses the `@anthropic-ai/claude-agent-sdk` `query()` function directly and manages setup/teardown imperatively. The plan's Phase 1 "Design test architecture" task should match this established pattern: a standalone script at `tools/dogfood/onboard-skill.test.ts` (or `test-onboard.ts` to match `test-migrate.ts` naming) run via `bun`, not a Vitest test. This matters because: (1) Vitest's test runner would add unnecessary overhead for a single SDK-driven integration test, (2) the existing harness pattern handles session lifecycle, logging, and assertions without a framework, and (3) consistency with `test-migrate.ts` makes the test suite easier to maintain. The `.test.ts` suffix in the plan is fine for discoverability but should not imply Vitest — clarify that it runs as a standalone bun script.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** SKILL.md description/trigger criteria are specified but no actual frontmatter `name` and `description` fields are drafted — the plan defers the most critical trigger-accuracy artifact

The plan says the SKILL.md "description must trigger on onboarding phrases, NOT on migrate/new-project phrases" and lists example triggers ("onboard this repo", "bring this project into goodplan", "set up goodplan for this repo"). But the plan never drafts the actual YAML frontmatter `name` and `description` fields. The `description` field is the primary trigger mechanism (per agentskills.io spec, max 1024 chars), and getting it wrong is the highest-risk failure mode for a skill. The skill's trigger boundary is subtle: `/onboard-repo` targets repos with code but no `.project/`, while `/create-epic` Mode A targets brand-new projects, and `/migrate` targets repos with a pre-CLI `.project/`. The Phase 1 SKILL.md skeleton task should include a sub-task to draft the frontmatter with specific `name` and `description` values, so the reviewer can evaluate trigger accuracy. At minimum, the description must include: (1) what the skill does ("scans an existing codebase and scaffolds a complete .project/ directory"), (2) when to use it ("when the repo has code but no .project/"), and (3) when NOT to use it (distinguish from `/create-epic` and `/migrate`). Third person, imperative framing per convention.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 fixture generation script creates "at least 2 contributors in git log" but does not specify how — git config manipulation during fixture creation needs explicit documentation

Creating multiple git authors in a scripted fixture requires switching `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL` env vars between commits. This is a non-obvious implementation detail. Since Phase 5 relies on per-author commit analysis (`git shortlog -sn`, per-subsystem expertise), the fixture must produce realistic multi-author history. The task should specify the mechanism (env var override per commit block) and ensure at least one author maps to the test user's `git config user.name`. This is minor because any competent implementation would figure this out, but making it explicit prevents the fixture from having all commits by a single author (which would make expertise profiling tests vacuous).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 smoke test specifies "Clone a small open-source TypeScript repo" but does not name a specific repo or explain how to keep the test reproducible

The smoke test says "selection criteria: 50-500 commits, 3+ contributors, has PRs on GitHub" but leaves repo selection to the implementer. This introduces non-determinism — different repos will produce different results, making regression detection impossible. Options: (1) name a specific repo and pin to a commit SHA, (2) use a fork under the team's GitHub org, or (3) accept non-determinism and only check structural properties (files exist, non-empty). The plan already takes approach (3) with its "concrete success criteria" (`.project/` exists, `idea.md` non-empty, etc.), which is pragmatic. But naming a candidate repo (or 2-3 options) in the plan would help the implementer avoid spending time on selection. This is minor because the structural checks are sufficient for a smoke test.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 architecture extraction reference mentions "build import graph from grep" but does not account for TypeScript path aliases or barrel re-exports

The `references/architecture-extraction.md` task says "Dependency mapping: which subsystems import from which others (build import graph from Grep-based heuristics)." But TypeScript projects commonly use path aliases (e.g., `@/api/routes` via tsconfig `paths`) and barrel re-exports (`export * from './routes'` in `index.ts`). A naive grep for `import .* from '../api'` would miss aliased imports entirely, and barrel re-exports would show dependencies on the barrel file rather than the actual module. The reference file should document: (1) read tsconfig `paths` to resolve aliases before building the graph, (2) trace barrel re-exports to actual modules, (3) handle `import type` separately (design coupling but not runtime dependency). This matters for the maturity estimation — incorrect dependency graphs produce incorrect subsystem boundaries.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-3 issues have been addressed: on-demand reference loading (Step 0 loads only `cli-interaction.md`, others at point of use), negative test for pre-flight re-entry guard (exit 3), convention dispatch table in `convention-heuristics.md`, lower subsystem detection threshold with multi-signal heuristics, quest goal size constraint, `git rev-parse --show-toplevel` for expertise path derivation, and `epic:create` invocation in Step 12. The plan is well-structured with a definitive 13-step flow, proper progressive disclosure via 5 reference files, re-entry handling at every step, and a pragmatic test strategy acknowledging `gh` CLI limitations in fixtures. The remaining issues are refinements: aligning the test harness with the existing dogfood pattern (plain bun script, not Vitest), drafting the actual frontmatter description for trigger accuracy review, and TypeScript-aware import graph construction. To reach 10: draft the frontmatter and align the test harness description with the established pattern.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
