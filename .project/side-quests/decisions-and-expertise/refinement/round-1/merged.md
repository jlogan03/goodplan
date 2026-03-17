# Merged Feedback — Decisions & Expertise Infrastructure (Round 1)

## CRITICAL Issues

None.

## IMPORTANT Issues

**1. Phase 3: refine-plan and implement-plan missing from decision readers list**
All three reviewers flagged this. The overview says "All interactive skills load active decisions" but Phase 3 lists only 7 skills, excluding refine-plan and implement-plan. Both spawn reviewer sub-agents that evaluate plans/code against architecture — decisions are essential context for those reviewers. The architecture-quality downstream quest needs this pattern established now.
Resolution: DIRECTLY_ACTIONABLE

**2. Phase 3: Decision-loading logic duplicated across 7+ skills without abstraction**
(Software Architecture) Phase 3 adds identical decision-loading instructions to 7 SKILL.md files independently. If loading behavior changes (e.g., adding category filtering for architecture-quality quest), all files need updating. The plan already has `_shared/references/decisions-format.md` as a consolidation point — the loading algorithm should live there once, with each SKILL.md referencing it.
Resolution: DIRECTLY_ACTIONABLE

**3. Phase 0: Consolidation scope incomplete — `codebase-context-discovery.md` excluded without explanation**
(Software Architecture) `codebase-context-discovery.md` is duplicated identically across refine-plan and implement-plan but not included in the consolidation list. Meanwhile `shared-preamble.md` is correctly excluded (copies differ) but the plan doesn't explain why. Add codebase-context-discovery.md to consolidation; add a note explaining shared-preamble.md exclusion.
Resolution: DIRECTLY_ACTIONABLE

**4. Phase 3: No explicit contract/extension policy for convention files consumed by downstream quests**
(Software Architecture) The architecture-quality quest may need to extend `decisions-format.md` (e.g., adding a "category" field). Without an extension policy, downstream quests risk breaking the 7+ skills already consuming it. Add a brief "Extension policy" section to decisions-format.md and expertise-tracking.md: additive fields safe, format changes require updating all consumers, list consumers.
Resolution: DIRECTLY_ACTIONABLE

**5. Phase 0: `_shared/references/` path resolution strategy undocumented**
(Agent Skill) The plan puts shared references at `~/.claude/skills/_shared/references/` using absolute home directory paths. All existing skills use `references/` relative to the skill directory. The plan should explicitly document that shared references use absolute user-level paths and that project-level installs are not supported for shared references (or provide a resolution strategy).
Resolution: DIRECTLY_ACTIONABLE

**6. Phase 3: complete-slice decision writing guidance doesn't reconcile with existing behavior**
(Agent Skill) `complete-slice/references/guidance.md` already has decision file writing (line 35: "Approved: edit arch file, write decision file"). The plan says "add decision writing guidance" without clarifying whether it updates the existing mechanism to use the new format or adds a second one. Should explicitly say: "Update existing decision writing in complete-slice to use decisions-format.md."
Resolution: DIRECTLY_ACTIONABLE

**7. Phase 4: Expertise check reads reference file on every invocation — unnecessary context cost**
(Agent Skill) Every interactive skill will Read `expertise-tracking.md` on every run, but CLAUDE.md (where expertise is stored) is already in the system prompt. The expertise check step will usually result in "no new expertise, skip." The reference file should only be read when the skill detects new expertise to record, not on every invocation.
Resolution: DIRECTLY_ACTIONABLE

**8. Phase 4: project-status should display expertise summary**
(Holistic) Phase 4 adds expertise awareness to 6 interactive skills but omits project-status. Users can't verify their expertise profile is correct without manually reading CLAUDE.md. Add a brief expertise summary line to the project-status report.
Resolution: DIRECTLY_ACTIONABLE

**9. Phase 0: refine-plan/implement-plan SKILL.md references to consolidated files occur in multiple places — plan doesn't enumerate**
(Agent Skill) The plan says "change Read paths" but grep shows these are referenced in 3+ places per SKILL.md. The plan should say "all occurrences" or enumerate them to avoid partial updates.
Resolution: DIRECTLY_ACTIONABLE

**10. Downstream readiness: "cross-cutting guidance" term undefined**
(Holistic) Both downstream quests list "cross-cutting guidance" as a dependency. This term isn't defined in the plan. If it refers to Phase 4's calibration depth notes, the plan covers it. If downstream quests expect something more specific (e.g., a shared reference file), there's a gap.
Resolution: USER_INPUT

## MINOR Issues

**11. Phase 1: Decision format missing domain/tags field**
(Holistic) Without a domain field, agents must read every decision file to determine relevance. A `Domain: architecture | slicing | implementation` field would enable selective loading as the project grows.
Resolution: DIRECTLY_ACTIONABLE

**12. Phase 1: Decision status `revisiting` has no defined entry/exit mechanism**
(Agent Skill) Who sets it? How does it resolve — back to `active` or `superseded`? Ambiguous lifecycle undermines reliability for downstream quests.
Resolution: DIRECTLY_ACTIONABLE

**13. Phase 2/naming: Auto memory files use underscores while plan uses kebab-case elsewhere**
(Software Architecture + Agent Skill) `expertise_event_driven.md` mixes conventions. Should be consistent — either `expertise_event-driven.md` or document why auto memory uses underscores.
Resolution: DIRECTLY_ACTIONABLE

**14. Phase 4: Expertise check placement guidance too rigid**
(Software Architecture) "Before the state write-back step" doesn't fit all skills naturally. Soften to: "after the main interactive work completes, before state write-back" and let each skill place it where it fits.
Resolution: DIRECTLY_ACTIONABLE

**15. Phase 5: `_shared/references/` not definitively added to workflow.md File Structure section**
(Agent Skill) The plan says "maybe" add it but workflow.md does have a File Structure section. This should be a definite task.
Resolution: DIRECTLY_ACTIONABLE

**16. Phase 5: Verification spot-check could be more specific**
(Holistic) "Spot-check consistency" should specify: verify workflow describes the same writer/reader lists as the plan implemented.
Resolution: DIRECTLY_ACTIONABLE

**17. Phase 0: No diff step before merging 6 formats.md files**
(Holistic) The plan assumes the 6 copies are identical. Should include an explicit diff step to catch any skill-specific content that crept in.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (for loop exit)

1. **Add refine-plan and implement-plan to decision readers list (Phase 3)** — In the plan's Phase 3 reader list, add these two skills. Each SKILL.md gets the same decision-loading instruction as the other 7 skills.

2. **Abstract decision-loading into decisions-format.md (Phase 3)** — Add a "Loading Protocol" section to `_shared/references/decisions-format.md` with the full algorithm (glob `.project/decisions/*.md`, skip `status: superseded`, flag `status: revisiting`). Change each SKILL.md to reference the Loading Protocol rather than duplicating the logic.

3. **Add codebase-context-discovery.md to Phase 0 consolidation** — Move to `_shared/references/codebase-context-discovery.md`, update refine-plan and implement-plan SKILL.md paths. Add a note explaining shared-preamble.md is excluded because copies differ (different placeholder sets for plan review vs code review).

4. **Add extension policy to convention files (Phase 1-2)** — Add to both `decisions-format.md` and `expertise-tracking.md`: "Extension policy: Additive fields are safe. Format changes require updating all consumers. Current consumers: [list skills]."

5. **Document _shared/references/ path resolution (Phase 0)** — Add a note to the plan and to the _shared directory itself: shared references use absolute `~/.claude/skills/_shared/references/` paths; project-level skill installs are not currently supported for shared references.

6. **Reconcile complete-slice decision writing (Phase 3)** — Change the Phase 3 task from "add decision writing guidance" to "Update the existing decision file writing in `complete-slice/references/guidance.md` to use the format from `decisions-format.md`."

7. **Make expertise check conditional (Phase 4)** — Change the expertise check from "always Read expertise-tracking.md" to: "If the interaction revealed new user expertise, Read `expertise-tracking.md` and follow the recording protocol. Otherwise skip." CLAUDE.md is already available in context.

8. **Add expertise summary to project-status (Phase 4)** — Add a task to Phase 4: "Update project-status to include a brief expertise summary from CLAUDE.md auto-memory entries."

9. **Enumerate all path occurrences in consolidation tasks (Phase 0)** — For refine-plan and implement-plan, change "update Read paths" to "update ALL occurrences of the old path (Read instructions, reference listings, and inline mentions)."

10. **Add domain/tags field to decision format (Phase 1)** — Add optional `Domain:` field to the decision template.

11. **Define revisiting status lifecycle (Phase 1)** — Add to decisions-format.md: who can set `revisiting`, how it resolves (back to `active` with updated rationale, or `superseded` by a new decision).

12. **Fix auto memory naming convention (Phase 2)** — Use consistent kebab-case: `expertise-event-driven.md`, or document that auto memory uses underscores and why.

13. **Soften expertise check placement (Phase 4)** — Change from "before the state write-back step" to "after the main interactive work, before state write-back — each skill places it where natural."

14. **Make _shared/references/ addition to workflow.md definite (Phase 5)** — Change from conditional ("if workflow.md has one") to definite task.

15. **Specify verification spot-check criteria (Phase 5)** — "Verify workflow.md describes the same writer/reader lists as implemented."

16. **Add diff step to Phase 0 formats.md merge** — "Before merging, diff all 6 formats.md files to identify any skill-specific content."

## RESEARCH_NEEDED

None. All issues are directly actionable or require user input.

## Contradictions Resolved

1. **Phase 0 consolidation scope**: Software Architecture flagged `codebase-context-discovery.md` and `shared-preamble.md`; Agent Skill flagged the same files plus path occurrence enumeration. Merged into two separate issues (consolidation scope + occurrence enumeration). No contradiction — Agent Skill's version was more specific on the path enumeration point, Software Architecture's version was more specific on which files to consolidate vs exclude.

2. **Expertise check cost**: Agent Skill flagged per-invocation context cost; Software Architecture flagged placement awkwardness. These are complementary concerns, not contradictions. Both addressed in separate items.

3. **Holistic false alarm**: Holistic initially flagged Phase 0 missing refine-plan/implement-plan for formats.md, then retracted after codebase verification. Excluded from merged issues.

4. **Auto memory naming**: Both Software Architecture and Agent Skill flagged the underscore/kebab-case inconsistency. Deduplicated into one MINOR issue.

## Unresolved (USER_INPUT required)

1. **What does "cross-cutting guidance" mean in the downstream quest dependencies?** Both the architecture-quality and slice-quality-and-health quests list "cross-cutting guidance" as a dependency of this side quest, but the term is not defined in the plan. Is "cross-cutting guidance" satisfied by the expertise calibration notes added in Phase 4, or do the downstream quests expect a specific artifact (e.g., a shared reference file about cross-cutting concerns)? Answering this determines whether an additional deliverable is needed. (Flagged by: Holistic reviewer)
### USER_INPUT Resolved

1. **"Cross-cutting guidance" is already covered** by the decisions loading (Phase 3) + expertise calibration (Phase 4). No additional artifact needed. The downstream quests consider these two capabilities as the "cross-cutting guidance" they depend on.
