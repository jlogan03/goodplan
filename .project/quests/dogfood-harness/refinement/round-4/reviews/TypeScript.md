# TypeScript Reviewer — Round 4

## Issues

**[MINOR]** `goodplan()` catch block cast specifies `Buffer` for stdout/stderr but `execFileSync` with `encoding: "utf-8"` returns `string`

The plan specifies the catch block cast as:
```typescript
NodeJS.ErrnoException & { stdout?: Buffer; stderr?: Buffer; status?: number | null }
```

But `execFileSync` is called with `encoding: "utf-8"` (harness.ts line 45), which means the thrown error's `stdout` and `stderr` fields are `string`, not `Buffer`. The existing code at line 52 already does `err.stdout ?? err.stderr ?? "unknown error"` — treating these as strings. If the cast type says `Buffer`, the `string` return type of `goodplan()` would require a `.toString()` call that isn't needed (and would be a type error under `exactOptionalPropertyTypes`).

Fix: Change the intersection to `{ stdout?: string; stderr?: string; status?: number | null }` to match what `execFileSync` actually throws when given `encoding: "utf-8"`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan says "import `AskUserQuestionInput` type" but doesn't specify `import type` — required by `verbatimModuleSyntax: true`

The plan text at the `runSkill()` rewrite task reads: "import `AskUserQuestionInput` type from SDK's `sdk-tools.d.ts`." With `verbatimModuleSyntax: true` in tsconfig.json (confirmed), any import used only as a type must use `import type`. A value-form import of a type-only export (`./sdk-tools` has no runtime export — the package.json `exports` entry only has `types`) will emit a bare `import` statement that the bundler cannot resolve at runtime.

The correct form is:
```typescript
import type { AskUserQuestionInput } from "@anthropic-ai/claude-agent-sdk/sdk-tools";
```

Fix: Add `import type` (not `import`) to the plan's task description for the `AskUserQuestionInput` import.

Resolution: DIRECTLY_ACTIONABLE

---

## Verification of Round 3 IMPORTANT Fixes

All four Round 3 IMPORTANT issues were correctly addressed in the current plan:

1. **`canUseTool` answers shape** — Fixed. Plan now specifies `Record<string, string>` keyed by `q.question`, includes the exact loop pattern, and explicitly says "NOT a positional array."

2. **`goodplan()` catch block type guard** — Fixed. Plan now specifies `err instanceof Error && 'status' in err && 'stdout' in err`, then cast to `NodeJS.ErrnoException & { ... }`, with a `// known shape from execFileSync` comment. (One minor inaccuracy noted above — `Buffer` vs `string` — but the strategy is now concrete and correct in approach.)

3. **`goodplanJson()` hardening scope** — Fixed. Plan now explicitly marks `result.ok` check and `JSON.parse` try/catch as **REQUIRED**, and the Zod schema parameter as optional/non-blocking.

4. **`logFriction()` signature** — Fixed. Plan specifies canonical 3-arg signature `logFriction(severity: string, source: string, message: string)` and explicitly requires updating all existing call sites including `logFriction(2, "Skill: /explore", "...", "MINOR")`.

## Score: 10/10

The plan is technically sound for TypeScript implementation. All four Round 3 IMPORTANT issues are properly resolved. The two remaining issues are minor — both are straightforward corrections with no implementation ambiguity. The type safety story is now complete: concrete cast strategy, correct `Record<string, string>` answers shape, required `result.ok` guards, and explicit `Map<string, string>` for model patching storage. The only items that could cause a quiet bug in implementation are the `Buffer` vs `string` mismatch (which would show up as a type error at the usage site) and the missing `import type` keyword (which would fail to compile or resolve at runtime). Neither is a design issue — both are typos in the plan's code snippets.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
