# Holistic Review: Planning & Execution Skills Migration

## Issues

**[IMPORTANT]** Plan claims ~13 Phase 1 hits but actual count is 6 (state.md/activity-log/state-and-activity-formats only) or 13 (including __active__ hits)
The "Before implementation" check in Phase 1 says `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/refine-plan/ skills/implement-plan/ skills/refine-slices/` returns "expected: ~13". Actual count for that specific grep is 6. The ~13 figure only holds if you include `__active__` hits, but the grep pattern shown does not include `__active__`. Either update the grep pattern to include `__active__` (matching the verification grep at the end of Phase 1), or correct the expected count to ~6. This discrepancy could confuse an implementer about whether they've found everything.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 create-plan task list misses quest-scoped CLI commands
The plan's Phase 2 task for `create-plan/SKILL.md` Step 7 says: "For slice scope: use `submit-plan --slice <name> --json`. For quest scope: use the quest equivalent." But it does not specify the quest equivalent command name. The CLI has `quest:plan --quest <name>` for beginning planning and the submit commands use `--quest` flag. The implementer needs to know the exact command: `submit-plan --quest <name> --json`. Similarly, the scope resolution in Step 2 (lines 27, 29, 31) references `side-quests` paths that need quest-scoped CLI resolution, but the task description only mentions `.activeSlice` — quests would appear under a different status field. Spell out the quest commands explicitly so the implementer doesn't have to guess.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** create-plan/references/guidance.md line 7 auto-detect `__active__` glob not listed in Phase 2 tasks
The plan's Phase 2 task for `guidance.md` lists "Lines 5-7: Replace state.md and __active__ in scope resolution" and "Lines 95, 99-103" and "Lines 113-114". However, line 7 also has an `__active__` glob in the auto-detect logic (`epics/__active__*/slices/`), and line 13 has another (`epics/__active__<name>/slices/sequencing.md`). The plan does mention line 13 as a separate bullet. Good. But the task description for "Lines 5-7" lumps three distinct changes together. Line 5 is `__active__`, line 6 is `state.md`, line 7 is `__active__` — each has a different replacement. Clarify that line 6 (`state.md` read for active slice) should become `goodplan status --json` -> `.activeSlice`, while lines 5 and 7 replace `__active__` globs with `status --json` -> `.activeEpic` + unprefixed paths.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 "refine-slices/SKILL.md" task says "Add version check (Step 0)" but doesn't mention what existing Step 0 content to preserve
The refine-slices SKILL.md has existing Step 0 content (epic detection via `__active__` glob). The task says to add a version check (Step 0) *and* replace `__active__` paths (lines 26, 32, 36). It should be clear that the version check is prepended to or integrated into the existing Step 0, not that it replaces the entire step. The explore/create-architecture skills from slices 03-04 can serve as the pattern reference.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** create-slices SKILL.md CLAUDE.md update (Step 9, lines 146-148) has `__active__` in example text
The plan correctly identifies this at line 101: "Replace `__active__` path references with unprefixed paths." But the example on line 148 is `- .project/epics/__active__initial/slices/sequencing.md`. The replacement should use unprefixed path derived from `goodplan status --json`. This is already covered by the task but worth noting that the example text itself needs rewriting, not just the instruction around it.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Smoke test step 10 syntax `stdin: "" |` is not valid shell
Steps 10, 12, 13, 16, 18 use `stdin: "" | goodplan ...` which is pseudo-syntax, not runnable shell. The research file notes `stdin: ""` is a requirement but actual shell would be `echo "" | goodplan ...` or `echo '{}' | goodplan ...`. For a smoke test that an implementer will actually run, use real shell syntax. Previous slices used `echo '{}' | goodplan ...` or `echo '' | goodplan ...`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured, follows established migration patterns from slices 03-04, and correctly groups skills by complexity. Phase ordering is logical, verification steps are concrete and grep-based (matching the proven approach). The codebase exploration confirms all referenced files exist, CLI commands are present, and pattern counts are broadly correct. The main gaps are: (1) quest-scoped commands in create-plan are underspecified, (2) hit count discrepancy in Phase 1 expected behavior, and (3) smoke test uses pseudo-syntax instead of runnable shell. Addressing the two IMPORTANT issues and cleaning up the MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
