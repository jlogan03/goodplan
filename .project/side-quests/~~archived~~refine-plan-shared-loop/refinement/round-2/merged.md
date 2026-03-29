### CRITICAL Issues

None.

### IMPORTANT Issues

1. **Step 3i surviving sentences include content already in iteration-loop.md** (Holistic + Agent Skill)
   The third surviving sentence for 3i ("For CODEBASE_EXPLORATION items, use Grep/Glob/Read instead of external search") is already in iteration-loop.md "Handling RESEARCH_NEEDED" step 5 verbatim. Keeping it creates duplication. Trim surviving list to two sentences: (1) Context7-first/WebSearch fallback and (2) `<scope_dir>/research/<topic>.md` write path. Also update the behavioral equivalence mapping table to remove this sentence from the surviving list.
   Resolution: DIRECTLY_ACTIONABLE

2. **Verification checklist and mapping table don't cross-reference removed sentences against iteration-loop.md sections** (Software Architecture)
   For "inline shortened" rows, the mapping table lists surviving sentences but doesn't confirm the *removed* sentences are covered by the referenced iteration-loop.md section. The verification checklist references sub-steps by name but doesn't tie back to specific removed sentences. For each "inline shortened" row, the verification checklist should confirm which removed sentences map to which iteration-loop.md sub-section.
   Resolution: DIRECTLY_ACTIONABLE

3. **Approach description says "keep all sub-steps inline but briefer" yet mapping table shows two sub-steps fully replaced** (Software Architecture)
   Sub-steps 3h (USER_INPUT) and 3j (editor spawn) are marked "Replaced" in the mapping table -- full removal, reader sent to iteration-loop.md. This contradicts the approach statement. Update the approach description to acknowledge these two replacements (simplest fix; the two sub-steps are thin wrappers around generic behavior, so full replacement is justified).
   Resolution: DIRECTLY_ACTIONABLE

4. **Synthesis model downgrade row may be lost when model selection table is trimmed** (Software Architecture)
   The plan says only the "Plan editor" row survives the model selection policy table, removing "Domain reviewer" and "Synthesis" rows. iteration-loop.md covers reviewer and editor model downgrade but does NOT cover the synthesis model downgrade condition ("All reviewer scores 8+, no CRITICAL/IMPORTANT"). Removing the "Synthesis" row loses this guidance entirely. Either keep the "Synthesis" row alongside "Plan editor," or add synthesis model downgrade to iteration-loop.md.
   Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

1. **Behavioral equivalence mapping table has inconsistent granularity for "inline shortened" entries** (Holistic)
   Some "inline shortened" rows quote specific surviving sentences while 3d says only "Plan editor model selection row." Row 3d should specify: "Plan editor row of the model selection policy table (opus default, sonnet when only MINOR DIRECTLY_ACTIONABLE items)."
   Resolution: DIRECTLY_ACTIONABLE

2. **"Atomic edit" task conflates commit atomicity with working-copy safety** (Holistic)
   The `-refining` copy pattern already provides rollback safety; the single-commit instruction is redundant. Consider simplifying to just the `-refining` copy guidance.
   Resolution: DIRECTLY_ACTIONABLE

3. **"Measure line reduction" task references "~15 lines added" but actual count is ~17-20** (Holistic)
   Loop Parameters table (~14 lines) + shared loop reference (~2 lines) + iteration-loop.md reference entry (~1 line) = ~17 lines. Update to "~17-20 lines added" or drop the addition estimate and keep only the net reduction expectation.
   Resolution: DIRECTLY_ACTIONABLE

4. **Approach summary in Overview could mention the behavioral equivalence mapping** (Agent Skill)
   The Overview's Approach paragraph doesn't mention the mapping table, which is the primary correctness mechanism. A brief mention would strengthen self-documentation.
   Resolution: DIRECTLY_ACTIONABLE

5. **Loop Parameters "Scope constraints" row could note "path determined at Step 0"** (Agent Skill)
   Template placeholders are necessary given dynamic paths, but adding "path determined at Step 0" would clarify the dynamism explicitly.
   Resolution: DIRECTLY_ACTIONABLE

6. **Future cleanup note about shared-preamble.md is buried in Verification** (Software Architecture)
   A one-line note in a "Known Limitations / Future Work" section at the bottom of the plan would be more discoverable.
   Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE (for loop exit)

All 10 issues (4 IMPORTANT + 6 MINOR) are DIRECTLY_ACTIONABLE.

### RESEARCH_NEEDED

None.

### Contradictions Resolved

1. **Software Architecture says synthesis model row is lost vs. Agent Skill says "model selection policy is handled correctly (only Plan editor row survives)"** -- Software Architecture is the domain specialist for tracking cross-document dependency coverage. Its analysis that the synthesis downgrade condition is not in iteration-loop.md is a concrete factual claim. Resolved in favor of Software Architecture: the synthesis row should be preserved or its content moved to iteration-loop.md.

### Unresolved (USER_INPUT required)

None.
