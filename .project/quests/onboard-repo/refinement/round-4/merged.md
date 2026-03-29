# Merged Feedback — onboard-repo Plan (Round 4)

### CRITICAL Issues

None.

### IMPORTANT Issues

**[IMPORTANT-1]** Test harness pattern mismatches existing dogfood convention — must use plain bun script, not Vitest

The plan references "Vitest framework" for the automated test, but the existing dogfood harness (`tools/dogfood/test-migrate.ts`) is a plain TypeScript script run via `bun` with no test runner. Vitest adds unnecessary overhead for a single SDK-driven integration test. The Phase 1 test architecture task should specify a standalone bun script (naming convention `test-onboard.ts` to match `test-migrate.ts`) that uses `@anthropic-ai/claude-agent-sdk` `query()` directly and handles setup/teardown imperatively. The `.test.ts` suffix must not imply Vitest.

Source: agent-skill (primary — domain-specific, confirmed against actual codebase file)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2]** SKILL.md frontmatter `name` and `description` fields are never drafted in the plan

The plan specifies trigger intent and boundary criteria ("onboard this repo", NOT migrate/create-epic phrases) but never drafts the actual YAML frontmatter. The `description` field (max 1024 chars) is the primary trigger mechanism and the highest-risk failure mode. The Phase 1 SKILL.md skeleton task must include a sub-task with specific `name` and `description` values covering: (1) what the skill does, (2) when to invoke it (repo has code but no `.project/`), (3) explicit distinction from `/create-epic` Mode A and `/migrate`. Third person, imperative framing per convention.

Source: agent-skill
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-3]** No plan task updates `expertise-tracking.md` consumer list to include `/onboard-repo`

`skills/_shared/references/expertise-tracking.md` maintains a `Current consumers:` list that enables coordinated updates when the two-layer expertise format changes. The plan makes `/onboard-repo` a consumer (Step 10 writes expertise data, Step 12 runs the end-of-run expertise check) but adds no task to append it to the consumer list. A task must be added to Phase 5 to update this list.

Source: software-architecture
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4]** Step 12 optional epic creation via `epic:create` on a zero-epic project — Mode A vs Mode B boundary not verified

Step 12 offers optional epic creation using the Mode B invocation pattern. For a freshly onboarded repo, this is the first epic — the state machine may not handle `epic:create` on a project with zero prior epics the same way Mode B expects. Since `onboard-repo` already writes `idea.md` at Step 4, the `idea.md` concern is addressed, but it is unclear whether `epic:create` on a project with zero previous epics (only `goodplan init` called at Step 3) is validated anywhere. The plan should either add an explicit verification note confirming this path works, or add a test case to the dogfood harness that exercises it.

Source: software-architecture
Resolution: CODEBASE_EXPLORATION

### MINOR Issues

**[MINOR-1]** Multi-author fixture commits: mechanism not specified — risk of single-author fixture

Both holistic and agent-skill flag that the fixture script must produce commits from multiple authors, but neither the plan nor either reviewer specifies the mechanism. Using `--author` flags on individual `git commit` calls is the cleanest approach (avoids mutating global git config if the script fails mid-run). The task should specify `git commit --author "Name <email>"` per commit block, with at least one author matching the test user's `git config user.name` so expertise profiling tests are meaningful.

Source: holistic + agent-skill (deduplicated; software-architecture also flags this but focuses on git config mutation risk — same root issue)
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2]** Smoke test repo not pinned — non-determinism makes regression detection difficult

The smoke test selects a small open-source TypeScript repo by criteria (50-500 commits, 3+ contributors, has PRs on GitHub) but names no specific repo. This introduces non-determinism across runs. The structural success criteria (`.project/` exists, `idea.md` non-empty, etc.) are sufficient for a smoke test, but naming 1-3 candidate repos (or pinning to a specific repo + commit SHA after first run) would reduce implementer friction and allow regression detection.

Source: software-architecture + agent-skill (deduplicated)
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3]** Phase 2 architecture extraction does not account for TypeScript path aliases or barrel re-exports

`references/architecture-extraction.md` specifies "build import graph from Grep-based heuristics" but naive grep misses path aliases (e.g., `@/api/routes` via tsconfig `paths`) and treats barrel re-exports as the dependency target rather than the actual module. The reference should document: (1) read tsconfig `paths` before building the graph, (2) trace barrel re-exports to actual modules, (3) treat `import type` as design coupling (not runtime dependency). Incorrect dependency graphs produce incorrect subsystem boundaries and maturity estimates.

Source: agent-skill
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4]** Phase 5 conventions.md housekeeping task is misplaced — belongs in Phase 1 or flagged explicitly

The last task in Phase 5 updates `conventions.md` to add `onboard-repo/` to the repo structure skills list. This is the only non-skill file touched beyond the install script, and it is a repo housekeeping item mixed into a phase about skill logic. It should be moved to the end of Phase 1 (when skill files are created) or at minimum flagged as a cross-cutting housekeeping item so the implementer doesn't overlook it.

Source: holistic
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5]** Phase 5 smoke test does not verify expertise memory file path derivation

The smoke test checks that "expertise memory file exists in `~/.claude/projects/<project>/memory/`" but does not verify the path derivation logic (slashes in the absolute repo path replaced by dashes). For a repo at `/tmp/some-repo`, the expected path is `~/.claude/projects/-tmp-some-repo/memory/expertise_*.md`. The test should assert the actual path matches this derivation, not just that some file exists.

Source: holistic
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-6]** Multi-language convention heuristics are untested — this should be acknowledged as a known limitation

Phase 2 convention-heuristics.md includes a dispatch table for Python (`pyproject.toml`/mypy/ruff), Rust (`Cargo.toml`/clippy), Go, and Java, but the only fixture and the only smoke test are TypeScript. Non-TypeScript heuristics are completely unverified. The plan should explicitly acknowledge this as a known limitation (or queue a future side quest), rather than leaving it to appear as uncovered scope.

Source: holistic
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-7]** Variant B summary fields in Step 12 are onboard-repo-specific extensions — should be noted as such

Step 12 specifies "project initialized, N subsystems identified, N conventions detected, N migrations found, N quests created, expertise profile built" as summary fields. These are a superset of what Variant B in `output-templates.md` specifies. Since Variant B is explicitly flexible, this is acceptable, but the plan should note these are onboard-repo-specific extensions of Variant B — not fields to be added to `output-templates.md` — to prevent future implementers from thinking the shared template needs updating.

Source: software-architecture
Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE

Count: 9 (IMPORTANT-1, IMPORTANT-2, IMPORTANT-3, MINOR-1 through MINOR-7)

### RESEARCH_NEEDED

Count: 1

- **IMPORTANT-4**: Verify `epic:create` behavior on a project with zero prior epics. Requires codebase exploration of the `epic:create` command and state machine to confirm Mode B works after `goodplan init` with no existing epics.

### Contradictions Resolved

None. All reviewers are consistent. Where multiple reviewers raised the same issue (MINOR-1: multi-author fixture mechanism; MINOR-2: smoke test non-determinism), the most specific version was kept. On domain-specific issues (test harness pattern, SKILL.md frontmatter), the agent-skill reviewer's judgment takes precedence over the generalist (holistic) per the specialist-over-generalist rule.

### Unresolved (USER_INPUT required)

None.
