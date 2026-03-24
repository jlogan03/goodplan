# Software Architecture Review — Round 3

## Issues

**[IMPORTANT]** Step 2 `phase2SliceCycle` still relies on `/complete` skill to handle both slice completion AND epic completion payloads without explicit fallback

Round 2 flagged that `phase2SliceCycle` invokes `/complete` with a generic prompt and doesn't add explicit fallback for completion. The updated plan (Step 2 tasks) now includes a detailed 10-step state machine path with explicit submit commands between each skill invocation — this is a significant improvement. Step 10 includes the correct `slice:complete` stdin payload (`{"verificationPassed":true,"deferred":[],"learnings":[],"architectureDelta":[]}`). However, the plan says "Follow the same fallback pattern as `phase2Explore`: after each skill, check if state transitioned. If not, attempt the explicit submit command as recovery and log friction." This is correct in principle, but the slice cycle has a subtlety: steps 3, 6, and 9 are explicit CLI calls (not skill-dependent), so if they fail, the recovery is not "run the skill again" — it's "fix the CLI invocation." The plan should clarify that recovery after an explicit CLI submit failure (exit code 2 or 3) follows the `goodplan()` helper's exit-code branching (already defined in Step 1), while recovery after a skill run checks whether the skill performed the expected state transition. This distinction exists implicitly in the plan but is not stated, which could lead to implementing a single recovery path that doesn't distinguish between skill failures and CLI failures.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 INV-001 clarification was addressed but the wording could be tighter

Round 2 flagged that the manual filesystem copy in Phase 4 reads like a state machine bypass. The updated plan now includes: "This is NOT a state machine bypass (INV-001) — it is a free-form markdown content operation (LLM-owned files). The actual state transition happens via `goodplan submit-architecture --epic llm-judge --json` which goes through the state machine." This directly addresses the concern. No further action needed.

Resolution: N/A (resolved)

---

**[MINOR]** `patchSkillModels()` startup check and verify-after-patch were both added — verify the startup check logic is sound

Round 2 flagged concurrent session risk and crash recovery for skill file patching. The updated plan adds: (a) a startup check that detects previously-patched files by looking for unexpected `"haiku"` references before patching, (b) restore-if-detected behavior, and (c) post-patch verification that replacements actually changed something. This adequately addresses the crash recovery concern. The concurrent session risk remains (no file lock), but given this is a single-developer test harness, this is acceptable. The one subtlety: the startup check looks for `"haiku"` references, but the `explore` skill's `explore-logic.md` already omits model references entirely — if a future skill legitimately uses `"haiku"`, the startup check would false-positive. The plan could note this edge case but it is not blocking.

Resolution: N/A (resolved, with minor caveat noted)

---

**[MINOR]** Step 2 `phase2Architecture()` task now correctly includes `epic:define-architecture` — matches transition table

Round 2 flagged that the existing harness code doesn't call `epic:define-architecture` before `/create-architecture`. The updated plan's Step 2 task for `phase2Architecture()` now explicitly says: "First run `goodplan epic:define-architecture --epic core-provider --json` to transition from `explored` to `defining-architecture` (this CLI call is required before the skill can run — add it explicitly to the existing function)." This correctly matches the transition table (`explored` -> `defining-architecture` via `BEGIN_ARCHITECTURE`). Resolved.

Resolution: N/A (resolved)

---

**[MINOR]** Step 1 verification section now includes unit test candidates and tsc smoke check — appropriate test boundary awareness

Round 2 flagged no automated tests for the harness. The updated plan's Step 1 verification section now includes: (a) "`bun tsc --noEmit tools/dogfood/harness.ts` as a smoke check" and (b) "`goodplan()`, `goodplanJson()`, `logFriction()`, `runSkill()` are candidates for unit testing in a follow-up — note this but do not block on it." This is the right level of test awareness for a harness. Resolved.

Resolution: N/A (resolved)

---

## Score: 9/10

All round 2 issues have been addressed. The critical and important issues from rounds 1 and 2 are resolved: quest lifecycle includes full refinement path, `canUseTool` vs `disallowedTools` conflict is resolved, INV-001 tension is explicitly clarified, `phase2Architecture()` includes the required `epic:define-architecture` call, skill file patching has crash recovery, and completion payloads are specified. The one remaining IMPORTANT issue is a clarity concern about distinguishing skill-failure recovery from CLI-failure recovery in the slice cycle — it's implicitly handled by the `goodplan()` helper's exit-code branching but should be stated explicitly to prevent implementation confusion. The architecture is sound: the harness correctly respects the 4-layer stack (all state mutations go through CLI commands), the data ownership model (LLM writes markdown, CLI owns state), and the invariants (no INV-001 violations). Module boundaries are appropriate — the harness is a single orchestration script in `tools/dogfood/` that depends on the CLI binary as its only interface to goodplan state.

## Summary
- Critical: 0
- Important: 1
- Minor: 4 (all resolved from previous rounds, noted for completeness)
