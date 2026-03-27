## Issues

**[IMPORTANT]** Phase 1 rollup-learnings.ts task omits the RPC layer file-copy responsibility

The task for `rollup-learnings.ts` says "Update `handleRollupLearnings()` to create JSONL entries at the target scope keeping the same scope-relative `file` value verbatim. The state machine does NOT copy files (INV-003)." This correctly keeps the state machine pure — but there is no corresponding RPC layer task for `ROLLUP_LEARNINGS` that copies the physical `.md` files from `<source-scope>/learnings/<slug>.md` to `<target-scope>/learnings/<slug>.md`. The plan's Phase 1 RPC layer task mentions rollup file copying only in the context of `COMPLETE_SLICE` / `COMPLETE_QUEST` ("For rollup, the RPC layer copies `.md` files from `<source-scope>/learnings/<slug>.md` to `<target-scope>/learnings/<slug>.md`"). However, `ROLLUP_LEARNINGS` is a separate event type with its own handler (see `src/core/state/transitions/rollup-learnings.ts`) dispatched independently from completion events. The RPC layer code path that handles `ROLLUP_LEARNINGS` (`learning:rollup` command) also needs to copy the physical `.md` files after reduce succeeds. Without this, a standalone `learning:rollup` call would create JSONL entries at the target scope pointing to `learnings/<slug>.md` files that don't exist there.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 `collectLearnings` update mismatches actual function signature and purpose

The plan says to update `collectLearnings()` to "include the `file` field in the projection." But examining the actual code (`src/core/context/learnings.ts`), `collectLearnings` projects `LearningEntry` to `LearningSummary`, and `LearningSummary` (defined in `src/core/context/types.ts`) has a fixed shape: `{ category, summary, tags, source }`. Adding `file` to `LearningSummary` would require updating the `LearningSummary` type definition in `types.ts`, which the plan doesn't mention. Additionally, the plan says "callers that need inline detail read the `.md` files themselves using the `file` path from the returned entries" — but `LearningSummary` is used in `ContextBundle.learnings` which is consumed by skills via `--inline`. Skills receiving `LearningSummary[]` won't have `file` paths unless `LearningSummary` is updated. The plan needs to either: (a) explicitly add `file` to `LearningSummary` and update `types.ts`, or (b) clarify that `collectLearnings` is not changed and callers that need file paths use `learning:list --json` instead.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 `assembleState` verification task is imprecise about what "picks up" means

The task says "Confirm that `assembleState` reads `learnings/*.md` files as `MarkdownEntry` nodes without any schema registry changes — the existing `.md` file handling (line 105-107) already does this." Looking at the actual code, `assembleState` walks directories recursively and reads `.md` files as `MarkdownEntry` (line 105-106 of `assemble.ts`). This is correct — a `learnings/` directory will be walked and its `.md` files read. However, the task references "line 105-107" which may shift during implementation. A more robust verification would be: run `goodplan state --json --query '.learnings'` on a fixture with a `learnings/` directory containing `.md` files, and confirm the directory appears as a nested object with `.md` file keys.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 audit-architecture task is incomplete about line references

The plan says "there are two bare `learnings.md` references (lines 69 and 116) — address both." From codebase exploration, line 69 reads `.project/learnings.md` as a direct file read for context, and line 116 says "Based on reconciled gap findings + `learnings.md` + decisions + the conversation, evaluate:". The line 116 reference is a prose instruction, not a file read — it just mentions the concept. The plan should distinguish between: line 69 (replace with CLI command) and line 116 (update the prose reference to say `learnings/` or "learnings from CLI"). This is minor because the implementer will see both and handle them, but precision helps.

Resolution: DIRECTLY_ACTIONABLE

No issues found with:
- Phase ordering (schema + state machine + RPC first, then commands, then skills, then migration) is correct
- INV-003 purity (slug derivation exclusively in RPC layer, state machine receives `LearningEventEntry` with `file` already set)
- Non-breaking schema transition (Zod union with two distinct object schemas, tightened only after migration)
- `completion/learnings.md` preservation (consistently excluded from retirement across all phases)
- Phase 4 ordering (migrate first, verify, then tighten schema)
- Scope-relative `file` paths with verbatim JSONL rollup
- Testing constraint (fixture repos only, not live `.project/`)
- All round 2 IMPORTANT fixes are correctly applied

## Score: 8/10

The plan is well-structured with clear data flow, correct invariant compliance, and thorough task coverage. Round 2 fixes are all properly integrated — slug derivation is cleanly in the RPC layer, `LearningEventEntry` bridges the type gap, file paths are scope-relative, and Phase 4 ordering is correct. The two IMPORTANT issues are both about missing specificity in implementation details (standalone rollup file-copy, `LearningSummary` type update) rather than fundamental design problems. Fixing those would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
