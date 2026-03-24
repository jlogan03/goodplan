# TUI & CLI Review

## Issues

### 1. Flag name inconsistency between architecture and convention doc
**Severity**: IMPORTANT
**Resolution**: Fix in `cli-interaction-conventions.md`
**File**: `.project/epics/__active__skills-cli-integration/architecture/cli-interaction-conventions.md`

The convention doc uses `--name` for show commands (lines 66, 102):
```
goodplan slice:show --name my-slice --json
goodplan epic:show --name X --json
```

But `commands-api.md` and the actual implementation use entity-specific flags (`--slice`, `--epic`, `--quest`):
```
goodplan slice:show --slice <name>
goodplan epic:show --epic <name>
```

The implementation matches `commands-api.md`. The convention doc is wrong. Since this doc is the shared reference for all ~15 skills, this inconsistency will cause skills to generate broken commands.

---

### 2. `--version --json` not implemented; hardcoded version string
**Severity**: IMPORTANT
**Resolution**: Implement before skill rollout
**File**: `src/index.ts` (line 63), `cli-changes.md` (Section 5)

`cli-interaction-conventions.md` specifies:
```bash
goodplan --version --json
# Returns: { "version": "1.2.0" }
```

The actual implementation (index.ts:63) prints a plain string `goodplan 0.0.1\n` and ignores `--json`. Skills that parse `--version --json` output as JSON will get a parse error. The convention doc and `cli-changes.md` both depend on this for version compatibility checking.

---

### 3. `goodplan state` command not registered in main.ts
**Severity**: IMPORTANT
**Resolution**: Track as implementation gap; document explicitly
**File**: `src/commands/main.ts`, `cli-changes.md` (Section 1)

The `state` command is described as "the single most important addition" in `cli-changes.md` and referenced extensively in `cli-interaction-conventions.md`, but it is not registered in `main.ts` and has no implementation file. The architecture correctly marks this as new work, but `cli-interaction-conventions.md` references it as if it already exists. The convention doc should note which commands are proposed vs. implemented, or the implementation priority should be clearer.

---

### 4. `activity:list` referenced in convention doc but not implemented
**Severity**: MINOR
**Resolution**: Remove from convention doc or note as planned
**File**: `cli-interaction-conventions.md` (line 104), `commands-api.md` (line 124)

The convention doc shows `goodplan activity:list --limit 5 --json` as an orchestrator read pattern. `commands-api.md` marks it as "not yet implemented." The `state` command with `--query` is positioned as a replacement. The convention doc should not present `activity:list` as a current command for skills to use, or should note the `state --query` alternative.

---

### 5. `--offset` / `--limit` flags on `state` not defined in global args or commands-api
**Severity**: MINOR
**Resolution**: Add to commands-api.md flag table
**File**: `cli-changes.md`, `commands-api.md`

`cli-changes.md` defines `--offset` and `--limit` for the `state` command's array pagination, but these flags are not listed in the global flags table or common workflow flags table in `commands-api.md`. They need a home — either as `state`-specific flags or as a new category in commands-api.

---

### 6. `schema` command uses parallel registry — drift risk
**Severity**: MINOR
**Resolution**: Accept with existing mitigation (drift-detection unit test)
**File**: `src/commands/global/schema.ts`

The `schema` command maintains a parallel `commandRegistry` (Map) alongside citty's `subCommands` in `main.ts`. INV-006 requires these stay in sync. The code comments note "A drift-detection unit test ensures this stays in sync with subCommands in main.ts" — this is the right mitigation. However, the architecture docs don't mention this parallel registry approach or its risk. Worth noting in conventions or invariants for future maintainers.

---

### 7. Error output routing: JSON errors to stdout is intentional but worth documenting the rationale
**Severity**: MINOR
**Resolution**: No code change; add brief rationale in conventions
**File**: `src/util/output.ts`, `conventions.md`

In `--json` mode, errors go to stdout (not stderr). This is intentional for LLM consumption — LLMs parse stdout, not stderr. The architecture mentions this in output.ts comments but `conventions.md` only says "stdout for command output." A one-line note in the error handling section of conventions.md would prevent future confusion.

---

### 8. `parseInlineBudget` returns `true` on invalid numeric strings
**Severity**: MINOR
**Resolution**: Consider returning a validation error instead
**File**: `src/commands/global-args.ts` (line 50)

When `--inline=abc` is passed, `Number("abc")` is `NaN`, which fails the `Number.isFinite` check, and the function falls through to returning `true` (default budget). This silently ignores the user's explicit budget. A validation error (`VALIDATION_INVALID_INPUT`) would be more helpful, especially for LLM agents that may construct the flag programmatically.

---

### 9. No `--archive` flag in current implementation
**Severity**: MINOR
**Resolution**: Track as implementation gap
**File**: `src/commands/slice/complete.ts`, `cli-changes.md` (Section 4)

`cli-changes.md` specifies `--archive` on complete commands. The convention doc references it (`goodplan slice:complete --slice my-slice --archive --json`). Neither `slice:complete` nor `quest:complete` implementations include this flag. This is expected new work for the epic, but the convention doc presents it as available.

---

### 10. Cross-platform: stdin handling depends on `isTTY` which is Node/Bun-specific
**Severity**: MINOR
**Resolution**: Acceptable; document the assumption
**File**: `src/util/stdin.ts`

The `process.stdin.isTTY` check is standard for Node.js/Bun runtimes and works on macOS, Linux, and Windows. Since the CLI compiles via `bun build --compile`, the runtime is guaranteed. The learning "Without `stdin: ""` the compiled binary blocks forever" (from learnings.md) shows this was already discovered and handled. No action needed, but the convention doc's note about always piping `stdin: ""` is essential — it should be more prominent (it appears once on line 91 and could be missed).

---

### 11. `submit-refinement` uses `--slice` or `--quest` but convention doc doesn't show this disambiguation
**Severity**: MINOR
**Resolution**: Add example to convention doc
**File**: `cli-interaction-conventions.md`, `commands-api.md` (line 51)

`commands-api.md` notes that `submit-refinement` "uses `--slice` or `--quest` to disambiguate" between slice and quest refinement events. The convention doc's sub-agent section doesn't show concrete examples of this disambiguation for submit commands.

## Score: 8/10

The CLI design is well-structured with strong fundamentals: entity-namespaced commands, consistent error handling with exit codes, Zod validation at boundaries, deterministic JSON output, and clean separation between human and JSON modes. The `state --query` approach is an elegant solution for giving LLM agents full data access through a single command. The stdin handling, TTY detection, and output routing are all well-thought-out for the LLM-first use case.

The two points keeping this from 9+:
1. **Convention doc accuracy** (Issues 1, 3, 4, 9): The `cli-interaction-conventions.md` file is the single reference all ~15 skills will code against. It currently presents proposed features as available (`state`, `--archive`, `activity:list`) and has a flag name error (`--name` vs `--slice`/`--epic`). Since LLMs follow instructions literally, these inaccuracies will cause broken commands at skill integration time.
2. **`--version --json` gap** (Issue 2): The version compatibility system is well-designed but the implementation doesn't support the JSON output format that both the convention doc and skill startup sequence depend on.

Fixing issues 1 and 2 would bring this to 9. Annotating proposed-vs-implemented commands in the convention doc (issue 3) would bring it to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 8
