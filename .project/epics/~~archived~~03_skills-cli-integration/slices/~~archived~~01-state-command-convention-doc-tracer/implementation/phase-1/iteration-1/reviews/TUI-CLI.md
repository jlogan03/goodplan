# TUI-CLI Review: Phase 1 — State Command & Version

## Issues

**[IMPORTANT]** Version string hardcoded in two places
The plan explicitly requires: "Version must come from a single source of truth... never hardcode `"0.0.1"` in two places." In `src/index.ts`, the version is `const version = "0.0.1"` (line 65). The original `goodplan 0.0.1` string was one place; now the `const version` consolidates within the function, but the version is still a magic string in `src/index.ts` rather than imported from `package.json` or a shared constant. When the version bumps, someone must remember to find and update this string manually. This should be a single exported constant (e.g., from `package.json` or a `src/version.ts` module) used by both the `--version` handler and any future version-reporting code.
File: src/index.ts:65
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Error output goes to stdout instead of stderr for non-GoodplanErrors
In `src/commands/global/state.ts` lines 87-107, the catch block handles `GoodplanError` by writing to stdout (correct for JSON-always mode). However, non-`GoodplanError` exceptions are re-thrown via `throw error` (line 107). This is fine for the top-level handler to catch, but the top-level handler in `src/index.ts` will use `outputError`/`outputUnexpectedError` which checks `args.json` — and since `state` is invoked without `--json` by default, the top-level handler will write to stderr in human-readable format. This violates the state command's contract of "always outputs JSON." The state command should catch ALL errors (not just `GoodplanError`) and format them as JSON to stdout, setting the appropriate exit code.
File: src/commands/global/state.ts:107
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `--offset`/`--limit` without `--query` are silently ignored
The commands-api.md documents this behavior ("silently ignored without `--query`"), and the plan acknowledges it. This is acceptable but worth noting: from a CLI UX perspective, silently ignoring flags that cannot have any effect can confuse users. A minor improvement would be to emit a stderr warning (when not `--quiet`) that `--offset`/`--limit` have no effect without `--query`. Not blocking.
File: src/commands/global/state.ts:84
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Schema registry description for `state` is verbose
The `state` command's description in the schema registry is: "Expose the full .project/ state tree as JSON. Always outputs JSON regardless of --json flag." This is fine for documentation but unusually long compared to other commands (e.g., "Show current project status" for `status`). The second sentence is an implementation detail that would be better in help text than in the schema output consumed by LLMs. Consider shortening to: "Expose the full .project/ state tree as JSON" — the always-JSON behavior is implicit in "as JSON."
File: src/commands/global/schema.ts:116
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is solid: the command registration follows the established 3-step pattern, `serializeStateTree` is well-structured with exhaustive switch and clean type unwrapping, pagination logic is correctly applied between query and output, and the `--version --json` enhancement works correctly. The error handling for `GoodplanError` is consistent with INV-007. Two areas prevent a 9+: (1) the version string should use a single source of truth as the plan requires, and (2) non-`GoodplanError` exceptions bypass the state command's JSON-only error contract and fall through to the human-readable top-level handler.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
