# Merged Feedback — Remaining Skills + Cleanup (Round 1)

## CRITICAL Issues

### C1. Phase 1 create-side-quest assumes quest `exploring`/`explored` statuses that do not exist
**Flagged by:** agent-skill, tui-cli
**Files:** plan.md Phase 1, `src/schemas/entities/quest.ts`

The create-side-quest pipeline is designed as a 4-phase pipeline with Phase 2 transitioning `created` -> `exploring` -> `explored`. However, the quest entity status lifecycle only supports: `created`, `planning`, `plan-created`, `refining`, `plan-refined`, `implementing`, `implementation-complete`, `completed`, `abandoned`. There are no `exploring` or `explored` statuses for quests. The `start-explore` CLI command only accepts `--epic`, not `--quest`. The plan's phase table, CLI status mapping, re-entry logic, and the `gp start-explore --quest <name>` command call are all based on non-existent quest state transitions. Either the quest schema/CLI need new transitions (significant scope expansion), or the explore phase must be dropped (reducing to a 3-phase pipeline: goal capture, plan Q&A, plan draft/refinement), or exploration must happen without CLI status tracking.

Resolution: DIRECTLY_ACTIONABLE — Redesign Phase 1 to either drop the explore phase or explicitly scope the required schema/CLI changes as prerequisite work.

---

### C2. Phase 5 reviewer count mismatch: plan says 18 total (6 existing + 12 new) but architecture specifies 20 domains and task list enumerates 14 new
**Flagged by:** holistic, software-architecture, agent-skill, repo-tooling, tui-cli (all five reviewers)
**Files:** plan.md overview, Phase 5 intro, Phase 5 Expected Behavior assertions

The architecture spec (`skill-model-api.md`) lists 20 reviewer domains. Phase 5's task list enumerates 14 new reviewers. 6 existing + 14 new = 20 total. But the overview says "12 new" / "18-domain", and Expected Behavior asserts `ls agents/reviewer-*.md | wc -l` returns 18 and `ls skills/_shared/references/review-*.md | wc -l` returns 18. The task list is correct; the summary numbers are wrong everywhere.

Resolution: DIRECTLY_ACTIONABLE — Update overview to "14 new reviewer agent definitions complete the reviewer infrastructure (matching the 20-domain architecture spec)." Update all count assertions to 20.

---

## IMPORTANT Issues

### I1. Phase 6 does not update shared reference files that mention deleted skill names
**Flagged by:** software-architecture
**Files:** `skills/_shared/references/cli-interaction.md`, `skills/_shared/references/expertise-tracking.md`, `skills/_shared/references/decisions-format.md`, `skills/_shared/references/epic-conventions.md`

Multiple shared reference files contain references to old skill names (`/project-status`, `/create-architecture`, `/create-slices`, `/complete`, `/audit-architecture`, `/onboard-repo`, `/create-plan`, `/refine-plan`, `/implement-plan`, `/refine-architecture`, `/refine-slices`). These are injected into agent contexts via `@` references. Stale skill names would confuse sub-agents. Phase 6 covers skill directory deletions and `build-plugin.sh` updates but not reference file hygiene.

Resolution: DIRECTLY_ACTIONABLE — Add a task to Phase 6 to grep all `skills/_shared/references/*.md` for the 15 deleted skill names and update to new consolidated names.

---

### I2. Phase 4 renames do not specify reference file disposition
**Flagged by:** software-architecture, repo-tooling, agent-skill, tui-cli
**Files:** `skills/migrate/references/migration-heuristics.md`, `skills/project-status/references/status-logic.md`, `skills/onboard-repo/references/*.md` (5 files)

The plan says "Copy reference files from `skills/migrate/references/` if needed" — the "if needed" is ambiguous. Since Phase 6 deletes old directories, any files not explicitly copied will be lost. The migrate skill has `migration-heuristics.md`, project-status has `status-logic.md`, and onboard-repo has 5 reference files critical for onboarding quality.

Resolution: DIRECTLY_ACTIONABLE — Make copy tasks definitive: copy `migration-heuristics.md` to `skills/upgrade/references/`, copy `status-logic.md` to `skills/status/references/`. For init/onboard-phase, specify whether the 5 onboard-repo reference files move to `skills/init/references/` or `skills/_shared/references/`.

---

### I3. Phase 5 does not update reviewer registry to new agent-based infrastructure
**Flagged by:** repo-tooling
**Files:** `skills/implement/references/reviewer-registry.md` (and duplicates in `skills/refine-plan/references/`, `skills/refine-slices/references/`, `skills/refine-architecture/references/`)

The current reviewer registry references prompt files via section-based lookups into monolithic reference files (`reviewers-language.md`, `reviewers-scientific.md`, `reviewers-web.md`, `reviewers-ai-tooling.md`). The new model uses individual agent `.md` files with separate criteria files in `skills/_shared/references/review-*.md`. Phase 5 creates new agents/criteria but doesn't update the registry. Since Phase 6 deletes old skills containing old-style registries, this needs updating.

Resolution: DIRECTLY_ACTIONABLE — Add a task to Phase 5 to update the reviewer registry in `skills/implement/references/` to reference new agent-based reviewer infrastructure.

---

### I4. Phase 3 `test-init.ts` expected-behavior references a file that does not exist
**Flagged by:** holistic, agent-skill
**Files:** plan.md Phase 3 Expected Behavior

The "Before" section states `ls tools/dogfood/test-init.ts` "exists but tests old skill. New version needed." The file does not exist. The correct existing files are `test-onboard.ts` and `test-migrate.ts`.

Resolution: DIRECTLY_ACTIONABLE — Fix to say "file does not exist" and clarify that `test-init.ts` replaces `test-onboard.ts` functionality.

---

### I5. Phase 4 renames have no test harness coverage
**Flagged by:** holistic
**Files:** plan.md Phase 4

Phases 1-3 each include test harness scripts. Phase 4 creates three renamed skills (task, upgrade, status) but includes no test scripts. The existing `test-migrate.ts` and `test-onboard.ts` test the old skills being replaced. At minimum, add basic smoke tests verifying each renamed skill loads and responds to trigger phrases.

Resolution: DIRECTLY_ACTIONABLE — Add test harness tasks to Phase 4 for task, upgrade, and status skills.

---

### I6. Phase 6 cleanup does not mention updating/deleting stale test harness files
**Flagged by:** holistic
**Files:** `tools/dogfood/test-onboard.ts`, `tools/dogfood/test-migrate.ts`, `tools/dogfood/validate.ts`

When old skill directories are deleted, corresponding dogfood test files become stale. The plan should include tasks to delete or update `test-onboard.ts`, `test-migrate.ts`, and review `validate.ts` for old skill name references.

Resolution: DIRECTLY_ACTIONABLE — Add cleanup/update tasks for stale dogfood test files in Phase 6.

---

### I7. Phase 1 create-side-quest missing re-entry status-to-phase mapping table
**Flagged by:** agent-skill
**Files:** plan.md Phase 1

The `create-epic` and `plan-slice` skills include explicit status-to-phase mapping tables for re-entry. The create-side-quest plan only mentions "check `status`, offer continue/go-back" without defining the actual mapping.

Resolution: DIRECTLY_ACTIONABLE — Add an explicit status-to-phase mapping table matching the established pattern from create-epic.

---

### I8. Phase 2 audit agents missing tool access specification
**Flagged by:** agent-skill
**Files:** plan.md Phase 2

The audit-architecture-phase, audit-docs-phase, and audit-tests-phase agents need explicit `allowedTools` and `disallowedTools` specifications. Existing agents always specify these. Based on the description (scan codebase, produce findings), they likely need `allowedTools: ["Read", "Grep", "Glob"]` and `disallowedTools: ["Agent"]`.

Resolution: DIRECTLY_ACTIONABLE — Add explicit tool access specs for all three audit agents.

---

### I9. Phase 6 `package.json` `install:skills` script update is vague
**Flagged by:** repo-tooling
**Files:** `package.json`

Phase 6 says "Update `package.json` if it has an `install:skills` script — remove or update it." The script exists and references `install-skills.sh` which is being deleted. This will break.

Resolution: DIRECTLY_ACTIONABLE — Change to definitive: remove the `install:skills` script from `package.json`.

---

### I10. No error-path verification for new skills
**Flagged by:** tui-cli
**Files:** plan.md (all phases with new skills)

None of the phases include verification that skills produce helpful output when invoked without arguments, with incorrect arguments, or when the CLI is unavailable. Test harness scripts verify happy paths only.

Resolution: DIRECTLY_ACTIONABLE — Add error-path verification tasks (graceful degradation, meaningful error messages) for each new skill.

---

## MINOR Issues

### M1. Phase 1 re-entry test expected behavior is underspecified
**Flagged by:** holistic, repo-tooling
The re-entry test says "verify it starts at plan Q&A phase, not goal capture" but doesn't define a concrete observable (CLI status or output) to assert on.

Resolution: DIRECTLY_ACTIONABLE — Add a concrete assertion (e.g., check CLI status output or sub-agent invocation) that proves correct phase entry.

---

### M2. Phase 4 references `gp task:create` — plan should clarify CLI command name is unchanged
**Flagged by:** holistic
The plan should note that the CLI command `task:create` already exists and doesn't change; only the skill name changes from `capture` to `task`.

Resolution: DIRECTLY_ACTIONABLE — Add clarifying note.

---

### M3. Phase 6 git log verification is not automatable
**Flagged by:** holistic, tui-cli
"Verify sub-ordering discipline: `git log --oneline` shows build-phase commits before cleanup-phase commits" is a manual visual check. Either remove or make it a concrete grep assertion.

Resolution: DIRECTLY_ACTIONABLE — Remove or convert to automated assertion.

---

### M4. Phase 1 missing version check (Step 0) specification
**Flagged by:** agent-skill
The create-epic and plan-slice skills start with "Step 0 -- Version Check" using `GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"`. This should be explicit in create-side-quest tasks.

Resolution: DIRECTLY_ACTIONABLE — Add version check step.

---

### M5. Phase 1 create-side-quest missing context discipline section
**Flagged by:** agent-skill
Both create-epic and plan-slice include an explicit "Context Discipline" section in SKILL.md. Create-side-quest mentions it briefly but doesn't formalize it.

Resolution: DIRECTLY_ACTIONABLE — Add formal Context Discipline section to create-side-quest SKILL.md spec.

---

### M6. Phase 6 `ls skills/` count assertion could be more precise
**Flagged by:** repo-tooling
The before/after count assertions would be clearer using `grep -v _shared | wc -l` for exact counts.

Resolution: DIRECTLY_ACTIONABLE — Improve count assertion specificity.

---

### M7. Phase 2 audit skill argument parsing pattern not specified
**Flagged by:** tui-cli
The plan says "Parse mode from argument" but doesn't specify how (positional, flag, etc.).

Resolution: DIRECTLY_ACTIONABLE — Specify argument parsing approach matching existing skill patterns.

---

### M8. Phase 1 test script missing `--max-iterations` default documentation
**Flagged by:** tui-cli
The re-entry test doesn't specify default iteration counts, unlike other test scripts.

Resolution: DIRECTLY_ACTIONABLE — Document default `--max-iterations` for both full and re-entry scenarios.

---

### M9. Phase 4 renames upgrading frontmatter (adding `user-invocable: true`) should be noted as intentional
**Flagged by:** agent-skill
Source skills don't have `user-invocable: true`; the renames are adding it. This should be explicit.

Resolution: DIRECTLY_ACTIONABLE — Note as intentional frontmatter upgrade.

---

### M10. Phase 6 should also assert agent count, not just skill count
**Flagged by:** agent-skill, tui-cli
Phase 6 asserts `build:plugin` packages 12 skills but has no parallel assertion for agent count (should be ~32 after adding 14 new reviewers).

Resolution: DIRECTLY_ACTIONABLE — Add agent count assertion to Phase 6 verification.

---

## DIRECTLY_ACTIONABLE

1. **C1 — Redesign Phase 1 create-side-quest pipeline** to drop the explore phase (quest statuses `exploring`/`explored` don't exist, `start-explore --quest` doesn't exist). Reduce to 3 phases: (1) goal capture, (2) plan Q&A, (3) plan draft/refinement. Remove all references to `gp start-explore --quest`, `exploring`/`explored` statuses, and explore-phase agent invocation from Phase 1 tasks.

2. **C2 — Fix reviewer counts everywhere**: In plan.md overview, change "12 new" to "14 new" and "18-domain" to "20-domain". In Phase 5 intro and Expected Behavior, update all count assertions from 18 to 20. Update `ls agents/reviewer-*.md | wc -l` expected to 20 and `ls skills/_shared/references/review-*.md | wc -l` expected to 20.

3. **I1 — Add shared reference file cleanup task to Phase 6**: New task to grep `skills/_shared/references/*.md` for all 15 deleted skill names and update references to new consolidated names.

4. **I2 — Make reference file copy tasks definitive in Phase 4**: Replace "if needed" with concrete tasks: copy `migration-heuristics.md` to `skills/upgrade/references/`, copy `status-logic.md` to `skills/status/references/`. For init, specify destination of all 5 onboard-repo reference files.

5. **I3 — Add reviewer registry update task to Phase 5**: Update `skills/implement/references/reviewer-registry.md` to reference new agent-based reviewer paths.

6. **I4 — Fix Phase 3 expected behavior**: Change `test-init.ts` "exists but tests old skill" to "file does not exist; replaces `test-onboard.ts` functionality."

7. **I5 — Add test harness tasks to Phase 4**: Create smoke tests for task, upgrade, and status skills (load and respond to trigger phrases).

8. **I6 — Add stale test cleanup to Phase 6**: Delete or update `test-onboard.ts`, `test-migrate.ts`; review `validate.ts` for old skill references.

9. **I7 — Add status-to-phase mapping table to Phase 1**: Follow create-epic pattern with explicit quest status -> pipeline phase mapping.

10. **I8 — Add tool access specs to Phase 2 audit agents**: `allowedTools: ["Read", "Grep", "Glob"]`, `disallowedTools: ["Agent"]` for all three audit phase agents.

11. **I9 — Make Phase 6 `package.json` task definitive**: Change to "Remove the `install:skills` script from `package.json`."

12. **I10 — Add error-path verification**: For each new skill, verify graceful degradation when invoked with wrong arguments or missing CLI.

13. **M1 — Specify concrete re-entry test assertion** (observable output proving correct phase).

14. **M2 — Clarify `gp task:create` CLI name is unchanged** in Phase 4.

15. **M3 — Remove or automate git log verification** in Phase 6.

16. **M4 — Add version check step** to Phase 1 create-side-quest tasks.

17. **M5 — Add formal Context Discipline section** to create-side-quest spec.

18. **M6 — Improve Phase 6 skill count assertions** with explicit `grep -v _shared`.

19. **M7 — Specify audit skill argument parsing** (positional first argument, matching existing patterns).

20. **M8 — Document `--max-iterations` defaults** for Phase 1 test script.

21. **M9 — Note `user-invocable: true` addition** as intentional upgrade in Phase 4.

22. **M10 — Add agent count assertion** to Phase 6 build verification.

---

## RESEARCH_NEEDED

### R1. Monolithic `reviewers-cross-cutting.md` deletion after per-domain decomposition
**Flagged by:** software-architecture
**Files:** `skills/_shared/references/reviewers-cross-cutting.md`
Phase 5 creates per-domain review criteria files but neither Phase 5 nor Phase 6 mentions deleting the monolithic `reviewers-cross-cutting.md`. Need to verify: (a) whether the monolithic file is fully decomposed by the new per-domain files, (b) whether any remaining `@` references point to it.
Resolution: CODEBASE_EXPLORATION

### R2. Phase 6 `test-plugin-skills.ts` may have hardcoded skill counts/names
**Flagged by:** software-architecture
**Files:** `tools/dogfood/test-plugin-skills.ts`
Need to check if this file has hardcoded skill counts or name lists from the pre-consolidation era that would need updating.
Resolution: CODEBASE_EXPLORATION

### R3. Phase 2 audit shared reference injection paths may not exist
**Flagged by:** agent-skill
**Files:** `skills/_shared/references/audit-conventions.md`, `skills/_shared/references/maturity-conventions.md`
The plan references injecting `audit-conventions` and `maturity-conventions` shared references, but these files may not exist. Need to check what convention reference files are available.
Resolution: CODEBASE_EXPLORATION

### R4. Phase 4 reference file existence needs verification
**Flagged by:** tui-cli
**Files:** `skills/migrate/references/`, `skills/project-status/references/`
Need to confirm which reference files exist in these directories before specifying copy tasks.
Resolution: CODEBASE_EXPLORATION

### R5. Re-entry test quest status manipulation mechanism
**Flagged by:** repo-tooling
Need to check if CLI commands exist to create a quest at a specific status for re-entry testing (e.g., `gp quest:transition`).
Resolution: CODEBASE_EXPLORATION

---

## Contradictions Resolved

1. **Agent placement in `agents/` directory** — holistic flagged this as a possible concern (single-purpose audit agents in shared `agents/` directory). software-architecture noted the naming is fine and marked it N/A. **Resolved: trust software-architecture** — the `agents/` directory convention allows phase-level agents regardless of reuse scope. Elevated to USER_INPUT since the holistic reviewer specifically requested user input on whether `agents/audit/` subdirectory is preferred.

2. **Phase 4 reference files: "if needed" vs definitive** — repo-tooling and tui-cli disagreed on whether the reference files exist. software-architecture and agent-skill confirmed they do. **Resolved: trust the reviewers who identified specific files** (software-architecture named exact files and sizes). Made copy tasks definitive in DIRECTLY_ACTIONABLE.

3. **Reviewer count target: 18 vs 20 vs 21** — repo-tooling noted the reviewer registry lists 21 distinct domains (including C++ and Background Jobs not in the architecture spec). Other reviewers converged on 20 from the architecture spec. **Resolved: 20 is correct per architecture spec.** The extra registry entries are aspirational and not yet planned. Noted in C2 fix.

---

## Unresolved (USER_INPUT required)

### U1. Should audit phase agents live in `agents/` or `agents/audit/`?
**Flagged by:** holistic
**Context:** The plan places `audit-architecture-phase.md`, `audit-docs-phase.md`, `audit-tests-phase.md` directly in `agents/`. The `agents/` directory currently holds shared infrastructure agents reused across multiple skills. The audit agents are single-purpose (only used by `/gp:audit`). Placing them alongside shared agents may muddy the directory's purpose as more single-skill agents accumulate.
**Question:** Should single-purpose phase agents go directly in `agents/` (flat, following current convention), or in a subdirectory like `agents/audit/` (organized by skill)?

### U2. Should create-side-quest include an explore phase at all?
**Flagged by:** agent-skill, tui-cli
**Context:** The quest state machine has no `exploring`/`explored` statuses. Three options: (a) drop explore phase entirely (simplest, 3-phase pipeline), (b) add quest explore statuses and `start-explore --quest` CLI support (scope expansion), (c) do exploration without CLI status tracking (informal, loses re-entry capability). The create-epic pipeline has exploration as Phase 2 because epics are larger scope; side quests may not need it.
**Question:** Which approach for create-side-quest: drop explore (3-phase), add quest explore support (scope expansion), or informal explore (no status tracking)?

### U3. `create-epic` frontmatter inconsistency
**Flagged by:** software-architecture
**Context:** The plan adds `user-invocable: true` to all new skills, but the existing `create-epic` skill doesn't have it. This creates an inconsistency. The plan could add a small task to fix `create-epic` frontmatter for consistency.
**Question:** Should the plan include a task to add `user-invocable: true` to `skills/create-epic/SKILL.md`?
