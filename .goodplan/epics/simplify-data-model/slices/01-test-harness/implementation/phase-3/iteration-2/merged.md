# Merged Review — Phase 3: Migrate Existing Harness Scripts (Iteration 2)

**Scores:** Generalist 8/10 | Software Architecture 8/10 | TypeScript 8/10
**Issues:** Critical: 0, Important: 2 (deduplicated), Minor: 3

---

## Important Issues

### I-1: harness.ts missing end-of-run violation summary [DIRECTLY_ACTIONABLE]
*Raised by: Generalist, Software Architecture (identical issue)*

`validate.ts` correctly accumulates violations in `allViolations[]` and prints a summary at the end. `harness.ts` logs violations per-skill-run (line 291) but has no aggregation in the HARNESS SUMMARY block (lines 2012–2023). Operators running a full `harness.ts all` session will miss violations buried in mid-run output. The original code had `directAccessViolations` with a summary — removed but not replaced.

**Fix:** Add `const allViolations: string[] = []` at module scope, push `session.violations` entries in `runSkill`, and print the accumulated list in the HARNESS SUMMARY block — the same pattern already present in `validate.ts`.

File: `tools/dogfood/harness.ts:291`

---

### I-2: `exactOptionalPropertyTypes` violations in harness.ts wrapper functions [DIRECTLY_ACTIONABLE]
*Raised by: TypeScript*

`gpLocal`, `gpLocalJson`, and `gpLocalForce` pass `opts.stdin` / `opts?.stdin` directly into object literals passed to `gp()`, `gpJson()`, and `gpForce()`. Under `exactOptionalPropertyTypes: true`, a property typed `stdin?: string` cannot receive `undefined` — it must be `string` or omitted. Produces TS2379 at lines 70, 74, and 78.

**Fix:** Use conditional spread — `...(opts.stdin !== undefined ? { stdin: opts.stdin } : {})` — at each of the three call sites.

File: `tools/dogfood/harness.ts:70`

---

## Minor Issues

### M-1: validate.ts `verifyEntityStatus` called with empty expected string [DIRECTLY_ACTIONABLE]
*Raised by: Generalist*

`entityStatus` calls `verifyEntityStatus(type, name, "", { cwd: PROJECT_DIR })`. Passing `""` as expected is a semantic misuse — `ok` will always be `false`. Works but is confusing. Prefer a direct `gpJson` call or an overload that returns status without comparison.

---

### M-2: Inconsistent `onMessage` casting patterns [DIRECTLY_ACTIONABLE]
*Raised by: TypeScript*

`harness.ts` casts to `Record<string, unknown>` and navigates `raw.message` / `inner.content` manually. The other three scripts cast to `{ message: { content: Array<...> } }` directly. Recommend aligning on the direct cast used in the other scripts.

File: `tools/dogfood/harness.ts:220`

---

### M-3: `logCliResult` not extracted to utils [DIRECTLY_ACTIONABLE]
*Raised by: TypeScript*

`logCliResult` is defined locally in `harness.ts` (line 80). Given the migration's deduplication goal it's a candidate for `utils.ts`. Not blocking — future pass.

File: `tools/dogfood/harness.ts:80`

---

## Consensus Strengths

- All 13 issues from iteration 1 resolved: `AUTONOMOUS_SYSTEM_PROMPT` removed, `firstOption` eliminated, stdin payloads restored, ESM imports cleaned, error handling exits 1 on fatal, shared utilities used consistently across all 5 scripts
- `patchSkillModels`/`restoreSkillModels` removal is a clean simplification
- `gpLocal`/`gpLocalJson`/`gpLocalForce` wrapper pattern is well-structured
- 34/34 unit tests pass; zero `AUTONOMOUS`/`firstOption` grep matches confirm cross-cutting cleanup is complete
- Zero direct Agent SDK imports remain in the 5 migrated scripts
