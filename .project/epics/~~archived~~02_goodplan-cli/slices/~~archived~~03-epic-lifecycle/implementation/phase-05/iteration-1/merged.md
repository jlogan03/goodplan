# Merged Review — Phase 05: Epic CLI Commands

**Scores:** software-architecture 8/10 | tui-cli 8/10
**Critical: 0 | Important: 4 | Minor: 4**

---

## Important Issues

### I-1. Missing `await` on `begin`/`complete` RPC calls (latent correctness hazard)

Every mutation command calls `begin(...)` or `complete(...)` without `await`. Currently non-breaking because both are synchronous, but if either is ever refactored to async the result will be a `Promise` object rather than the transition result, silently corrupting output serialization.

**Affected files:** `create.ts:32`, `abandon.ts`, `explore.ts`, `activate.ts`, `define-architecture.ts`, `refine-architecture.ts`, `define-slices.ts`, `refine-slices.ts`, `add-verification.ts`, `update-verification.ts`, `complete.ts`.

**Fix:** Add `await` to all `begin(...)`/`complete(...)` calls. If callers must remain synchronous, mark that explicitly with a comment.

---

### I-2. Redundant runtime guard in `abandon.ts` (dead code / inconsistency)

`abandon.ts` lines 36–40 manually check `if (!args.reason)` and throw `VALIDATION_INVALID_INPUT`. The `reason` arg is already declared `required: true` in the citty arg definition, so citty rejects the command before `run()` is reached. The guard is dead code, inconsistent with all other commands (including `activate.ts`), and risks masking a future arg-spec regression.

**File:** `src/commands/epic/abandon.ts:36–40`

**Fix:** Remove lines 36–40. Rely uniformly on citty's `required: true` declaration.

---

### I-3. Schema boundary blurs flag vs. stdin origin

`completeEpicInputSchema`, `addVerificationInputSchema`, and `updateVerificationInputSchema` include both `epic` (a CLI flag) and stdin-sourced fields in the same Zod object. `validateInput` merges flags over stdin before validation, so this works — but the schema is not self-documenting about which fields originate where. If a user passes `--epic foo` and `{ "epic": "bar" }` in stdin, the flag silently wins; this is undocumented. `createEpicInputSchema` is the correct pattern (stdin fields only).

**Files:** `src/schemas/commands/epic.ts` — `completeEpicInputSchema`, `addVerificationInputSchema`, `updateVerificationInputSchema`.

**Fix:** Either split schemas into flag-schema + stdin-schema, or add explicit comments documenting origin and flag-wins semantics. At minimum document the override behavior in command-level JSDoc for LLM-driven pipeline callers.

---

### I-4. `epic:list` errors on missing overview file instead of showing empty list

`epic:list` throws `DATA_FILE_NOT_FOUND` when `epics/overview.json` is absent. For a newly initialized project that has no epics yet, this surfaces an internal file path error ("epics/overview.json not found in project state") instead of the "No epics found." message. The empty-list branch is only reached when the file exists but is empty.

**Files:** `src/commands/epic/list.ts`

**Fix:** Treat a missing overview file the same as an empty list (surface "No epics found.") unless the project is not initialized at all, in which case surface a clear "project not initialized" message rather than an internal path.

---

## Minor Issues

### M-1. `setup()` is an empty no-op on every command

Every command declares `setup() {}`. If this satisfies a citty interface requirement, a shared comment or base type should explain it; if it is not required, it should be removed to reduce noise.

**Affected:** all 13 command files.

---

### M-2. `verbose` global flag declared but never used

`global-args.ts` defines `verbose: boolean` but no command or utility reads it. This creates a false expectation in `--help` output.

**File:** `src/commands/global-args.ts`

**Fix:** Wire up verbose (e.g., write diagnostics to stderr when `args.verbose` is true in validate/stdin/rpc layers) or remove the flag until implemented.

---

### M-3. Help text embeds internal schema shapes

Several `meta.description` strings include raw schema syntax: `"Stdin: {verificationResults: [{index, passed, notes}]}"`. Useful for LLM callers but makes `--help` noisy for humans.

**Fix:** Move schema-shape documentation to a JSDoc block or a separate `long` description if citty supports it; keep the terse `description` clean for human help output.

---

### M-4. Tests bypass citty routing — flag parsing untested

All test helpers call `def.run(...)` directly with pre-constructed `args` objects, so citty's `required: true` enforcement, type coercions, and the `--index` string-to-number path are never exercised by the test suite.

**Fix:** Not blocking. Worth adding at least one end-to-end test that invokes the CLI binary and verifies citty rejects a missing required flag and that `--index 0` correctly arrives as a number.

---

## What's Done Well

- Layer boundary discipline is clean throughout: read-only commands hit `loadState`/`getJson` directly; all mutations route exclusively through RPC.
- Stdin handling is robust: TTY detection, 1 MB cap, empty-stdin fallback to `{}`, parse errors typed correctly.
- Output modes (json / human / quiet) and error routing (JSON errors to stdout, human errors to stderr) are uniform across all 13 files.
- Exit code mapping (`VALIDATION_*` → 2, `STATE_*` → 3) is well designed.
- Help text meets the spec contract: every description includes precondition status and transition direction.
- `deterministicStringify` ensures stable JSON for downstream consumers.
- Schema reuse: `verificationResultSchema` and `verificationSchema` are imported from entity schemas, not re-declared.
- `z.coerce.number()` for `--index` correctly handles CLI string-to-number conversion.
- Full lifecycle integration test walks the entire epic state machine end-to-end.
- Test coverage is broad: every command has at least one happy-path test; disk state is verified (not just output) for create/add/update-verification.
