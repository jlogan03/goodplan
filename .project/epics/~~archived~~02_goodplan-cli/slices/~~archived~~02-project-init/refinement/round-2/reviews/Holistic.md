## Issues

**[IMPORTANT]** Phase 4 INIT_PROJECT apply function does not create `learnings.jsonl` at project root

Phase 4 task says INIT_PROJECT produces: `project.json`, `epics/overview.json`, `slices/overview.json`, `quests/overview.json`, `activity-log.jsonl` with init entry, `decisions.jsonl` (empty), `learnings.jsonl` (empty), plus collection directories. However, the data model's directory structure (data-model.md) also shows `learnings.jsonl` at the project root. The plan mentions it in the Phase 4 task list but the Phase 5 expected behavior verification (`goodplan init --name test-project` output check) does not list `learnings.jsonl` or `decisions.jsonl` among the files verified after init. The Phase 5 expected behavior line says "creates .project/ with project.json, epics/overview.json, slices/overview.json, quests/overview.json, activity-log.jsonl, plus collection directories" -- this omits `decisions.jsonl` and `learnings.jsonl`. Add those to the Phase 5 expected behavior verification so the implementer confirms all files created by INIT_PROJECT are present.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 missing binary regression cleanup

Phase 5 expected behavior includes `bun run build && ./goodplan init --name binary-test && ./goodplan status --json` to verify the compiled binary works. This creates a `.project/` directory in the repo root. There is no cleanup step to remove this test artifact. This could pollute the working tree and interfere with `resolveProjectDir()` (which walks up from cwd). Either: (a) run the binary test in a temp directory (`cd $(mktemp -d) && /path/to/goodplan init ...`), or (b) add a cleanup step (`rm -rf .project/`) after the binary regression check.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 entity schemas do not mention `Learning` input type vs stored type distinction

The data-model.md and rpc-layer-api.md note that the canonical `Learning` input type omits `source` (populated by the RPC layer during persistence). Phase 2's `learningEntrySchema` defines the stored type with all fields including `source`. This is correct for the schema (it validates what's on disk), but the plan should note that a separate input type (without `source`) will be needed in a future slice when `COMPLETE_SLICE` is implemented. Without this note, an implementer might wonder whether `source` should be optional. A one-line note like "Input variant (omitting `source`) deferred to the slice that implements COMPLETE_SLICE" would prevent confusion.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 `assembleState` does not specify behavior for non-JSON/JSONL/MD file types

The architecture's data-layer-api.md says "Other files (binary, config, etc.) are ignored -- not part of the state tree." Phase 3's task description does not explicitly state what happens when the walker encounters unknown file types (e.g., `.gitkeep`, `.state-cache.json` is called out, but other non-matching files are not). Add a line: "Other file types are silently skipped (not added to the tree)."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 conventions.md update task is vague

Phase 5 includes "Update `.project/conventions.md` repo structure section to match actual `src/` directory layout after this slice." This is appropriate, but the task does not specify what sections need updating. After this slice, at minimum the following directories are new: `src/schemas/records/`, `src/core/state/`, `src/core/state/transitions/`, `src/core/rpc/`. Listing these would make the task less ambiguous.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is substantially improved from round 1. All 21 round-1 issues appear to have been addressed: Phase 1 before-checks now reference the correct path, debug logging clarifies the `--verbose` vs `GOODPLAN_DEBUG` relationship, `GOODPLAN_DIR` verification semantics are corrected, `StateError`-to-`GoodplanError` mapping is explicit, `setEntry` auto-creates intermediates, JSONL append strategy is documented, schema registry includes `projectSchema`, and Phase 5 verifications now cover human-readable output, quiet mode, JSON mode, `--query` without `--json` error path, error output format per INV-007, and activity-log content. The one IMPORTANT issue (missing verification of decisions.jsonl and learnings.jsonl in Phase 5 expected behavior) is straightforward to fix. The binary regression cleanup is also IMPORTANT because it can cause real problems during implementation. The remaining issues are minor clarity improvements.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
