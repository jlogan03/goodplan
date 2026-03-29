# Phase 05 CLI Commands Review — TUI/CLI

**Reviewer:** Claude Code
**Date:** 2026-03-22
**Scope:** `src/commands/epic/{create,list,abandon,activate,complete,add-verification,update-verification,show}.ts`, `src/commands/main.ts`, `src/schemas/commands/epic.ts`, supporting utils (`stdin.ts`, `output.ts`, `global-args.ts`, `validate.ts`, `errors.ts`)

---

## Score: 8/10

---

## Summary

The CLI layer is well-structured. Stdin handling, output routing, and error codes are solid. The main issues are a redundant manual validation in `abandon.ts`, inconsistent `--epic` flag sourcing in schemas, and some help text that exposes internal schema structure rather than user-friendly descriptions.

---

## Critical Issues (0)

None.

---

## Important Issues (3)

### 1. Redundant required-check in `abandon.ts` (dead code / inconsistency)

`abandon.ts` line 36 manually checks `if (!args.reason)` and throws `VALIDATION_INVALID_INPUT`. However `reason` is already declared `required: true` in the args definition (line 31), so citty will reject the command before `run()` is ever called if `--reason` is absent. The manual check is dead code and sets a precedent other commands don't follow — if the arg spec is wrong the guard will silently mask it.

**Fix:** Remove lines 36–40 in `abandon.ts`. Rely on the citty arg spec consistently, matching `activate.ts` and other commands.

### 2. `--epic` flag ownership: flag vs. stdin inconsistency in schemas

For `epic:complete`, `epic:add-verification`, and `epic:update-verification`, the `epic` field is defined in the Zod schema (`completeEpicInputSchema`, `addVerificationInputSchema`, `updateVerificationInputSchema`) alongside stdin fields, yet `--epic` is also declared as a CLI arg with `required: true`. This means `epic` can arrive via either path, which is fine — but the schema comment says "stdin: { verificationResults }" while the schema object also validates `epic`. The inconsistency is:

- `create.ts` has no `--epic` flag (epic name is in stdin), consistent with its schema.
- `complete.ts` has `--epic` flag but the schema validates it as a merged field — but `validateInput` merges flags into stdin, so it works.
- The real risk: if a user passes `--epic foo` AND `{ "epic": "bar" }` in stdin, the flag silently wins (merge semantics: flags override stdin). This is intentional per `validate.ts` docs but is not surfaced in any help text.

**Fix:** Document the flag-wins-over-stdin merge in help text or at minimum in the command-level JSDoc for affected commands. Minor but could cause silent confusion in LLM-driven pipelines.

### 3. Human-readable output does not show `result.entity` identity for `list` and `show` commands in failure paths

`epic:list` throws `DATA_FILE_NOT_FOUND` when `epics/overview.json` is missing. The error message says "epics/overview.json not found in project state" — this is an internal file path, not a user concept. For a fresh project where `epic:list` is called before any epics exist, this is a confusing error message instead of "No epics found." (the empty-list case only handles when the file exists but is empty).

**Fix:** Distinguish between "file does not exist" (project not initialized or corrupted) and "file exists but empty." The current code would error before reaching the empty-list branch for an uninitialized project. Alternatively, treat a missing overview file as an empty list and surface the "No epics found." path.

---

## Minor Issues (3)

### 4. `meta.description` text duplicates flag info in machine-readable form

Several descriptions embed schema shape inline: `"Stdin: {verificationResults: [{index, passed, notes}]}"`. This is useful for LLM callers but makes `--help` output noisy. Consider a two-level approach: a terse `description` for help, and a longer `long` if citty supports it, or move the schema shape documentation to a dedicated doc comment.

### 5. `verbose` global flag declared but never used

`global-args.ts` defines `verbose: boolean` but no command reads it. There is no verbose diagnostic path in `output.ts` or anywhere else. This creates a false expectation.

**Fix:** Either wire up verbose (e.g., write diagnostic info to stderr when `args.verbose` is true in validate/stdin/rpc layers) or remove the flag until it is implemented.

### 6. `setup()` is empty on every command

Every command declares `setup() {}`. If this is a citty lifecycle requirement, it should be noted; otherwise it is noise that could be removed to keep files minimal.

---

## Positive Observations

- **Stdin handling** is correct and robust: TTY detection, 1 MB cap, empty-stdin fallback to `{}`, JSON parse error typed correctly.
- **Error output routing** is clean: JSON errors go to stdout (correct for piped consumers), human errors go to stderr. Exit code mapping (`VALIDATION_*` → 2, `STATE_*` → 3) is well thought out.
- **`validateInput` merge semantics** (stdin base, flags override) are sound and well-documented.
- **`--quiet` mode** suppresses output entirely without emitting exit code changes — correct for scripting.
- **Flat colon-namespaced subcommands** (`epic:create`, `epic:list`) in `main.ts` are clean and predictable.
- **`deterministicStringify`** in output ensures stable JSON for downstream consumers.
- **Schema separation** in `src/schemas/commands/epic.ts` is clean. Re-use of `verificationSchema` and `verificationResultSchema` from the entity layer is correct.
- **`z.coerce.number()` for `--index`** in `updateVerificationInputSchema` correctly handles the CLI string→number conversion.
