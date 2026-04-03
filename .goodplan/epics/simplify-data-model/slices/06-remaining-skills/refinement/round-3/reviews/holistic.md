# Holistic Review — Remaining Skills + Cleanup (Round 3)

## Issues

**[IMPORTANT]** Phase 2 audit orchestrator has no error-handling for malformed agent return JSON
Round 2 flagged this and it remains unaddressed. Phase 2 step 5 says "Receive structured JSON findings from agent (format: `{ findings: Array<...>, scores: Record<string, number>, proposedSideQuests: Array<...> }`)." There is no task specifying what the orchestrator does if the agent returns malformed JSON, an unexpected shape, or a `FAILED` status. The audit agent result is the primary output surface for the user — a silent pass-through of invalid data would corrupt the report. Add a task: "Validate agent return shape against the documented schema; if `status` is not `SUCCESS` or the shape is wrong, surface the raw agent response with a clear error message and stop gracefully rather than attempting to render a report."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 `gp start-explore --quest` CLI surface is not in the `schema` command output — fitness function INV-006 requires `schema` output to match actual command signatures
`gp start-explore` currently only accepts `--epic`. Phase 1 adds a `--quest` flag. INV-006 ("schema output reflects actual command signatures") requires that `src/commands/global/schema.ts` also be updated when the command definition changes. The plan task list adds the `--quest` flag to `start-explore.ts` and `submit-explore.ts`, but there is no explicit task to update `src/commands/global/schema.ts` with the new flag. The fitness function `tests/fitness/schema-output-accuracy.test.ts` will catch this at verification, but the task should be enumerated in the plan so the implementer doesn't skip it. Add a task: "Update `src/commands/global/schema.ts` `start-explore` and `submit-explore` entries to include the `--quest` flag."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 init skill: `gp status --json` will exit non-zero on an uninitialized project, which is exactly the first-run case
Phase 3 re-entry check says "Check if `.goodplan/` already exists and is initialized (via `gp status --json`)." On a fresh repo, `.goodplan/` doesn't exist yet, so `gp status --json` will fail (exit code 1 or 2). The error-handling task (step 3) says "If any CLI command fails, report the error" — but this conflates two distinct cases: a legitimate first run (status fails because uninitialized) vs. a broken installation. The plan should specify the correct detection order: (1) check for `.goodplan/` directory existence via filesystem check first, (2) only call `gp status --json` if `.goodplan/` exists. This avoids misreporting a first-run as an error. The task wording as written could lead the implementer to call `gp status --json` first and show an error on every new project.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6 does not verify that `bun test` (unit + integration) doesn't reference deleted skill names
Phase 6 audits `skills/_shared/references/*.md` for stale skill name references, and deletes old dogfood test files. But `tests/integration/` and `tests/unit/` are not checked. `tests/integration/workflow-quest.test.ts` and `tests/fitness/*.test.ts` are unlikely to reference skill names directly, but `tools/dogfood/validate.ts` rewrite may invalidate import paths. Add a task: "Grep `tests/` and `src/` for old skill directory names (`onboard-repo`, `create-plan`, `refine-plan`, etc.) to confirm no test file imports from or references the deleted directories."
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 5 does not address the `refine-architecture/references/reviewer-registry.md` copy
The plan's Phase 5 note says "Only update `skills/implement/references/reviewer-registry.md` — the copies in `refine-plan/` and `refine-slices/` directories are deleted in Phase 6." However, codebase exploration reveals a third copy: `skills/refine-architecture/references/reviewer-registry.md`. This file also lives in a skill scheduled for deletion (`refine-architecture/` is in the Phase 6 delete list), but the plan doesn't mention it. This is not a blocking issue since Phase 6 will delete it, but the Phase 5 note should be updated to say "copies in `refine-plan/`, `refine-slices/`, and `refine-architecture/` directories" for clarity and so the implementer isn't confused when they spot the third copy.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 6 validate.ts rewrite scope is underspecified for test assertions
Phase 6 says "Rewrite `tools/dogfood/validate.ts`" with a mapping of old skill names to new ones. The current `validate.ts` (18KB, ~500 lines) runs a full workflow validation with multiple phases. The plan specifies the old→new name mappings but says "may require restructuring validation logic, not just renaming." This leaves an unclear scope for the implementer. Add: "As part of the rewrite, verify that `validate.ts` still covers the same workflow surface (2 epics + 2 quests as before), even if the skill invocations change. The goal is equivalent workflow coverage, not just renamed references."
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

This plan has addressed all four IMPORTANT issues from round 2 clearly and correctly: the reviewer count is now consistently 14 new / 20 total throughout the overview and Phase 5 expected behavior; the Phase 5 reviewer-registry task explicitly notes that only `implement/references/reviewer-registry.md` needs updating (with the other copies handled by Phase 6 deletion); Phase 1 now specifies exact transition row names and the `transition-tables.md` update task; Phase 4 adds the diff-based equivalence check; and Phase 6 now explicitly handles the monolithic reviewer file orphans. The plan is now implementable end-to-end without significant ambiguity. The remaining issues are targeted clarifications that prevent specific implementation pitfalls (audit return validation, schema command update, init detection order) rather than gaps in scope. To reach 10/10: add the audit return validation task, the schema.ts update task, and the init detection-order clarification.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
