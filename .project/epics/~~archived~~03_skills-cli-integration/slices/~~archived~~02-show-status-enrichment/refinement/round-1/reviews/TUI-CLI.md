## Issues

**[IMPORTANT]** Missing `completion` boolean in Phase 1 artifact shape

The epic architecture convention doc (`cli-interaction-conventions.md` line 238) shows a `completion` boolean in the slice artifact shape: `goal`, `exploreComplete`, `plan`, `planRefined`, `implementation`, `completion`, `abandoned`. The plan's Phase 1 task list and expected behavior omit `completion`. This means the CLI output will not match the convention doc that skills reference. Add `completion: boolean` (true when `completion/` directory exists with content) to the slice/quest `ArtifactFlags` type and update the expected behavior assertions.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 version compatibility error code uses wrong exit code

The plan says `VERSION_MAJOR_MISMATCH` should use exit code 2. Per the established exit code convention (INV-007 and `exitCodeForError()` in `src/util/output.ts`), exit code 2 is for `VALIDATION_*` errors. The proposed error code `VERSION_MAJOR_MISMATCH` does not start with `VALIDATION_`, so `exitCodeForError()` will return exit code 1, not 2. Either: (a) name the error `VALIDATION_VERSION_MAJOR_MISMATCH` to get exit 2 automatically, or (b) create a new error namespace `VERSION_*` and update `exitCodeForError()` to map it to exit 2. Option (a) is simpler and consistent — version mismatch is a usage/compatibility error, which is the VALIDATION namespace's purpose.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 human-readable version warning goes to stderr but no format specified

The plan says "For `minor-mismatch`: `process.stderr.write()` warning" but does not specify the warning format or how it interacts with `--json`/`--quiet` flags. Current convention: errors use `outputError()` which respects `--json`. A stderr warning should follow the same convention — in JSON mode, warnings should either be suppressed from stderr (since structured output goes to stdout) or use a structured warning shape. The plan should specify: (1) the exact warning message format, (2) whether warnings appear in `--json` mode (they should not — only stdout matters to parsers), and (3) whether `--quiet` suppresses warnings.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 human-readable `formatStatusHuman()` not mentioned in tasks

The plan's Phase 2 tasks mention updating the schema, the status command builder, and tests, but do not mention updating `formatStatusHuman()` (lines 301-324 in `status.ts`). This function references `artifacts.architectureFiles`, `artifacts.researchFiles`, etc. as numbers — after the schema change to `{ count, files }` objects, the human formatter will break. The research doc flags this (Implementation Risk #5) but the task list doesn't include a task for it. Add a task: "Update `formatStatusHuman()` to use `artifacts.architecture.count` (etc.) instead of `artifacts.architectureFiles`."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `show` commands don't include `artifacts` in human-readable output

The plan specifies adding `artifacts` to `--json` output but does not address the human-readable (default) output path. Looking at `slice:show` (lines 42-55), the human-readable branch formats entity fields with picocolors. The plan should specify whether the human-readable output shows artifact info (e.g., a line like "Artifacts: goal, plan, planRefined" listing truthy ones) or intentionally omits it. Either choice is fine, but the plan should be explicit. If omitted, the `show` command human output won't change — which is acceptable since artifacts are primarily for programmatic skill consumption.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 expected behavior uses `slice:plan` but this is a `begin` command, not a `submit`

The expected behavior says `./goodplan slice:plan --slice <test-slice> --json | jq '.paths'` should return paths. But `slice:plan` triggers `BEGIN_PLAN` and returns a `BeginResult`. The current `BeginResult` (line 103-108 in `rpc/types.ts`) has 4 fields: `entity`, `phase`, `previousStatus`, `newStatus`. The plan correctly adds `paths?` to `BeginResult`, so this will work — but the expected behavior should also test a `submit-plan` command (which returns `SubmitResult`) and a `slice:complete` command (which returns `CompleteResult`) to verify all three result types get `paths`. The plan's verification section partially covers this ("Test multiple command types") but the expected behavior assertions should be more explicit.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 `--version --json` already works but verification says "should fail before"

The expected behavior "Before implementation" says `./goodplan --version` prints `goodplan 0.0.1`. Looking at `src/index.ts` lines 65-72, `--version --json` already outputs `{ "version": VERSION }`. The plan's Phase 4 expected behavior item `./goodplan --version --json` returning `{ "version": "1.0.0" }` implies this format needs to be added, but it already exists. The "before" assertion should say it returns `{ "version": "0.0.1" }` (exists but wrong value), not imply the JSON format is new. Minor — doesn't affect implementation, but keeps expected behavior accurate for the implementor.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phases and good use of existing codebase patterns. The main gaps are: (1) a missing artifact field (`completion`) that creates a convention doc mismatch, (2) an error code naming issue that will silently produce the wrong exit code, and (3) missing human-readable formatter updates that will cause runtime breakage. Fixing the two IMPORTANT issues and adding the `formatStatusHuman()` task would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
