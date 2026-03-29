# TUI and CLI Review — Rename to gp (Round 5)

## Issues

**[IMPORTANT] Phase 2 CLAUDE.md task contradicts its own verification note**
The task on line 93 says "update all `.project/` paths to `.goodplan/`, CLI invocation examples to `gp`" — a blanket instruction. But the Phase 2 verification on line 98 explicitly says "CLAUDE.md's 'Three Separate Things' table intentionally uses `.project/` to describe the installed CLI's current state directory and those references are correct." The three-worlds section (#2 and #3) references the *installed* `goodplan` binary at `~/.local/bin/goodplan` and `.project/` as the installed CLI's state directory. These describe the installed tool's behavior, not the repo source code being renamed. Until `bun run install:skills` is run post-rename, the installed CLI remains `goodplan` writing to `.project/`. The task should be scoped: update CLI invocations and `.project/` paths in CLAUDE.md EXCEPT the "Three Separate Things" section (headings, prose, and the Rules table), which describes the currently-installed tool and should only be updated when the renamed CLI is actually installed. Alternatively, if the intent is a forward-looking update (anticipating the install), the task should say so explicitly and acknowledge the temporary inconsistency.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 verification step missing `migrate` re-migration test with `.goodplan/` input**
The Phase 1 verification (line 67) says "run `./gp migrate` in a directory with a legacy `.project/`" but doesn't verify re-migration from `.goodplan/` input. The `migrate.ts` task (line 44) adds dual-path resolution (check `.goodplan/` first, then `.project/` fallback), and the `migrate.test.ts` task (line 56) says "Add test coverage for `.goodplan/` input if not already present." But the manual verification only covers the `.project/` input path. Add a second manual verification: create a `.goodplan/` directory (e.g., via `./gp init`), then run `./gp migrate` to verify re-migration from `.goodplan/` works.
Resolution: DIRECTLY_ACTIONABLE

No issues found with:
- **CLI argument design**: `gp` is short, memorable, and consistent with CLI naming conventions (`git`, `gh`, `gp`). The `--version` output format `gp <version>` is clean and standard.
- **Output formatting**: `[gp]` stderr prefix is concise. Structured `--json` output is unchanged. The distinction between binary name (`gp`) and product name ("goodplan") in error messages and descriptions is well-drawn.
- **Error reporting**: Error messages are updated consistently. The generic "No project directory found" for the RPC layer (line 46) is correct — the RPC layer doesn't know which directory name was used. The command layer provides the specific guidance (`"No .goodplan/ directory found. Run \`gp init\`"`).
- **Cross-platform**: No platform-specific concerns. Path construction uses `path.join()` throughout.
- **Testing approach**: Verification uses actual binary execution (`./gp --version`, `./gp init`, full lifecycle). The regex fix for `runner-modes.test.ts` (`/\bgp\b/` instead of `toContain("gp")`) from round 4 is incorporated. The `state.test.ts` pattern `/^gp /` is correctly used as a model.
- **Input handling**: The `migrate` dual-path resolution (`.goodplan/` first, `.project/` fallback) is sound. The atomicity requirement for `GOODPLAN_DIR` + fixture renames is the correct mitigation for the trust model gap.
- **`schema.ts` consistency**: The round 4 IMPORTANT issue (blanket update vs. migrate entry exception) is now correctly resolved — line 48 explicitly carves out the `migrate` entry.
- **Install script**: The `rm -f "$INSTALL_DIR/goodplan"` cleanup step with user-facing message is good UX for a clean-break rename.
- **`--help` output**: The citty `name: "gp"` change (line 40) will propagate to help text automatically. The `init` description ("Initialize a new goodplan project") correctly keeps "goodplan" as the product name.

## Score: 9/10

All round 4 issues have been addressed. The plan is thorough with accurate codebase references, consistent CLI naming conventions, and well-specified verification steps. The remaining IMPORTANT issue is a contradiction between the CLAUDE.md blanket-update task and its own verification note about the three-worlds table. The MINOR issue is a missing manual verification step for re-migration. Resolving the IMPORTANT item brings this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
