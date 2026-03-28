# TypeScript and JavaScript Review: Test Infrastructure Polish

## Issues

**[CRITICAL]** Phase 1 regex extraction misses `StateErrorCode` — it lives in a different file

The plan says to "regex-extract all string literals from the four error code union types (`DataErrorCode`, `InternalErrorCode`, `StateErrorCode`, `ValidationErrorCode`)" by reading `src/util/errors.ts`. However, `StateErrorCode` is **not defined in that file** — it is imported from `src/schemas/state-events.ts`:

```ts
import type { StateErrorCode } from "../schemas/state-events.js";
```

Only `DataErrorCode`, `ValidationErrorCode`, and `InternalErrorCode` are defined inline in `errors.ts`. `StateErrorCode` is defined at `src/schemas/state-events.ts:139-149` with 10 members.

The regex extraction must either:
- (a) Read **both** `src/util/errors.ts` and `src/schemas/state-events.ts`, extracting union members from each, or
- (b) Follow the import to resolve the source file dynamically, or
- (c) Extract from `GoodplanErrorCode` union (which references all four sub-types) by resolving all transitive type definitions.

Option (a) is simplest and most robust for this codebase. The task description must explicitly name both files.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Regex pattern `^\t\| "..."` is fragile and under-specified for `InternalErrorCode`

The plan describes the pattern as extracting "quoted strings from lines matching `^\t| "..."`". This works for multi-member unions formatted as:

```ts
type DataErrorCode =
	| "DATA_CONCURRENT_MODIFICATION"
	| "DATA_FILE_NOT_FOUND"
```

But `InternalErrorCode` is a single-member type defined as:

```ts
type InternalErrorCode = "INTERNAL_ERROR";
```

This line does **not** start with `\t|` — it uses `= "..."` syntax. The regex must handle both the `| "MEMBER"` and `= "MEMBER"` patterns, or extract all quoted strings that match the `[A-Z]+_[A-Z_]+` error code naming convention from the type blocks.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 task should specify `import { readFileSync } from "node:fs"` not bare `fs`

The plan says "Read `src/util/errors.ts` at test time using `fs.readFileSync`". For consistency with the project's `verbatimModuleSyntax` and existing import patterns in other fitness tests (e.g., `data-determinism.test.ts` uses `import * as fs from "node:fs"`), the task should clarify which import style to use. Either form works, but specifying it prevents ambiguity during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `collectFiles` signature differs from existing usage in `snapshotFiles`

The plan proposes `collectFiles(dir: string, base?: string): string[]`. This matches the existing `data-determinism.test.ts` implementation. However, that file also has a `snapshotFiles` function that depends on `collectFiles` — it should continue to work after the refactor. The plan's Phase 2 tasks mention removing `collectFiles` but don't mention `snapshotFiles`. Since `snapshotFiles` calls `collectFiles` locally, the import change applies transitively. This is likely fine but worth noting in the task to avoid confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has a correct high-level goal but the critical issue (StateErrorCode living in a separate file) means Phase 1 as written would produce a test that undercounts error codes by 10. The regex pattern fragility for single-member unions adds further risk. Fixing these two issues would bring the score to 9+. Phase 2 is clean and well-specified.

## Summary
- Critical: 1
- Important: 1
- Minor: 2
