# Merged Review — Phase 1: Shared Utilities Foundation

**Sources:** Generalist (7/10), Software Architecture (7/10), TypeScript (7/10)

---

## CRITICAL Issues (1)

### C1: `gp()` missing `stdin` option — Phase 3 migration blocker
*Source: Generalist*

`gp()` hardcodes `input: ""` and does not accept a `stdin` parameter. Both `harness.ts` and `validate.ts` pass `stdin` to their local `gp()` equivalents for JSON payloads to commands like `epic:create`, `slice:create`, `quest:complete`. Without `stdin` support, Phase 3 cannot migrate these scripts without falling back to raw `execFileSync` calls. `createMinimalFixture` already works around this by calling `execFileSync` directly, proving `stdin` is needed.

Fix: Add `stdin?: string` to the `gp()` opts type and pass it through as `input`.

File: `tools/dogfood/utils.ts:79`
Resolution: DIRECTLY_ACTIONABLE

---

## IMPORTANT Issues (5)

### I1: `createMinimalFixture` bypasses `gpBin` option for epic/slice creation
*Sources: Generalist, Software Architecture (confirmed)*

`createMinimalFixture` uses `DEFAULT_GP_BIN` directly for `epic:create` (line 479) and `slice:create` (line 500) via `execFileSync`, while `gp init` goes through the shared `gp()` helper. If `GP_CLI_PATH` is set, `gp init` respects it but `epic:create`/`slice:create` do not. Root cause is that `gp()` lacks `stdin` support (C1). Fixing C1 enables routing all calls through `gp()` consistently.

Fix: After fixing C1, route all CLI calls in `createMinimalFixture` through `gp()` with `gpBin` support.

File: `tools/dogfood/utils.ts:479`
Resolution: DIRECTLY_ACTIONABLE (blocked by C1)

### I2: `runSkillSession` cost tracker accumulated total never exposed
*Sources: Generalist, Software Architecture (confirmed)*

`runSkillSession` creates a `costTracker` and accumulates costs, but the return type is `SDKResultMessage` which only contains the last message's cost. The accumulated total is lost. Existing scripts report total cost at session end — Phase 3 migration will need this.

Fix: Return `{ result: SDKResultMessage, violations: string[], totalCost: number }` or similar enriched return type.

File: `tools/dogfood/utils.ts:335`
Resolution: DIRECTLY_ACTIONABLE

### I3: Unsafe `as` casts in error handling bypass type safety
*Source: TypeScript*

`gp()` uses `as NodeJS.ErrnoException & { stdout?: Buffer | string; status?: number | null }` (line 84) after a partial runtime guard. `createMinimalFixture()` uses similar casts at lines 486 and 507. The guard on line 83 checks property existence but the cast then widens to a different type. If error shapes change (e.g., Bun runtime), code silently reads `undefined`.

Fix: Replace casts with proper type narrowing — the existing `"status" in e && "stdout" in e` guard should be sufficient without the cast.

File: `tools/dogfood/utils.ts:84`
Resolution: DIRECTLY_ACTIONABLE

### I4: `gpJson<T>` returns unchecked `as T` cast from `JSON.parse`
*Source: TypeScript*

`JSON.parse(r.stdout) as T` returns whatever T the caller specifies without runtime validation. Per INV-005 (schema validation on reads/writes), callers may assume type safety that doesn't exist. For Experimental maturity, a JSDoc comment documenting the intentional trust-the-CLI behavior is acceptable; optionally accept `schema?: z.ZodType<T>`.

Fix: Add JSDoc comment documenting the unvalidated cast. Optionally add schema parameter.

File: `tools/dogfood/utils.ts:107`
Resolution: DIRECTLY_ACTIONABLE

### I5: `checkViolation` casts to `Record<string, unknown>` without array guard
*Source: TypeScript*

After checking `typeof input !== "object" || input === null`, arrays still pass (`typeof [] === "object"`). An array input gets cast to `Record<string, unknown>` — safe at runtime but semantically wrong.

Fix: Add `Array.isArray(input)` to the early return guard.

File: `tools/dogfood/utils.ts:148`
Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues (6)

### M1: Module-level mutable transcript state — test isolation risk
*Sources: Generalist, Software Architecture, TypeScript (all three flagged)*

`transcriptBuffers` Map and `exitHandlerRegistered` boolean are module-level singletons. Tests share state across describe blocks. No `resetTranscriptState()` exists for cleanup. Currently works because tests use unique file paths, but fragile if tests grow.

Fix: Add `resetTranscriptState()` export for test cleanup.

File: `tools/dogfood/utils.ts:206-207`
Resolution: DIRECTLY_ACTIONABLE

### M2: `DEFAULT_GP_BIN` hardcodes version `1.0.2` — fragile path
*Sources: Generalist, Software Architecture, TypeScript (all three flagged)*

Fallback path contains specific version and architecture. Existing scripts use `~/bin/goodplan` instead. Will break silently on version bump or different architecture.

Fix: Use `~/bin/goodplan` or `which gp` as fallback, or document `GP_CLI_PATH` as effectively required.

File: `tools/dogfood/utils.ts:26-29`
Resolution: DIRECTLY_ACTIONABLE

### M3: `createAskUserHandler` re-instantiated on every tool call
*Source: Software Architecture*

Handler is stateless so functionally correct, but wasteful and obscures intent. Should be created once outside the loop and reused.

File: `tools/dogfood/utils.ts:348`
Resolution: DIRECTLY_ACTIONABLE

### M4: `createAskUserHandler` double cast `as unknown as AskUserQuestionInput`
*Source: TypeScript*

Double cast is a red flag. Runtime check already validates the shape. Consider using SDK type guard or restructuring to avoid the double cast.

File: `tools/dogfood/utils.ts:301`
Resolution: DIRECTLY_ACTIONABLE

### M5: `checkViolation` missing `sed`/`node -e` patterns
*Source: Generalist*

Violation patterns check `cat`, `echo >`, `mv` but miss `sed -i` on `.goodplan/` files and `node -e "fs.writeFileSync(...)"`. Edge cases but worth noting since this function is the single source of truth for violation detection.

File: `tools/dogfood/utils.ts:155`
Resolution: DIRECTLY_ACTIONABLE

### M6: `as any` usage in test file (6 instances)
*Source: TypeScript*

Test file uses `as any` 6 times for SDK message stubs. Per project anti-patterns, should use `satisfies Partial<SDKAssistantMessage>` or a typed test helper. Low severity for Experimental test code.

File: `tests/unit/dogfood/utils.test.ts:214,223,247,268,283,288`
Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE

1. **C1** — Add `stdin?: string` to `gp()` opts, pass through as `input`
2. **I1** — Route all `createMinimalFixture` CLI calls through `gp()` after C1 fix
3. **I2** — Return enriched object from `runSkillSession` with violations + totalCost
4. **I3** — Replace `as` casts with proper type narrowing in error handling
5. **I4** — Add JSDoc to `gpJson<T>` documenting unvalidated cast; optionally add schema param
6. **I5** — Add `Array.isArray(input)` guard in `checkViolation`
7. **M1** — Add `resetTranscriptState()` export
8. **M2** — Fix `DEFAULT_GP_BIN` fallback to use non-versioned path
9. **M3** — Hoist `createAskUserHandler` outside per-tool-call path
10. **M4** — Eliminate double cast in `createAskUserHandler`
11. **M5** — Add `sed -i` and `node -e` patterns to `checkViolation`
12. **M6** — Replace `as any` in test stubs with typed alternatives

## RESEARCH_NEEDED

None.

## Contradictions Resolved

### `checkViolation` dropping `.project/` detection
Software Architecture flagged that dropping `.project/` path detection could cause Phase 4 issues when migrating `validate.ts` (which checks `.project/`). Generalist did not mention this. TypeScript did not mention this. Resolution: Software Architecture's concern is valid but is explicitly a later-phase concern (Phase 4), not a Phase 1 issue. The test intentionally asserts `.project/` is NOT matched. No action needed for Phase 1; flagged as awareness for Phase 4 planning.

### `CliResult` interface drift (Generalist M1)
Generalist noted `CliResult` lacks `ok` field that existing scripts use. No other reviewer flagged this. Resolution: This is migration friction, not a bug. The `ok` field is trivially derivable from `exitCode !== 0`. Noted but not promoted to actionable — Phase 3 migration can handle this inline.

## Unresolved (USER_INPUT required)

None.
