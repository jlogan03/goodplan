# TUI and CLI Review: Tracer Bullet Plan (Round 2)

## Issues

**[MINOR]** Phase 3 `process.exitCode` approach should specify cleanup ordering with `runCommand`

Phase 3 now correctly specifies `runCommand` with a custom runner that "sets `process.exitCode` with the correct code (1 generic, 2 validation, 3 state) and lets the process exit naturally after cleanup." This is good. However, the task also says the runner "(4) handles `--help` rendering manually since `runMain`'s auto-help is bypassed." The plan does not specify what `--help` rendering looks like -- whether it calls citty's `renderUsage`/`showUsage` helpers (documented in the citty research) or formats help output from scratch. Using citty's `renderUsage` is the right approach since it reads the command's `meta` and `args` definitions and keeps help in sync with the actual command definitions. The plan should reference `renderUsage` or `showUsage` to avoid the implementer building a custom help renderer.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 `--query` error behavior not fully specified

Phase 5 specifies that `--query` requires `--json` (error if used without it) and validates the jqjs integration. However, it does not specify what happens when the jq expression itself is invalid (e.g., `--query '.['`). The commands-api.md specifies `VALIDATION_INVALID_QUERY` with exit 2 for invalid jq expressions. Phase 5 tasks should note: invalid jq expression produces exit 2 with `VALIDATION_INVALID_QUERY` error. This is a one-line addition but prevents the implementer from forgetting error handling on the jqjs `compile()` call (which throws on invalid expressions).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6 verification list has 9 items but goal says "8 Phase 6 verification checks"

The plan overview says "Done = compiled ./goodplan binary passes all 8 Phase 6 verification checks." Phase 6's verification section lists 9 items (1-9), with item 9 being the NO_COLOR check added from round 1 feedback. Either update the overview to say "9 verification checks" or renumber. Minor consistency issue.

Resolution: DIRECTLY_ACTIONABLE

---

No other issues found. All round-1 TUI/CLI feedback has been addressed:

- `runCommand` replaces `runMain` with custom error handler and manual `--help` -- resolves exit code differentiation (was IMPORTANT)
- `--query <expr>` replaces `--smoke-jq` -- resolves awkward flag design and ambiguous `--json` interaction (was IMPORTANT)
- `NO_COLOR=1` verification added to both Phase 5 Expected Behavior and Phase 6 verification (was IMPORTANT)
- `badcommand --json` now works because global flags are parsed before dispatch (was IMPORTANT)
- Unknown flags documented as known limitation in plan overview (was MINOR)
- Help grouping for namespaced commands documented as deferred (was MINOR)
- stdin unit tests specified in Phase 3 tasks (was MINOR)
- Init default `--name` omission: Phase 4 still only tests `--name test-project`, not the default `path.basename(cwd)` behavior. This is acceptable for a tracer bullet -- the default path is straightforward and risks are low.

## Score: 9/10

All significant round-1 issues have been addressed. The plan now correctly uses `runCommand` for exit code control, replaces the awkward `--smoke-jq` with a proper `--query` flag, and verifies `NO_COLOR` behavior. The three remaining MINOR items are small specification gaps that an implementer could resolve without ambiguity. To reach 10: specify `renderUsage` for help, add invalid-query error handling to Phase 5, and fix the verification count in the overview.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
