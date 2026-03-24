# TUI & CLI Review — Round 2

## Prior Issues Status

All 3 IMPORTANT issues from round 1 are resolved:
- **Issue 1** (`--name` vs `--slice`/`--epic`): Fixed. Convention doc now uses correct entity-specific flags throughout.
- **Issue 2** (`--version --json`): Tracked as implementation work in `cli-changes.md` (Section 4, bullet 4). Architecture correctly specifies the target format and lists it in implementation priority.
- **Issue 3** (`state` command not registered): Architecture correctly describes `state` as new work. Convention doc now references it alongside concrete `state --query` examples, with `activity:list` removed from examples.

Additionally: `--archive` removed entirely (was round-1 issue 9). `submit-*` examples corrected with proper `--slice`/`--quest` disambiguation. `state.md` replacement guide added. Stdin `IMPORTANT` note is prominent.

## Issues

### 1. `state` command `--offset`/`--limit` semantics with jqjs multi-result queries
**Severity**: MINOR
**File**: `commands-api.md` (lines 235-236), `cli-changes.md` (Section 1)

The spec says `--offset`/`--limit` apply "when `--query` returns an array" and are "ignored otherwise." But `applyQuery()` in `src/util/query.ts` has its own array-collapsing behavior: 0 results returns `null`, 1 result returns the scalar, multiple results returns an array. Consider the query `.["activity-log.jsonl"][]` (note the trailing `[]` unwrap) — jqjs yields N individual results, `applyQuery` wraps them in an array, then `--offset`/`--limit` would slice. But `.["activity-log.jsonl"]` (no unwrap) returns an array directly as a single result, which `applyQuery` returns as-is. The docs should clarify whether pagination applies to "the result is an Array" or "the query yielded multiple jq outputs" — these are different cases. Current doc wording ("returns an array") is ambiguous between the two. The implementation will need to pick one; documenting the choice now prevents confusion.

---

### 2. `schema` command registry missing `state` command entry
**Severity**: MINOR
**File**: `src/commands/global/schema.ts`

The schema registry registers `init`, `status`, and `schema` as global commands but does not register `state`. When `state` is implemented, it must also be added to the parallel registry. This is expected (the command doesn't exist yet), but worth noting because INV-006 (schema output reflects actual signatures) means the registry update must happen atomically with the command implementation. The round-1 observation about schema drift risk still applies.

---

### 3. Convention doc `stdin: ""` syntax is shell-pseudocode, not real shell
**Severity**: MINOR
**File**: `cli-interaction-conventions.md` (lines 98-99, 151, 158, 173, 184)

The convention doc uses `stdin: "" | goodplan ...` which is not valid shell syntax. Real shell equivalents would be `echo '' | goodplan ...` or `echo -n '' | goodplan ...` or `printf '' | goodplan ...`. Since LLM agents will construct shell commands by following these examples literally, using invalid syntax risks agents reproducing it verbatim. The `IMPORTANT` callout on line 97 uses the same pseudocode. Consider using `echo '' | goodplan ...` or a heredoc `<<< '' goodplan ...` for shell-valid examples. The `echo '{"name":"..."}' | goodplan ...` examples elsewhere in the doc use real shell correctly.

---

### 4. `applyQuery` error on `--query` uses exit code 2, but `--query` runtime errors are not validation errors
**Severity**: MINOR
**File**: `src/util/query.ts`, `commands-api.md` (line 287)

`applyQuery` throws `VALIDATION_INVALID_QUERY` for both compile-time errors (bad jq syntax) and runtime errors (query execution failure). These map to exit code 2 via `exitCodeForError`. But a runtime query failure against valid syntax (e.g., `.foo` on an integer) is arguably a data error, not a validation error. The architecture doc says "invalid jq expression -> exit 2" which is correct for syntax errors. Runtime evaluation failures are a grey area. This is minor because the current behavior is consistent and predictable — agents can always retry on exit 2 — but a future `QUERY_RUNTIME_ERROR` code mapping to exit 1 would be more precise.

---

### 5. `parseInlineBudget` silent fallback on invalid values persists
**Severity**: MINOR
**File**: `src/commands/global-args.ts` (line 50)

Round 1 flagged this as issue 8. `--inline=abc` silently falls back to `true` (default budget) instead of producing a validation error. This remains unchanged. For LLM agents constructing flags programmatically, a silent fallback masks bugs. Low priority because the default budget is a safe fallback, but worth fixing during implementation.

---

### 6. `conventions.md` error routing note for JSON mode
**Severity**: MINOR
**File**: `conventions.md` (line 44)

Round 1 flagged that `conventions.md` says "stdout for command output" without noting that JSON errors also go to stdout. The architecture `conventions.md` (this epic's version) now correctly states "In `--json` mode, errors go to stdout (not stderr) so LLM consumers can parse them from the same stream as success responses." This is resolved. Noting for completeness.

## Score: 9/10

The architecture is in strong shape after the round-1 fixes. The three IMPORTANT issues are all resolved: flag names are consistent across docs, `--version --json` is properly tracked as implementation work, `--archive` is cleanly removed, and the convention doc no longer references unimplemented commands as available. The `state` command with `--query`/`--offset`/`--limit` is well-specified in `commands-api.md` with a clear flag table and serialization format.

Remaining items are all MINOR and implementable without architectural changes. The `stdin: ""` pseudocode (issue 3) is the most likely to cause friction at skill integration time since LLM agents follow examples literally, but it is a documentation fix, not an architectural one.

The point keeping this from 10: the `--offset`/`--limit` pagination semantics (issue 1) have a subtle ambiguity around `applyQuery`'s result-collapsing behavior that will need a design decision during implementation. Documenting the choice now would be ideal.

## Summary
- Critical: 0
- Important: 0
- Minor: 6 (1 resolved from round 1, 5 new/carried)
