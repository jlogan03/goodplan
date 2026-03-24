## Issues

**[IMPORTANT] learning:rollup invocation described incorrectly**
Phase 2, Step 5 says: "Replace direct `.project/learnings.md` edit with `goodplan learning:rollup --json` with stdin payload." The actual `learning:rollup` command uses `--from` and `--to` flags, not stdin. The correct invocation is `goodplan learning:rollup --from <source-scope> --to <target-scope> --json`. The plan should specify the correct flag-based invocation and clarify the `from`/`to` scope values (e.g., `--from slices/<name> --to epics/<epic-name>`).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Filesystem-backed accumulation lacks explicit file path conventions**
The plan says the complete skill will write intermediate results to `completion/learnings.md` and `completion/architecture-updates.md` during Steps 4-6, then read them back in Step 10 to construct the `slice:complete` payload. However, the plan never specifies where `completion/` lives relative to the project. Is it `<slice-dir>/completion/`? `<epic-dir>/completion/`? The current complete skill already uses a `completion/` subdirectory pattern, but the plan should explicitly state the path derivation (likely from `status --json` response fields) so the implementer does not have to guess. This also matters for the re-entry detection in Step 2.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2 Expected Behavior: `state --json --query` grep check is fragile**
The "after" check `grep -n 'state --json --query' skills/complete/SKILL.md skills/complete/references/guidance.md` requires that exact string to appear verbatim. If the implementer uses `goodplan state --json --query` (with the binary name prefix) or breaks the command across lines, or uses `status --json --query` instead, the grep will fail despite correct behavior. Use a more robust check pattern, e.g., `grep -n 'state.*--query' skills/complete/`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 Expected Behavior: line count check (316 -> 200) uses wrong baseline**
The overview says "316->~160 lines" and Phase 1 targets "<=200 lines." The research file says create-epic is 280 lines, not 316. Actual `wc -l` confirms 280. The plan overview should reference the correct baseline (280), though the <=200 target is still reasonable.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 Step 5: learning:rollup may not be the right mechanism**
The plan says Step 5 replaces direct `.project/learnings.md` editing with `learning:rollup`. But `learning:rollup` moves learnings between scopes (e.g., from slice to epic). The complete skill's Step 5 is about synthesizing new learnings and adding them to the project-level learnings file. These are different operations. The newly synthesized learnings are part of the `slice:complete` payload's `learnings` array (with `rollupTo` tags) -- the CLI's `complete` RPC handles rollup automatically (see `slice:complete` output with `learningsRolledUp`). The plan should clarify whether `learning:rollup` is truly needed as a separate step, or whether the `slice:complete` payload's built-in rollup is sufficient.
Resolution: CODEBASE_EXPLORATION

**[MINOR] Phase 3 validation steps are manual traces, not executable checks**
Phase 3 tasks include "Manual validation: create-epic Mode A" and similar, which are read-through traces of the skill flow. These are valuable but are not runnable verifications. The Expected Behavior section's executable checks are limited to greps and `bun test`. Consider adding at least one end-to-end smoke test: run `goodplan init` + `epic:create` in a temp directory to confirm the CLI commands in the migrated skill actually work with the current CLI binary.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Convention doc location ambiguity**
Phase 3 task says "Add Migration Patterns section to convention doc (`skills/_shared/references/cli-interaction.md`)" but the research file notes that `cli-interaction-conventions.md` at the epic architecture level (402 lines) is "authoritative (newer)." The plan should clarify which file gets the new section, or note that both should be updated to stay in sync.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing, good goal alignment, and thorough Expected Behavior sections. The filesystem-backed accumulation pattern is a sound design for multi-step interactive flows. However, the `learning:rollup` invocation is wrong (flags, not stdin), the accumulation file paths are underspecified, and there is potential confusion about whether `learning:rollup` is even needed given `slice:complete`'s built-in rollup. Fixing the two IMPORTANT issues and clarifying the rollup mechanism would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
