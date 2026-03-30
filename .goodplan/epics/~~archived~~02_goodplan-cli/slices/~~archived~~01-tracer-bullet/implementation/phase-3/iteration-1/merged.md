# Phase 3: Command Framework — Merged Review

**Reviewers:** Generalist (9/10), Software Architecture (7/10), TypeScript (8/10), TUI and CLI (8/10)
**Composite Score: 8/10**

## Critical (0)

None.

## Important (4)

### IMP-1: `--quiet` flag defined but not implemented in `output()`

**Raised by:** Software Architecture, TypeScript, TUI and CLI (3/4 reviewers)
**File:** `src/util/output.ts:16`, `src/commands/main.ts`

The `--quiet` flag is registered in `globalArgs`, accepted in `OutputArgs`, but `output()` never checks it. The architecture says `--quiet` produces "minimal output for scripting." A flag that is accepted and silently ignored violates interface contracts. At minimum, `output()` should suppress output when `quiet` is true, establishing the pattern before commands start using it.

**Resolution:** DIRECTLY_ACTIONABLE — Add a `quiet` branch to `output()`. Even a simple "suppress all output" is sufficient for the tracer bullet; individual commands can refine later.

---

### IMP-2: `output.ts` imports `deterministicStringify` directly from `src/core/data/json.ts` — cross-layer violation

**Raised by:** Software Architecture
**File:** `src/util/output.ts:2`

Commands layer (`src/util/`) imports directly from Data Layer internals (`src/core/data/`). The architecture specifies Commands -> RPC -> Data Layer dependency direction. `deterministicStringify` is a general-purpose JSON utility, not a data-layer concern. It should live in `src/util/` or be re-exported through a public API surface.

**Resolution:** DIRECTLY_ACTIONABLE — Move `deterministicStringify` to `src/util/` (it's a general utility) or create a re-export barrel.

---

### IMP-3: `validateInput` does not strip global flags before schema validation

**Raised by:** Software Architecture
**File:** `src/util/validate.ts:23`

When `validateInput` receives the full citty `args` object (including `json`, `quiet`, `verbose`), those flags end up in the merged object passed to `schema.safeParse()`. With `.strict()` schemas, validation fails. With `.passthrough()`, global flags leak into validated output. This is a latent bug that surfaces when the first real command uses `validateInput`.

**Resolution:** DIRECTLY_ACTIONABLE — Strip known global flag keys before merging, or document that command schemas must use `.passthrough()` and handle the extra keys.

---

### IMP-4: Pre-dispatch unknown-command check does not account for citty command aliases

**Raised by:** TUI and CLI
**File:** `src/index.ts:71`

`getKnownSubcommands()` only checks `Object.keys(subCommands)`. Citty resolves subcommands by both key name and `meta.alias`. A command invoked by alias would be rejected by pre-dispatch before citty can resolve it. Two options: (a) also check aliases, or (b) remove the pre-dispatch check and rely on the try/catch which already handles citty's `E_UNKNOWN_COMMAND`. The try/catch path is already implemented and alias-compatible.

**Resolution:** DIRECTLY_ACTIONABLE — Simplest fix: remove pre-dispatch check and rely on the try/catch error handling, which already handles this case correctly.

## Minor (6)

### MIN-1: `INTERNAL_ERROR` code is not in `GoodplanErrorCode` union and is not namespaced

**Raised by:** TypeScript
**File:** `src/util/output.ts:53`

`outputUnexpectedError` uses `code: "INTERNAL_ERROR"`, but this literal is not in the `GoodplanErrorCode` union type and lacks the required namespace prefix per INV-007. Add `"INTERNAL_ERROR"` to the union (acceptable as a catch-all) or use a namespaced form.

**Resolution:** DIRECTLY_ACTIONABLE

---

### MIN-2: `GoodplanError.detail` typed as `string | undefined` but architecture shows structured `detail` objects

**Raised by:** Software Architecture, TypeScript
**File:** `src/util/errors.ts:27`, `src/schemas/error-output.ts:6`

The commands-api.md error example shows `detail` as an object (`{ "slice": "01-auth", ... }`), but the current type only permits strings. Fine for the tracer bullet, but will require a type change later. Consider typing as `unknown` or `Record<string, unknown> | string | undefined` now.

**Resolution:** DIRECTLY_ACTIONABLE (low urgency — no commands emit structured detail yet)

---

### MIN-3: `--query` global flag not yet in `globalArgs`

**Raised by:** Generalist, TypeScript
**File:** `src/commands/main.ts:7`

The architecture lists `--query` as a global flag, but it is absent from `globalArgs`. Intentionally deferred to Phase 5. The Generalist also notes `output()` should include `query` in its signature now to avoid a signature change later.

**Resolution:** USER_INPUT — Confirm this is intentionally deferred. If so, no action needed.

---

### MIN-4: `isCLIError` relies on citty internal error naming convention

**Raised by:** Generalist
**File:** `src/index.ts:25`

The type guard checks `error.name === "CLIError"` which is a duck-type check since citty doesn't export `CLIError`. A more explicit comment about this fragility would help maintainers.

**Resolution:** DIRECTLY_ACTIONABLE (comment addition only)

---

### MIN-5: No test coverage for `src/index.ts` runner or `outputUnexpectedError` human mode

**Raised by:** Software Architecture, Generalist
**File:** `src/index.ts:47`, `tests/unit/util/output.test.ts`

The `main()` orchestration logic (flag pre-parsing, error mapping, exit codes) is untested. `outputUnexpectedError` human mode path is also untested. These are the most likely regression points.

**Resolution:** DIRECTLY_ACTIONABLE (add integration-style tests for the runner)

---

### MIN-6: `--version` not handled since `runCommand` doesn't auto-handle it

**Raised by:** TUI and CLI
**File:** `src/index.ts:47`

Using `runCommand` instead of `runMain` means `--version` silently exits 0 with no output. Consider adding explicit handling or documenting as deferred.

**Resolution:** DIRECTLY_ACTIONABLE (low urgency)

## Consensus Observations

All reviewers praised:
- The decision to use `runCommand` over `runMain` for exit code control
- Pre-parsing global flags to enable `badcommand --json` structured errors
- Clean separation of output/stdin/validation utilities
- Proper reuse of `deterministicStringify` from Phase 2 (though placement disputed)
- Well-structured tests with good edge case coverage for stdin and validation
