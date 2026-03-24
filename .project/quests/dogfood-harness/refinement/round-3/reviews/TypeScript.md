# TypeScript Reviewer — Round 3

## Issues

**[IMPORTANT]** `canUseTool` return shape for `updatedInput` uses wrong key for answers

The plan specifies the `canUseTool` return as:
```
{ behavior: 'allow', updatedInput: { questions: <original questions>, answers: <auto-response array> } }
```

But the actual `AskUserQuestionInput` type in `sdk-tools.d.ts` (line 2178) shows `answers` is typed as `{ [k: string]: string }` — a **record keyed by question text**, not an array. The plan says "auto-response array" which implies `string[]`. The harness research (agent-sdk-harness.md §2) also uses `Record<string, string>` with `answers[question.question] = "..."`.

Additionally, `AskUserQuestionInput.questions` is a complex tuple type (minimum 1, maximum 4 elements, each with `question`, `header`, `options[]`, `multiSelect`). The `canUseTool` intercept must build answers keyed by the `question` string field, not by position/index.

The plan text is ambiguous ("auto-response array") and could mislead the implementer into a `string[]` shape that the SDK will reject silently or misinterpret.

Fix: Clarify the `answers` shape in the task as `{ [questionText: string]: string }` (record keyed by `question.question`), e.g.:
```typescript
const answers: Record<string, string> = {};
for (const q of typed.questions) {
  answers[q.question] = q.options[0]?.label ?? "Proceed";
}
return { behavior: "allow", updatedInput: { questions: typed.questions, answers } };
```
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goodplan()` catch block type cast is not fixed in the plan

The plan says "Replace `as { stdout?: string; ... }` catch block with proper type guard (use Bun/Node typed `child_process` error types)."

The current harness code at line 51 does exactly this cast: `const err = e as { stdout?: string; stderr?: string; status?: number }`. The plan's resolution is vague: "use Bun/Node typed `child_process` error types." However, with `exactOptionalPropertyTypes: true` and `noUncheckedIndexedAccess: true`, any replacement must handle that `err.stdout` / `err.stderr` / `err.status` may be `undefined`. The plan does not specify what the typed child_process error interface looks like or where to import it from.

With Bun's `execFileSync`, the thrown error is a `SpawnSyncReturns<string>` (Node.js type) or Bun's equivalent. The `status` field on `SpawnSyncReturns<string>` is typed `number | null`, not `number | undefined` — so `err.status ?? 1` works, but only if the type is known.

The plan should specify either: (a) import `SpawnSyncError` from the `child_process` module for a proper guard, or (b) explicitly note that a runtime `instanceof` check is unavailable (the thrown object is not a class instance from a publicly-importable class) and accept the cast with a `// satisfies` comment documenting the known shape. Without this specificity, the implementer will likely re-apply the same `as` cast with a slightly different type annotation, which doesn't actually fix the underlying issue.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goodplanJson()` Zod schema parameter uses `as T` after `JSON.parse` — not fixed

The plan acknowledges the `as T` issue and offers an optional Zod schema parameter as the fix, but labels it "not blocking." However, the plan also says "Harden `goodplanJson()`" with "Check `result.ok` before parsing" and "Wrap `JSON.parse` in try/catch." The current code at line 58–60 does neither. With `noUncheckedIndexedAccess: true` and `exactOptionalPropertyTypes: true`, any use of `goodplanJson<T>()` without runtime validation is a type safety hole — the generic `T` is a lie that TypeScript accepts but runtime rejects.

Given the plan explicitly notes the Zod option, it should either: (a) mandate the Zod schema parameter overload (not just "consider"), or (b) at minimum mandate the `result.ok` check and `JSON.parse` try/catch, and explicitly call out that `as T` callers are accepted-risk casts (documenting why it's acceptable in a harness context).

Currently the plan is ambiguous: the task description lists three sub-items but only the third is labeled "not blocking." It's unclear whether the `result.ok` check and try/catch are required in this step. Clarify that the `result.ok` check + try/catch are required, and the Zod overload is optional.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `logFriction()` signature change between existing code and plan

The existing harness code (line 73) has:
```typescript
function logFriction(phase: number, source: string, issue: string, severity: string): void
```

The plan's Step 2 and Step 4 call it as:
```typescript
logFriction("important", "phase4-architecture", "No CLI command...")
logFriction(2, "Skill: /explore", "...", "MINOR")
```

The Step 4 call uses `("important", "phase4-architecture", ...)` — **three arguments, with the first being a string severity** — while the existing signature takes `(phase: number, source: string, issue: string, severity: string)` (four arguments with numeric phase first). This is a signature mismatch. The plan needs to either update the `logFriction` signature to match the new call style used in Step 4, or fix the Step 4 call sites to use the existing signature.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `patchSkillModels()` / `restoreSkillModels()` read/write pattern is not type-annotated in plan

The plan describes reading file contents with `grep -rl` and replacing strings. The `readFileSync` / `writeFileSync` operations are straightforward, but the plan doesn't specify the data structure for storing originals (needed for `restoreSkillModels()`). With `noUncheckedIndexedAccess: true`, a `Map<string, string>` is safer than `Record<string, string>` for storing path → originalContent, because map access returns `string | undefined`. The plan should specify a `Map<string, string>` (not an object/record) or explicitly note that the record approach requires non-null assertion.

This is minor because the implementer will likely make the right call, but the plan's silence on the storage type could lead to a `Record<string, string>` with `as string` access.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `runSkill()` does not propagate `model` option — oversight in plan

The plan adds `model: "claude-haiku-4-5"` to `query()` options as a task in Step 1. The current `runSkill()` function at lines 114–129 passes a hardcoded options object. The plan task ("Add `model` option") says to pass `model: "claude-haiku-4-5"` to `query()` options — this is correct and directly actionable.

However, the plan does not address that `runSkill()` currently **has no `model` parameter** and the model is therefore hardcoded. If a caller ever wants to override the model (e.g., for a specific skill), there's no way to do so. At minimum, the plan should add `model?: string` to `runSkill()`'s `opts` parameter type (defaulting to `"claude-haiku-4-5"`) to keep the API flexible. This is a minor extensibility gap, not a correctness issue for the harness goal.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `phase2SliceCycle()` missing explicit `submit-plan`, `submit-refinement`, `submit-implementation` CLI calls

The plan (Step 2, `phase2SliceCycle` task) specifies an explicit 10-step state machine path with CLI submit commands between each skill invocation (e.g., `submit-plan`, `submit-refinement`, `submit-implementation`). The **existing harness code** at lines 302–339 calls only `slice:plan` + four `runSkill()` calls with **no** intermediate submit commands. The existing code relies entirely on the skill itself completing the transitions.

The plan correctly identifies this gap and the task description lists all 10 steps. However, the task description uses numbered steps 1–10 with embedded `echo` stdin payload calls inline — the implementer needs to understand these are separate `goodplan()` calls (not shell commands). The plan should clarify that steps 3, 6, 9, 10 each require a separate `goodplan(["submit-plan", ...], { stdin: "..." })` call (using the `goodplan()` helper with stdin), not a raw `execFileSync` with `echo`. This distinction matters because `goodplan()` handles exit code branching per the Step 1 helper contract.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 3 is in good shape. The two critical issues from Round 2 (canUseTool return shape, AskUserQuestionInput type) were addressed, but the `answers` key type ("array" vs "record") remains an implementer trap. The other issues are clarification gaps that could cause subtle runtime failures (`logFriction` signature mismatch) or type safety regressions (`goodplanJson` hardening scope). Nothing here is a blocking architectural flaw.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
