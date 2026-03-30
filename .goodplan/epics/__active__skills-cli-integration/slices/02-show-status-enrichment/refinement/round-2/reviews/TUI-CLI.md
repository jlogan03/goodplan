## Issues

**[IMPORTANT]** Phase 4 version warning uses `outputError()` but that function outputs structured JSON errors to stdout

The plan says "Use `outputError()` which respects these flags" for version mismatch warnings. But `outputError()` in `src/util/output.ts` (lines 46-63) writes structured `{ error: { code, message } }` JSON to **stdout** in `--json` mode -- it is designed for errors, not warnings. A version compatibility warning is not an error (the command still executes). Using `outputError()` would: (1) write to stdout in JSON mode, polluting the structured command output, or (2) require calling it before the command runs, meaning stdout would have both a warning object and the command result -- invalid JSON for parsers.

The plan should instead specify a dedicated warning path: `process.stderr.write()` for human mode, and complete suppression in `--json` and `--quiet` modes. Check `args.json` and `args.quiet` directly at the call site -- no need for a new utility function. This matches the stated goal ("suppress in `--json` mode") without misusing the error output channel.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 version compat check cannot access `--json`/`--quiet` flags at the dispatch point

The plan places the version compatibility check in `src/index.ts` between the unknown-command check and `runCommand()`. At that point in the dispatch path (lines 91-107), only `globalFlags.json` is available (parsed manually from argv). The `--quiet` flag is NOT extracted by `parseGlobalFlags()` -- it only extracts `--json`. This means the plan's requirement to suppress warnings in `--quiet` mode cannot be implemented at the proposed location without also extracting `--quiet` in `parseGlobalFlags()`.

Fix: Either (a) extend `parseGlobalFlags()` to also extract `--quiet`, or (b) note in the plan that the version check task must update `parseGlobalFlags()` to include `quiet: boolean`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `ArtifactFlags` Zod schema placed in `src/schemas/entities/` but artifacts describe command output, not stored entities

The plan says to place `ArtifactFlags` Zod schema in `src/schemas/entities/` with the rationale that "artifact flags describe entity properties, not command shapes." However, `src/schemas/entities/` contains schemas for persisted JSON files (`epic.json`, `slice.json`, `quest.json`, `project.json`). `ArtifactFlags` is not persisted -- it is computed at runtime and only appears in command output. The existing `src/schemas/commands/status.ts` already defines an `artifactsSchema` for command output. A new `ArtifactFlags` schema for `show --json` output fits better in `src/schemas/commands/` (e.g., `src/schemas/commands/show.ts` or alongside the entity schemas it enriches).

This is minor because either location works at compile time, but `src/schemas/entities/` sets the wrong expectation about what the schema represents.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 expected behavior assertions don't test `submit` or `complete` result types

The plan's Phase 3 expected behavior section tests `slice:plan` (begin), `epic:explore` (begin), and `slice:implement` (begin) -- all `BeginResult` types. There is no expected behavior assertion for a `submit` command (e.g., `submit-plan`) or a `complete` command (e.g., `slice:complete`). The round-1 review flagged this; the plan now includes `submit-plan` in the expected behavior but still lacks a `complete` assertion. Since `paths` is being added to all three result types (`BeginResult`, `SubmitResult`, `CompleteResult`), the expected behavior should cover all three.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan addressed nearly all round-1 TUI-CLI issues well. The two remaining IMPORTANT issues are both about the version warning output path: (1) `outputError()` is the wrong mechanism for non-error warnings, and (2) the `--quiet` flag is inaccessible at the planned check location. These are implementation blockers that would be discovered during coding but are straightforward to fix. The MINOR issues are cosmetic/completeness concerns. Fixing the two IMPORTANT items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
