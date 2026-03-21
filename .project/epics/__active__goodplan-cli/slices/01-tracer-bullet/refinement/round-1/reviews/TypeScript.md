## Issues

**[CRITICAL]** `runMain` prevents custom exit codes — plan uses `runMain` but needs exit 2 and exit 3

The plan says to "wire `src/index.ts` to import and run the main command" and "handle unknown commands: catch citty's unknown command error, return exit 2." However, the citty research doc confirms that `runMain` catches all errors and calls `process.exit(1)` — there is no hook to differentiate exit codes. The plan needs exit 2 (validation) and exit 3 (state machine) per INV-007, but `runMain` will swallow errors and always exit 1.

Phase 3 must use `runCommand` (programmatic execution) instead of `runMain`, wrapping it with a custom error handler that inspects error codes and calls `process.exit()` with the correct exit code (2 for validation/unknown command, 3 for state errors). This also avoids the `--version`/`-v` conflict noted in the citty gotchas (relevant if `--verbose` alias `-v` is added later).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `--smoke-jq` flag design conflates concerns — should apply jq filter to `--json` output, not be a separate flag

Phase 5 defines `--smoke-jq` as a boolean flag that hardcodes the `.project.name` jq expression. The architecture's `--query` flag (commands-api.md) applies an arbitrary jq expression to JSON output. A more faithful tracer bullet would implement `--query` minimally (accept a string, run it through jqjs, output result) rather than a boolean that hardcodes one expression. This would:
1. Actually validate the jqjs integration pattern that slice 05 will use at scale
2. Avoid throwaway code — `--smoke-jq` is deleted in slice 05, while a minimal `--query` stays
3. Better prove the tech stack end-to-end (the stated goal)

The verification check can remain `./goodplan status --json --query '.project.name'` which returns `"binary-test"`. Same validation, better architectural alignment.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan does not specify how `readJson`/`writeJson` handle `noUncheckedIndexedAccess` in recursive key sorting

Phase 2 task says "deterministic key ordering (sort keys recursively before stringify)." With `noUncheckedIndexedAccess: true`, indexing into an object's keys during recursive sorting will return `T | undefined`. The plan should specify using a typed recursive sort utility, or more simply, using `JSON.stringify`'s replacer parameter with a sorted-keys approach:

```typescript
function stableStringify(data: unknown): string {
  return JSON.stringify(data, (_key, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value
  , 2);
}
```

This avoids manual recursion and the `noUncheckedIndexedAccess` pitfalls entirely. The plan should call out this approach (or similar) rather than leaving "sort keys recursively" ambiguous.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing Zod type inference — plan defines schemas but doesn't mention `z.infer`

Phase 2 mentions "infer `Project` type" for the project schema but does not establish the pattern for the other schemas (`statusResultSchema`, `errorSchema`). Per the team defaults (Zod schemas as single source of truth), every schema should export both the schema and its inferred type: `export type StatusResult = z.infer<typeof statusResultSchema>`. The plan should make this explicit as a convention for all schema files, not just project.ts, to prevent schema/type drift from the start.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `validateInput` in Phase 3 merges args and stdin but plan doesn't address type narrowing

Phase 3 creates `validateInput(schema, args, stdin)` that merges CLI args and stdin, then validates with Zod. The citty `args` object has string/boolean typed properties, while stdin is `unknown` (parsed JSON). The merge strategy (which takes precedence? how are type conflicts handled?) is unspecified. The plan should specify:
1. stdin values are the base object
2. CLI flags override stdin values (flags take precedence)
3. The merged object is validated through the Zod schema, which handles type coercion (e.g., string flag to number)

This is important because incorrect merge order will cause subtle bugs when commands accept both flags and stdin input.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 directory structure includes `src/core/workflow/` but conventions.md shows `src/core/workflow/` — plan lists `src/core/context/` instead

Phase 1 creates `src/core/data/`, `src/core/state/`, `src/core/context/` but the project conventions.md shows `src/core/workflow/` (not `context/`). The architecture overview has context bundling as a module within the RPC layer at `src/core/context/`. Both should be created as empty directories since they'll be needed in later slices, but the plan should match the documented structure. Add `src/core/workflow/` to the directory list.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 verification uses inline `bun run -e` with module import — fragile and unclear

The Phase 4 "After implementation" check pipes project.json through a `bun run -e` command that imports from a relative path. This is brittle (depends on CWD being the project root) and tests Bun's module resolution more than the init command. A simpler verification: `cat .project/project.json | bun -e "const d = JSON.parse(await Bun.stdin.text()); if (!d.name || !d.version || !d.created) process.exit(1)"` — or better, just run the status command which already validates via the data layer.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `resolveProjectDir()` walk-up logic not covered by unit tests

Phase 2 tasks say "Write unit tests: schema validation (valid/invalid), JSON round-trip (deterministic keys), GOODPLAN_DIR resolution." The GOODPLAN_DIR test covers the env var path, but the walk-up-from-cwd behavior (finding `.project/` in parent directories) is not mentioned. Add a test case that creates a `.project/` two levels up and verifies `resolveProjectDir()` finds it from a nested subdirectory.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No explicit mention of `process.exitCode` vs `process.exit()` strategy

The plan implies `process.exit(N)` for error exits but doesn't address cleanup. Citty's `cleanup` handler runs via `finally`, but `process.exit()` aborts immediately. For correctness, set `process.exitCode = N` and let the process exit naturally after cleanup, or call `process.exit()` only after all cleanup is complete. This matters most in Phase 3 where the error handling wrapper is established.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan is well-structured with clear phases and good verification steps. However, the critical issue with `runMain` swallowing exit codes would cause Phase 3 and Phase 6 verification to fail outright — the compiled binary would exit 1 for everything instead of the required exit 2/3 differentiation. The `--smoke-jq` design misses an opportunity to prove the actual `--query` pattern. The merge semantics for `validateInput` and the deterministic JSON implementation approach need explicit specification to avoid ambiguity during implementation.

To reach 9+: fix the `runMain` vs `runCommand` issue (critical), replace `--smoke-jq` with minimal `--query`, specify `validateInput` merge semantics, specify the `JSON.stringify` replacer approach for deterministic keys, and establish `z.infer` as a convention across all schema files.

## Summary
- Critical: 1
- Important: 3
- Minor: 3
