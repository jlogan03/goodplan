# Merged Review Feedback — Round 1

## CRITICAL Issues

None.

## IMPORTANT Issues

**IMP-1: Phase 3 fixture task incorrectly targets pre-CLI fixtures**
Reviewer: holistic
The task "Add `tasks/overview.json` to all test fixtures" lists `pre-cli-project` and `learnings-migration` among targets. These are pre-CLI format fixtures (have `state.md` instead of `project.json`, no `decisions.jsonl`, no `quests/`). They exist for migration tests and intentionally lack modern entities. Adding `tasks/overview.json` would corrupt their purpose. Explicitly exclude `pre-cli-project` and `learnings-migration` from the fixture update list.
Resolution: DIRECTLY_ACTIONABLE

**IMP-2: Phase 4 verification requires `_overview.md` update but no task creates it**
Reviewers: holistic, software-architecture, typescript (all three flagged this)
Phase 4 verification says "_overview.md fitness function listings are accurate" but the tasks only mention updating `commands-api.md` and `rpc-layer-api.md`. The `_overview.md` subsystem maturity table has a "Fitness Functions" column. Add an explicit task: "Update `_overview.md` subsystem maturity table to list `tests/fitness/structured-errors.test.ts` in the Commands row and `tests/fitness/mutation-through-state-machine.test.ts` in the RPC Layer row."
Resolution: DIRECTLY_ACTIONABLE

**IMP-3: Phase 4 INV-001 fitness function incorrectly lists version-stamp as an exception**
Reviewers: software-architecture, typescript
The plan says `fs.writeFileSync`/`fs.writeFile` for `.json` files appears in `commit.ts` and documented exceptions `version-stamp` and `migrate`. However, `version-stamp.ts` does NOT use direct filesystem writes -- it uses `setEntry()` on the in-memory tree, written through `commitState()`. The only real exception for direct `.json` writes outside `commit.ts` is `migrate.ts`. Remove `version-stamp` from the exception list. Also clarify that the fitness function scope covers `.json`/`.jsonl` files only (not `.md` files, which `markdown-files.ts` writes directly).
Resolution: DIRECTLY_ACTIONABLE

**IMP-4: Phase 2 `setEpicStatus` test description overstates behavior**
Reviewer: typescript
The plan says to "verify status updated AND overview.json synced" for `setEpicStatus`. But `setEpicStatus` only updates `epics/{name}/epic.json` -- it does NOT sync overview.json. Overview sync is a separate function `updateOverviewStatus`. In contrast, `setSliceStatus` and `setQuestStatus` DO bundle overview sync. Fix the test description: test `setEpicStatus` for status + timestamp only. If overview sync coverage is desired, test `updateOverviewStatus` separately.
Resolution: DIRECTLY_ACTIONABLE

**IMP-5: Phase 2 helpers.test.ts scope covers ~10 of 30+ exported functions without justification**
Reviewers: holistic, software-architecture, typescript
`helpers.ts` exports 30+ functions. The plan covers 5 groups (~10 functions): `evaluateRefinement`, guards, `processLearnings`, `appendActivityLog`, status setters. Omitted: getters (`getEpic`, `getSlice`, `getQuest`, `getTask`, `getProject`), builders (`buildInitialQuestJson`, `buildInitialEpicJson`), overview functions (`addEpicToOverview`, `addSliceToOverview`, `addQuestToOverview`), `createEpicSubdirectories`, terminal checks (`isEpicTerminal`, `isSliceTerminal`, etc.). Add a note: "Covers highest-risk logic; simple getters, builders, and terminal checks are covered transitively by integration tests."
Resolution: DIRECTLY_ACTIONABLE

**IMP-6: Phase 3 event count hardcodes 41, perpetuating the staleness problem**
Reviewers: software-architecture, typescript
Changing `toHaveLength(38)` to `toHaveLength(41)` replaces one magic number with another. This test already drifted once. Either derive the count dynamically from the source (parse the StateEvent union or use the allTypes array as single source of truth and verify uniqueness + exhaustiveness), or at minimum add a comment explaining how to determine the correct count.
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**MIN-1: Phase 4 structured-errors fitness function scope is vague on "representative set"**
Reviewer: holistic
The task says "at least one per exit code" but doesn't specify which errors. For a fitness function meant to catch regressions, list specific error codes to test (e.g., one VALIDATION_* for exit 2, one STATE_* for exit 3, one INTERNAL_* for exit 1), or state "all error codes" if that's the intent.
Resolution: DIRECTLY_ACTIONABLE

**MIN-2: Phase 1 diagnosis guidance is imprecise about binary staleness**
Reviewer: software-architecture
The plan says "run `bun run build` first, then re-run tests" but `global-setup.ts` already compiles the binary before tests run. The more likely root cause is fixture schema drift or validation changes (missing `tasks/` directory). The plan should redirect investigation toward fixture-related failures, which Phase 3 also addresses.
Resolution: DIRECTLY_ACTIONABLE

**MIN-3: Phase 2 markdown-files.test.ts atomic write test is not directly testable as described**
Reviewer: typescript
The plan asks to verify "temp file cleaned up on success." But `writeMarkdownFiles` uses `fs.renameSync(tmpPath, absPath)` -- the temp file becomes the final file atomically. Testing cleanup requires mocking, which contradicts project conventions. Instead, verify indirectly: write succeeds, file has correct content, no `.tmp.*` files remain in the directory.
Resolution: DIRECTLY_ACTIONABLE

**MIN-4: Phase 2 serialize.test.ts exhaustive switch test needs specifics**
Reviewer: typescript
The plan says "exhaustive switch coverage (all StateEntry types)" but doesn't specify testing the `never` branch. Add: pass an invalid entry type (via type assertion) to verify the error path and confirm the exhaustive switch guard works at runtime.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (for loop exit)

**IMP-1:** In Phase 3 fixture task, add: "Exclude `pre-cli-project` and `learnings-migration` fixtures (pre-CLI format, used by migration tests)."

**IMP-2:** Add Phase 4 task: "Update `_overview.md` subsystem maturity table: list `tests/fitness/structured-errors.test.ts` in Commands row, `tests/fitness/mutation-through-state-machine.test.ts` in RPC Layer row."

**IMP-3:** In Phase 4 INV-001 fitness function task, change exception list from "commit.ts (and documented exceptions: version-stamp, migrate)" to "commit.ts (and documented exception: migrate.ts)". Add note: "Scope: `.json`/`.jsonl` files only; `.md` writes via `markdown-files.ts` are out of scope."

**IMP-4:** In Phase 2 helpers.test.ts, change `setEpicStatus` test description from "verify status updated AND overview.json synced" to "verify status and timestamp updated in epic.json (no overview sync -- that's `updateOverviewStatus`)."

**IMP-5:** In Phase 2 helpers.test.ts task, add scope note: "Covers highest-risk logic (~10 functions). Simple getters, builders, terminal checks, and overview-add functions are covered transitively by transition handler integration tests."

**IMP-6:** In Phase 3 event count fix, replace hardcoded `toHaveLength(41)` approach with: derive count dynamically from `state-events.ts` (e.g., import allTypes array and assert `allTypes.length`), or add comment: `// Derive: grep -c 'type:' src/core/state/state-events.ts`.

**MIN-1:** In Phase 4 structured-errors task, replace "representative set" with: "Test one error per exit code: at least one VALIDATION_* (exit 2), one STATE_* (exit 3), one INTERNAL_* (exit 1)."

**MIN-2:** In Phase 1, replace "run `bun run build` first" with: "Note: `global-setup.ts` already compiles the binary. If failures persist after a clean build, investigate fixture schema drift (e.g., missing `tasks/` directory) as root cause."

**MIN-3:** In Phase 2 markdown-files.test.ts, replace "temp file cleaned up on success" with: "Verify atomic write indirectly: write succeeds, file exists with correct content, no `.tmp.*` files remain in directory."

**MIN-4:** In Phase 2 serialize.test.ts, add: "Include a test that passes an invalid entry type (via `as any` type assertion) to verify the `default: never` exhaustive switch guard throws at runtime."

## RESEARCH_NEEDED

None.

## Contradictions Resolved

None -- all reviewers were in agreement. Overlapping issues (IMP-2, IMP-3, IMP-5, IMP-6) had consistent diagnoses across reviewers; the most specific version from the domain specialist was kept in each case.

## Unresolved (USER_INPUT required)

None.
