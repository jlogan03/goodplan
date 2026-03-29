# Merged Review Feedback — Round 1

## CRITICAL Issues

None.

## IMPORTANT Issues

### 1. Missing `completion` boolean in Phase 1 artifact shape
**Flagged by:** Holistic, Software Architecture, TypeScript, TUI-CLI, API Contract (all 5)

The epic architecture spec (`cli-interaction-conventions.md` line 238) defines the slice artifact shape with a `completion` boolean. The plan's Phase 1 lists six fields (`goal`, `exploreComplete`, `plan`, `planRefined`, `implementation`, `abandoned`) but omits `completion`. The research file explicitly flags this discrepancy.

**Fix:** Add `completion: boolean` to the slice/quest `ArtifactFlags` Zod schema and `detectArtifacts()` implementation (check for `completion/` directory existence with content).

Resolution: DIRECTLY_ACTIONABLE

---

### 2. `VERSION_MAJOR_MISMATCH` exit code routing mismatch
**Flagged by:** Holistic, Software Architecture, TypeScript, TUI-CLI, API Contract (all 5)

The plan says `VERSION_MAJOR_MISMATCH` should use exit code 2. But `exitCodeForError()` in `src/util/output.ts` dispatches by prefix: `VALIDATION_*` -> 2, `STATE_*` -> 3, else -> 1. A bare `VERSION_MAJOR_MISMATCH` falls through to exit code 1, not 2.

**Fix:** Name the error `VALIDATION_VERSION_MAJOR_MISMATCH` so the existing prefix routing gives exit 2 automatically. This is semantically appropriate -- version mismatch is a compatibility/usage error, which fits the VALIDATION namespace.

Resolution: DIRECTLY_ACTIONABLE

---

### 3. Phase 4 version stamp on `commitState()` violates layer boundaries (INV-001)
**Flagged by:** Holistic, Software Architecture, TypeScript

The plan says to stamp `project.json.version` in `commitState()`, but `commitState()` is a Data Layer function (pure I/O). Version stamping is a policy/workflow decision. Per INV-001, state mutations go through the state machine, and the Data Layer handles I/O, not semantic decisions. Modifying `project.json.version` in `commitState()` bypasses the state machine -- it's a silent mutation.

**Fix:** Move version stamping to the RPC layer. After `reduce()` produces the new state, the RPC layer checks if the CLI version is newer than `project.json.version` and updates it before calling `commitState()`.

Resolution: DIRECTLY_ACTIONABLE

---

### 4. Phase 2 `formatStatusHuman()` not updated in task list
**Flagged by:** Holistic, TUI-CLI

The plan's Phase 2 tasks update the schema, status builder, and tests -- but do not include a task to update `formatStatusHuman()` in `src/commands/global/status.ts` (lines 301-324). This function accesses `status.artifacts.architectureFiles` as a number. After the schema change to `{ count, files }` objects, it will fail to compile.

**Fix:** Add a task: "Update `formatStatusHuman()` to use `artifacts.architecture.count` (etc.) instead of `artifacts.architectureFiles`."

Resolution: DIRECTLY_ACTIONABLE

---

### 5. Phase 1 artifact detection placed in wrong architectural layer
**Flagged by:** Software Architecture

The plan creates `src/core/data/artifacts.ts`. However, `src/core/data/` is the Data Layer, responsible for I/O, not semantic interpretation. `detectArtifacts()` is a pure function operating on the in-memory tree (no I/O) -- it interprets what file existence means for workflow phase.

**Fix:** Place `detectArtifacts()` in `src/core/artifacts.ts` (peer to `tree.ts`) since it depends only on tree types and `hasChild()`/`getDir()`, not on any I/O.

Resolution: DIRECTLY_ACTIONABLE

---

### 6. Phase 2 should use state tree, not raw filesystem I/O
**Flagged by:** Software Architecture, TypeScript

The plan's Phase 2 says to extend `countFiles()` (raw `fs.readdirSync`) to also return filenames. But `status` already calls `assembleState()` and has the full tree in memory. Using raw I/O duplicates what `assembleState()` does and could produce inconsistent results.

**Fix:** Walk `DirectoryEntry.contents` keys from the assembled state tree to collect filenames. Remove the `countFiles()` extension option.

Resolution: DIRECTLY_ACTIONABLE

---

### 7. `PathReferences` typed as plain `Record<string, string>` -- loses type safety
**Flagged by:** TypeScript

With `noUncheckedIndexedAccess: true`, every key access on `Record<string, string>` returns `string | undefined`. Consumers (skills) won't know which keys are present for each phase without documentation.

**Fix:** Either define per-phase path shapes as specific interfaces and union them, or keep `Record<string, string>` with JSDoc comments on `resolvePathReferences` documenting guaranteed keys per phase.

Resolution: DIRECTLY_ACTIONABLE

---

### 8. Phase 4 `parseSemver` should validate input with Zod
**Flagged by:** TypeScript

Version strings come from `project.json` (external data). A bare `parseInt` on malformed input silently returns `NaN`. At a data boundary, validation should use Zod.

**Fix:** Add a Zod schema like `z.string().regex(/^\d+\.\d+\.\d+$/)` in `parseSemver` and throw a structured error on invalid input.

Resolution: DIRECTLY_ACTIONABLE

---

### 9. Phase 4 compatibility check conflates "CLI too old" and "CLI too new"
**Flagged by:** API Contract

The plan's `checkCompatibility()` returns `'compatible' | 'minor-mismatch' | 'major-mismatch'`. But the epic architecture spec (`cli-changes.md` lines 188-194) defines four scenarios with different behavior for "CLI major > data major" (warn) vs "CLI major < data major" (error). The function should return four variants encoding directionality.

**Fix:** Return `'compatible' | 'minor-ahead' | 'major-ahead' | 'major-behind'` (or similar) matching the spec's four-row compatibility table.

Resolution: DIRECTLY_ACTIONABLE

---

### 10. Phase 4 human-readable version warning format unspecified
**Flagged by:** TUI-CLI

The plan says "For `minor-mismatch`: `process.stderr.write()` warning" but doesn't specify format or interaction with `--json`/`--quiet` flags. Current convention: errors use `outputError()` which respects `--json`.

**Fix:** Specify: (1) exact warning message format, (2) suppress warning in `--json` mode (only stdout matters to parsers), (3) `--quiet` suppresses warnings.

Resolution: DIRECTLY_ACTIONABLE

---

### 11. Phase 2 breaking change lacks migration annotation
**Flagged by:** API Contract

Renaming `architectureFiles` to `architecture` in `status --json` is a breaking change. Pre-1.0 and internal-only, but the convention doc update should include a "Changed in 1.0.0" annotation and Phase 4's version bump should document it.

**Fix:** Add task in Phase 2 to annotate convention doc with version-change note, and in Phase 4 to include breaking changes in changelog or similar artifact.

Resolution: DIRECTLY_ACTIONABLE

---

### 12. `BeginResult`/`SubmitResult` missing `context?` from RPC spec -- needs scoping note
**Flagged by:** API Contract

The current types lack `context?: ContextBundle` which the RPC architecture spec includes. The plan correctly scopes Phase 3 to `paths?` only, but should explicitly note that `context?` is out of scope for this slice to prevent implementer confusion.

**Fix:** Add a note in the Phase 3 task description: "`context?` fields on `BeginResult` and `SubmitResult` are deferred to a later slice."

Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

### M1. Phase 1 `show` commands should use `loadState()` not `assembleState()`
**Flagged by:** Software Architecture, TypeScript, API Contract

The plan says to call `assembleState()` in show commands, but they already use `loadState()` which returns the same tree and is cached/faster. The research confirms `loadState()` is sufficient.

**Fix:** Keep `loadState()`. Task descriptions should say "use the state tree from `loadState()`."

Resolution: DIRECTLY_ACTIONABLE

---

### M2. Phase 3 `resolvePathReferences` `complete` phase mapping inconsistency
**Flagged by:** Holistic, Software Architecture

The mapping lists `slice:complete` returning `{ completion: "<dir>/completion/" }` but there's no `completion/` directory concept in the current codebase. Also, `complete()` already returns `architecturePaths`, creating two overlapping path-reference mechanisms.

**Fix:** Verify what the epic architecture spec expects for complete paths. Clarify relationship between `paths` and `architecturePaths` (deprecation strategy or coexistence).

Resolution: CODEBASE_EXPLORATION

---

### M3. Phase 4 skip-list for version checking is fragile
**Flagged by:** TypeScript, Software Architecture, Holistic

Hard-coded skip list (`--version`, `--help`, `init`, `schema`) must be maintained as commands are added.

**Fix:** Only check version compatibility when `resolveProjectDir()` succeeds. Wrap in try-catch -- if it fails, skip the check. This naturally covers all commands that don't need `.project/`.

Resolution: DIRECTLY_ACTIONABLE

---

### M4. Phase 1 `show` commands: human-readable output for artifacts unspecified
**Flagged by:** TUI-CLI

Plan adds artifacts to `--json` but doesn't say whether human-readable output shows artifact info. Either show a summary line or intentionally omit -- but be explicit.

**Fix:** Specify in the plan whether human-readable output includes an artifacts line (e.g., "Artifacts: goal, plan, planRefined") or omits it (acceptable since artifacts are primarily for programmatic consumption).

Resolution: DIRECTLY_ACTIONABLE

---

### M5. Phase 3 path mappings incomplete for some begin phases
**Flagged by:** API Contract

`resolvePathReferences()` omits phases like `create`, `abandon`, `activate`, etc. Plan says "Other phases -> `{}`" but doesn't document the design decision.

**Fix:** Document that these phases intentionally return empty paths. Consider whether `abandon` should return `{ abandoned: "<dir>/abandoned.md" }`.

Resolution: DIRECTLY_ACTIONABLE

---

### M6. Phase 3 `paths` on `BeginResult` should never be `undefined`
**Flagged by:** TypeScript

The epic architecture spec says `paths?: PathReferences; // always included`. The plan types it as optional but should ensure `resolvePathReferences` returns `{}` (not `undefined`) so `paths` is always present.

**Fix:** Ensure `resolvePathReferences` always returns an object (empty `{}` for phases with no paths).

Resolution: DIRECTLY_ACTIONABLE

---

### M7. No schema validation test for Phase 1 `show --json` output shape
**Flagged by:** API Contract

Phase 1 adds `ArtifactFlags` to `show --json` output but no test verifies the combined output passes a response schema. INV-005/INV-006 require schema validation.

**Fix:** Add a test that `slice:show --json` output validates against the updated response schema.

Resolution: DIRECTLY_ACTIONABLE

---

### M8. Phase 4 version stamp has no contract test
**Flagged by:** API Contract

No test proposed to verify that `project.json.version` auto-advances on mutation.

**Fix:** Add a unit test: after any RPC mutation, `project.json.version` >= previous version.

Resolution: DIRECTLY_ACTIONABLE

---

### M9. Phase 4 `--version --json` already exists -- expected behavior wording misleading
**Flagged by:** TUI-CLI

The plan's "before" assertion implies `--version --json` format is new, but it already exists in `src/index.ts` lines 65-72. The assertion should say it returns `{ "version": "0.0.1" }` (wrong value), not imply the format is new.

**Fix:** Correct the expected behavior "before" assertion to note the format exists but the version value changes.

Resolution: DIRECTLY_ACTIONABLE

---

### M10. `ArtifactFlags` Zod schema reuse for `show` output schema not specified
**Flagged by:** TypeScript

The plan creates `ArtifactFlags` schemas but doesn't say whether `show --json` gets a Zod output schema for `schema` command compatibility (INV-006).

**Fix:** Specify that `show --json` output gets an output schema incorporating `ArtifactFlags`.

Resolution: DIRECTLY_ACTIONABLE

---

### M11. Phase 1 import path for tree helpers ambiguous
**Flagged by:** Holistic

The plan says to import tree types in the new artifacts file but doesn't specify whether to use `../tree.js` (canonical) or `./tree.js` (re-export).

**Fix:** Import from `../tree.js` (canonical source) if placing in `src/core/artifacts.ts`, or document the chosen import path.

Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (for loop exit)

1. **Add `completion` boolean to artifact shape** — In the `ArtifactFlags` Zod schema (to be created in `src/schemas/commands/`) and in `detectArtifacts()` implementation: add `completion: boolean` that checks for `completion/` directory existence with content, matching `cli-interaction-conventions.md` line 238.

2. **Rename error code to `VALIDATION_VERSION_MAJOR_MISMATCH`** — In `src/util/errors.ts`, register the new error as `VALIDATION_VERSION_MAJOR_MISMATCH` (not bare `VERSION_MAJOR_MISMATCH`) so `exitCodeForError()` in `src/util/output.ts` automatically maps it to exit code 2 via the `VALIDATION_*` prefix.

3. **Move version stamp from `commitState()` to RPC layer** — Phase 4 task should say: in the RPC mutation path (e.g., `begin()`, `submit()`, `complete()`), after `reduce()` produces new state, check if CLI version > `project.json.version` and update it before calling `commitState()`. Do not modify `commitState()`.

4. **Add `formatStatusHuman()` update task to Phase 2** — Add task: "Update `formatStatusHuman()` in `src/commands/global/status.ts` (lines 301-324) to use `artifacts.architecture.count` instead of `artifacts.architectureFiles`, and similarly for all renamed artifact fields."

5. **Move `detectArtifacts()` to `src/core/artifacts.ts`** — Create the file as a peer to `src/core/tree.ts`, not in `src/core/data/`. Import tree types from `./tree.js`. No I/O dependencies.

6. **Use state tree for file listing in Phase 2** — Walk `DirectoryEntry.contents` keys from the assembled state tree instead of extending `countFiles()` with raw `fs.readdirSync`. Remove the `countFiles()` extension option from the plan.

7. **Improve `PathReferences` typing** — Either define per-phase path interfaces (e.g., `PlanPaths = { plan: string }`) or add JSDoc comments on `resolvePathReferences` documenting guaranteed keys per phase.

8. **Add Zod validation to `parseSemver`** — Use `z.string().regex(/^\d+\.\d+\.\d+$/)` at the parse boundary. Throw a structured error on invalid input.

9. **Expand `checkCompatibility()` to four variants** — Return `'compatible' | 'minor-ahead' | 'major-ahead' | 'major-behind'` matching the spec's four-row compatibility table in `cli-changes.md` lines 188-194.

10. **Specify version warning format and flag interaction** — Phase 4 should specify: warning message format for stderr, suppression in `--json` mode, suppression with `--quiet`.

11. **Add breaking-change annotation** — Phase 2 convention doc update should include "Changed in 1.0.0" note. Phase 4 should document breaking changes.

12. **Add scoping note for `context?` fields** — Phase 3 task description should note: "`context?` on `BeginResult`/`SubmitResult` is deferred to a later slice."

13. **Use `loadState()` not `assembleState()` in show commands** — Phase 1 task descriptions should say "use the state tree from `loadState()`" (already available in the command).

14. **Replace skip-list with `resolveProjectDir()` try-catch** — Phase 4 version check: wrap in try-catch on `resolveProjectDir()`. If it fails, skip the check.

15. **Specify human-readable artifact output** — Phase 1 should explicitly state whether `show` (non-JSON) includes an artifacts summary line or intentionally omits it.

16. **Ensure `resolvePathReferences` always returns `{}`** — Never return `undefined` for `paths`; return empty object for phases with no specific paths.

## RESEARCH_NEEDED

None.

## CODEBASE_EXPLORATION

### CE1. Phase 3 `complete` phase path mapping validation
**What to look up:** What does the `complete()` RPC function currently return for `architecturePaths`? Does a `completion/` directory concept exist in the codebase? What should `resolvePathReferences` return for `slice:complete` / `quest:complete`?
**Why it matters:** The plan maps `complete` to `{ completion: "<dir>/completion/" }` but this directory may not exist. Also, `architecturePaths` already exists on `CompleteResult`, creating overlap.
**Tool strategy:** `Grep` for `architecturePaths` and `completion/` in `src/core/rpc/`. `Read` the `complete()` function to see what it returns.

## Contradictions Resolved

1. **Artifact detection layer placement:** Holistic says `src/core/data/artifacts.ts` is acceptable but import path is ambiguous. Software Architecture says it belongs outside Data Layer. **Trusted Software Architecture** as the domain specialist on layer boundaries -- moved to `src/core/artifacts.ts`.

2. **Phase 2 file listing approach:** The plan offers two alternatives (extend `countFiles()` vs use state tree). Software Architecture and TypeScript both recommend the tree-based approach. **Trusted Software Architecture** -- use the state tree, not raw I/O.

3. **Version stamp layer placement:** Holistic and Software Architecture both flag this as an INV-001 violation; TypeScript flags it as MINOR. **Trusted Software Architecture** on severity -- promoted to IMPORTANT since it's a layer boundary violation.

4. **`loadState()` vs `assembleState()`:** Software Architecture, TypeScript, and API Contract all agree `loadState()` is sufficient. No contradiction -- unanimous.

## Unresolved (USER_INPUT required)

None. All issues are either DIRECTLY_ACTIONABLE or require CODEBASE_EXPLORATION only.
