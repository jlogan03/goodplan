# CLI Review — Round 3

## Issues

**[IMPORTANT]** `logFriction()` signature changed in plan but existing code differs

The existing harness (line 73) has signature `logFriction(phase: number, source: string, issue: string, severity: string)`. The plan's Step 2 tasks reference `logFriction("important", "phase4-architecture", "...")` (Step 4), using `(severity, source, message)` order — a different signature. This is internally inconsistent within the plan: Step 1 calls it as `logFriction(2, "Skill: /explore", "...", "MINOR")` (old sig) and Step 4 calls it as `logFriction("important", "phase4-architecture", "...")` (new sig). If the harness refactoring doesn't unify this signature, callers will silently use the wrong argument order.

Resolution: DIRECTLY_ACTIONABLE

The plan should standardize `logFriction(severity, source, message)` throughout all steps, and the Step 1 "Fix `logFriction()`" task should explicitly rename/reorder the parameters to match. Audit all call sites — Step 1 existing code calls it with `(2, "Skill: /explore", "...", "MINOR")` and must be updated.

---

**[IMPORTANT]** `phase2Architecture()` is missing the required `epic:define-architecture` CLI call

The plan's Step 2 task for `phase2Architecture()` says: "First run `goodplan epic:define-architecture --epic core-provider --json` to transition from `explored` to `defining-architecture` (this CLI call is required before the skill can run — add it explicitly to the existing function)."

The existing harness code (lines 221–239) does NOT include this call — it immediately calls `runSkill("create-architecture", ...)` without first transitioning the state machine. This means if the epic is in `explored` state, the `/create-architecture` skill will find the CLI in the wrong state, fail its submit-architecture call, and state will be corrupted.

The Step 2 task description correctly identifies this gap, but the Expected Behavior verification items do not include a check that the epic reaches `defining-architecture` before the skill runs. The task should add a pre-skill state check: assert epic is `defining-architecture` before calling `runSkill`.

Resolution: DIRECTLY_ACTIONABLE

Add to the Step 2 task: "After calling `epic:define-architecture`, assert exit code 0 and verify epic status is `defining-architecture` before proceeding to `runSkill`."

---

**[IMPORTANT]** `slice:list --json` in `phase2SliceCycle` orchestrator uses `--json` but is missing `--epic` filter

In `runPhase2()` (line 369–372 of harness), `slice:list --json` returns all slices — no `--epic` filter. This is fine for Step 2 since there's only one epic, but the plan adds Phase 4 which creates a second epic. If Phase 4 slices are listed without filtering by epic, the Phase 2 slice cycle loop would also pick them up. The plan currently says Step 4 runs per-slice cycles "same pattern as Step 2" — meaning `runPhase2()`'s loop will include Phase 4 slices if they already exist from a previous partial run.

The plan should update the `slice:list` calls in both `runPhase2()` and Phase 4's equivalent to pass `--epic core-provider` and `--epic llm-judge` respectively.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goodplan()` catch block uses `as` cast — plan says to fix but doesn't specify the correct type

The Step 1 task says "Replace `as { stdout?: string; stderr?: string; status?: number }` catch block with proper type guard (use Bun/Node typed `child_process` error types)." The actual error type from `execFileSync` in Node/Bun is `SpawnSyncReturns<Buffer>` thrown as an `Error` subclass via `child_process.ExecFileSyncError`. The plan should specify using `instanceof Error` check plus `'status' in err` guard, or reference the exact Bun/Node type to use. Without this, an implementer may pick the wrong type or keep a cast.

Resolution: DIRECTLY_ACTIONABLE

Specify the fix: check `err instanceof Error && 'status' in err` and `'stdout' in err`, then extract `(err as NodeJS.ErrnoException & { stdout?: Buffer; stderr?: Buffer; status?: number })`. Or simply note: use `SpawnSyncError` shape from `@types/node`.

---

**[MINOR]** `phase2SliceCycle` in the existing harness does NOT include explicit submit commands between skill invocations — plan adds them in Step 2 but the existing code is the baseline

The Step 2 plan task lists a 10-step sequence with explicit CLI submit commands between each skill. The existing harness `phase2SliceCycle()` (lines 302–338) calls skills directly in sequence with NO explicit submit calls — the plan implies the skills themselves call submit, which is inconsistent with the rest of the plan's explicit-submit philosophy.

This means Step 2's task "Implement `phase2SliceCycle(name)`" is actually a full rewrite of the existing function, not a small additive change. The plan's Before/After Expected Behavior items don't reflect this — the "Before" doesn't note that the existing implementation already has a `phase2SliceCycle` that's incomplete.

Resolution: DIRECTLY_ACTIONABLE

The Step 2 Expected Behavior "Before" section should add: `phase2SliceCycle` exists but does NOT include explicit submit commands (only skill invocations). The "After" should confirm the 10-step sequence is fully wired.

---

**[MINOR]** `phase2EpicComplete()` calls `runSkill("complete", ...)` but Step 2's task says to use `epic:complete` with a `verificationResults` stdin payload — mismatch between existing code and plan

The existing `phase2EpicComplete()` (lines 341–353) calls `runSkill("complete", ...)` and asks the skill to "complete the epic." The Step 2 task says: "Run `/complete` for the epic with stdin payload: `{"verificationResults": [{"index": 0, "passed": true, "notes": "Harness automated verification"}]}`" — implying the `/complete` skill should receive the payload via its prompt, not as a CLI stdin call.

However, the actual CLI for epic completion is `goodplan epic:complete --epic core-provider --json` with a `verificationResults` stdin payload — this is what the fallback should use. The plan's Step 2 task says "If not completed, attempt manual CLI fallback: `echo '<payload>' | goodplan epic:complete --epic core-provider --json`" — this is correct. But the skill-invocation path needs the prompt to pass `verificationResults` to the skill; if the skill doesn't see this payload it won't know verification passed.

This is a minor coherence issue: the prompt passed to `runSkill("complete", ...)` should include the `verificationResults` payload text explicitly so the skill can embed it when it calls the CLI. The plan's task description mentions the payload but doesn't specify it should be injected into the skill prompt.

Resolution: DIRECTLY_ACTIONABLE

Add to the `phase2EpicComplete` task: "Pass the verificationResults payload in the skill prompt: e.g., `Complete the epic. Verification results: [{"index": 0, "passed": true, "notes": "Harness automated verification"}]. Call epic:complete with this payload.`"

---

**[MINOR]** `submit-refinement` stdin format — plan uses `{"scores":{...}}` but the actual schema merges from stdin base

The plan correctly uses `echo '{"scores":{"completeness":8,...}}' | goodplan submit-refinement --slice <name> --override --json`. This is correct — `validateInput` merges stdin as base and flags override, so `scores` comes from stdin. Confirmed correct from `submitRefinementInputSchema`. No issue here, just verifying Round 2 fixes held.

(No issue — noting for completeness.)

---

**[MINOR]** `reset` command deletes `.project/` then calls `goodplan init`, but `goodplan init` in a directory with no `.project/` is the correct path — plan should confirm `init` takes `--name` as a flag

The plan says `goodplan init --name nondet-eval --json`. Let me cross-check this is the actual flag. The `src/commands/global/init.ts` exists but wasn't read — this is a minor risk. If `--name` is not a real flag for `init`, the reset command will fail silently.

Resolution: CODEBASE_EXPLORATION

Explore: Read `/Users/iwhite/Repos/goodplan/src/commands/global/init.ts` to confirm `--name` is a valid flag for `goodplan init`. The plan relies on this flag in the `reset` command — if the flag doesn't exist or has a different name, the reset step will fail.

---

## Score: 8.5/10

Round 2 successfully addressed all critical CLI issues: submit commands are now explicit with correct stdin payloads, `--quest` flags are present throughout Phase 3, `--json` is consistently applied, `canUseTool` replaces `disallowedTools`, exit code branching is specified. The plan is substantively correct.

Remaining issues are mostly coherence gaps between the existing harness code and what the plan intends: the `logFriction` signature inconsistency across steps, the missing `epic:define-architecture` state assertion, and the `slice:list` epic filter gap are the most actionable. None are blockers, but they will cause friction during implementation if not addressed. The `--name` flag for `goodplan init` is an unverified assumption worth confirming before Step 1.

To reach 9+: resolve the `logFriction` signature inconsistency (one unified call signature throughout), add the pre-skill state assertion in `phase2Architecture`, and add `--epic` filter to `slice:list` calls.

## Summary
- Critical: 0
- Important: 3
- Minor: 5
