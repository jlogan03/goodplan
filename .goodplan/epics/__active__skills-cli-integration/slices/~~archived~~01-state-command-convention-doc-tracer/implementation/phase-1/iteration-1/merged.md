# Merged Review — Phase 1, Iteration 1

**Consensus Score: 8/10** | Critical: 0, Important: 4, Minor: 5

## Important (4)

### IMP-1: Exit code logic duplicated between `state.ts` and `exitCodeForError()`
**Raised by:** Software-Architecture, TypeScript, API-Contract (3/5 reviewers)

`state.ts:100-104` reimplements the exit code mapping (`VALIDATION_ -> 2`, `STATE_ -> 3`, else `1`) that already exists in `exitCodeForError()` in `src/util/output.ts:93-100`. If mappings change, these two locations will silently diverge.

**Fix:** Import and call `exitCodeForError(error)` instead of the inline ternary.

File: `src/commands/global/state.ts:100`

---

### IMP-2: Error formatting duplicates `outputError()` pattern; non-GoodplanErrors bypass JSON contract
**Raised by:** Software-Architecture, Generalist, TUI-CLI (3/5 reviewers)

Two related sub-issues:

1. **Duplicated error shape construction.** The structured error JSON (`{ error: { code, message, detail? } }`) is built inline at `state.ts:91-106`, duplicating `outputError()` from `src/util/output.ts:46-63`. The error output shape is governed by INV-007 and is now defined in two places.

2. **Non-GoodplanError exceptions re-thrown to top-level handler.** The `throw error` at line 107 reaches the top-level handler in `index.ts`, which checks `args.json` — but `state` is invoked without `--json`, so the top-level handler writes human-readable text to stderr. This violates the state command's always-JSON contract.

**Fix:** Catch all errors (not just `GoodplanError`), use `outputError(error, { json: true })` for GoodplanErrors, and format unexpected errors as JSON to stdout as well. Use `exitCodeForError()` for the exit code (ties into IMP-1).

File: `src/commands/global/state.ts:91-107`

---

### IMP-3: Version string hardcoded instead of single source of truth
**Raised by:** TUI-CLI, API-Contract, Generalist (3/5 reviewers)

The plan requires: "Version must come from a single source of truth." The implementation uses `const version = "0.0.1"` in `src/index.ts:65` while `package.json` also contains `"version": "0.0.1"`. These are independent sources that can drift.

**Fix:** Import version from `package.json` or define a shared `VERSION` constant.

File: `src/index.ts:65`

---

### IMP-4: `--offset`/`--limit` without `--query` silently ignored
**Raised by:** TUI-CLI (1/5 reviewers)

Pagination flags have no effect without `--query` and are silently ignored. While documented in `commands-api.md`, this can confuse CLI users.

**Fix (optional):** Emit a stderr warning (when not `--quiet`) that `--offset`/`--limit` have no effect without `--query`. Low priority since the plan acknowledges this behavior.

File: `src/commands/global/state.ts:84`

---

## Minor (5)

### MIN-1: `as const` on citty arg type literals is unnecessary
**Raised by:** Software-Architecture, TypeScript (2/5 reviewers)

`state.ts` lines 30-44 use `type: "string" as const` on individual arg definitions. Existing commands like `status.ts` and `globalArgs` do not use `as const` on individual fields. Harmless but inconsistent noise.

File: `src/commands/global/state.ts:30`

---

### MIN-2: `serialize.ts` placed in Data Layer despite being a pure transformation
**Raised by:** Software-Architecture (1/5 reviewers)

`src/core/data/serialize.ts` has no I/O — it's a pure transformation. The Data Layer's stated responsibility is "Entity CRUD and filesystem I/O." The plan approved either `src/core/data/` or `src/core/`, so this is acceptable but slightly blurs the layer boundary.

File: `src/core/data/serialize.ts`

---

### MIN-3: `--query` description says "(implies --json)" which is misleading for `state`
**Raised by:** API-Contract (1/5 reviewers)

The `query` arg inherits its description from `globalArgDefs`: "jq expression to filter JSON output (implies --json)". The "(implies --json)" qualifier is irrelevant for `state` which always outputs JSON. Minor confusion for schema consumers.

File: `src/commands/global/schema.ts:114`

---

### MIN-4: `parseNonNegativeInt` strictness undocumented
**Raised by:** Generalist, API-Contract (2/5 reviewers)

`String(parsed) !== value` rejects `"03"`, `"+5"`, etc. This is stricter than "validate non-negative finite integer" but reasonable for CLI. The strict behavior is not documented in flag descriptions or help text.

File: `src/commands/global/state.ts:121`

---

### MIN-5: Formatting-only changes in `schema.ts` inflate the diff
**Raised by:** Software-Architecture, TypeScript (2/5 reviewers)

The `schema.ts` diff includes import reordering and line-wrapping alongside the actual `registerCommand("state", ...)` addition. Likely from a formatter run. No functional concern, just review noise.

File: `src/commands/global/schema.ts`

---

## Resolved / Retracted

- **TypeScript** initially flagged `parseNonNegativeInt` as IMPORTANT for rejecting valid inputs, then retracted after analysis confirmed correct behavior.
- **Generalist** noted the `args.inline === ""` guard is redundant with `parseInlineBudget("")` but confirmed the current code is correct and the guard prevents a subtle edge case.
- **API-Contract** raised integration test fixture assumptions (activity-log needing 3+ entries) — valid observation but the fixture is test-controlled and stable.

## Consensus Notes

- All reviewers confirm: build passes, lint passes, all 850 tests pass.
- All reviewers confirm plan adherence is high across all tasks.
- Code quality praised: exhaustive switch with `never`, clean separation of serialize vs I/O, thorough test coverage.
- Primary path to 9+: fix IMP-1 (exit code duplication) and IMP-2 (error handling duplication / non-GoodplanError JSON contract).
