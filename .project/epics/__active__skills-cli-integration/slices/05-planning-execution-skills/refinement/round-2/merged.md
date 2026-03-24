# Merged Feedback — Round 2

### CRITICAL Issues
None.

### IMPORTANT Issues

1. **Phase 1 before-check expected count is wrong (~18 vs actual 13)**
   The Expected Behavior before-check says "expected: ~18" but actual grep returns 13 hits (5 in refine-plan, 4 in implement-plan, 4 in refine-slices). Implementer who gets 13 may waste time looking for 5 missing hits.
   Source: holistic
   Resolution: DIRECTLY_ACTIONABLE — correct the count to ~13.

2. **refine-slices line 120 activity-log write not covered in tasks**
   `skills/refine-slices/SKILL.md` line 120 in Cleanup on Interruption: `Write activity-log with "status":"abandoned"`. Not listed in the plan's task inventory. Also escapes grep verification since before-check pattern uses `activity-log\.jsonl` which won't match bare `activity-log`.
   Source: holistic + software-architecture (both flagged, software-architecture provided the most specific fix)
   Resolution: DIRECTLY_ACTIONABLE — add task bullet for line 120: replace or remove the activity-log write in Cleanup on Interruption, since interrupted/abandoned states are not tracked through CLI submit commands.

3. **create-slices task line ranges are confusing and overlap**
   "Steps 8/10 lines 125-186" spans graceful stop, CLAUDE.md update, and state write-back. CLAUDE.md update should NOT be replaced wholesale. A separate bullet "Step 9 lines 146-148" overlaps and misnumbers the step (it's Step 8 in the actual file). Implementer could delete CLAUDE.md update logic or be confused about canonical step numbers.
   Source: holistic
   Resolution: DIRECTLY_ACTIONABLE — restructure into non-overlapping ranges with correct step numbers.

4. **create-slices/references/guidance.md task underspecified — lines 42-43 also have state.md/activity-log references**
   Task says "Line 41: Replace state.md reference in graceful stop" but lines 42-43 also contain explicit state.md and activity-log references for stop cases (b) and (c). Entire Graceful Stop section (lines 41-43) needs updating.
   Source: software-architecture
   Resolution: DIRECTLY_ACTIONABLE — expand task to cover lines 41-43: replace entire Graceful Stop section, remove formats.md references.

### MINOR Issues

5. **Before/after-check grep patterns don't catch all activity-log variants**
   Patterns use `activity-log\.jsonl` but codebase has bare `activity-log` references (e.g., refine-slices lines 115, 120; create-slices lines 127-129, 172, 184). Using `activity-log` without `.jsonl` would be more comprehensive.
   Source: holistic
   Resolution: DIRECTLY_ACTIONABLE

6. **Phase 2 create-plan guidance.md task section name mismatch**
   Task says "Two-Layer Architecture section" but line 95 is in a table (likely "Architecture Layers"), not a section titled "Two-Layer Architecture". Minor clarity issue.
   Source: holistic
   Resolution: CODEBASE_EXPLORATION — verify actual section heading and correct.

7. **create-slices graceful stop `state-and-activity-formats.md` reference on line 125 not called out**
   Implicitly covered by "lines 125-186" range but since that range is already confusing (see IMPORTANT #3), this specific reference could be missed.
   Source: holistic
   Resolution: DIRECTLY_ACTIONABLE — will be resolved when IMPORTANT #3 line ranges are restructured.

8. **create-plan guidance.md line 13 has dense `__active__` references**
   Line 13 contains multiple path references. Already listed in plan but implementer should be careful to catch all occurrences within this dense line.
   Source: software-architecture
   Resolution: DIRECTLY_ACTIONABLE — add note to be thorough on line 13.

9. **Smoke test `--inline` without `--json`**
   Steps 8, 11, 14, 17 use `--inline` without `--json`. Research doc shows `--json` alongside `--inline`. Likely intentional (human-readable output) but inconsistent with research doc.
   Source: software-architecture
   Resolution: DIRECTLY_ACTIONABLE — clarify intent; add `--json` if output will be parsed, or add comment explaining omission.

### DIRECTLY_ACTIONABLE
Issues 1, 2, 3, 4, 5, 7, 8, 9 (8 total)

### RESEARCH_NEEDED
None.

### Contradictions Resolved
None — both reviewers agreed on all overlapping issues. The refine-slices line 120 issue was flagged by both reviewers; software-architecture provided the more specific fix (noting that abandoned states aren't tracked through CLI submit), which was kept as the canonical version.

### Unresolved (USER_INPUT required)
- Issue 6: Verify actual section heading in create-plan guidance.md to correct the task description (CODEBASE_EXPLORATION needed, no user decision required — can be resolved during implementation).
