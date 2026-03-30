# Codebase Context for skill-workflow-bugs Plan Review

Explored: 2026-03-26

---

## Current State of Each Bug

### Bug 1: Duplicate Verification/Success Criteria in create-slices

**Status: NOT FOUND.** The `skills/create-slices/SKILL.md` does NOT contain duplicate Verification or Success Criteria sections. The file has a clean structure: Steps 0-10, Error Handling, no repeated headings. The only mention of verification/success criteria is in Step 6 sub-step 3 (lines 132-134), which describes what goes INTO each slice's goal.md — not a duplicate section in the skill itself.

**Implication for plan**: This bug may have already been fixed, or it may exist in `create-slices/references/guidance.md` (the goal.md template), not in SKILL.md. The plan should clarify which file contains the duplication, or verify it still exists before attempting a fix.

### Bug 2: Unnecessary Confirmation Prompts (cli-interaction.md principle)

**Current state of `skills/_shared/references/cli-interaction.md`** (lines 1-626): The file covers CLI detection, data ownership, invocation patterns, interaction patterns by role, state orientation, error handling, self-discovery, and migration patterns. It has 13 sections. There is NO existing principle about avoiding unnecessary confirmation prompts or workflow-defined actions. The closest content is the "Interaction Patterns by Role" section (section 5), which describes orchestrator vs sub-agent patterns but does not address when skills should or should not ask for user confirmation.

**Implication for plan**: Adding a principle here is clean — no conflicts with existing content. The plan should specify where in the file to add it (likely a new section or an addition to section 5).

### Bug 3: /complete Asks to Confirm Learnings (Step 4)

**Current state of `skills/complete/SKILL.md` Step 4** (lines 143-173): Step 4 says "Present the draft. Iterate on corrections. Write `completion/learnings.md` when approved." (line 167). This is the gate — "when approved" implies the skill waits for user approval of the learnings draft before writing. The plan targets removing this approval gate so that learnings are presented informatively but written without asking.

**Line 167 is the exact location** of the issue: `Present the draft. Iterate on corrections. Write completion/learnings.md when approved.`

### Bug 4: Migration Sibling File Detection

**Current state of `src/core/rpc/migrate.ts`**: The migration copies markdown artifacts from `.project-old/` to the new `.project/` using an allowlist approach (lines 457-593). The `copyMarkdownFiles()` function (lines 585-593) copies `.md` files from the root of a source directory. The `ARTIFACT_DIRS` allowlist (lines 457-464) covers: `architecture`, `research`, `brainstorm`, `prototypes`, `decisions`, `completion`.

**The bug**: When copying per-slice artifacts, the code checks `ARTIFACT_DIRS` and root `.md` files, but does NOT detect or copy sibling files that may exist alongside `goal.md` in the old format — specifically files like `plan.md`, `plan-refined.md`, `plan-learnings-and-feedback.md`, `after-implementation-fixes-and-polish.md`. These ARE `.md` files, so `copyMarkdownFiles()` DOES copy them (line 588 checks `entry.name.endsWith(".md")`).

**Re-evaluation**: Looking more carefully, `copyMarkdownFiles()` copies ALL `.md` files from the root of a slice source directory. So plan.md, goal.md, etc. WOULD be copied. The actual sibling detection issue may be about something else — perhaps about detecting what artifacts a slice has (for status mapping) rather than about file copying. The `validate-source-path.ts` only checks that the directory exists, not what's inside.

**Implication for plan**: The plan should clarify what "sibling file detection" means. If it's about copying, the current code already handles `.md` files. If it's about accurately mapping old-format artifact presence to the new `slice.json` artifact flags, that's a different fix (in `buildMigrationState()`).

**Related files**:
- `src/commands/global/migrate/schemas.ts` (lines 1-241) — migration protocol types, no artifact detection logic
- `src/commands/global/migrate/validate-source-path.ts` (line 1-11) — only checks directory existence
- `tests/unit/rpc/migrate.test.ts` — existing unit tests
- `tests/integration/migrate.test.ts` — existing integration tests

---

## Current Template Landscape

| Skill | Has Output Templates? | Template Style | Details |
|---|---|---|---|
| **refine-plan** | YES — rigid | Two templates: "Iteration Summary Template" (lines 247-278) and "Completion Summary Template" (lines 280-324). Both use exact markdown format with placeholders. |
| **implement-plan** | YES — rigid | Two templates: "Iteration Summary Template" (lines 370-397) and "Completion Summary Template" (lines 399-437). Similar structure to refine-plan but with phase-specific columns. |
| **refine-architecture** | YES — rigid | Two templates: "Iteration Summary Template" (lines 266-290) and "Completion Summary Template" (lines 292-326). Same pattern as refine-plan. |
| **refine-slices** | NO templates | No output templates section at all. The skill uses the shared iteration loop but defines no display format for progress or completion. |
| **project-status** | YES — rigid | Three format variants: "Format A" (active slice, lines 182-203), "Format B with Active Epic" (lines 211-248), "Format B without Epics" (lines 252-278). These are status display templates, not iteration templates. |
| **complete** | NO templates | No output templates. Step 11 "Done Summary" (line 411) says only: "List: learnings written, architecture updates made, decisions written, slice goal changes, recommended next step." Prose description only. |
| **create-plan** | NO templates | Step 8 "Done Summary" (line 176) says: "Present: plan location, phase count, research files written, recommended next step." Prose description only. |
| **create-slices** | NO templates | Step 10 "Done Summary" (line 222) says: "List all slices defined. Recommend `/create-plan` for the first unplanned slice." Prose description only. |

**Pattern**: The three iteration-loop skills (refine-plan, implement-plan, refine-architecture) have rigid templates with identical structure (Iteration Summary + Completion Summary). The orchestrator/interactive skills (complete, create-plan, create-slices) have prose-only "done summary" descriptions. refine-slices is the gap — it uses the iteration loop but has no templates.

---

## Recent Development Activity

**Most recent changes to affected files** (last 2 months):

- `skills/create-slices/SKILL.md`: Last significantly changed in `994ca9a [plan-exec-skills] Phase 2` and `604d118 [dogfood] Fix create-slices missing slice:create`. The dogfood fix added Step 7b (slice:create registration).
- `skills/complete/SKILL.md`: Last changed in `9f8235a [core-skill-val] Phase 2: complete Migration` (CLI migration) and `5b121f1 [dogfood] Remove ~~archived~~ rename`.
- `skills/_shared/references/cli-interaction.md`: Last changed in `eb8857b [plan-exec-skills] Integration review` and `ab1ce15 [state-cmd-tracer] Phase 2: Convention Doc`. Added migration patterns section (section 13).
- `src/core/rpc/migrate.ts`: Created in `507a1cc` through `f10619c [migrate-to-cli] Phase 2-4`. Brand new code, no prior modifications.
- `src/commands/global/migrate/schemas.ts`: Created in `df2052c [migrate-to-cli] Phase 1`. No modifications since.

**Overall trajectory**: The codebase recently completed a CLI migration epic (migrate-to-cli) and dogfooding quest. Skills were migrated from direct file access to CLI-based state access. The migration command itself is new code.

---

## Key Constraints for Reviewers

1. **Data ownership boundary**: Skills MUST NOT read or write JSON/JSONL files directly — only via CLI commands. LLM-owned markdown (architecture, plans, goals) can be read/written directly. This is enforced in `cli-interaction.md` section 2-3.

2. **Shared iteration loop**: refine-plan, refine-architecture, and refine-slices all consume `_shared/references/iteration-loop.md`. Any shared template must be compatible with this loop's run directory structure (`round-N/reviews/`, `round-N/merged.md`).

3. **AskUserQuestion convention**: Per the memory file `feedback_present_dont_ask.md`, "Skills should present what they're doing but never ask permission for workflow-defined actions." This directly supports Bug 3 (removing the learnings confirmation gate).

4. **Template consistency**: The three existing template sets (refine-plan, implement-plan, refine-architecture) use nearly identical Iteration Summary structures. Extracting to a shared template should unify them. However, implement-plan's iteration template includes "Phase {X}" which the others don't — the shared template needs a `{scope_prefix}` slot.

5. **Completion Summary divergence**: While Iteration Summary templates are structurally identical, Completion Summary templates differ:
   - refine-plan: "Refinement Complete" with Score Progression + Issues Resolved Per Iteration + Remaining Issues
   - implement-plan: "Implementation Complete" with Phase Summary table + Verification Evidence + Key Decisions + Follow-up Recommendations
   - refine-architecture: "Architecture Refinement Complete" with Score Progression + Changes Summary + Issues Resolved

   A shared Completion Summary template would need to accommodate these structural differences, or only the Iteration Summary should be shared.

6. **Test infrastructure**: Migration code has both unit tests (`tests/unit/rpc/migrate.test.ts`) and integration tests (`tests/integration/migrate.test.ts`). Any changes to migrate.ts should include corresponding test updates.
