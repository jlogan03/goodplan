# Holistic Review: Tracer Bullet Plan

## Issues

**[IMPORTANT] Exit code handling requires wrapping `runCommand` instead of `runMain`**
Phase 3 says "Handle unknown commands: catch citty's unknown command error, return exit 2 with VALIDATION_UNKNOWN_COMMAND" and Phase 6 verification expects differentiated exit codes (2 for validation, 3 for state errors). However, the citty research (citty.md) documents that `runMain` exits with code 1 for ALL errors and calls `process.exit(1)` directly. The plan does not specify how to intercept this behavior. The plan should explicitly state that `src/index.ts` must use `runCommand` (not `runMain`) with a custom error-handling wrapper to control exit codes, or wrap the main command execution in a try/catch that handles `CLIError` before `runMain` can call `process.exit`. Without this, all errors will exit 1 regardless of type.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Directory structure mismatch between plan and conventions**
Phase 1 creates `src/core/data/`, `src/core/state/`, `src/core/context/` which aligns with the architecture overview. However, `conventions.md` (project conventions) lists `src/core/workflow/` instead of `src/core/state/` in the repo structure. The plan should reconcile this -- either the project conventions need updating or the plan should match the documented repo structure. Additionally, `conventions.md` lists `src/commands/build/` and `src/commands/resource/` as namespaces while the architecture docs use `epic/`, `slice/`, `quest/` etc. The plan correctly follows the architecture docs, but conventions.md appears stale.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `--smoke-jq` filter expression inconsistency with goal.md**
Phase 5 specifies the jqjs smoke test applies `.project.name` to the StatusResult JSON. The goal.md says "applies `.name` to status output." Given the StatusResult schema (which nests project name inside a `project` object), `.project.name` is the correct filter. However, this means goal.md is slightly wrong. The plan should note this correction explicitly so the implementer does not try to match the goal verbatim. Alternatively, if the StatusResult had a top-level `name` field, `.name` would work -- but that contradicts the schema defined in Phase 2.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Unknown flags are silently ignored -- no verification for this**
The citty research notes that unknown flags are silently ignored (not errors) as of v0.2.1. The plan's Phase 3 Expected Behavior tests `badcommand` (unknown command) but never tests unknown flags (e.g., `goodplan status --nonexistent-flag`). The plan should document this as a known limitation and decide whether to accept citty's default behavior or implement custom unknown-flag detection. This matters for INV-007 (no silent errors).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 `build` script defined in Phase 1 but used in Phase 6**
Phase 1 tasks say: "Add scripts: `build` (bun build --compile)". Phase 6 tasks also say: "Add `build` script to package.json: `bun build --compile src/index.ts --outfile goodplan`". The Phase 6 version is more specific (includes `--outfile goodplan`). Either remove the build script from Phase 1 (since it cannot be verified until Phase 6) or make Phase 1's version match Phase 6's specification exactly. Having it in both phases creates ambiguity about which is the source of truth.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 before-check assumes empty directory exists**
Phase 2 Expected Behavior "Before" states: `ls src/core/data/` -- "directory exists but empty". But this directory was just created in Phase 1 as part of the directory structure. The before-check should verify the absence of specific files (e.g., `ls src/core/data/json.ts` -- file not found) rather than asserting a directory is empty, which is a weaker assertion.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No documentation update tasks**
None of the phases include tasks for updating documentation. While this is a greenfield tracer bullet (no existing docs to update), Phase 6 should include a task to update the epic's architecture `_overview.md` maturity table if the tracer bullet reveals anything about subsystem maturity. The plan does mention "Document binary size for baseline tracking" in Phase 6 but does not specify where this gets documented.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] stdin infrastructure (Phase 3) has no Expected Behavior test**
Phase 3 creates `src/util/stdin.ts` with TTY detection, JSON parsing, and size limits, but the Expected Behavior section only tests `--help` and `badcommand`. There is no before/after check for stdin behavior (e.g., `echo '{}' | bun run src/index.ts init --name test` or verifying TTY detection). This infrastructure is included early because it is shared by future mutation commands, but the only command that could exercise it in this slice is `init` -- which does not accept stdin. Consider adding a unit test reference to Phase 3's Expected Behavior or deferring stdin infrastructure to a later slice where it can be properly verified.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 verification uses absolute path that will vary**
Phase 4 Expected Behavior says `bun run /path/to/src/index.ts init --name test-project`. This is a placeholder path. Real verification commands should use a consistent approach (e.g., always run from the project root with `bun run src/index.ts`). This is cosmetic but could confuse an implementer.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing, good bottom-up ordering, and solid alignment to the confirmed goal. The Expected Behavior sections are concrete and falsifiable. However, there are several important gaps: the critical citty exit-code behavior that conflicts with the plan's error handling expectations, a directory structure mismatch with project conventions, and missing verification for the stdin infrastructure that is included in scope. Addressing the IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 5
