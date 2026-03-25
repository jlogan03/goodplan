# TypeScript Review — Phase 2 Functions

**Reviewer:** TypeScript specialist
**Scope:** phase2Architecture, phase2RefineArchitecture, phase2Slices, phase2Activate, phase2SliceCycle, phase2EpicComplete
**Date:** 2026-03-24

---

## Summary

Score: **7/10**
Critical: 0 | Important: 3 | Minor: 4

Overall the Phase 2 functions are well-structured. The `goodplan()` helper is used correctly throughout with the `stdin` option where required. Template literals are used consistently. Error handling is solid — no empty catch blocks. The main issues are a type-unsafe cast pattern, two `noUncheckedIndexedAccess` violations, and some narrowing gaps.

---

## Important Issues (3)

### I-1: Unsafe cast in `goodplanJson` — `parsed as T` without validation (line 137)

```ts
return { data: parsed as T, result };
```

`T` is a generic type parameter (defaults to `unknown`). The cast bypasses type safety entirely — callers like `goodplanJson<{ items: Array<{ name: string; status: string }> }>` assume the shape is correct, but there is no runtime validation. If the CLI returns a different shape, downstream property access will silently produce `undefined` rather than throwing.

**Location:** `goodplanJson` (line 137), consumed in `phase2Slices` (line 827–830) and `runPhase2` (lines 1094–1098).

**Fix:** Either validate with Zod or at minimum narrow the fields used before accessing them. This is particularly relevant for `slices.items` (see I-2).

---

### I-2: `noUncheckedIndexedAccess` violation — `slices.items.map(s => ...)` without null guard (lines 830, 1097–1098)

```ts
// phase2Slices line 830
console.log(`  Slices: ${JSON.stringify(slices.items.map((s) => `${s.name}:${s.status}`))}`);

// runPhase2 lines 1097–1098
for (const slice of slices.items) {
    await phase2SliceCycle(slice.name);
}
```

With `noUncheckedIndexedAccess: true`, array element access yields `T | undefined`. However the more direct issue is that `slices.items` itself could be `undefined` if the CLI returns an unexpected shape — the `goodplanJson` cast provides no guarantee. If `items` is absent, both lines throw at runtime with a confusing error.

**Fix:** Guard `slices.items` before use: `const items = slices.items ?? [];`

---

### I-3: `noUncheckedIndexedAccess` violation — `q.options[0]` (line 319)

```ts
const firstOption = q.options[0];
answers[q.question] = firstOption?.label ?? "Proceed";
```

This is actually handled correctly via optional chaining (`firstOption?.label`). **However**, `q.options` itself is typed as whatever `AskUserQuestionInput` declares — if it is typed as a non-empty array tuple, `[0]` is safe; if it is `Array<...>`, the result is `T | undefined` and `firstOption` should be `typeof q.options[0] | undefined`. The optional chaining handles the `undefined` case, so this is borderline. The concern is that the `AskUserQuestionInput` import comes from an external SDK where the type may change.

**Fix:** Verify `AskUserQuestionInput.questions[number].options` is typed as `Array<...>` (not a tuple), and confirm optional chaining is sufficient. If so, this is acceptable as-is.

---

## Minor Issues (4)

### M-1: `message as Record<string, unknown>` cast on system:init message (line 381)

```ts
const initMsg = message as Record<string, unknown>;
```

`message` already has a typed discriminated union shape — this cast discards it to access `skills`. Instead, narrow via `"skills" in message` (already done on line 382) and use a typed assertion only on the specific field, or define the init message type from the SDK.

This is a minor type-soundness issue. The `"skills" in initMsg` guard on line 382 partially mitigates it, but `initMsg.skills` is then treated as `unknown[]` which is fine — the real issue is the unnecessary full-object cast.

---

### M-2: String concatenation in `epicStatus()` error message in `goodplanJson` (line 121)

```ts
`goodplan ${args.join(" ")} failed (exit ${result.exitCode}): ${describeExitCode(result.exitCode)}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
```

This uses template literals — correct. No issue here. (Flagged during audit, confirmed clean.)

---

### M-3: `phase2SliceCycle` — `slice:plan` failure throws without checking if already past `planning` state (line 876–880)

```ts
const planTransition = goodplan(["slice:plan", "--slice", sliceName, "--json"]);
logCliResult("slice:plan", planTransition);
if (!planTransition.ok) {
    throw new Error(`Failed to start planning for ${sliceName}: exit ${planTransition.exitCode}`);
}
```

Unlike all other transition calls (which check `currentStatus` first and only transition if in the expected state), `slice:plan` is always called unconditionally. If the slice is already in `planning` or later state (e.g., from a partial run), this will fail with a state machine error (exit 3) and throw, blocking recovery.

**Fix:** Check `sliceStatus(sliceName)` first and skip the transition if already past `created`.

---

### M-4: `phase2EpicComplete` — `runSkill` errors are swallowed, fallback runs regardless (lines 1037–1067)

```ts
await runSkill("complete", ...);
// State recovery: if skill didn't complete the epic, do it manually
const afterStatus = epicStatus();
if (afterStatus !== "completed") {
    // manual fallback
}
```

`runSkill` catches all exceptions internally (lines 411–415) and always returns `{ result, costUsd }`. This means a hard SDK failure (network error, budget exceeded) is silently absorbed and the harness proceeds to check state. This is intentional for resilience, but the cost is that a catastrophic failure during the complete skill looks identical to a skill that ran but didn't call the CLI. Consider logging the `result` string from `runSkill` to help distinguish these cases.

This is a design trade-off, not a bug — but worth noting.

---

## Checklist

| Check | Result |
|---|---|
| No `as any` | PASS — one `as Record<string, unknown>` (M-1), one `as T` (I-1), one `as unknown as AskUserQuestionInput` (acceptable — SDK type) |
| No `@ts-ignore` | PASS |
| No empty catch blocks | PASS — all catch blocks log or rethrow |
| Exit code checks on goodplan() calls | PASS — all results checked, failures logged or thrown |
| noUncheckedIndexedAccess compliance | PARTIAL — `q.options[0]` guarded (I-3 clean), `slices.items` unguarded (I-2) |
| Template literals (not string concat) | PASS — all string construction uses template literals |
| goodplan() stdin option used correctly | PASS — all commands requiring JSON input use `{ stdin: ... }` |
