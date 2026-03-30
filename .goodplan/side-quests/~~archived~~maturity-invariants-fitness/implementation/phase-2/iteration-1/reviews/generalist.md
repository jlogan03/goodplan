# Phase 2 Review: `/define-architecture` Update

**Reviewer:** Generalist
**Score:** 9/10

## Summary

All plan tasks are implemented correctly. Steps 8f/8g/8h are properly placed between 8e (line 153) and Step 9 (line 205). Step 9b (Expertise Check, line 226) is unchanged. The three new steps, graceful stop cases, template updates, and guidance additions are coherent and cross-reference `maturity-conventions.md` consistently.

## Findings

### Important (1)

1. **Graceful stop cases positioned inside 8e, before the new steps they protect.** The graceful stop section (8e) now contains interruption handlers for Steps 8f/8g/8h (lines 162-164), but 8e appears _before_ those steps in the document (8e ends at line 165, 8f starts at line 166). This means an agent reading linearly encounters the stop-handling for steps it hasn't read yet. While functionally correct (the stop logic references steps by name, not by position), it mildly violates the principle of defining behavior after defining the step. This is a structural ordering concern, not a correctness bug -- the plan explicitly called for this placement ("Insert between existing Step 8e cases and Step 9 cases"), so it was implemented as specified.

### Minor (2)

1. **`_overview.md` template includes Subsystem Maturity section but no guidance on re-entry.** If `/define-architecture` re-enters (Case D) and `_overview.md` already has a populated Subsystem Maturity table, Step 8f says "populate the section" without addressing whether to merge with or replace existing content. The re-entry check (Step 3, Case D) handles revisiting at the file level, but the maturity table within `_overview.md` has no specific merge guidance.

2. **Guidance section "Early Stop" in `guidance.md` not updated to mention 8f/8g/8h.** The guidance file's Early Stop section (lines 54-59) still lists only cases (a), (b), and (c). The detailed graceful stop cases in SKILL.md are correct and complete, but the guidance summary doesn't reflect the three new stop scenarios. This creates a minor inconsistency between the two files -- agents following only `guidance.md` for early-stop context would miss the new cases, though the authoritative SKILL.md is always loaded first.

## Verification Checklist

- [x] Steps 8f/8g/8h exist with clear instructions between Step 8e and Step 9
- [x] Step 9b (Expertise Check) present and unchanged
- [x] New steps execute before Step 9, so artifacts are included in CLAUDE.md
- [x] `_overview.md` template includes Subsystem Maturity section
- [x] Guidance covers all three new concepts (maturity, invariants, fitness functions)
- [x] Each step references `maturity-conventions.md` for format
- [x] Invariant creation handles both "user has ideas" and "nothing yet" cases
- [x] Graceful stop cases cover interruption during Steps 8f/8g/8h
- [x] `<subsystem>-api.md` template includes `## Fitness Functions` section
- [x] Cross-file consistency: SKILL.md steps, templates, and guidance all align
