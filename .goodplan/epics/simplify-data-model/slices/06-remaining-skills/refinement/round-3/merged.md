# Merged Feedback — Remaining Skills + Cleanup (Round 3)

Reviewers: holistic (9/10), agent-skill (8/10), repo-tooling (8/10)
Not re-run: software-architecture (8/10 round 2, no CRITICAL remaining), tui-cli (8/10 round 2, no CRITICAL remaining)

---

## IMPORTANT Issues (4)

**[IMPORTANT-1] Phase 2 audit orchestrator has no error-handling for malformed agent return JSON**
*(holistic)*

Phase 2 step 5 documents the expected return shape `{ findings, scores, proposedSideQuests }` but no task specifies what the orchestrator does when the agent returns malformed JSON, an unexpected shape, or a `FAILED` status. The audit report is the primary output surface — a silent pass-through of invalid data would corrupt it.

Add a task: "Validate agent return shape against the documented schema; if `status` is not `SUCCESS` or the shape is wrong, surface the raw agent response with a clear error message and stop gracefully rather than attempting to render a report."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2] Phase 5: Hardcoded reviewer lists in create-epic and plan-slice SKILL.md will not include the 14 new agents**
*(agent-skill — domain specialist, authoritative)*

`skills/create-epic/SKILL.md` hardcodes `Available reviewers: [...]` in two places (architecture refinement loop, slices refinement loop). `skills/plan-slice/SKILL.md` hardcodes a similar list in one place. The `implement` skill correctly uses `reviewer-registry.md`, but these two orchestrators pass hardcoded lists directly to the refinement-coordinator. After Phase 5 adds 14 new reviewer agents, create-epic and plan-slice will silently continue invoking only the original 6 reviewers. The create-side-quest SKILL.md (Phase 1) also needs the full set defined from the start.

Fix: Phase 5 must also update `skills/create-epic/SKILL.md` (2 places) and `skills/plan-slice/SKILL.md` (1 place) to expand the available reviewer lists. The Phase 1 create-side-quest SKILL.md template should reference the full set or defer to the registry (following implement's pattern). Ideally all three skills are updated to reference `reviewer-registry.md` so future reviewer additions propagate from one place.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-3] Phase 5: `iteration-loop.md` describes the old "Prompt File + Section" reviewer pattern; will be stale/contradictory after Phase 5**
*(repo-tooling — domain specialist, authoritative)*

`skills/_shared/references/iteration-loop.md` (lines 46–52) instructs orchestrators to pass "Prompt file path and section heading (from reviewer-registry.md)" and references `sub-agent-prompts.md` as the bootstrap source. After Phase 5 the registry moves to an `Agent` column with agent names — no `Prompt File` + `Section` columns. Line 50 also references "the skill's `references/sub-agent-prompts.md` or inherited from refine-plan" which will be orphaned when Phase 6 deletes `refine-plan/`.

Fix: Add a task to Phase 5 to update the Reviewer Spawn Pattern section of `skills/_shared/references/iteration-loop.md` to: (a) describe the new agent-name-based spawn pattern, and (b) remove references to `sub-agent-prompts.md`. These are two stale sections in the same file — handle together.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4] Phase 6: CLAUDE.md not updated — old skill names remain as live references for developers**
*(agent-skill)*

`CLAUDE.md` Section 2 ("Installed Tools") references `/project-status`, `/create-plan`, `/implement-plan`, and the harness table lists `test-onboard.ts` (`/onboard-repo`) and `test-migrate.ts` (`/migrate`). After Phase 6 deletes these skills, any developer reading CLAUDE.md will attempt to invoke non-existent skills. CLAUDE.md is the first document a developer reads.

Add a Phase 6 task: "Update `CLAUDE.md` — replace `/project-status` → `/status`, `/create-plan` → `/plan-slice`, `/implement-plan` → `/implement`; update harness table to reference `test-init.ts` and `test-renames.ts`."

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues (7)

**[MINOR-1] Phase 1: `gp start-explore --quest` flag missing from `schema.ts` update task**
*(holistic)*

Phase 1 adds `--quest` to `start-explore.ts` and `submit-explore.ts` but has no explicit task to update `src/commands/global/schema.ts`. INV-006 requires schema output to reflect actual command signatures; the fitness function `tests/fitness/schema-output-accuracy.test.ts` will catch this at verification, but the task should be enumerated so the implementer doesn't skip it.

Add a task: "Update `src/commands/global/schema.ts` `start-explore` and `submit-explore` entries to include the `--quest` flag."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] Phase 1: Skip-explore path from `created` to `planning` removed with no documented alternative**
*(agent-skill)*

The transition table change replaces `created -> BEGIN_QUEST_PLAN -> planning` with `explored -> BEGIN_QUEST_PLAN -> planning`, removing any direct path from `created` to `planning`. The skill's re-entry table says "offer to continue with explore or go-back" but doesn't define a skip-explore option. The epic pattern allows `gp submit-explore --epic <name> --skip` to reach `explored` without running the agent.

The plan must explicitly state one of: (a) skipping explore is not supported for quests (close the ambiguity in the re-entry table), or (b) add the skip-explore transition to the transition table and the skill's re-entry table.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] Phase 3 init skill: `gp status --json` fails on first run — detection order is wrong**
*(holistic)*

Phase 3 re-entry check specifies "Check if `.goodplan/` already exists and is initialized (via `gp status --json`)." On a fresh repo `gp status --json` exits non-zero, which conflates "legitimate first run" with "broken installation."

Specify correct detection order: (1) check for `.goodplan/` directory existence via filesystem first; (2) only call `gp status --json` if `.goodplan/` exists.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4] Phase 5: refine-architecture reviewer-registry.md copy not mentioned in the Phase 5 note**
*(holistic)*

The Phase 5 note says "Only update `skills/implement/references/reviewer-registry.md` — the copies in `refine-plan/` and `refine-slices/` directories are deleted in Phase 6." A third copy exists at `skills/refine-architecture/references/reviewer-registry.md` (that skill is also in the Phase 6 delete list). Not a blocking issue since Phase 6 will delete it, but the Phase 5 note should be updated to read "copies in `refine-plan/`, `refine-slices/`, and `refine-architecture/` directories" so the implementer isn't confused.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5] Phase 5: New reviewer agents have no end-to-end test coverage**
*(agent-skill — carried from round 2, still unaddressed)*

Phase 5 verification relies on file existence checks and `bun run build:plugin` — no runtime invocation. Build-time checks cannot catch `@` reference resolution failures or prompt issues.

Add either: (a) a lightweight dogfood test (`test-reviewers.ts`) that spawns a representative reviewer agent (e.g., `reviewer-agent-skill`) with a small fixture and verifies the agent returns valid review JSON; or (b) at minimum, a step that runs an existing skill's refinement loop against a fixture and verifies the new reviewers appear in the coordinator's selection output.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-6] Phase 6: Three tooling/cleanup gaps**
*(repo-tooling — combined for efficiency)*

Three related gaps in Phase 6 verification and cleanup:

a. **`_shared/references/README.md` not updated after orphan deletion.** If `reviewers-cross-cutting.md` (explicitly listed in README) is deleted as an orphan, the README row becomes a dead reference. Add a task: "After deleting orphaned `_shared/references/*.md` files, update `skills/_shared/references/README.md` to remove rows for deleted files."

b. **`test-plugin-skills.ts` per-skill assertions are advisory (WARN), not failing.** The plan says to update `expectedSkills` to the 12 new names, but the current test only warns (not exits 1) when expected skills are missing. Strengthen the update task: change per-skill check from WARN to FAIL so the test is a real assertion.

c. **`validate.ts` rewrite has no post-rewrite TypeScript check.** Given validate.ts costs $50–100+ to run fully, add `bun check tools/dogfood/validate.ts` to Phase 6 verification steps to catch type errors from the rewrite before committing.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-7] Phase 6: `validate.ts` rewrite scope underspecified for test assertions and coverage**
*(holistic)*

Phase 6 notes that `validate.ts` "may require restructuring validation logic, not just renaming" but leaves scope unclear. Add: "Verify that the rewritten `validate.ts` still covers the same workflow surface (2 epics + 2 quests as before), even if skill invocations change. Goal is equivalent workflow coverage, not just renamed references."

Resolution: DIRECTLY_ACTIONABLE

---

## Deduplication Notes

- MINOR-6 combines three repo-tooling items (README cleanup, test-plugin-skills assertion strength, validate.ts type check) into one grouped issue for implementation efficiency — all Phase 6 cleanup scope.
- The `iteration-loop.md` IMPORTANT-3 covers both stale sections (Prompt File + Section pattern at lines 46–52 and sub-agent-prompts.md reference at line 50) — the repo-tooling reviewer flagged both separately (IMPORTANT + MINOR); treated as one actionable item since they're in the same file.
- No contradictions between reviewers. Domain specialists (agent-skill for agent/skill patterns, repo-tooling for build/test tooling) are trusted over holistic on their respective domains where they overlap.

---

## Score Summary

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| holistic | 9/10 | 0 | 2 | 4 |
| agent-skill | 8/10 | 0 | 2 | 4 |
| repo-tooling | 8/10 | 0 | 3 | 3 |
| **Merged** | **~8.5/10** | **0** | **4** | **7** |

All 4 IMPORTANT issues are DIRECTLY_ACTIONABLE with no codebase exploration required. The plan is implementable end-to-end; these issues are targeted fixes to prevent specific runtime failures (missing reviewers in orchestrators, stale bootstrap instructions) and developer-experience gaps (CLAUDE.md, error handling).
