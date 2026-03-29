# Software Architecture Review — Round 3

Plan: Refine-Plan Shared Loop Refactoring
Goal: Refactor /refine-plan's SKILL.md to replace its inline iteration loop with a reference to iteration-loop.md + a Loop Parameters table, matching the pattern used by refine-architecture and refine-slices. Pure refactoring — no behavioral change.

## Codebase Exploration

Read:
- `/Users/iwhite/.claude/skills/refine-plan/SKILL.md` (current, ~326 lines)
- `/Users/iwhite/.claude/skills/refine-architecture/SKILL.md` (target pattern)
- `/Users/iwhite/.claude/skills/refine-slices/SKILL.md` (target pattern)
- `/Users/iwhite/.claude/skills/_shared/references/iteration-loop.md` (shared reference)

Key observations:

1. **refine-architecture's pattern** (target): Loop Parameters table after Reviewer Roles, then Step 2 opens with "Read `~/.claude/skills/_shared/references/iteration-loop.md` for the shared orchestration structure. This step fills in the architecture-specific parameters." Sub-steps are kept inline but in abbreviated form.

2. **refine-slices's pattern** (also target): Step 3 opens with "Enter the shared iteration loop (read `~/.claude/skills/_shared/references/iteration-loop.md` for the full mechanics). Skill-specific details:" then bullet list of what's unique. Even more compressed than refine-architecture.

3. **iteration-loop.md coverage**: Fully covers reviewer spawn, synthesis, USER_INPUT, RESEARCH_NEEDED, editor spawn, exit criteria, graceful stop, and resume. The plan's coverage analysis (sub-steps 3c–3j) is correct.

4. **Model selection policy table** in refine-plan Step 3d: The "Domain reviewer" row IS covered by iteration-loop.md "Reviewer Spawn Pattern § 5". The "Synthesis" row downgrade condition (all scores 8+, no CRITICAL/IMPORTANT) is NOT in iteration-loop.md. The "Plan editor" row condition (only MINOR DIRECTLY_ACTIONABLE) is in iteration-loop.md § Editor Sub-Agent Pattern § 4 verbatim.

5. **refine-plan's early exit warning** (Step 3f): "report which reviewers scored below 9, their reasons, and whether the plan may need to be restructured, split into smaller plans, or have its scope reconsidered" — iteration-loop.md's early exit text says "warn the user which reviewers scored below the full-pass threshold, their reasons, and whether restructuring may help." The "split into smaller plans, or have its scope reconsidered" is plan-specific and not in iteration-loop.md.

6. **Step 3i CODEBASE_EXPLORATION sentence**: iteration-loop.md § Handling RESEARCH_NEEDED § 5 says "For CODEBASE_EXPLORATION items, use Grep/Glob/Read instead of external search" — verbatim match. Correctly identified as removable.

7. **Step 3i surviving sentences**: "Uses Context7 MCP tools first, falls back to WebSearch" and "Writes results to `<scope_dir>/research/<topic>.md`" — iteration-loop.md § 3 says only "Each agent writes results to a research directory (skill-specific location)" without specifying Context7-first or the path convention. Both survive correctly.

8. **Atomic edit requirement**: The plan uses a `-refining` working copy with the original as rollback. This is consistent with how refine-plan itself works for plans — appropriate pattern.

9. **References section update**: The plan adds a `- **Shared iteration loop**` entry matching refine-architecture's References section format. Correct.

10. **Loop Parameters table**: 11 rows. refine-architecture has 11 rows. refine-slices is missing several (Backup directory, Scope constraints, Score thresholds, Exit criteria as separate row). refine-plan's table mirrors refine-architecture, which is appropriate since they're most similar in behavior.

## Issues

**[MINOR]** Loop Parameters table has a redundant parameter pair (Exit criteria + Score thresholds)

The Loop Parameters table includes both `**Exit criteria**` ("All scores >= 9, no CRITICAL or IMPORTANT issues") and `**Score thresholds**` ("Full pass: 9+, Early exit: 8+ after 5 iterations"). These express the same information twice in different phrasings. refine-architecture has the same redundancy in its table (lines 49 and 52) — so matching the existing pattern is correct and this is consistent behavior. However, if a future cleanup of the table is planned, these two rows could be merged. Not a refactoring concern for this plan.

Resolution: MINOR — consistent with existing pattern; no action needed for this refactoring.

**[MINOR]** Behavioral equivalence table row for 3d "Synthesis" model downgrade condition is ambiguous

The plan states the "Synthesis" row survives (opus default, sonnet when all reviewer scores 8+ and no CRITICAL/IMPORTANT). However, iteration-loop.md § Synthesis Prompt Skeleton § 2 says to spawn synthesis with `model: "opus"` — it does NOT mention any downgrade condition for the synthesis sub-agent. The plan correctly identifies this as not covered by iteration-loop.md and marks it as surviving. This is accurate.

However, the surviving sentence as described in the plan ("Synthesis" row — opus default, sonnet when all scores 8+ no CRITICAL/IMPORTANT) differs subtly from the "Domain reviewer" downgrade condition (also "all previous scores 8+, only MINOR issues"). These are logically equivalent conditions expressed differently. The refactored SKILL.md should keep the table row with both conditions (Domain reviewer row should be removed, per plan; Synthesis and Plan editor rows survive). The plan handles this correctly.

Resolution: MINOR — no action needed; plan analysis is correct.

**[MINOR]** "Surviving content" for Step 3d drops the "Domain reviewer" row from the model selection policy table — but this row is not covered by iteration-loop.md in the table form

The plan says: "Remove: the 'Domain reviewer' row (covered by iteration-loop.md 'Reviewer Spawn Pattern' § 5)." iteration-loop.md § 5 says "consider `model: 'sonnet'` to reduce cost" — this matches the Domain reviewer row's "Cost-reduction condition" semantically, but it does not present a table. The surviving refactored table in SKILL.md will have 2 rows (Synthesis + Plan editor) instead of 3. This is fine — the table format is refine-plan-specific, and the missing row's content IS covered in iteration-loop.md prose. The plan is accurate.

Resolution: MINOR — no change needed; plan handles this correctly.

**[IMPORTANT]** Step 3 restructured content in refine-architecture still retains sub-steps inline (abbreviated), but the plan's approach for 3h and 3j is full replacement with a pointer

The plan calls for replacing 3h (USER_INPUT) and 3j (editor spawn) "entirely with reference to iteration-loop.md." In refine-architecture, these equivalent steps (h, j) remain as abbreviated inline sub-steps — not replaced by a pointer-only sentence. Replacing 3h and 3j with pointer-only text while keeping 3c, 3d, 3f, 3i as abbreviated inline sub-steps creates a structural inconsistency within Step 3: some sub-steps are "inline abbreviated" and some are "pointer only." A reader scanning the skill will see gaps in the sub-step sequence (missing 3h and 3j sub-steps) that could cause confusion.

Compare: refine-architecture keeps all sub-steps lettered inline (a through l) even if abbreviated. Dropping two sub-steps entirely breaks the pattern within the plan itself.

Suggested fix: Rather than eliminating 3h and 3j entirely, keep them as 1-sentence inline sub-steps that reference iteration-loop.md — e.g., "h. **Handle user input needs** (if USER_INPUT count > 0): Follow iteration-loop.md § Handling USER_INPUT." This preserves letter continuity, matches refine-architecture's approach, and is still a meaningful reduction from the current 3-sentence inline step.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Line reduction target may be optimistic given the Loop Parameters table size

The plan projects "expect net 20-35 lines removed after accounting for ~17-20 lines added for Loop Parameters table, reference text, and iteration-loop.md References entry." The Loop Parameters table alone is 13 lines (header + 11 data rows + 2 separator lines). The reference text adds 2 lines. The References entry adds 1-2 lines. Total additions: ~17 lines. Current Step 3 is ~89 lines. The sub-steps being removed/shortened: 3c (~4 lines), 3d model table (~5 lines of the 9-line block), 3f (3 lines of exit criteria definitions), 3h (~2 lines), 3j (~2 lines), 3i (~2 lines) = ~18 lines gross reduction. Net: 18 - 17 = ~1 line net reduction, far below the 20-35 projected. The projection may be based on removing more content than the plan actually specifies (since 3c, 3d, 3f, 3i are shortened, not removed). This doesn't affect correctness, but the verification step ("If reduction is under 15 lines net, investigate") could falsely trigger an investigation loop. The threshold should be lower (5-8 lines net) to match actual expected reduction.

Resolution: DIRECTLY_ACTIONABLE — adjust the verification threshold from 15 lines net to 5-8 lines net to match realistic expected reduction.

## Score: 8/10

The plan is well-structured with a clear behavioral equivalence mapping table that makes verification tractable. The coverage analysis of iteration-loop.md is thorough and accurate. The approach mirrors the existing refine-architecture pattern correctly.

Two items prevent a higher score: (1) the structural inconsistency of fully eliminating 3h and 3j while keeping other sub-steps as abbreviated inline text — this breaks the a-through-m lettering continuity that refine-architecture maintains; (2) the line reduction verification threshold is set to a value that would falsely trigger an investigation loop given the actual removal scope.

Both are DIRECTLY_ACTIONABLE and would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 4
