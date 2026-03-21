# Merged Feedback: Tracer Bullet Plan — Round 1

## CRITICAL Issues

**C1. `runMain` prevents custom exit codes — must use `runCommand` with custom error handler**
Flagged by: TypeScript (CRITICAL), TUI/CLI (IMPORTANT), Holistic (IMPORTANT), Architecture (IMPORTANT)
Files: Phase 3 tasks, `src/index.ts`

The citty research confirms `runMain` catches all errors and calls `process.exit(1)` — no hook exists to differentiate exit codes. The plan requires exit 2 (validation/unknown command) and exit 3 (state errors) per INV-007, but never specifies using `runCommand` instead of `runMain`.

**Fix:** Phase 3 must explicitly state: use `runCommand` (not `runMain`) as the entrypoint. Build a custom top-level runner that:
1. Calls `runCommand` programmatically
2. Catches errors and inspects error type/code
3. Calls `process.exit()` with the correct exit code (1 generic, 2 validation, 3 state)
4. Handles `--help` rendering manually (since `runMain`'s auto-help is bypassed)

This also avoids the `--version`/`-v` conflict noted in citty gotchas (relevant if `--verbose` alias `-v` is added later). Additionally, Phase 3's Expected Behavior for `badcommand --json` assumes the `--json` flag is parsed for unknown commands — this only works if the custom runner parses global flags before dispatching to subcommands.

Resolution: DIRECTLY_ACTIONABLE

---

## IMPORTANT Issues

**I1. `--smoke-jq` flag design — replace with minimal `--query` implementation**
Flagged by: TypeScript (IMPORTANT), TUI/CLI (IMPORTANT)

`--smoke-jq` is a boolean flag hardcoding `.project.name`. The architecture defines `--query` as an arbitrary jq expression filter. A minimal `--query` implementation would:
1. Actually validate the jqjs integration pattern slice 05 uses at scale
2. Avoid throwaway code (`--smoke-jq` is deleted in slice 05; `--query` stays)
3. Better prove the tech stack end-to-end

Additionally, the flag's interaction with `--json` is unspecified: does it require `--json`? What if used alone? What format is the output (raw string or JSON-encoded)?

Also: goal.md says `.name` but StatusResult nests it as `.project.name`. The plan should note this correction explicitly.

**Fix:** Replace `--smoke-jq` with `--query <expr>` on the status command. Verification becomes: `./goodplan status --json --query '.project.name'` returning `"binary-test"`. Specify that `--query` requires `--json` and outputs the raw jq result.

Resolution: DIRECTLY_ACTIONABLE

---

**I2. `readJson`/`writeJson` naming diverges from architecture's `readEntity`/`writeEntity`**
Flagged by: Architecture (IMPORTANT)
Files: Phase 2, `src/core/data/json.ts`

The Data Layer API specifies `readEntity<T>(path, schema)` and `writeEntity<T>(path, data, schema, expected?)`. Starting with `readJson`/`writeJson` means a rename in slice 02 or maintaining two naming conventions.

**Fix:** Use `readEntity`/`writeEntity` from the start. The `project.ts` wrapper (`readProject()`/`writeProject()`) is fine as a convenience layer on top.

Resolution: DIRECTLY_ACTIONABLE

---

**I3. Directory structure mismatch between plan and conventions.md**
Flagged by: Holistic (IMPORTANT), Architecture (IMPORTANT), TypeScript (MINOR)

Phase 1 creates `src/core/data/`, `src/core/state/`, `src/core/context/` but `conventions.md` lists `src/core/workflow/` (not `context/`). The architecture overview has context at `src/core/context/`. Additionally, `conventions.md` lists `src/commands/build/` and `src/commands/resource/` which don't appear in the architecture docs.

**Fix:** Follow the architecture docs (more detailed and authoritative). Create only directories needed for this slice (`src/core/data/`, `src/commands/global/`). Either update `conventions.md` to match architecture docs or note the discrepancy. Do not create empty placeholder directories (`src/core/state/`, `src/core/context/`) unless there is a reason — they remain empty through all 6 phases.

Resolution: DIRECTLY_ACTIONABLE

---

**I4. `validateInput` merge semantics unspecified**
Flagged by: TypeScript (IMPORTANT)
Files: Phase 3, `src/util/validate.ts`

Phase 3 creates `validateInput(schema, args, stdin)` that merges CLI args and stdin, then validates with Zod. The merge strategy (precedence, type conflicts) is unspecified.

**Fix:** Plan should specify: (1) stdin values are the base object, (2) CLI flags override stdin values, (3) merged object is validated through Zod schema which handles coercion.

Resolution: DIRECTLY_ACTIONABLE

---

**I5. Missing Zod `z.infer` convention across all schema files**
Flagged by: TypeScript (IMPORTANT)
Files: Phase 2, `src/schemas/`

Phase 2 mentions "infer `Project` type" for project schema but doesn't establish the pattern for `statusResultSchema`, `errorSchema`, etc.

**Fix:** Establish explicit convention: every schema file exports both the schema and its inferred type (e.g., `export type StatusResult = z.infer<typeof statusResultSchema>`). State this in Phase 2 tasks.

Resolution: DIRECTLY_ACTIONABLE

---

**I6. StatusResult schema shape needs clarification for this slice**
Flagged by: Architecture (IMPORTANT)
Files: Phase 2, `src/schemas/commands/status.ts`

StatusResult defines `activeEpic`, `activeSlice`, `activeQuest` as nullable objects with `name, status, phase` — but `project.json` stores these as string names, requiring entity file lookup. In this slice, entities don't exist, so these are always null.

**Fix:** Phase 2 schema definition should document that the "objects with name, status, phase" shape is a projection requiring entity lookup, and in this slice null is the only valid value. This prevents the implementer from trying to populate these fields.

Resolution: DIRECTLY_ACTIONABLE

---

**I7. No `NO_COLOR` / `FORCE_COLOR` verification**
Flagged by: TUI/CLI (IMPORTANT)

Phase 5 introduces colored output (picocolors) but no Expected Behavior verifies `NO_COLOR=1` produces uncolored output, or that piped output strips colors. Picocolors may behave differently in a compiled binary.

**Fix:** Add verification to Phase 5 or Phase 6: `NO_COLOR=1 ./goodplan status` produces uncolored output.

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

**M1. stdin infrastructure (Phase 3) is dead code with no verification in this slice**
Flagged by: Architecture (MINOR), TUI/CLI (MINOR), Holistic (MINOR)

`src/util/stdin.ts` and `src/util/validate.ts` have zero callers and zero tests in this slice. Neither `init` nor `status` accept stdin.

**Fix:** Either add unit tests for stdin.ts/validate.ts in Phase 3, or defer stdin to the slice that first uses it. If kept, add at minimum: unit tests for TTY detection, JSON parsing, and size limit enforcement.

Resolution: DIRECTLY_ACTIONABLE

---

**M2. Unknown flags are silently ignored — no verification or documentation**
Flagged by: Holistic (IMPORTANT), TUI/CLI (MINOR)

Citty silently ignores unknown flags (e.g., `goodplan status --typo-flag` succeeds). The plan never tests this or documents it as a known limitation. Matters for INV-007 (no silent errors).

**Fix:** Document as a known limitation in the plan. Decide whether to accept citty's default or add custom unknown-flag detection. At minimum, add a note so future slices can address it.

Resolution: DIRECTLY_ACTIONABLE

---

**M3. Phase 1 `build` script defined in both Phase 1 and Phase 6 with different specificity**
Flagged by: Holistic (MINOR)

Phase 1: "Add scripts: `build` (bun build --compile)". Phase 6: "Add `build` script: `bun build --compile src/index.ts --outfile goodplan`". Phase 6 is more specific.

**Fix:** Remove the build script from Phase 1 (it cannot be verified until Phase 6) or make Phase 1's version match Phase 6's exact specification.

Resolution: DIRECTLY_ACTIONABLE

---

**M4. `--smoke-jq` flag name is the only hyphenated flag in the system**
Flagged by: Architecture (MINOR)

All other flags are single words (`--json`, `--name`, `--query`). Moot if I1 is accepted (replace with `--query`).

Resolution: DIRECTLY_ACTIONABLE (subsumed by I1)

---

**M5. Phase 4 verification uses placeholder path and fragile `bun run -e` import**
Flagged by: Holistic (MINOR), TypeScript (MINOR)

Phase 4 uses `/path/to/src/index.ts` (placeholder) and a `bun run -e` command that imports from a relative path.

**Fix:** Use consistent `bun run src/index.ts` from project root. Simplify verification to run the status command (which validates via the data layer) rather than inline module imports.

Resolution: DIRECTLY_ACTIONABLE

---

**M6. Phase 2 `resolveProjectDir()` walk-up logic not covered by unit tests**
Flagged by: TypeScript (MINOR)

Tests cover `GOODPLAN_DIR` env var but not the walk-up-from-cwd behavior.

**Fix:** Add a test case that creates a `.project/` two levels up and verifies `resolveProjectDir()` finds it from a nested subdirectory.

Resolution: DIRECTLY_ACTIONABLE

---

**M7. No explicit `process.exitCode` vs `process.exit()` strategy**
Flagged by: TypeScript (MINOR)

`process.exit()` aborts immediately, skipping cleanup. `process.exitCode = N` lets the process exit naturally after cleanup.

**Fix:** Specify in Phase 3: set `process.exitCode = N` and let process exit naturally, or call `process.exit()` only after cleanup is complete.

Resolution: DIRECTLY_ACTIONABLE

---

**M8. No documentation update tasks — binary size baseline location unspecified**
Flagged by: Holistic (MINOR)

Phase 6 mentions "Document binary size for baseline tracking" but doesn't say where.

**Fix:** Specify that binary size goes in the slice's completion notes or the epic's architecture docs.

Resolution: DIRECTLY_ACTIONABLE

---

**M9. Phase 2 before-check asserts empty directory — weak assertion**
Flagged by: Holistic (MINOR)

**Fix:** Check for absence of specific files (e.g., `ls src/core/data/json.ts` — file not found) rather than asserting directory is empty.

Resolution: DIRECTLY_ACTIONABLE

---

**M10. `--help` output for colon-namespaced commands is flat, not grouped**
Flagged by: TUI/CLI (MINOR)

Not an issue in this slice (only global commands), but should be noted as a known limitation for future slices.

**Fix:** Add a note in the plan that help grouping for namespaced commands is deferred.

Resolution: DIRECTLY_ACTIONABLE

---

**M11. Deterministic key sorting approach unspecified — `noUncheckedIndexedAccess` pitfall**
Flagged by: TypeScript (IMPORTANT)

Phase 2 says "sort keys recursively before stringify" but doesn't specify how. With `noUncheckedIndexedAccess: true`, manual recursion has pitfalls.

**Fix:** Specify using `JSON.stringify`'s replacer parameter with sorted `Object.entries()` to avoid manual recursion:
```typescript
JSON.stringify(data, (_key, value) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
    : value
, 2);
```

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE (for loop exit)

All issues above are DIRECTLY_ACTIONABLE. Summary of changes to apply:

1. **C1 — Exit codes:** Phase 3 must specify `runCommand` (not `runMain`), custom error handler mapping error types to exit codes 1/2/3, manual `--help` handling.
2. **I1 — Replace `--smoke-jq` with `--query`:** Phase 5 implements minimal `--query <expr>` flag instead of boolean `--smoke-jq`. Specify interaction with `--json`. Note goal.md says `.name` but correct filter is `.project.name`.
3. **I2 — Naming:** Phase 2 uses `readEntity`/`writeEntity` (not `readJson`/`writeJson`).
4. **I3 — Directories:** Follow architecture docs. Don't create empty placeholders. Note `conventions.md` needs updating.
5. **I4 — Merge semantics:** Phase 3 specifies stdin-base, flags-override, Zod-validates merge order.
6. **I5 — z.infer convention:** Phase 2 establishes `export type X = z.infer<typeof xSchema>` for all schema files.
7. **I6 — StatusResult docs:** Phase 2 documents that active pointers are always null in this slice.
8. **I7 — NO_COLOR test:** Phase 5 or 6 adds `NO_COLOR=1` verification.
9. **M1 — stdin:** Add unit tests or defer to later slice.
10. **M2 — Unknown flags:** Document as known limitation.
11. **M3 — Build script:** Remove from Phase 1, keep only in Phase 6.
12. **M5 — Verification paths:** Use consistent `bun run src/index.ts` from project root.
13. **M6 — Walk-up test:** Add nested-directory test for `resolveProjectDir()`.
14. **M7 — Exit strategy:** Specify `process.exitCode` vs `process.exit()` approach.
15. **M8 — Binary size docs:** Specify documentation location.
16. **M9 — Before-checks:** Assert file absence, not empty directory.
17. **M10 — Help grouping:** Note as deferred limitation.
18. **M11 — Deterministic keys:** Specify `JSON.stringify` replacer approach.

## RESEARCH_NEEDED

None. All issues are directly actionable.

## Contradictions Resolved

1. **Severity of `runMain` exit code issue:** TypeScript rated it CRITICAL; Holistic, Architecture, and TUI/CLI rated it IMPORTANT. **Resolution:** Elevated to CRITICAL. TypeScript reviewer is the domain specialist for citty behavior, and the issue would cause Phase 3 and Phase 6 verification to fail outright. All four reviewers agree on the fix (use `runCommand`).

2. **`--smoke-jq` — keep vs replace with `--query`:** TUI/CLI says clarify the flag's behavior; TypeScript says replace it entirely with minimal `--query`. **Resolution:** Adopted TypeScript's recommendation (replace with `--query`). It proves the actual pattern, avoids throwaway code, and the TUI/CLI concerns about ambiguity are resolved by the replacement.

3. **Empty placeholder directories — create or skip:** Architecture says don't create directories not needed in this slice; TypeScript says add `src/core/workflow/` to match conventions. **Resolution:** Follow Architecture reviewer — create only directories needed for this slice. The conventions.md discrepancy is a separate documentation fix, not a reason to create unused directories.

4. **stdin infrastructure — test or defer:** Architecture and TUI/CLI say add tests or defer; Holistic says add unit test reference. **Resolution:** Merged as "add unit tests or defer" — implementer's choice, but the current state (built, untested, unused) is not acceptable.

5. **Deterministic key sorting severity:** TypeScript rated it IMPORTANT; no other reviewer flagged it. **Resolution:** Downgraded to MINOR. The approach is straightforward (JSON.stringify replacer) and any competent implementation would handle it. The TypeScript reviewer's concern about `noUncheckedIndexedAccess` is valid but the fix is simple and well-known.

6. **Unknown flags severity:** Holistic rated it IMPORTANT; TUI/CLI rated it MINOR. **Resolution:** Kept as MINOR. TUI/CLI is the domain specialist for CLI behavior, and this is a citty limitation that doesn't affect this slice's verification criteria.

## Unresolved (USER_INPUT required)

None. All issues have clear resolutions agreed upon by the relevant domain specialists.
