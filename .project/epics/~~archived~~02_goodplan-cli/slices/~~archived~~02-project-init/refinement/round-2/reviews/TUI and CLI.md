## Issues

**[IMPORTANT]** Phase 5 Expected Behavior still missing `--quiet` verification for `init`
Round 1 (IMP-10) flagged that `goodplan init --quiet` was not verified. The plan now has the item `goodplan init --quiet` -- suppresses output (no stdout)`, which is good. However, the Tasks section for Phase 5 does not mention preserving `--quiet` behavior in the refactored init command. The current `init.ts` delegates to `output()` which respects `args.quiet`. If the refactored init changes the output path (e.g., calling a different output function or printing directly), `--quiet` could break. Add a brief note in the Phase 5 refactor task that the refactored init must route all output through `output()` to preserve `--quiet` and `--json` behavior.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 `--verbose` debug output verification is fragile
Phase 5 Expected Behavior includes: `goodplan init --name debug-test --verbose 2>/tmp/debug.txt && cat /tmp/debug.txt` -- debug logging shows files created. This verification is fragile because it checks that *something* appears in stderr but does not specify what to look for. A single blank line or unrelated warning would pass. Strengthen: verify that stderr contains at least one line mentioning a specific file path (e.g., `project.json` or `activity-log.jsonl`). Something like: `goodplan init --name debug-test --verbose 2>&1 1>/dev/null | grep -q 'project.json'`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 does not verify `NO_COLOR` / `FORCE_COLOR` respect
The existing `status.ts` uses `picocolors` for colored output. `picocolors` automatically respects `NO_COLOR` and `FORCE_COLOR` environment variables, so this is handled at the library level. However, the plan does not verify that `NO_COLOR=1 goodplan status` produces uncolored output. This is low-risk since picocolors handles it, but a single verification line would confirm the contract survives any future output refactoring.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 `init --json` verification could check output structure
The Expected Behavior item `goodplan init --json` (in fresh dir) -- returns structured JSON result` does not specify what the JSON structure should contain. Should it return the `Project` object (matching the current behavior in `init.ts`)? Or a different result shape? The current init returns the raw `Project` object in JSON mode. The refactored init via RPC could return a different shape. Specify: `goodplan init --json | jq .name` returns `"test-project"` (or whatever the expected shape is) so the implementer knows the contract.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 binary regression test does not verify exit codes
The binary regression `bun run build && ./goodplan init --name binary-test && ./goodplan status --json` relies on shell `&&` chaining to catch non-zero exits, but does not explicitly verify exit code 0. More importantly, it does not test the error path: `./goodplan init --name binary-test && ./goodplan init --name binary-test` should exit 3 in the compiled binary too. The plan has a separate `goodplan init` same-dir verification, but that uses the dev-mode `goodplan` (likely `bun run`), not the compiled binary. Add one error-path binary check.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
The plan addressed the major round 1 CLI concerns: `--quiet` and `--json` verification items were added to Phase 5's Expected Behavior, human-readable `status` output is now verified, `--query` without `--json` error is verified, and error output format verification is present. The debug logging approach is now dual-track (`--verbose` for CLI, `GOODPLAN_DEBUG` for dev/test) which is documented. Remaining issues are about verification robustness rather than missing functionality. To reach 9+: tighten the `--verbose` verification to check for specific output, ensure the refactored init preserves output routing through `output()`, and add one compiled-binary error-path test.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
