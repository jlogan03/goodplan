# Generalist Review — Iteration 2

## Fix Verification

### 1. Node.js imports use `node:` prefix
CONFIRMED. Lines 16–25: `node:child_process`, `node:fs`, `node:path` — all correct.

### 2. goodplanJson() has runtime validation before `as T`
CONFIRMED. Lines 124–136: parses to `unknown`, then checks `parsed === null || typeof parsed !== "object"` before casting. The cast `parsed as T` at line 137 is sound given the guard — the function correctly rejects null/primitives. One nuance: arrays pass this guard (`typeof [] === "object"`), but T is always typed as an object at call sites, so this is acceptable for a harness.

### 3. patchSkillModels() uses git stash/checkout as safety nets
CONFIRMED. Lines 186–194: `git stash push -- skills/` before patching. Lines 257–265: `git checkout -- skills/` after restoring. Both wrapped in try/catch with appropriate messaging. The stash happens before patching and checkout happens after in-memory restore — correct order.

### 4. AskUserQuestionInput has runtime shape guard before cast
CONFIRMED. Lines 319–324: checks `"questions" in input && Array.isArray(input.questions)` before proceeding. Falls back to `allow` with original input on shape mismatch. Cast at line 325 is preceded by the guard.

---

## New Issues Introduced

### IMPORTANT

**I1. git stash may silently swallow pre-existing user changes (lines 186–194)**
The stash runs on `skills/` unconditionally before every skill run. If the user has legitimate uncommitted work in `skills/`, it gets stashed silently — the catch block discards any stash output. The stash message says "may fail if there are no changes" but does not log what was actually stashed. If harness crashes between stash and restore, user loses visibility into what was stashed. The `restoreSkillModels` does `git checkout -- skills/` (not `git stash pop`), so a stash created here is never popped. This is a correctness hazard: the stash accumulates permanently.

Concretely: `patchSkillModels` stashes, `restoreSkillModels` does `git checkout --` (not `git stash pop`). User's pre-existing work ends up in the stash stack forever, not restored.

### IMPORTANT

**I2. AUTONOMOUS_SYSTEM_PROMPT is referenced before it is defined (line 314 references line 441)**
`AUTONOMOUS_SYSTEM_PROMPT` is used inside the `runSkill` function body at line 314, but the `const AUTONOMOUS_SYSTEM_PROMPT = ...` declaration is at line 441. In JavaScript/TypeScript, `const` is not hoisted — but since it's used inside an `async function` body (not at module evaluation time), it will be defined by the time `runSkill` is first called. This is safe at runtime in practice, but is a code smell: declaration after first use makes code harder to audit. Not a runtime bug given the call pattern, but worth noting. Downgrading to minor for actual risk.

### MINOR

**M1. `q.options[0]` access without `noUncheckedIndexedAccess` guard (line 329)**
`const firstOption = q.options[0]` — with `noUncheckedIndexedAccess: true`, this returns `T | undefined`. The code does handle it: `firstOption?.label ?? "Proceed"`. This is correct.

**M2. `message as Record<string, unknown>` cast (line 392)**
`const initMsg = message as Record<string, unknown>` — bypasses the discriminated union type. This was present in iteration 1 and not part of the fix set, so not a regression.

---

## Summary

All 4 IMPORTANT fixes from iteration 1 are correctly applied. One new IMPORTANT issue was introduced: the git stash/checkout safety net has a logic gap where stashed changes are never popped — `restoreSkillModels` does `git checkout --` rather than `git stash pop`, leaving any pre-existing user stash permanently stranded.

| Category | Count |
|---|---|
| Critical | 0 |
| Important | 1 (I1: stash never popped) |
| Minor | 1 (I2: declaration order) |
