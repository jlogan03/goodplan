# Merged Feedback — Round 3

## CRITICAL Issues

None.

## IMPORTANT Issues

**[IMPORTANT] Fully eliminating 3h and 3j breaks sub-step lettering continuity**
Source: Software Architecture reviewer

The plan calls for replacing sub-steps 3h (USER_INPUT handling) and 3j (editor spawn) entirely with a pointer to iteration-loop.md, with no inline sub-step remaining. But refine-architecture — the target pattern — keeps all sub-steps lettered inline (a through l) as abbreviated 1-sentence stubs rather than removing them. Dropping two letters from the sequence creates visible gaps (3g → 3i, 3i → 3k) that will confuse implementers scanning the skill.

Fix: Keep 3h and 3j as 1-sentence inline stubs referencing iteration-loop.md rather than removing them entirely. Example: "h. **Handle user input needs** (if USER_INPUT count > 0): Follow iteration-loop.md § Handling USER_INPUT." This matches refine-architecture's approach and is still a meaningful reduction from the current 3-sentence inline text.

Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**[MINOR-A] Verification checklist doesn't link to the behavioral equivalence mapping table**
Source: Agent Skill reviewer

The "Verify iteration-loop.md completeness" task tells the implementer to confirm each sentence is either covered or surviving, but doesn't point them to the mapping table (already built in the plan) as the authoritative checklist for this verification. Add one sentence: "Use the 'Removed' column of the behavioral equivalence mapping table below as the checklist of sentences to confirm."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR-B] "Build a mapping table" wording is incorrect — the table is pre-built**
Source: Agent Skill reviewer

The Verification section says "Build a mapping table..." but the table is already fully built in the plan. The implementer should validate it, not rebuild it. Change to: "Verify the behavioral equivalence mapping table below is accurate after executing the refactoring."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR-C] Line reduction verification threshold is too high**
Source: Software Architecture reviewer

The plan's verification step flags investigation if net line reduction is under 15 lines. But actual expected reduction is approximately: ~18 lines removed (shortened sub-steps 3c, 3d, 3f, 3h, 3i, 3j) minus ~17 lines added (Loop Parameters table + reference text + References entry) = ~1 line net. Even generously, the realistic net reduction is 5-8 lines, not 20-35. A threshold of 15 would always falsely trigger the investigation loop. Adjust threshold to 5-8 lines net.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR-D] Model selection policy verification bullet needs explicit expected values**
Source: Holistic reviewer

The Verification section's bullet "model selection policy 'Plan editor' and 'Synthesis' rows" is the only check for the highest-risk content in this refactoring, but it doesn't tell the implementer what to confirm. Tighten to: "model selection policy 'Plan editor' row (opus default, sonnet when only MINOR DIRECTLY_ACTIONABLE) and 'Synthesis' row (opus default, sonnet when all scores 8+ no CRITICAL/IMPORTANT) both present and correct."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR-E] Atomic edit scope guidance doesn't cover potential iteration-loop.md edits**
Source: Holistic reviewer

The atomic edit guidance (task 8) covers the SKILL.md edit, but task 3 ("Verify iteration-loop.md completeness") notes that if a gap is found, iteration-loop.md should be updated first. That iteration-loop.md edit is a prerequisite step not covered by the atomic edit guidance. Add a note clarifying that atomic edit guidance applies to the SKILL.md refactoring specifically, and that any iteration-loop.md additions (if gaps are found in task 3) are a separate prerequisite step completed beforehand.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR-F] Loop Parameters table has redundant Exit criteria + Score thresholds rows**
Source: Software Architecture reviewer

Both rows express the same information in different phrasings. However, this matches the existing refine-architecture pattern, so it is consistent behavior. No action needed for this refactoring; flag as a future cleanup opportunity.

Resolution: No action needed — consistent with existing pattern.

**[MINOR-G] Synthesis model downgrade condition analysis is correct but subtly worded**
Source: Software Architecture reviewer

The plan correctly identifies the Synthesis row downgrade condition as not covered by iteration-loop.md and marks it as surviving. The analysis is accurate. No action needed.

Resolution: No action needed — plan analysis is correct.

**[MINOR-H] Domain reviewer row removal from model selection table is correct**
Source: Software Architecture reviewer

iteration-loop.md § Reviewer Spawn Pattern § 5 covers the Domain reviewer row semantically (though in prose, not table form). The plan's identification of this row as removable is accurate. No action needed.

Resolution: No action needed — plan analysis is correct.

## DIRECTLY_ACTIONABLE (for loop exit)

All actionable items:
1. Keep 3h and 3j as 1-sentence pointer stubs (not fully removed) — IMPORTANT
2. Add link from verification checklist to mapping table's "Removed" column — MINOR-A
3. Change "Build a mapping table" to "Verify the behavioral equivalence mapping table" — MINOR-B
4. Lower line reduction investigation threshold from 15 to 5-8 lines net — MINOR-C
5. Expand model selection policy verification bullet with explicit expected values — MINOR-D
6. Clarify atomic edit scope excludes prerequisite iteration-loop.md edits — MINOR-E

Items F, G, H require no action.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

No contradictions between reviewers. The Agent Skill and Holistic reviewers both scored 9/10 and found no IMPORTANT issues; the Software Architecture reviewer scored 8/10 and found 1 IMPORTANT issue (3h/3j structural gap). The architectural concern is domain-specific and the Software Architecture reviewer has domain authority — the IMPORTANT classification stands.

## Unresolved (USER_INPUT required)

None.
