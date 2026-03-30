# TUI and CLI Review — State Protection Hooks

## Issues

**[IMPORTANT] Error message on block references `gp --help` but hook stderr also says "e.g., gp status, gp epic:create" -- the CLI binary may not be on PATH when delivered as a plugin**

The plan's stderr message in `protect-state.sh` says: `"Use the gp CLI instead (e.g., gp status, gp epic:create). See gp --help for available commands."` When the plugin is installed via the marketplace, the `gp` binary lives at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` — it is not on PATH. The error message will be read by Claude (not the user directly), so Claude needs to know how to invoke `gp`. The bare `gp` references work only if the binary happens to be on PATH (the installed-from-source case). For plugin users, Claude would need to use the full plugin binary path.

Consider either: (a) making the message generic ("Use the goodplan CLI commands instead of direct file writes"), or (b) using `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` in the message, or (c) accepting this is fine because Claude will already know the plugin binary path from its context. Option (c) is probably acceptable for Experimental maturity, but document the decision.

Resolution: USER_INPUT

**[IMPORTANT] `warn-bash-state.sh` exits 0 for both "warn" and "allow" — Claude cannot distinguish warning from clean pass**

The plan specifies that `warn-bash-state.sh` exits 0 in all cases (warning on stderr, or silent). Per the hook research, exit code 0 means stderr is **ignored** — it is not fed back to Claude. Only exit code 2 feeds stderr back as an error message. This means the warning in `warn-bash-state.sh` will never reach Claude at all.

From the research doc: "Exit Code 0: Allow — tool call proceeds. stdout: Parsed as JSON for optional modifications. **stderr: Ignored**." And: "Exit Code 2: Block — tool call is cancelled. stdout: Ignored. **stderr: Fed back to Claude as error message**."

To deliver the advisory warning to Claude without blocking the tool, the script should exit 0 and output JSON on stdout with an `additionalContext` field (v2.1.9+ feature, documented in the research). For example:
```json
{"hookSpecificOutput":{"additionalContext":"This command references .goodplan/ files. State files (.json/.jsonl) are managed by the gp CLI -- direct reads are fine, but avoid direct writes."}}
```

This is a functional correctness issue — the warning will be silently discarded as currently designed.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No `--json` or `--plain` structured output consideration for hook stderr messages**

The hook scripts output free-form text to stderr. This is fine for the current use case (stderr is consumed by Claude, not parsed programmatically). However, for consistency with the CLI's structured error output pattern (INV-007: structured error responses), consider whether hook error messages should follow a similar format. This is low priority since hooks run in Claude Code's runtime, not the CLI's runtime, and the consumer is always Claude's LLM context.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `realpath` availability not guaranteed on all systems**

Phase 1 task 3 mentions resolving file_path via `realpath` or string manipulation. `realpath` is a GNU coreutils command that is available on macOS via Homebrew but is **not** installed by default on macOS. The plan should specify the fallback (string manipulation with bash parameter expansion) as the primary approach, not `realpath`. Using `python3` for path resolution (since the script already depends on python3) would be more reliable: `python3 -c "import os; print(os.path.realpath(path))"`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Verification tests in Phase 1 don't test the `additionalContext` JSON output path**

If the `warn-bash-state.sh` script is updated to output JSON on stdout (per the IMPORTANT issue above), the verification tests need to check stdout for the expected JSON structure, not just stderr. The current expected behavior items only check stderr and exit codes.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan is well-structured with clear phases and concrete verification steps. However, the `warn-bash-state.sh` warning delivery mechanism is fundamentally broken — exit 0 with stderr is silently discarded per the hook protocol. This means half the hook functionality (the Bash command warning) will not work as designed. The fix is straightforward (use `additionalContext` on stdout), but it changes the script's output contract. The `gp` PATH question is a design decision that should be explicitly made. Fixing the warning delivery mechanism and clarifying the PATH assumption would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
