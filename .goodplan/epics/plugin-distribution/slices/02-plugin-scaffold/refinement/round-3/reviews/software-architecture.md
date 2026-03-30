# Software Architecture Review — Plugin Scaffold (Round 3)

## Issues

**[MINOR] `plugin/CLAUDE.md` scoping note is good but the file's value proposition is unclear**
Round 2 raised that the root-level CLAUDE.md may never be loaded for marketplace-installed plugins. The plan now includes a scoping note acknowledging this limitation: "loaded when using `--plugin-dir` (dev/testing) but may not be loaded for marketplace-installed plugins." This is honest, but the plan still creates and maintains the file without a clear statement of when it would be removed or replaced. The plan should add a single sentence to the task: "If marketplace testing in slice 07 confirms the file is not loaded, remove it from the build script and move any remaining instructions into skill content." This makes the file explicitly provisional rather than creating a maintenance obligation for a file that may be inert.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `plugin-hooks/` directory with `.gitkeep` but no consumer until slice 04 — build script doesn't reference it**
Phase 2 creates `plugin-hooks/` with a `.gitkeep` file and notes it's "where slice 4 will add hook scripts; the build script copies from here to `dist/gp-plugin/hooks/`." However, the Phase 1 build script (which is implemented first) does not copy from `plugin-hooks/` — it only creates an empty `dist/gp-plugin/hooks/` directory. This is correct for now (no hooks exist yet), but the forward reference in the Phase 2 task description implies the build script already does the copy. The build script task in Phase 1 (step 2) creates `hooks/` as an empty directory; the `plugin-hooks/` copy step should be documented as a slice 04 addition to the build script, not presented as if it's already wired up.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
The plan has addressed all prior architecture concerns well. Round 1's version define mismatch, HMAC define removal, CLAUDE.md template location, hooks.json fallback, dist/ gitignore, and regression testing — all resolved. Round 2's `cli-usage.md` deferral to slice 06 is clean and well-justified. The CLAUDE.md scoping note is honest. The `--plugin-dir` load test in Expected Behavior is a good addition. Module boundaries are clear: the build script is a standalone shell script following the `install-skills.sh` pattern, the plugin directory is pure packaging output with no coupling back into the CLI codebase, and the marketplace manifest is correctly separated from the plugin manifest. Dependency direction is correct — the plugin consumes the CLI binary but the CLI has zero awareness of the plugin. The two remaining minors are documentation clarity issues, not structural problems. To reach 10: clarify the provisional status of `plugin/CLAUDE.md` and fix the forward reference about `plugin-hooks/` in the build script.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
