## Issues

**[IMPORTANT]** Debug logging uses `GOODPLAN_DEBUG=1` env var instead of existing `--verbose` flag
Phase 3 tasks specify `GOODPLAN_DEBUG=1` for stderr debug logging, and verification uses `GOODPLAN_DEBUG=1 bun test`. However, conventions.md explicitly states: "Logging: stderr for diagnostics (only with `--verbose`), stdout for command output." The `--verbose` global flag already exists in `global-args.ts` but is unused. The plan should wire debug logging to `--verbose` rather than introducing a new env var that contradicts the documented convention. The env vars section in conventions.md says "No other env vars initially" beyond `GOODPLAN_DIR`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 `init` output lacks `--quiet` and human-mode verification
The Phase 5 Expected Behavior section tests `goodplan init --name test-project` and confirms the file structure it creates, but never verifies: (1) human-readable success output (the current init command prints `Initialized project "..." in ...`), (2) `--quiet` mode suppresses output, or (3) `--json` mode on init returns structured JSON. The existing init command already supports `--json` output. Phase 5 should verify that the refactored init preserves all three output modes, especially since the refactor replaces the output path. Add expected behavior items like: `goodplan init --name test --quiet` produces no stdout; `goodplan init --name test --json` returns the project object as JSON.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 `status` human-readable output not verified
The plan verifies `goodplan status --json` and `goodplan status --json --query` but never tests human-readable `goodplan status` (no flags). The existing `formatStatusHuman()` function produces colored terminal output with project name, active work summary, recommendations, and warnings. After the refactor from `readProject()` to `assembleState()`, the human-readable path could break silently. Add an Expected Behavior item: `goodplan status` (no flags) prints the project name and "No active work" to stdout.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 missing `--query` without `--json` error verification
The existing status command throws `VALIDATION_INVALID_INPUT` when `--query` is passed without `--json`. The plan should verify this error path survives the refactor: `goodplan status --query '.project.name'` (without `--json`) should exit 2 with the validation error.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No verification of `init` error output formatting
Phase 5 verifies `goodplan init` on an already-initialized directory exits with code 3 and `STATE_ALREADY_INITIALIZED`, but does not verify the error output format. The plan should verify both modes: human mode prints "Error: Project already initialized..." to stderr, and `goodplan init --json` in the same dir outputs the structured `{ "error": { "code": "STATE_ALREADY_INITIALIZED", ... } }` to stdout. This ensures the error output contract (INV-007) is maintained through the refactor.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10
The plan is solid on the core data model and state machine work (Phases 1-4), which are pure internal concerns with no CLI surface. The CLI-facing issues are concentrated in Phase 5, where the plan tests the happy-path JSON output thoroughly but under-verifies human-readable output modes, quiet mode, and error formatting. The `GOODPLAN_DEBUG` env var contradicts the existing `--verbose` convention. To reach 9+: wire debug logging to `--verbose`, and add Expected Behavior items covering human-readable output, `--quiet`, `--json` on init, and error format verification for both output modes.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
