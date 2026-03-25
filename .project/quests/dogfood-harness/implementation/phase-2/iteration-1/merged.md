# Merged Feedback — Phase 2 Harness (Iteration 1)

Reviewers: Generalist (8/10), TypeScript (7/10)
Composite score: **7.5/10**
Critical: 0 | Important: 4 | Minor: 6

---

## Important Issues (4)

### IMP-A: `goodplanJson` unsafe cast — `parsed as T` without runtime validation
*(TypeScript I-1 + Generalist MIN-4 partial overlap)*

`goodplanJson` casts its parsed JSON to the caller-supplied generic `T` with no runtime shape check. Callers like `phase2Slices` and `runPhase2` assume `{ items: Array<...> }` but any CLI shape change or error response would silently produce `undefined` rather than a clear error. Combined with `noUncheckedIndexedAccess: true`, downstream property access becomes unsound.

**Fix:** Add a Zod guard or at minimum a field-presence check before the cast. At minimum, guard `slices.items` before use: `const items = slices.items ?? [];`

**Locations:** `goodplanJson` line 137; `phase2Slices` lines 827–830; `runPhase2` lines 1094–1098.

---

### IMP-B: `phase2Activate` has no pre-condition state check
*(Generalist IMP-2)*

`phase2Activate` calls `epic:add-verification` and `epic:activate` unconditionally without verifying the epic is in `slices-refined` status. Called out-of-sequence it will fail and silently log "FAIL" and continue. All other phase functions guard with a status check before transitioning.

**Fix:** Read `epicStatus()` at the start of `phase2Activate` and return early (or throw) if the epic is not in the expected state.

---

### IMP-C: `slice:plan` called unconditionally — blocks recovery on partial runs
*(TypeScript M-3 — promoted to Important due to recovery impact)*

In `phase2SliceCycle`, `slice:plan` is always invoked without checking whether the slice is already past `created` state. If a slice is already in `planning` or later (from a partial run), the CLI returns exit 3 (invalid transition) and the harness throws, preventing any recovery. All other transition calls in this file first read current status and skip if already past the expected state.

**Fix:** Call `sliceStatus(sliceName)` before `slice:plan` and skip the transition if the slice is not in `created` state.

**Location:** `phase2SliceCycle` lines 876–880.

---

### IMP-D: Submit transitions happen after skill invocations — mismatch with "CLI calls BEFORE skill" criterion
*(Generalist IMP-1)*

`submit-plan`, `submit-refinement`, and `submit-implementation` are embedded in skill prompts as instructions to the skill, not called upfront by the harness. The criterion "CLI transition calls BEFORE skill invocations" is met for open-phase transitions but not for submit transitions. The design is intentional for the happy path (skill performs the submit), and fallback blocks handle the failure case, but the conceptual mismatch is worth confirming against the spec.

**Action:** Confirm with spec owner whether submit transitions are intentionally delegated to the skill or should be called by the harness as a pre-step. No code change needed if intentional.

---

## Minor Issues (6)

### MIN-1: `slices.items` — `noUncheckedIndexedAccess` gap
*(TypeScript I-2 / overlaps IMP-A — residual minor after fix)*

After fixing IMP-A, ensure `slices.items` is guarded before `.map()` and `for...of` iterations. A missing `items` property from an unexpected CLI response would throw with a confusing error rather than a useful message.

**Locations:** `phase2Slices` line 830; `runPhase2` lines 1097–1098.

---

### MIN-2: `phase2Explore` fallback does not verify transition success
*(Generalist MIN-2)*

After calling the `submit-explore` fallback, `phase2Explore` only checks for the research directory — it does not re-read status to confirm the transition succeeded. `phase2Architecture` logs `finalStatus` but does not assert. `phase2RefineArchitecture` and `phase2SliceCycle` both read and log `finalStatus`. The pattern is inconsistent.

**Fix:** After each fallback submit, read and log `epicStatus()` or `sliceStatus()` to confirm success. Optionally assert expected state.

---

### MIN-3: `submit-implementation` in skill prompt lacks `--override`
*(Generalist MIN-3)*

`submit-refinement`, `submit-refine-architecture`, and `submit-refine-slices` all correctly include `--override` in skill prompts and fallback blocks. `submit-implementation` (line 973) does not. If the CLI enforces a score gate on implementation submit, skill-driven invocations will fail without override.

**Action:** Confirm whether `--override` is required for `submit-implementation`. Add if so.

---

### MIN-4: `message as Record<string, unknown>` unnecessary full-object cast
*(TypeScript M-1)*

In the `system:init` handler, `message` is cast to `Record<string, unknown>` to access `skills`, discarding its discriminated union type. The `"skills" in initMsg` guard on line 382 partially compensates, but the cast is broader than needed.

**Fix:** Use a targeted narrowing (`"skills" in message && Array.isArray((message as { skills?: unknown }).skills)`) or define the init message type from the SDK.

**Location:** Line 381.

---

### MIN-5: `goodplanJson` throws raw `Error` — error messages lack actionable context
*(Generalist MIN-4)*

`goodplanJson` throws unstructured errors on non-zero exit codes. Callers propagate these throws to `main()`'s catch, which exits with code 1. For a harness this is acceptable, but distinguishing "epic not found" from "state machine violation" would help triage failed runs.

**Fix (optional):** Catch in `epicStatus()`/`sliceStatus()` and return a structured error or a sentinel value with a descriptive message. Low priority.

---

### MIN-6: `runSkill` errors silently absorbed — catastrophic failures look like "skill didn't transition"
*(TypeScript M-4)*

`runSkill` catches all exceptions internally and always returns `{ result, costUsd }`. A hard SDK failure (network error, budget exceeded) is indistinguishable from a skill that ran but didn't call the CLI. This is an intentional resilience trade-off but can confuse post-run analysis.

**Fix (optional):** Log the `result` string from `runSkill` at a visible level so the post-mortem can distinguish these cases.

**Location:** `phase2EpicComplete` lines 1037–1067; `runSkill` lines 411–415.

---

## Resolved / Non-Issues

- `slice:list` in both `phase2Slices` and `runPhase2` correctly uses `--epic core-provider --json` — no issue.
- `q.options[0]` (TypeScript I-3) — optional chaining handles the `undefined` case; acceptable as-is pending confirmation of `AskUserQuestionInput` array typing.
- `phase2SliceCycle` step count: steps 3, 6, 9 are conditional fallbacks, not unconditional steps. Comments make this clear. No change needed.
- Template literals, `--json` flags, `--epic` filters, `--override` on refinement submits, exit code branching: all PASS.
- No `as any`, no `@ts-ignore`, no empty catch blocks: PASS.

---

## Priority Order

1. **IMP-A** — fix `goodplanJson` cast + guard `slices.items` (type safety + runtime safety)
2. **IMP-C** — guard `slice:plan` behind status check (recovery correctness)
3. **IMP-B** — add pre-condition check to `phase2Activate` (parity with other phase functions)
4. **IMP-D** — confirm submit delegation intent with spec owner (no code change if intentional)
5. **MIN-2** — add `finalStatus` checks after fallback submits (observability consistency)
6. **MIN-3** — confirm `--override` on `submit-implementation` (correctness gating)
7. **MIN-4** — tighten `system:init` cast (type soundness)
8. **MIN-5**, **MIN-6** — optional harness ergonomics improvements
