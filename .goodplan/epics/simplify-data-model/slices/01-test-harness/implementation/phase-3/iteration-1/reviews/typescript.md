# TypeScript and JavaScript Review — Phase 3: Migrate Existing Harness Scripts

## Issues

**[CRITICAL]** `validate.ts` `epic:create` and `quest:create` lost `stdin` payload
The original code passed `{ stdin: JSON.stringify({ name: epicName, goal }) }` to `gpForce` for `epic:create` and `quest:create`. The migrated code passes `{ cwd: PROJECT_DIR }` only, dropping the `stdin` entirely. These CLI commands require JSON input via stdin to specify the entity name and goal. Without it, the commands will fail at runtime.
File: tools/dogfood/validate.ts:173
Resolution: DIRECTLY_ACTIONABLE

Affected lines (all in `validate.ts`):
- Line 173: `gpForce(["epic:create", "--json"], { cwd: PROJECT_DIR })` — needs `stdin: JSON.stringify({ name: epicName, goal })`
- Line 292: `gpForce(["quest:create", "--json"], { cwd: PROJECT_DIR })` — needs `stdin: JSON.stringify({ name: questName, goal })`
- Line 220: `gpForce(["epic:add-verification", "--epic", epicName, "--json"], { cwd: PROJECT_DIR })` — needs the verification payload via stdin
- Line 200: `gpForce(["submit-refine-architecture", ...], { cwd: PROJECT_DIR })` — needs scores JSON via stdin
- Line 216: `gpForce(["submit-refine-slices", ...], { cwd: PROJECT_DIR })` — needs scores JSON via stdin
- Line 258: `gpForce(["submit-refinement", ...], { cwd: PROJECT_DIR })` — needs scores JSON via stdin
- Line 238: `gpForce(["epic:complete", ...], { cwd: PROJECT_DIR })` — needs verification results via stdin
- Line 279: `gpForce(["slice:complete", ...], { cwd: PROJECT_DIR })` — needs completion payload via stdin
- Line 310: `gpForce(["quest:complete", ...], { cwd: PROJECT_DIR })` — needs completion payload via stdin

This is a systemic issue: every `gpForce` call in `validate.ts` that previously had `stdin` data has lost it.

**[CRITICAL]** `harness.ts` `gpLocalForce` drops `stdin` parameter
`gpLocalForce` accepts `stdin` in its options type but silently discards it, passing only `cwd`:
```typescript
function gpLocalForce(args: string[], opts: { cwd?: string; stdin?: string } = {}): CliResult & { retried: boolean } {
    return gpForce(args, { cwd: opts.cwd ?? NONDET_EVAL_DIR });
}
```
Several callers construct payloads (e.g., `completePayload` at line 913) but never pass them to `gpLocalForce`. The payloads are dead code — constructed but unused.
File: tools/dogfood/harness.ts:80
Resolution: DIRECTLY_ACTIONABLE

Affected callers that construct payloads but don't pass them:
- Line 913: `completePayload` for `slice:complete` — constructed but unused
- Line 960: `epic:complete` — previously had `stdin: completePayload`
- Line 1168: `quest:complete` — previously had `stdin: completePayload`
- Line 1692: `slice:complete` in phase 4 — previously had `stdin: completePayload`
- Line 1730: `epic:complete` in phase 4 — previously had `stdin: completePayload`

**[IMPORTANT]** `validate.ts` uses `require()` instead of ESM import
Line 49 uses `const { appendFileSync } = require("node:fs")` inside the `log()` function. The project has `verbatimModuleSyntax: true` in tsconfig and all other files use ESM imports. While `appendFileSync` is already imported at the top of the file in utils.ts (and indeed `appendFileSync` was removed from the top-level imports of validate.ts during migration), `require()` in a `verbatimModuleSyntax` project is inconsistent and would fail under strict ESM enforcement. Since `log()` calls `appendFileSync` on every invocation, just import it at the top.
File: tools/dogfood/validate.ts:49
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `validate.ts` imports `CliResult` and `SkillSessionResult` types but `SkillSessionResult` is unused
`SkillSessionResult` is imported but never referenced in the file. This is dead code.
File: tools/dogfood/validate.ts:34
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `validate.ts` imports `createLogger` but doesn't use it
The `createLogger` utility is imported but the file defines its own `log()` function with `require()`. This is inconsistent with the migration goal of using shared utilities.
File: tools/dogfood/validate.ts:23
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `harness.ts` message type casts use `as` instead of type guards
Multiple places in the `onMessage` callback cast `message` to inline object types:
```typescript
const msg = message as { message: { content: Array<{ type: string; name?: string }> } };
```
These unvalidated casts could silently break if the SDK message shape changes. Consider using a type guard or at least checking `"message" in message` before casting.
File: tools/dogfood/harness.ts:211
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `harness.ts` error handler swallows errors and continues
The `try/catch` at the entry point (line 1989-1995) catches all errors and falls through to the summary instead of re-throwing or setting a non-zero exit code. If a phase fails fatally, the process exits 0, making it harder to detect failures in CI.
File: tools/dogfood/harness.ts:1989
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `test-migrate.ts` references `GOODPLAN_BIN` but doesn't use it directly
`GOODPLAN_BIN` is defined at line 41 but only used in the post-migration verification section (line 195) via `execFileSync`. The pre-migration CLI calls go through the shared `gp()` utility. This is correct but the constant could be removed if `gp()` were used for verification too — minor inconsistency.
File: tools/dogfood/test-migrate.ts:41
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `test-onboard.ts` imports `gp as gpCli` but never uses it
The aliased import is present but unused in the file body.
File: tools/dogfood/test-onboard.ts:24
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

Two critical issues (dropped `stdin` payloads across validate.ts and harness.ts) would cause runtime failures for any CLI commands requiring JSON input. These are functional regressions introduced during migration. The migration pattern is sound overall — shared utilities, simulated user, model selection — but the `stdin` data loss is a show-stopper. Fixing the two critical issues and the `require()` / unused import cleanup would bring this to 8+. Addressing all issues would reach 9.

## Summary
- Critical: 2
- Important: 3
- Minor: 4
