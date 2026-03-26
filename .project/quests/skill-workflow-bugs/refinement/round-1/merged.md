# Merged Feedback — Round 1

## CRITICAL Issues

### C1. Bug 1 targets wrong file or is a non-bug — "duplicate" sections are intentionally distinct
**Files:** `skills/create-slices/SKILL.md`, `skills/create-slices/references/guidance.md`
**Flagged by:** Holistic, Software Architecture, Agent Skill, TypeScript

Research (`_codebase-context.md`) confirmed SKILL.md has NO duplicate Verification/Success Criteria sections. The goal.md template in `guidance.md` (lines 92-100) has both `## Success Criteria` and `## Verification` as **intentionally separate** sections — Success Criteria are checkable assertions; Verification is live end-to-end testing. SKILL.md Step 6 sub-step 3 (line 132) says "Focus on **Success Criteria** and **Verification**" as distinct concepts. The plan's Expected Behavior greps target the wrong file and would produce misleading results.

Resolution: USER_INPUT — Confirm whether these two sections are intentionally distinct (evidence strongly suggests yes, in which case Bug 1 should be removed) or identify the actual duplication if it exists elsewhere.

### C2. Bug 4 is misdiagnosed — research shows file copying already works, proposed fix targets wrong problem and wrong mechanism
**Files:** `src/core/rpc/migrate.ts`, `src/commands/global/migrate/schemas.ts`
**Flagged by:** Holistic, Software Architecture, Agent Skill, TypeScript, TUI and CLI (all 5 reviewers)

Every reviewer flagged this. Key findings:
1. `copyMarkdownFiles()` already copies ALL `.md` files from slice source directories — the plan's core premise (siblings are missed) appears wrong.
2. The plan proposes "emit a follow-up question asking the LLM" but doesn't specify how this integrates with the existing round-based Q&A protocol (Rounds 1-3: inventory, epic-details, confirmation). Adding mid-validation follow-ups breaks this structure.
3. The migration protocol is CLI-driven JSON Q&A, not a skill with `AskUserQuestion` — the interaction mechanism is unspecified.
4. The plan doesn't clarify whether the real issue is file copying (already handled) or artifact flag mapping in `buildMigrationState()`.
5. Adding interactive follow-up questions from the RPC layer violates architectural boundaries (RPC orchestrates state transitions, doesn't conduct conversations).
6. No Zod schema specified for the new response type (INV-005 requires Zod on all read/write boundaries).
7. Modifying migration may violate INV-001's exception scope.

Resolution: USER_INPUT — Clarify what "sibling file detection" actually means with a concrete reproduction case. Is this about files not being copied, artifact flags not being set, or something else? If the issue was already fixed or misdiagnosed, remove Bug 4.

---

## IMPORTANT Issues

### I1. Phase 2 Completion Summary templates are structurally divergent — shared template adds complexity without reducing duplication
**Flagged by:** Holistic, Software Architecture, Agent Skill

The three Completion Summary templates share only the outer heading and "Score Progression" table. Bodies are entirely different:
- refine-plan: Score Progression + Issues Resolved Per Iteration + Remaining Issues
- implement-plan: Phase Summary + Verification Evidence + Key Decisions + Follow-up
- refine-architecture: Score Progression + Changes Summary + Issues Resolved

Extracting these to a shared file doesn't reduce duplication — it moves three independent templates to a different file and adds indirection. The plan's "supplement mechanism" for architecture-specific sections is unspecified.

Resolution: DIRECTLY_ACTIONABLE — Keep Completion Summary templates inline in each skill. Only extract the Iteration Summary template (which IS structurally identical across skills with only a `{scope_prefix}` difference).

### I2. Phase 3 modifies 7-8 files in a single phase with no incremental verification
**Flagged by:** Holistic, Software Architecture, Agent Skill

Phase 3 touches refine-slices, complete, create-slices, create-plan, implement-plan, refine-plan, refine-architecture, and iteration-loop.md. If the shared template has a structural issue, every consuming skill inherits it.

Resolution: DIRECTLY_ACTIONABLE — Split Phase 3 into two sub-phases: (a) update iteration-loop.md + one iteration-loop skill (refine-plan) and verify, then (b) update remaining skills. This also fixes the circular dependency where refine-slices references templates that iteration-loop.md doesn't yet point to (flagged by Agent Skill).

### I3. Phase 1 Expected Behavior checks are incomplete and partially incorrect
**Flagged by:** Holistic, Agent Skill

1. Bug 2 (confirmation prompts) has no before/after check.
2. Bug 1's after-check targets wrong file (should be `guidance.md` if bug exists).
3. Bug 3's before-check greps for "AskUserQuestion" but the actual text is "when approved" — grep would return empty before AND after.
4. Bug 4 has no behavioral test (grep-based checks only verify code exists).

Resolution: DIRECTLY_ACTIONABLE — Fix the Expected Behavior section: Bug 3 before-check should grep "when approved"; Bug 1 should target the correct file or be removed; Bug 2 needs an explicit before/after check; Bug 4 needs a behavioral test or removal per C2.

### I4. "Done Summary" and "Context Load Summary" are thin abstractions with no existing rigid source material
**Flagged by:** Software Architecture, Agent Skill

These are 3-4 line patterns with no existing rigid template anywhere. The plan would be designing new templates from scratch (not extracting), and they differ across consuming skills. Extracting them to a shared file adds a file read and indirection for patterns so simple that inline definitions are clearer.

Resolution: DIRECTLY_ACTIONABLE — Keep Done Summary and Context Load Summary as inline rigid templates in each consuming skill. Only extract the Iteration Summary template to the shared file.

### I5. Bug 4 sibling detection schema changes lack Zod definition and round protocol integration
**Flagged by:** TypeScript, TUI and CLI

If Bug 4 is kept: (a) any new response type must be a Zod schema with `z.infer<>`, not a plain interface; (b) the plan must specify whether this is a new round type, a new `MigrationState.status` enum value, or an extension to an existing round; (c) "sibling scan schema" is misleading — a filesystem scan result is not a response schema from the LLM.

Resolution: DIRECTLY_ACTIONABLE — If Bug 4 survives USER_INPUT review, rewrite tasks to specify: Zod schema shape, round protocol integration point, `MigrationResult` discriminated union changes, and `noUncheckedIndexedAccess` handling for directory listing results.

### I6. Bug 2 principle placement in cli-interaction.md is unspecified
**Flagged by:** Agent Skill

The plan says "Add a 'Workflow Action Principle' section to `cli-interaction.md`" but doesn't say where in the 13-section, 626-line file. Most natural home: within or adjacent to Section 5 ("Interaction Patterns by Role").

Resolution: DIRECTLY_ACTIONABLE — Specify placement: add after or within Section 5 of `cli-interaction.md`.

---

## MINOR Issues

### M1. Phase 2 verification lacks concrete falsifiability
**Flagged by:** Holistic
"Confirm each template matches" without specifying how. Use `diff` or `wc -l` for objective checks.
Resolution: DIRECTLY_ACTIONABLE

### M2. Phase 3 project-status verification is weak and contradictory
**Flagged by:** Holistic, Agent Skill, TUI and CLI
Plan says "no changes needed" but also "verify templates are still correct after other changes." Since project-status uses completely different templates, this adds no value.
Resolution: DIRECTLY_ACTIONABLE — Remove or replace with `bun run check`.

### M3. No documentation update tasks for shared references README
**Flagged by:** Holistic
Adding `output-templates.md` to shared references should be reflected in the README's table.
Resolution: DIRECTLY_ACTIONABLE

### M4. `bun run install:skills` — verify this script exists
**Flagged by:** Agent Skill
Confirm `install:skills` exists in `package.json` before relying on it in verification.
Resolution: CODEBASE_EXPLORATION

### M5. New Bug 4 code should avoid `as` type assertions
**Flagged by:** TypeScript
Existing `migrate.ts` uses `as` assertions heavily. New code should use Zod `.parse()` or type narrowing instead.
Resolution: DIRECTLY_ACTIONABLE

### M6. No verification that migration JSON output shape remains stable
**Flagged by:** TUI and CLI
Bug 4 modifies migrate.ts — verify existing round output shapes are unchanged since they're consumed by LLMs parsing JSON.
Resolution: DIRECTLY_ACTIONABLE

### M7. Context Load Summary "Missing" output should clarify it's informational, not an error
**Flagged by:** TUI and CLI
"Missing: [list]" must not be confused with CLI error output (INV-007 structured errors).
Resolution: DIRECTLY_ACTIONABLE

### M8. No `tsc --noEmit` in verification
**Flagged by:** TypeScript
`bun run check` runs biome, not TypeScript type checking. Plan should include `tsc --noEmit` or note the gap.
Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE (for loop exit)

1. **Keep Completion Summary templates inline** — Do NOT extract to shared file. Only extract the Iteration Summary template to `skills/_shared/references/output-templates.md`. Remove Phase 2 tasks for Refinement Completion Summary and Implementation Completion Summary templates. Keep each skill's Completion Summary inline in its own SKILL.md.

2. **Keep Done Summary and Context Load Summary inline** — Remove these from the shared template extraction. They are 3-4 line patterns that differ across skills; inline definitions are clearer.

3. **Split Phase 3 into two sub-phases** — Sub-phase 3a: Update `iteration-loop.md` to reference shared Iteration Summary template + update refine-plan as the first consumer + verify. Sub-phase 3b: Update remaining 6 skills (refine-architecture, refine-slices, implement-plan, create-plan, create-slices, complete).

4. **Fix Expected Behavior checks** — Bug 3 before-check: change `grep "AskUserQuestion"` to `grep "when approved"`. Bug 2: add explicit before/after check. Bug 1: target `guidance.md` not `SKILL.md` (or remove if Bug 1 is dropped). Bug 4: add behavioral test or remove if Bug 4 is dropped.

5. **Specify Bug 2 principle placement** — Add "Workflow Action Principle" within or after Section 5 ("Interaction Patterns by Role") of `cli-interaction.md`.

6. **Add `tsc --noEmit` to verification steps** — Include alongside `bun run check` in Phase 1 verification.

7. **Make Phase 2 verification falsifiable** — Add `diff` between extracted template and original inline version; add `wc -l` check for file size constraint.

8. **Remove or replace project-status verification** — Replace "run twice" with `bun run check` since project-status is explicitly unchanged.

9. **Add README update task** — Add task to update `skills/_shared/references/README.md` (or equivalent) to list `output-templates.md`.

10. **If Bug 4 survives: specify Zod schema, round protocol, and avoid `as` assertions** — Define Zod schema with `z.infer<>`, specify which round it belongs to, handle `noUncheckedIndexedAccess`, and verify existing JSON output shapes remain stable.

---

## RESEARCH_NEEDED

### R1. Bug 4 — What is the actual migration sibling detection problem?
**Why it matters:** All 5 reviewers flagged Bug 4 as misdiagnosed. The research shows `copyMarkdownFiles()` already copies all `.md` files. Before any implementation, the actual bug needs concrete reproduction.
**What to look up:** (a) Original bug report for Bug 4 in `.project/quests/skill-workflow-bugs/`. (b) Full read of `src/core/rpc/migrate.ts` focusing on `buildMigrationState()` and answer-processing logic. (c) What files are NOT being migrated that should be? (d) How the existing question/answer cycle works in `schemas.ts`. (e) Whether the issue is about file copying or artifact flag mapping.
**Tool strategy:** CODEBASE_EXPLORATION — Read the quest definition, then `migrate.ts` and `schemas.ts` in full.

### R2. Bug 1 — Are Success Criteria and Verification intentionally distinct?
**Why it matters:** If they are intentionally distinct (evidence strongly suggests yes), Bug 1 should be removed entirely.
**What to look up:** (a) `skills/create-slices/references/guidance.md` lines 85-110 for the goal.md template. (b) Existing goal.md files under `.project/` to see how both sections are used in practice. (c) Whether any refine-slices reviewer references one or both section names.
**Tool strategy:** CODEBASE_EXPLORATION — Read guidance.md, then grep for goal.md files and check their section structure.

### R3. `bun run install:skills` — does this script exist?
**What to look up:** Check `package.json` for an `install:skills` script.
**Tool strategy:** CODEBASE_EXPLORATION — Read `package.json`.

---

## Contradictions Resolved

1. **Bug 1 severity:** Software Architecture rated it IMPORTANT; Holistic and Agent Skill rated it CRITICAL. **Resolved: CRITICAL.** The Agent Skill reviewer provided the most specific analysis showing the two sections are intentionally distinct (Success Criteria = checkable assertions, Verification = live testing), which means implementing the "fix" would actively harm the template by removing a useful distinction. This is worse than "targeting the wrong file" — it's fixing a non-bug, which elevates it to CRITICAL.

2. **Bug 4 resolution tag:** Software Architecture and TUI and CLI said USER_INPUT; Agent Skill said RESEARCH_NEEDED; Holistic and TypeScript said CODEBASE_EXPLORATION. **Resolved: USER_INPUT** (with CODEBASE_EXPLORATION as prerequisite). The research has already been done and it contradicts the plan's premise — at this point the user needs to clarify intent. Codebase exploration alone won't resolve the ambiguity about what problem Bug 4 is supposed to solve.

3. **Completion Summary extraction:** Holistic framed it as "needs clarification on centralization vs deduplication." Software Architecture and Agent Skill said "keep inline — structurally divergent." **Resolved: keep inline.** Trusting the architecture specialist — the templates share too little structure to benefit from extraction.

4. **Done Summary / Context Load Summary extraction:** Only Software Architecture explicitly flagged these as "thin abstractions." Agent Skill noted they have "no existing rigid source material." **Resolved: keep inline.** Both domain specialists agree these are too thin to extract.

---

## Unresolved (USER_INPUT required)

(All resolved)

## USER_INPUT Resolved

1. **Bug 1**: VALID but targets wrong file. Real issue: `Success Criteria` and `Verification` sections in `skills/create-slices/references/guidance.md` (the goal.md template) are redundant in practice — real goal.md files restate the same content in both. Fix should consolidate them in `guidance.md`, not `SKILL.md`. Also update the SKILL.md step that references both section names.

2. **Bug 4**: REMOVED. User confirmed the issue was misdiagnosed — `copyMarkdownFiles()` already handles .md files. Remove all Bug 4 tasks, expected behavior checks, and related Phase 1 verification items. Plan reduces from 4 bugs to 3.

---

## Synthesis Summary
Scores: Holistic: 5/10, Software Architecture: 5/10, Agent Skill: 5/10, TypeScript: 5/10, TUI and CLI: 6/10
Severity: Critical: 2, Important: 6, Minor: 8
USER_INPUT items: Bug 1 existence, Bug 4 actual problem definition
DIRECTLY_ACTIONABLE count: 10
RESEARCH_NEEDED count: 3
Contradictions: 4 resolved, 0 unresolved
Domains needing re-review: All (CRITICAL issues affect plan foundation)
