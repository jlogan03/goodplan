# TUI and CLI Review: Tracer Bullet Plan

## Issues

**[IMPORTANT]** `runMain` prevents custom exit codes — plan does not address this

The plan specifies exit code 2 for validation errors and exit code 3 for state errors (per INV-007), but the citty research clearly documents that `runMain` exits with code 1 for all errors. The plan says "Handle unknown commands: catch citty's unknown command error, return exit 2" (Phase 3) but does not explain how to intercept `runMain`'s exit behavior. The citty research itself notes: "Custom error handling requires wrapping `runCommand` instead of using `runMain`." The plan should explicitly call out using `runCommand` (or wrapping `runMain` with a custom error handler) to achieve differentiated exit codes. Without this, all errors will exit 1 regardless of type, violating INV-007.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `--smoke-jq` flag design is awkward and under-specified

The plan says `--smoke-jq` on the status command "applies `.project.name` filter to the StatusResult JSON and outputs the result." This is a boolean flag that hardcodes a specific jq expression — it is neither a general-purpose flag nor a clear smoke test. The Expected Behavior says it "returns `"test"`" but the verification section says it returns `"smoke-test"` (the project name), so at least the plan is consistent on what it does. However, the flag's interaction with `--json` is unclear. Phase 5 Expected Behavior shows `--json --smoke-jq` together, implying `--smoke-jq` requires `--json`. The plan should specify: (1) does `--smoke-jq` require `--json`? (2) does it output the raw jq result (a string) or JSON-encoded output (`"smoke-test"` with quotes)? (3) what happens if `--smoke-jq` is used without `--json`? These ambiguities will cause implementation confusion.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No `NO_COLOR` / `FORCE_COLOR` verification in Expected Behavior

The architecture conventions specify picocolors respects `NO_COLOR` and TTY detection. Phase 5 introduces colored output but no Expected Behavior item verifies that `NO_COLOR=1 ./goodplan status` produces uncolored output, or that piped output (non-TTY) strips colors. Phase 6 binary verification also omits this. Since this is a tracer bullet proving the tech stack, verifying color behavior in the compiled binary is important — picocolors could behave differently in a compiled binary context.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 Expected Behavior for `badcommand --json` is unreliable

The plan expects `bun run src/index.ts badcommand --json` to output structured JSON error to stdout. But if `runMain` handles the unknown command error before the custom error handler gets it, the `--json` flag may never be parsed (since `badcommand` is the subcommand token, not a recognized command). Citty's `runMain` logs the error and exits — it does not parse remaining flags for unknown commands. The plan needs to address how the `--json` flag is captured for error cases where the subcommand itself is invalid. This ties into the `runMain` vs `runCommand` issue above.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 init command path is `src/commands/global/init.ts` but architecture says one file per command organized by namespace

The plan correctly places init under `global/` namespace. However, the `--name` flag defaults to `path.basename(cwd)`. The Expected Behavior for Phase 4 tests init with `--name test-project` but does not test the default (no `--name` flag). The default behavior should be verified since `path.basename(cwd)` behavior in a compiled binary may differ (binary could be run from any directory, including `/`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 stdin infrastructure (`readStdin`) is built but never verified by Expected Behavior

The plan creates `src/util/stdin.ts` with TTY detection, 1 MB limit, JSON parsing, and error handling. But no phase's Expected Behavior exercises stdin. The `init` command uses `--name` flag only. The `status` command is read-only. Stdin is not tested until future slices. Since this is a tracer bullet, building stdin without verifying it in the binary risks shipping broken infrastructure. Either add a minimal stdin verification (e.g., `echo '{}' | ./goodplan status --json` should work) or defer stdin to the slice that first uses it.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `--help` output quality for colon-namespaced commands not addressed

The citty research notes: "there is no automatic namespace grouping for help output. `gp --help` will list `epic:create`, `epic:list` as flat entries, not grouped under `epic`." In this tracer bullet, the only commands are `init` and `status` (both global), so this is not an immediate problem. But the plan registers them under `subCommands` in `main.ts` and the Expected Behavior checks `--help` "shows available commands listed." The plan should note that help output formatting for colon-namespaced commands is a known limitation to address in later slices, so the implementer does not waste time trying to group commands in help output during this slice.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Unknown flags are silently ignored — not mentioned in plan

The citty research documents: "unknown flags are silently ignored (not errors)." This means `./goodplan status --typo-flag` will succeed silently. The plan does not acknowledge this. For a tracer bullet this is acceptable, but it should be documented as a known limitation so future slices can decide whether to add unknown-flag detection.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan covers the right scope for a tracer bullet and the phase sequencing is logical. However, it has a significant gap around exit code handling — the plan specifies custom exit codes (2, 3) as verification criteria but does not address the fact that citty's `runMain` always exits with code 1. This would cause Phase 3 and Phase 6 verification to fail as written. The `--smoke-jq` interaction with `--json` is ambiguous, and the stdin infrastructure is built but never verified. To reach 9+: resolve the `runMain` vs `runCommand` exit code strategy, clarify `--smoke-jq` behavior, add `NO_COLOR` verification, and either verify or defer stdin.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
