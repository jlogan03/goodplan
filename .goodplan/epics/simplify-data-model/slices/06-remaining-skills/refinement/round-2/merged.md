# Merged Feedback — Remaining Skills + Cleanup (Round 2)

## CRITICAL Issues

### C1. Reviewer agent count inconsistent across overview, Phase 5, and expected-behavior assertions
**Flagged by:** repo-tooling (CRITICAL), holistic (IMPORTANT), agent-skill (IMPORTANT), tui-cli (IMPORTANT)

Phase 5 task list enumerates **14** new reviewer agents. With 6 existing, that is **20 total**. The architecture spec (`skill-model-api.md`) confirms 20. However:
- Overview paragraph says "Twelve new" and "18-domain architecture spec"
- Overview Phase 5 table row says "12 remaining"
- Phase 5 Expected Behavior asserts `ls agents/reviewer-*.md | wc -l` returns 18
- Phase 5 Expected Behavior asserts `ls skills/_shared/references/review-*.md | wc -l` returns 18 — but 7 criteria files already exist (including `review-preamble.md`), so 7 + 14 = 21 (or 20 excluding the preamble). This assertion also needs correction.

**Fix:** Update all four locations to say 14 new / 20 total. Correct the review criteria file count assertion as well. If any domains are being deliberately dropped, remove them from the task list and document why.

Resolution: DIRECTLY_ACTIONABLE

---

## IMPORTANT Issues

### I1. Phase 1 quest exploration transitions lack specificity — transition table, events, RPC, context, and fitness function all need explicit tasks
**Flagged by:** holistic (IMPORTANT), software-architecture (IMPORTANT), agent-skill (IMPORTANT), tui-cli (IMPORTANT)

Phase 1 Sub-phase A says "Add quest transitions for exploring/explored in the state machine" but is too vague for implementation. The following distinct code changes are needed:

1. **Transition table** — add rows to `.goodplan/architecture/transition-tables.md`:
   - `created -> BEGIN_QUEST_EXPLORE -> exploring`
   - `exploring -> COMPLETE_QUEST_EXPLORE -> explored`
   - `created -> COMPLETE_QUEST_EXPLORE -> explored` (skip-explore path, mirrors epic pattern)
   - `explored -> BEGIN_QUEST_PLAN -> planning` (replaces current `created -> BEGIN_QUEST_PLAN -> planning`)
2. **Event schema** — add `BEGIN_QUEST_EXPLORE` and `COMPLETE_QUEST_EXPLORE` to `src/schemas/state-events.ts`
3. **Transition handlers** — add to `src/core/state/transitions/quest-phase.ts` (mirroring `epic-phase.ts`)
4. **RPC layer** — update `src/core/rpc/begin.ts` and `src/core/rpc/submit.ts` to handle quest-scoped explore
5. **Context module** — extend explore priority table in `src/core/context/priorities.ts` for quest scope, update `startContext()` target resolution
6. **Fitness functions** — verify `tests/fitness/transition-completeness.test.ts` and `state-machine-purity.test.ts` (INV-003) still pass
7. **activeQuest guard** — specify whether `BEGIN_QUEST_EXPLORE` sets `project.json activeQuest` (see I2 below)

**Fix:** Enumerate these as explicit sub-tasks in Sub-phase A.

Resolution: DIRECTLY_ACTIONABLE

### I2. Phase 1 `activeQuest` guard interaction not specified for explore phase
**Flagged by:** software-architecture (MINOR, upgraded to IMPORTANT during merge due to dependency on I1)

Currently `BEGIN_QUEST_PLAN` requires `activeQuest == null` and sets it. The epic pattern: `BEGIN_EXPLORE` does NOT set `activeEpic`. If `BEGIN_QUEST_EXPLORE` sets `activeQuest`, it blocks other quests during a potentially long explore phase. If it doesn't, multiple quests can be active simultaneously.

**Fix:** Phase 1 Sub-phase A should specify whether `BEGIN_QUEST_EXPLORE` sets `activeQuest` and document the rationale. Recommend following epic pattern (don't set it during explore).

Resolution: DIRECTLY_ACTIONABLE

### I3. Phase 1 `submit-explore` quest support underspecified
**Flagged by:** agent-skill (IMPORTANT), tui-cli (IMPORTANT)

The plan says "Extend `submit-explore` CLI command to support quest exploration submission" with no detail. `src/commands/subagent/submit-explore.ts` currently only accepts `--epic`. Need to specify: add `--quest <name>` flag (mutually exclusive with `--epic`), route to `COMPLETE_QUEST_EXPLORE` event in the RPC submit layer. This parallels how `submit-plan`/`submit-refinement`/`submit-implementation` handle `--slice|--quest` mutual exclusivity.

**Fix:** Add implementation detail to the submit-explore task: flag definition, RPC routing, event dispatch.

Resolution: DIRECTLY_ACTIONABLE

### I4. Phase 5 reviewer registry update is a full rewrite, not an incremental update — and only needs to target `skills/implement/references/`
**Flagged by:** holistic (IMPORTANT), software-architecture (IMPORTANT), agent-skill (IMPORTANT), repo-tooling (IMPORTANT)

The current registry uses `Prompt File` + `Section` columns pointing to monolithic files (`reviewers-language.md`, `reviewers-scientific.md`, etc.) that live under skills scheduled for deletion. These monolithic files never actually worked at runtime — the section-based lookup format was never implemented. The task must specify:
1. This is a **full rewrite** of the registry format, not an incremental update
2. New format: replace `Prompt File` + `Section` columns with `Agent` column referencing `agents/reviewer-*.md` + separate criteria `review-*.md`
3. List exactly the 20 agents that will exist — no aspirational entries (remove C++ and Background Jobs rows)
4. Only `skills/implement/references/reviewer-registry.md` needs updating; the copies in `refine-plan/` and `refine-architecture/` are deleted in Phase 6 (note this dependency explicitly)

Resolution: DIRECTLY_ACTIONABLE

### I5. Phase 6 orphaned `reviewers-cross-cutting.md` (31KB) not explicitly addressed
**Flagged by:** holistic (MINOR), software-architecture (IMPORTANT), agent-skill (IMPORTANT), tui-cli (MINOR)

After Phase 5 creates per-domain `review-*.md` files and Phase 6 deletes `refine-plan/` and `refine-slices/`, the file `skills/_shared/references/reviewers-cross-cutting.md` will be orphaned. The Phase 6 audit task should explicitly list this as a known deletion candidate.

**Fix:** Add explicit task to Phase 6: grep all surviving skills and agents for references to `reviewers-cross-cutting.md`. If none remain, delete it.

Resolution: DIRECTLY_ACTIONABLE

### I6. Phase 6 `validate.ts` rewrite is significantly underspecified
**Flagged by:** repo-tooling (IMPORTANT)

`validate.ts` references 13+ old skill names across ~15 lines. The entire epic and quest workflow needs restructuring to use new consolidated skill names (`create-epic`, `plan-slice`, `implement`). Previously sequential skill invocations become single pipeline invocations. "Review and update" is too vague.

**Fix:** The task should: (a) list the specific old-to-new skill name mappings, (b) note the workflow structure change (sequential -> pipeline), (c) acknowledge this may require restructuring logic, not just find-and-replace.

Resolution: DIRECTLY_ACTIONABLE

### I7. Phase 2 audit skill error handling needs specificity
**Flagged by:** tui-cli (IMPORTANT)

The plan says "report the error with a helpful message and stop gracefully" but doesn't distinguish between CLI binary not found (plugin not installed), exit code 1 (state error), and exit code 2 (usage error per INV-007). The existing pattern in `create-epic/SKILL.md` Step 0 provides a template.

**Fix:** Reference the existing error handling pattern from `create-epic/SKILL.md` Step 0 and specify distinct messages for each failure mode.

Resolution: DIRECTLY_ACTIONABLE

### I8. Phase 2 audit skill re-entry pattern deviates from orchestrator pattern without justification
**Flagged by:** software-architecture (MINOR, upgraded to IMPORTANT during merge — pattern consistency matters)

The audit skill checks for filesystem artifacts for re-entry, but the orchestrator pattern says "phase detection uses the CLI exclusively." Since audit is a standalone skill (not a pipeline), this may be acceptable, but should be explicitly noted as a deviation.

**Fix:** Explicitly note this as an acceptable deviation from the pipeline re-entry pattern since audit is standalone.

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

### M1. Phase 3 init skill `--mode` override mechanism unclear
**Flagged by:** holistic (MINOR), tui-cli (MINOR)

Skills receive context from user's natural language, not formal CLI flags. Clarify whether `--mode` is parsed from invocation text or handled via AskUserQuestion when ambiguous.

Resolution: DIRECTLY_ACTIONABLE

### M2. Phase 4 no semantic equivalence check for adapted skills
**Flagged by:** holistic (MINOR)

Phase 4 creates skills adapted from existing ones. Verification checks frontmatter but not that the skill body is semantically equivalent. A diff-based check would catch accidental content loss.

Resolution: DIRECTLY_ACTIONABLE

### M3. Phase 4 reference file existence not verified before copy
**Flagged by:** tui-cli (MINOR)

The plan assumes `skills/migrate/references/` exists with copyable files. Include an `ls` verification step with fallback if files don't exist.

Resolution: CODEBASE_EXPLORATION

### M4. Phase 4 reference files for init skill should be listed explicitly
**Flagged by:** agent-skill (MINOR)

The task says "copy the 5 reference files from `skills/onboard-repo/references/`" but doesn't name them. List: `architecture-extraction.md`, `convention-heuristics.md`, `expertise-profiling.md`, `migration-detection.md`, `repo-scanning.md`.

Resolution: DIRECTLY_ACTIONABLE

### M5. Phase 3 init skill auto-detection should exclude `.goodplan/`
**Flagged by:** agent-skill (MINOR)

The heuristic checks for source code files but could false-positive on `.goodplan/` contents. Explicitly exclude it from the scan.

Resolution: DIRECTLY_ACTIONABLE

### M6. Phase 5 no end-to-end test for reviewer agents
**Flagged by:** agent-skill (MINOR)

Phases 1-4 each have dogfood test scripts. Phase 5 only checks file existence. A lightweight Agent SDK test spawning a single reviewer with a fixture would catch prompt/reference resolution issues.

Resolution: DIRECTLY_ACTIONABLE

### M7. Phase 6 `bun test` may break on old skill name references
**Flagged by:** holistic (MINOR)

If unit tests import from deleted skill directories or reference old names, they will break. Add: grep for old skill names in `src/**/*.test.ts` and `tests/`.

Resolution: CODEBASE_EXPLORATION

### M8. Phase 6 `test-plugin-skills.ts` skill name assertions need updating
**Flagged by:** repo-tooling (MINOR)

The `expectedSkills` array needs updating to the 12 new skill names, not just the count.

Resolution: DIRECTLY_ACTIONABLE

### M9. Phase 6 `test-migrate.ts` replacement by `test-renames.ts` has coverage gap
**Flagged by:** repo-tooling (MINOR)

`test-migrate.ts` tests actual migration functionality. `test-renames.ts` only tests skill discoverability. Either expand `test-renames.ts`, create a separate `test-upgrade.ts`, or accept and document the gap.

Resolution: DIRECTLY_ACTIONABLE

### M10. Phase 3 `test-init.ts` may not cover `test-onboard.ts` functional scope
**Flagged by:** repo-tooling (MINOR)

`test-onboard.ts` tests actual onboarding behavior with generated fixtures. Clarify whether `test-init.ts` includes these functional tests or deliberately reduces coverage.

Resolution: DIRECTLY_ACTIONABLE

### M11. Phase 6 does not mention `scripts/generate-onboard-fixture.sh`
**Flagged by:** repo-tooling (IMPORTANT, downgraded to MINOR — depends on codebase exploration result)

If `test-init.ts` uses a different fixture approach, this script becomes orphaned. Needs exploration.

Resolution: CODEBASE_EXPLORATION

### M12. Phase 6 shared reference audit should list specific orphan candidates
**Flagged by:** tui-cli (MINOR)

`skills/_shared/references/` contains 26 files. The audit task should list known candidates beyond `reviewers-cross-cutting.md`.

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE
1. **C1** — Fix reviewer count to 14 new / 20 total in overview, phase table, and expected-behavior assertions; fix review criteria count assertion
2. **I1** — Enumerate all 7 code touchpoints for quest explore transitions in Sub-phase A
3. **I2** — Specify `activeQuest` guard behavior for `BEGIN_QUEST_EXPLORE`
4. **I3** — Add implementation detail for `submit-explore --quest` (flag, RPC routing, event)
5. **I4** — Clarify reviewer registry update is a full rewrite; specify new format; list exactly 20 agents
6. **I5** — Add explicit task to Phase 6 to grep for and delete orphaned `reviewers-cross-cutting.md`
7. **I6** — Specify `validate.ts` rewrite scope with old-to-new mappings and workflow structure changes
8. **I7** — Reference existing error pattern for audit skill error handling
9. **I8** — Note audit re-entry as acceptable deviation from pipeline pattern
10. **M1** — Clarify `--mode` mechanism for init skill
11. **M2** — Add diff-based semantic equivalence check for adapted skills
12. **M4** — List the 5 reference files by name for init skill copy
13. **M5** — Exclude `.goodplan/` from init auto-detection heuristic
14. **M6** — Add lightweight reviewer agent end-to-end test
15. **M8** — Update `expectedSkills` array in `test-plugin-skills.ts`
16. **M9** — Address `test-migrate.ts` -> `test-renames.ts` coverage gap
17. **M10** — Clarify `test-init.ts` vs `test-onboard.ts` functional coverage
18. **M12** — List specific orphan candidates for shared reference audit
Count: 18

## RESEARCH_NEEDED
1. **M3** — Verify `skills/migrate/references/` exists before Phase 4 copy tasks
2. **M7** — Grep for old skill names in test files (`src/**/*.test.ts`, `tests/`)
3. **M11** — Check if `generate-onboard-fixture.sh` is used by `test-init.ts` or orphaned
Count: 3

## Contradictions Resolved

1. **repo-tooling rated C1 as CRITICAL; others rated it IMPORTANT.** Resolved: elevated to CRITICAL. This is a concrete assertion that will cause Phase 5 expected-behavior checks to fail — repo-tooling (the domain specialist for build/test infrastructure) is correct that this is a build-breaking issue.

2. **software-architecture rated `activeQuest` guard as MINOR; tui-cli flagged quest explore transitions as IMPORTANT without separating the guard question.** Resolved: elevated the guard question (I2) to IMPORTANT because it is a prerequisite for correctly implementing I1 — the transition rows cannot be specified without knowing whether `activeQuest` is set.

3. **repo-tooling rated `generate-onboard-fixture.sh` as IMPORTANT; no other reviewer mentioned it.** Resolved: downgraded to MINOR (M11) pending codebase exploration. The script may be needed by the new `test-init.ts`.

4. **software-architecture rated audit re-entry pattern as MINOR; merged as IMPORTANT (I8)** because pattern consistency across skills is an architectural concern that affects maintainability.

## Unresolved (USER_INPUT required)

None. All issues are either directly actionable or resolvable via codebase exploration during implementation.
