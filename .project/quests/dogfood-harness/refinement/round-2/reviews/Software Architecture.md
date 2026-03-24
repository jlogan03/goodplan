# Software Architecture Review — Round 2

## Issues

**[IMPORTANT]** Phase 4 architecture proposal still uses manual filesystem copy — INV-001 tension remains

Round 1 flagged (I14) that Phase 4's "manual filesystem copy of `architecture-proposal/` to `architecture/` and write `approved.md`" bypasses the state machine (INV-001). The updated plan now explicitly acknowledges this as a friction item and logs it, which is an improvement. However, the plan also states "No CLI command exists for proposal approval." The research file (`cli-quest-proposal.md`) confirms this is correct — the CLI has no `approve-architecture` command, and `/start-epic` is broken (corrupts CLI state). The plan's approach (manual copy + `submit-architecture` + friction log) is the pragmatically correct path given the CLI gap. But the plan should clarify that the manual copy is NOT a state mutation — it is a free-form markdown operation (copying LLM-owned architecture markdown from one directory to another), and `submit-architecture` is the actual state transition that goes through the state machine. As written, it reads like a state machine bypass when it is actually consistent with the data ownership model (LLM writes markdown, CLI owns state transitions). Adding one sentence of clarification would prevent confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Step 2 `phase2SliceCycle` invokes `/complete` skill generically but slice completion requires specific stdin payload

Step 2 defines `phase2SliceCycle(name)` which calls `/complete` with a generic prompt. The plan correctly notes that slice `/complete` requires stdin payload `{"verificationPassed": true, "deferred": [...], "learnings": [...], "architectureDelta": [...]}` via `slice:complete --slice <name> --json`. However, the existing harness code at line 330-336 invokes `/complete` as a skill with a vague prompt ("Complete the slice — synthesize learnings, update architecture.") and relies on the skill to construct and submit the correct payload. The plan's task list says "Slice `/complete` requires stdin payload" but doesn't add a task to ensure the prompt tells the skill exactly what payload shape to construct, or to add a post-skill verification step that checks the slice actually reached `completed` status and falls back to manually calling `slice:complete` with a constructed payload if the skill didn't. The existing `phase2EpicComplete` has the same issue — the `/complete` skill prompt for the epic needs `verificationResults` via `epic:complete --epic <name> --json`. Step 1 adds state recovery but Step 2 doesn't explicitly add recovery for completion steps.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `patchSkillModels()` mutates shared skill files without protecting against concurrent sessions or partial writes

Step 1 adds `patchSkillModels()` / `restoreSkillModels()` to replace `"opus"` and `"sonnet"` with `"haiku"` in `skills/_shared/references/iteration-loop.md` and `skills/implement-plan/SKILL.md`. These are shared files in the goodplan repo — if another Claude session or user is working with these skills concurrently, the patched files could produce unexpected behavior. Additionally, if the harness crashes between `patchSkillModels()` and the `finally` block executing `restoreSkillModels()`, the skill files remain corrupted. The plan should: (a) save original content to a temp file or variable (it already says "read original content"), (b) consider using a file lock or at minimum logging a prominent warning that skill files are patched, and (c) add a `reset` or startup check that detects and restores previously-patched skill files (e.g., check if `"haiku"` appears where `"opus"` should be at the start of each run).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Step 2 `phase2Architecture()` doesn't call `goodplan epic:define-architecture` before running `/create-architecture`

Looking at the transition tables, the epic must transition from `explored` to `defining-architecture` via `BEGIN_ARCHITECTURE` before the skill writes architecture files and `submit-architecture` is called. Step 2's task says "Run `goodplan epic:define-architecture --epic core-provider --json`, then `/create-architecture`" which is correct in the task description. But the existing harness code for `phase2Architecture()` (lines 221-239) does NOT call `epic:define-architecture` — it goes straight to `runSkill("create-architecture", ...)`. The plan should explicitly include updating the existing harness code to add the `epic:define-architecture` call before the skill invocation, since Step 1 does not touch `phase2Architecture()`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No explicit test boundary for the harness — verification is all manual

The harness is a test tool, but it has no automated tests of its own. The plan's verification sections are all manual execution checks ("run this command, check that output"). This is appropriate for an integration harness, but the plan could note that the harness's own helper functions (`goodplan()`, `goodplanJson()`, `logFriction()`, `runSkill()`) are candidates for unit testing in a follow-up. Step 1 already notes "`tools/` is not covered by `tsconfig.json`" — this is the right awareness level, but the plan could add a minor task to verify `bun tsc --noEmit tools/dogfood/harness.ts` works as a smoke check (separate from the main `bun tsc --noEmit`).

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

Round 1 issues have been substantially addressed. The critical quest lifecycle skip (C1) is fixed — Phase 3 now includes the full refinement path. The naming collision (I15) is resolved with "Step 1-4" terminology and an explicit mapping note. The `canUseTool` vs `disallowedTools` conflict (I1) is clearly resolved. `goodplanJson()` hardening (I2), exit code branching (C2), result type narrowing (C4), tool call counting (I3), cost tracking (M1), compilation logging (M2), log path relocation (I8), env var validation (I10), catch block typing (I11), and friction log file creation (I12) are all addressed with explicit tasks. The remaining issues are important but not blocking — the INV-001 clarification is editorial, the completion payload concern is recoverable at runtime, and the skill file patching risk is mitigated by the `finally` block. To reach 9+: add the INV-001 clarification sentence for Phase 4, add explicit completion fallback logic in Step 2, and add the startup check for previously-patched skill files.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
