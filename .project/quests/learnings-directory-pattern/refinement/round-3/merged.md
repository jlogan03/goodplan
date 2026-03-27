# Merged Feedback — Round 3

## CRITICAL Issues

None.

## IMPORTANT Issues

**IMP-1: Missing `state-events.ts` update task — `COMPLETE_SLICE` / `COMPLETE_QUEST` still typed as `LearningInput[]`**
(Software Architecture, TypeScript)

The plan introduces `LearningEventEntry` (with `file` instead of `detail`) but never tasks updating `src/schemas/state-events.ts`. Currently `COMPLETE_SLICE` (line 76) and `COMPLETE_QUEST` (line 99) carry `learnings: LearningInput[]`. After the RPC layer maps to `LearningEventEntry`, the event construction in `buildCompleteEvent()` will produce a compile-time type error. Add an explicit Phase 1 task: update `state-events.ts` to change `learnings: LearningInput[]` to `learnings: LearningEventEntry[]` on both event variants.

Resolution: DIRECTLY_ACTIONABLE

**IMP-2: RPC layer needs explicit `.md` file-write mechanism — `commitState()` skips markdown**
(Software Architecture)

`commitState()` explicitly skips markdown entries (`commit.ts` line 101-103). The plan says "the RPC layer writes `.md` files" but doesn't specify the mechanism. This is a new pattern: currently the RPC layer delegates all filesystem I/O to the Data Layer. Add a Phase 1 task specifying a Data Layer helper (e.g., `writeMarkdownFiles(projectDir, files)` and `copyMarkdownFiles(projectDir, copies)`) so the RPC layer stays I/O-free except through Data Layer calls. This also applies to rollup file-copy operations.

Resolution: DIRECTLY_ACTIONABLE

**IMP-3: Standalone `ROLLUP_LEARNINGS` event handler missing physical `.md` file copy**
(Holistic)

The Phase 1 RPC layer task mentions rollup file copying only in the context of `COMPLETE_SLICE` / `COMPLETE_QUEST`. But `ROLLUP_LEARNINGS` is a separate event with its own handler dispatched via `learning:rollup`. Without a corresponding task, a standalone `learning:rollup` call would create JSONL entries at the target scope pointing to `learnings/<slug>.md` files that don't exist there. Add a task to the Phase 1 RPC layer section for the `ROLLUP_LEARNINGS` handler to copy `.md` files after reduce succeeds.

Resolution: DIRECTLY_ACTIONABLE

**IMP-4: Partial-write window between `.md` file writes and `commitState()` needs documented recovery semantics**
(Software Architecture)

If the process crashes between writing `.md` files and `commitState()`, dangling `.md` files exist without JSONL entries. Conversely, if `commitState()` succeeds but an `.md` write fails mid-batch, JSONL entries reference non-existent files. Add a brief note to the Phase 1 RPC layer task stating: (1) dangling `.md` files without JSONL references are inert (all learning reads go through JSONL), and (2) JSONL entries with missing `.md` files produce a graceful degradation at read time.

Resolution: DIRECTLY_ACTIONABLE

**IMP-5: `LearningSummary` type in `types.ts` needs `file` field for context bundling**
(Holistic)

Phase 2 says "include the `file` field in the projection" for `collectLearnings()`, but `LearningSummary` (in `src/core/context/types.ts`) has a fixed shape without `file`. Skills consuming `ContextBundle.learnings` (via `--inline`) won't have file paths unless `LearningSummary` is updated. Either: (a) add `file?: string` to `LearningSummary` and update `types.ts`, or (b) clarify that callers needing file paths use `learning:list --json` instead. With `exactOptionalPropertyTypes: true`, the projection must use conditional spread (`"file" in entry ? { file: entry.file } : {}`) to avoid assigning `undefined`.

Resolution: DIRECTLY_ACTIONABLE

**IMP-6: Transition handler type annotations should use narrow type, not full union**
(TypeScript)

After the schema change, `event.learnings` in `slice-complete.ts` and `quest-complete.ts` will be `LearningEventEntry[]`. The local `learningEntries` array should be typed as the new-format variant (e.g., `LearningEventEntry[]`), not the full `LearningEntry` union. This is assignable to `setEntry()` which accepts the union, and prevents ambiguity about which variant is being constructed.

Resolution: DIRECTLY_ACTIONABLE

**IMP-7: `cli-interaction.md` payload examples show `detail` field — needs clarifying note or update**
(Agent Skill)

`cli-interaction.md` contains authoritative payload documentation for `slice:complete` and `quest:complete` (lines 422-443) showing `"detail": "..."`. During the transition this is technically correct since `learningInputSchema` still accepts `detail`, but after Phase 4 tightening these become misleading. Add a task (Phase 3 or 4) to update the payload examples or add a clarifying note about the CLI-side `detail` -> `file` mapping.

Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**MIN-1: `assembleState` verification task is imprecise and low-value**
(Holistic, Software Architecture)

The task references "line 105-107" which may shift, and the plan already answers the question in the same sentence. Mark as a verification step (not a code task) and use a runtime check (`goodplan state --json --query '.learnings'` on a fixture) rather than line references.

Resolution: DIRECTLY_ACTIONABLE

**MIN-2: Phase 3 `audit-architecture` task should distinguish file-read vs. prose references**
(Holistic)

Line 69 of `audit-architecture/SKILL.md` is a file read (replace with CLI command); line 116 is a prose instruction (update wording to say `learnings/`). The plan says "address both" without distinguishing.

Resolution: DIRECTLY_ACTIONABLE

**MIN-3: `deriveSlug` should handle empty-after-normalization edge case**
(TypeScript)

A summary of all special characters could truncate to an empty string, producing a file named `learnings/.md`. Add a note that `deriveSlug` should throw or return a fallback slug (e.g., `"learning-<index>"`) if empty after normalization.

Resolution: DIRECTLY_ACTIONABLE

**MIN-4: Phase 1 Expected Behavior `grep` commands need context clarification**
(TUI and CLI)

`grep -c 'deriveSlug' src/util/slug.ts` will exit 2 if the file doesn't exist yet. Clarify these checks target the repo source tree (not a fixture), since they verify source code presence, not runtime behavior.

Resolution: DIRECTLY_ACTIONABLE

**MIN-5: Phase 2 Expected Behavior missing negative assertion for human output**
(TUI and CLI)

The plan correctly specifies omitting `file` from human output, but the Expected Behavior section has only JSON-focused assertions. Add a negative assertion: "`goodplan learning:list` (no --json) output does NOT include file paths."

Resolution: DIRECTLY_ACTIONABLE

**MIN-6: Phase 3 verification grep may match `plan-learnings-and-feedback.md` — note expected match**
(Agent Skill)

The broader `grep -r 'learnings\.md' skills/` pattern will match `plan-learnings-and-feedback.md` in `cli-interaction.md`. Note this as an expected non-target match alongside `completion/learnings.md`.

Resolution: DIRECTLY_ACTIONABLE

**MIN-7: `epic-conventions.md` directory diagrams — task should clarify `completion/learnings.md` entries are preserved**
(Agent Skill)

The task says "Update directory structure diagrams that show `learnings.md` to show `learnings/`." But the two entries in `epic-conventions.md` (lines 66, 97) are both under `completion/` and must NOT be changed. Clarify that these are preserved and that a new `learnings/` entry is added alongside.

Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

All 14 issues (7 IMPORTANT + 7 MINOR) are directly actionable.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

**IMP-2 vs IMP-3 scope overlap**: Software Architecture flagged the missing `.md` write mechanism as a general issue; Holistic flagged the specific case of standalone `ROLLUP_LEARNINGS` missing file copies. These are complementary — IMP-2 addresses the mechanism (Data Layer helper), IMP-3 addresses a specific missing handler. Both kept as separate items since the fixes are distinct.

**IMP-5 and TypeScript MIN (now MIN-3 context)**: Holistic said `collectLearnings` update "mismatches actual function signature" and offered two options (update `LearningSummary` or don't change `collectLearnings`). TypeScript noted the `exactOptionalPropertyTypes` conditional spread requirement. Merged into IMP-5 with both the design decision and the implementation pattern.

## Unresolved (USER_INPUT required)

None.
