## Issues

**[IMPORTANT]** Behavioral equivalence mapping table does not verify iteration-loop.md section coverage for "inline shortened" rows
The plan adds an excellent mapping table (sub-steps 3a through 3m) resolving round-1 feedback. However, for rows marked "Inline shortened," the table lists surviving sentences but does not confirm that the *removed* sentences are actually covered by the referenced iteration-loop.md section. For example, row 3c says surviving sentence is "do NOT read the reviewer prompt files yourself" and points to iteration-loop.md "Reviewer Spawn Pattern" -- but the plan does not include a verification step that reads iteration-loop.md's "Reviewer Spawn Pattern" and confirms it covers the general parallel-launch rationale and bootstrap mechanics that are being removed from 3c. The "Verify iteration-loop.md completeness" task (third task in Phase 1) addresses this in principle, but its checklist references sub-steps 3c/3d/3f/3h/3i/3j by name without explicitly tying back to the *specific removed sentences* from the behavioral equivalence table. The verification checklist and the mapping table should cross-reference each other: for each "inline shortened" row, the verification checklist should confirm which removed sentences map to which iteration-loop.md sub-section.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan's approach description says "keep all sub-steps inline but briefer" yet the mapping table shows two sub-steps fully replaced
The Overview/Approach paragraph states: "keep all sub-steps inline but briefer, with an explicit iteration-loop.md reference at the top of the loop step. This avoids the hybrid problem of forcing readers to switch between two documents." But the mapping table shows sub-steps 3h (USER_INPUT) and 3j (editor spawn) as "Replaced" -- meaning their inline content is fully removed and the reader IS sent to iteration-loop.md. This contradicts the approach statement. Either (a) update the approach description to acknowledge these two replacements, or (b) keep brief inline stubs for 3h and 3j matching the "inline shortened" pattern used elsewhere. Option (a) is simpler and more honest -- the two replaced sub-steps are thin wrappers around generic behavior, so full replacement is justified.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Model selection policy table surviving rows should be explicit
The mapping table row for 3d says surviving content is "the 'Plan editor' row of the model selection policy table only." The task description for "Shorten inline content" says the same and adds that "Domain reviewer" and "Synthesis" rows should be removed. This is clear. However, iteration-loop.md's "Reviewer Spawn Pattern" section 5 covers reviewer model downgrade, and "Editor Sub-Agent Pattern" section 4 covers editor model downgrade -- but neither covers the *synthesis* model downgrade condition ("All reviewer scores 8+, no CRITICAL/IMPORTANT"). If the "Synthesis" row is removed from refine-plan's table, the synthesis model downgrade guidance is lost entirely (it's not in iteration-loop.md). The plan should either (a) keep the "Synthesis" row alongside the "Plan editor" row, or (b) add synthesis model downgrade to iteration-loop.md (which would require verifying refine-architecture and refine-slices aren't broken).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Future cleanup note about shared-preamble.md placement is buried in the verification section
The plan includes a "Future cleanup note" at the very end of the Verification section noting the asymmetry between iteration-loop.md (in `_shared/`) and shared-preamble.md (in `refine-plan/references/`). This is good -- it was flagged in round 1. However, placing it inside Verification makes it easy to overlook during future planning. A one-line note in a "Known Limitations / Future Work" section at the bottom of the plan would be more discoverable. Minor because the information is present; it's just placement.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Significant improvement from round 1 (was 6/10). The plan now explicitly follows refine-architecture's "all sub-steps inline but briefer" pattern, includes a concrete behavioral equivalence mapping table, has sentence-level precision for surviving content, addresses atomicity, and tightens the Loop Parameters values. The two remaining IMPORTANT issues are: (1) the verification checklist and mapping table don't cross-reference removed sentences against iteration-loop.md sections, creating a gap where content could be silently lost; and (2) the approach description contradicts the mapping table on two fully-replaced sub-steps. To reach 9+: fix the approach description inconsistency and add cross-references between the verification checklist and the mapping table's removed content.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
