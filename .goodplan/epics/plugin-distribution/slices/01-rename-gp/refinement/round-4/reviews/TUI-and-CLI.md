# TUI and CLI Review — Rename to gp (Round 4)

## Issues

**[IMPORTANT] Phase 1 `schema.ts` task says "update `.project/` references to `.goodplan/`" but `migrate` registry entry needs both**
The Phase 1 task for `schema.ts` (line 48 of the plan) says: update `.project/` references in command descriptions (~lines 121-141) to `.goodplan/`. The `migrate.ts` task (line 44) correctly says to update `meta.description` (~line 34) and `schema.ts` registry entry (~line 127) to mention **both** `.project/` and `.goodplan/`. But the separate `schema.ts` task on line 48 contradicts this by saying to update all `.project/` references to `.goodplan/` — which would change the `migrate` registry entry at line 127 to only mention `.goodplan/`, losing the `.project/` legacy input reference. The `schema.ts` task should explicitly carve out the `migrate` entry at line 127 and defer to the `migrate.ts` task's "mention both" instruction, or the blanket "update to `.goodplan/`" wording should add "except the `migrate` entry, which should mention both per the migrate.ts task."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `runner-modes.test.ts` assertion `toContain("gp")` is fragile — could match substrings**
The plan says to change `expect(result.stdout).toContain("goodplan")` to `toContain("gp")` at ~line 44. The string `"gp"` is a very short substring that could match unintended content (e.g., a description containing "helping" or any word with "gp"). The `state.test.ts` task correctly uses a regex `/^gp /` which is anchored and specific. Consider using a regex here too (e.g., `/\bgp\b/` or checking the `--version` output specifically) for robustness. This is minor because the test context (the `--version` output line) is short and unlikely to false-match in practice.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 verification step `grep -r '\.project/' skills/ CLAUDE.md` will not match CLAUDE.md**
The Phase 2 verification says: `grep -r '\.project/' skills/ CLAUDE.md --include="*.md" -l` — should return no results. But `--include="*.md"` with `skills/` as a directory argument works for recursive search into `skills/`, while `CLAUDE.md` as a separate file argument is also filtered by `--include`. This should work. However, the plan expects "no results" but Phase 2 tasks for `CLAUDE.md` say to update `.project/` paths to `.goodplan/`. The CLAUDE.md in the repo root (line 93) contains `.project/` references in the "Three Separate Things" table — which describes the installed CLI writing to `.project/`. The user decision says ".project/architecture/*.md as-is" and the three-worlds separation says `.project/` is managed by installed tools. The CLAUDE.md references to `.project/` in the rules table (e.g., "Run a workflow command: `goodplan status --json`", "Mutate `.project/` state") describe the *installed* CLI and its current state directory. These should be updated to reference `gp` (binary) and `.goodplan/` (directory) since after this rename, the installed CLI will eventually also be `gp` with `.goodplan/`. But the verification "should return no results" is correct only if ALL `.project/` references in CLAUDE.md are updated. The plan should clarify whether the three-worlds table rows mentioning `.project/` get updated or not.
Resolution: DIRECTLY_ACTIONABLE

No issues found with:
- CLI argument design: `gp` is shorter, more ergonomic, consistent with convention (git, gh, gp). Help text and `--version` format are properly addressed.
- Output formatting: `[gp]` stderr prefix is more concise. Version output `gp <version>` is clean.
- Error reporting: Error messages are updated consistently ("`No .goodplan/ directory found. Run `gp init`"`).
- Cross-platform: No platform-specific concerns introduced.
- Testing approach: Verification steps include actual binary execution (`./gp --version`, `./gp init`, `bun run test`), which is the most direct verification method. The migrate lifecycle test is well-specified.
- Input handling and `migrate` dual-path: The command-layer detection pattern (check `.goodplan/` first, `.project/` fallback) is sound and consistent with `init.ts`'s direct-check pattern.
- Install script cleanup: The `rm -f "$INSTALL_DIR/goodplan"` step to remove the old binary is a good UX detail.
- Fixture handling: The `pre-cli-project` exception for legacy migrate testing is correct. Atomicity requirement for `GOODPLAN_DIR` + fixture renames prevents test breakage.

## Score: 9/10

The plan is thorough with accurate codebase references. All round-3 IMPORTANT issues (`.gitignore` keep-and-augment, `migrate` description mentioning both directories, `withMigrateFixture` keeping `.project/` paths) have been resolved. The remaining IMPORTANT issue is a contradiction between the `schema.ts` blanket-update task and the `migrate.ts` task's "mention both" instruction for the same registry entry. The two MINOR issues are low-risk polish items. Resolving the IMPORTANT item brings this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
