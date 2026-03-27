# Holistic Review (Round 3) — Slice 05: Tests and Migration

## Issues

**[MINOR] Phase 3 architecture doc task for `state-machine-api.md` should also mention `Directory-Based Guards` section**
The plan's Phase 3 task for `state-machine-api.md` enumerates State Key Dependencies table rows (lines 235-240) and `hasChild` guard examples (lines 262-263), but also mentions "update Directory-Based Guards section" without specifying what stale references exist there. Codebase exploration confirms the State Key Dependencies table at lines 235-240 has 4 `slices/overview.json` references and multiple flat `slices/<name>/` references. The `hasChild` guards at lines 262-263 use stale paths. The Directory-Based Guards section reference is vague — an implementer may not know what to look for. However, this is minor because the "Note: event type definitions may already be correct — verify before changing" guidance gives the implementer enough latitude to inspect and fix all stale references in the file.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 Expected Behavior "before" check claims 5 failing test files with 8 total failing test cases — research says 4 files with 8 failures**
The before check says "5 failing test files with 8 total failing test cases." The research document identifies 4 test files (3 integration + 1 fitness) with 8 failures. Phase 1 tasks list 5 test files (4 integration/fitness + 1 context test), but the context test (`startContext.test.ts`) currently passes — it is being updated for consistency, not because it fails. The `result-paths.test.ts` file was not counted in the research's "4 files" tally but does appear to have 1 failure (confirmed via codebase exploration: stale flat path at lines 19 and 47). So the actual count is 5 files with 9 failures (3 migrate + 2 workflow-slice + 1 error-transitions + 1 result-paths + 1 fitness + 1 context... but context passes). The "5 failing test files" count may be correct if counting `result-paths.test.ts` (which the research omitted), but the "8 total failing test cases" needs verification. This is minor because the implementer will run `bun test` and see the actual failures.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan has matured significantly across three rounds. All critical and important issues from rounds 1 and 2 have been addressed: `PROJECT_SCOPE_COMMANDS` replaces `STDIN_ENTITY_COMMANDS` for the fitness test exemption (IMP-1), the `startContext.test.ts` task is now decisive (IMP-2), `epicJsonContent` gets `z.input<typeof epicSchema>` typing (IMP-3), the State Key Dependencies table enumeration is explicit (IMP-4), the re-migration warning uses structured JSON output (IMP-5), and `sliceSequence` removal counts are precise with line numbers (IMP-6). Phase 2.5 now verifies build success. Before/after checks use `jq` for concrete value extraction. Timestamp format for backup naming is specified.

The plan is complete, well-phased, clear, and implementable. Goal alignment is strong — every task directly serves the confirmed goal. Phase ordering respects dependencies (tests first, migration code second, build/install third, self-migration last). Success criteria are concrete and runnable. Documentation updates are included. Code cleanup (removing `sliceSequence` from output, removing `STATE_ALREADY_INITIALIZED` guard) is addressed. No invariant violations detected. The only remaining items are minor phrasing/count clarifications.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
