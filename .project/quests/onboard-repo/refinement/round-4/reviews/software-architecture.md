# Software Architecture Review — onboard-repo Plan (Round 4)

## Issues

**[IMPORTANT]** Phase 5 expertise profiling writes to `~/.claude/CLAUDE.md` and `~/.claude/projects/` — no plan task to update `expertise-tracking.md` consumer list

The shared reference `skills/_shared/references/expertise-tracking.md` maintains a `Current consumers:` list (line 81) that tracks which skills use the two-layer expertise system. The plan adds `/onboard-repo` as a new consumer (Step 10 writes expertise data, Step 12 runs the end-of-run expertise check), but no task in any phase adds `/onboard-repo` to the consumer list in `expertise-tracking.md`. This matters because the extension policy section says "Format changes that alter the CLAUDE.md section structure or memory file convention require updating all consumer skills" — if a future change needs to coordinate across consumers, onboard-repo will be missed. Add a task to Phase 5 to append `/onboard-repo` to the consumers list in `expertise-tracking.md`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 Step 12 optional epic creation via `epic:create` does not account for the fact that the project was just initialized with no existing epic — this is Mode A territory

Step 12 offers optional epic creation: "invoke via `echo '{"name":"<name>","goal":"<goal>"}' | goodplan epic:create --json` (matching `/create-epic` Mode B pattern)." However, `/create-epic` Mode B assumes an already-established project with a previous epic. For a freshly onboarded repo (which has never had an epic), the first epic requires additional setup that `epic:create` alone may not handle — specifically, `/create-epic` Mode A writes `idea.md` before creating the epic, while Mode B skips `idea.md` because it already exists. Since onboard-repo already writes `idea.md` at Step 4, this should be fine for the `idea.md` concern. But the plan should verify that `epic:create` on a project with zero previous epics works correctly — the state machine may expect `goodplan init` to have been called (which it was at Step 3) but not expect an epic to be the very first entity created after init. If this is already validated by the test harness, the plan should say so explicitly. If not, add a verification note.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 5 smoke test on a real open-source repo has no reproducibility guarantees

The smoke test task says "Clone a small open-source TypeScript repo (selection criteria: 50-500 commits, 3+ contributors, has PRs on GitHub — e.g., a well-known utility library)." The repo is not pinned — different runs may use different repos, making test failures hard to reproduce. Consider pinning a specific repo and commit SHA in the task description, or documenting the chosen repo after the first successful run. This is minor because the fixture-based automated test is the primary verification; the smoke test is supplementary.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 fixture generation creates "at least 2 contributors" in git history — git config manipulation may leave artifacts

The fixture script must create commits from multiple authors. This requires either `git commit --author` flags or changing `git config user.name` / `git config user.email` during generation. The plan doesn't specify the mechanism. Using `--author` on individual commits is cleanest and avoids mutating the test environment's git config. Specifying this prevents the implementer from using `git config` which could accidentally affect the user's global git settings if the script fails mid-run.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Variant B summary format in Step 12 adds onboard-repo-specific fields not documented in output-templates.md

Step 12 specifies: "project initialized, N subsystems identified, N conventions detected, N migrations found, N quests created, expertise profile built." Variant B in `output-templates.md` lists: artifacts written, decisions recorded, CLAUDE.md update confirmation, recommended next step. The plan's summary fields are a superset — they include domain-specific counts that aren't in the template. This is acceptable since Variant B explicitly says "format is flexible — not a rigid fenced block," but the plan should note that these additional fields are onboard-repo-specific extensions of Variant B, not a new template. This prevents a future implementer from thinking they need to add these fields to `output-templates.md`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 3's issues have been comprehensively addressed. The mkdir justification is now inline in Phase 3 Step 6. CLAUDE.md placement logic matches `/create-epic` Step 9 exactly (append at end, not near top). The test harness interactive step handling is specified (system prompt auto-approval). Test file location is now `tools/dogfood/`. Convention dispatch table is specified. Quest goal size is constrained to 2-3 sentences. Shared references are loaded on-demand. Before-checks are strengthened. Name sanitization is specified. The `.d.ts` exclusion is addressed for both hot spots and debt heuristics. Shallow-clone awareness is threaded through Steps 1, 5, and 6. The plan is architecturally sound — it respects the data ownership split (CLI owns JSON, LLM owns markdown), uses existing CLI commands without modifications, follows established skill patterns, and correctly identifies `architecture/` as an LLM-owned content directory. The remaining issues are one important item (expertise consumer list update), one item needing codebase exploration (epic creation on fresh project), and three minor consistency items. To reach 10: add the consumer list update task and verify the epic creation path.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
