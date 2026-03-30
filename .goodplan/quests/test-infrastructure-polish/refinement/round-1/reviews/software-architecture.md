# Software Architecture Review: Test Infrastructure Polish

## Issues

**[CRITICAL]** Phase 1 regex extraction cannot cover `StateErrorCode` — it lives in a different file

The plan says to "regex-extract all string literals from the four error code union types (`DataErrorCode`, `InternalErrorCode`, `StateErrorCode`, `ValidationErrorCode`)" by reading `src/util/errors.ts`. However, `StateErrorCode` is not defined in `errors.ts` — it is imported from `src/schemas/state-events.ts` via `import type { StateErrorCode } from "../schemas/state-events.js"`. The regex approach as described will miss all 10 `STATE_*` error codes, producing an incorrect count (17 instead of 27).

**Fix:** The test must either (a) also read `src/schemas/state-events.ts` and extract `StateErrorCode` members from there, or (b) extract the union type from `GoodplanErrorCode` (which combines all four) — but that type just references names, not literals. Option (a) is straightforward: read both files, extract from each union type in its respective file. The plan should specify both file paths and map each union type to its source file.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Regex pattern `^\t\| "..."` is fragile and tied to formatting assumptions

The plan specifies extracting quoted strings from "lines matching `^\t| "..."`". This pattern assumes tab indentation and a specific union formatting style. If Biome reformats the file (e.g., using spaces, or changing line breaks), the regex silently extracts zero members and the test becomes a false pass. A more robust approach: match any line containing a quoted string between `type XxxErrorCode =` and the closing `;`, regardless of whitespace style. Alternatively, use a pattern like `/"([A-Z_]+)"/g` scoped between the type declaration and its terminating semicolon, which is indentation-agnostic.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No bidirectional verification — regex count could exceed `ALL_ERROR_CODES` length

The plan describes asserting `ALL_ERROR_CODES.length` equals the regex-extracted count. This catches the case where `ALL_ERROR_CODES` is missing an entry. But it does not catch the reverse: `ALL_ERROR_CODES` containing a string that is not in any union type (a stale entry). The existing `satisfies` check catches type mismatches at compile time, but a deleted union member that is still in `ALL_ERROR_CODES` would cause a TypeScript error only if the `satisfies` is strict enough. Worth adding an explicit set-equality assertion: the set of regex-extracted codes should equal the set of `ALL_ERROR_CODES` entries, not just match on count. This is architecturally important because the fitness function's purpose is completeness verification.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `collectFiles` signature doesn't document that it returns sorted paths

The plan specifies `collectFiles(dir: string, base?: string): string[]` to be added to `helpers.ts`. The existing implementation in `data-determinism.test.ts` returns `results.sort()` — sorted relative paths. The plan should note this sorting behavior in the signature description or as a JSDoc contract, since `snapshotFiles` in `data-determinism.test.ts` depends on deterministic ordering (it iterates the result). This is minor because the implementation will likely carry the `.sort()` over, but the plan should be explicit.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has a correct high-level goal and clean phase separation, but the critical issue (StateErrorCode lives in a different file) means Phase 1 as written would produce a broken test. The regex fragility and missing bidirectional check are secondary but architecturally meaningful — fitness functions must be robust against false passes. Fixing all three issues would bring this to 9+.

## Summary
- Critical: 1
- Important: 2
- Minor: 1
