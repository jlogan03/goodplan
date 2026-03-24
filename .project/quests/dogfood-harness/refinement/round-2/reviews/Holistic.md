# Holistic Review — Dogfood Harness Plan (Round 2)

## Issues

**[IMPORTANT]** Step 2 `phase2Architecture()` missing `epic:define-architecture` CLI transition
Step 2 task says: "Run `goodplan epic:define-architecture --epic core-provider --json`, then `/create-architecture`." This is correct. However, the existing `phase2Architecture()` code in `harness.ts` (line 221-239) calls `runSkill("create-architecture", ...)` directly without first running `epic:define-architecture`. The plan's Step 2 task text describes the fix, but there is no explicit task saying "add the missing `epic:define-architecture` call to the existing `phase2Architecture()` function." An implementer working on Step 2 might read "Implement `phase2Architecture()`" as writing a new function from scratch (which would include it) or as modifying the existing one (where the omission could be missed). Make the task explicit: "Add `goodplan epic:define-architecture --epic core-provider --json` call before `runSkill()` in `phase2Architecture()`."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Step 2 `phase2SliceCycle()` missing intermediate CLI transitions
The existing `phase2SliceCycle()` (line 302-339) runs `slice:plan` then immediately runs `/create-plan`, `/refine-plan`, `/implement-plan`, `/complete` skills back-to-back. But per the transition tables, several intermediate CLI transitions are needed:
- After `/create-plan`: `submit-plan --slice <name> --json` (planning -> plan-created)
- After plan-created: `slice:refine-plan --slice <name> --json` or `submit-refinement --slice <name> --override --json` (plan-created -> refining or plan-refined)
- After `/refine-plan`: `submit-refinement --slice <name> --override --json` (refining -> plan-refined)
- After plan-refined: `slice:implement --slice <name> --json` (plan-refined -> implementing)
- After `/implement-plan`: `submit-implementation --slice <name> --json` (implementing -> implementation-complete)
- After implementation-complete: `slice:complete --slice <name> --json` with stdin payload (implementation-complete -> completed)

The Step 2 task for `phase2SliceCycle(name)` mentions the `/complete` stdin payload and "check state transitions at each step," but does not enumerate all these intermediate CLI commands. The skills themselves may call some of these transitions, but the plan should not rely on that assumption — the state recovery task says "if not, attempt manual CLI transition" but doesn't list which transitions to expect. Enumerate the expected CLI commands between each skill invocation.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Step 1 `patchSkillModels()` covers only 2 files but research identifies 6+ files with model references
The plan says patching `iteration-loop.md` + `implement-plan/SKILL.md` covers "~80% of sub-agent spawns." The research file `skill-model-config.md` identifies model references in at least 6 files: `iteration-loop.md`, `implement-plan/SKILL.md`, `audit-architecture/SKILL.md`, `create-plan/SKILL.md`, `refine-plan/SKILL.md`, and `create-architecture/SKILL.md`+references. The 80% coverage claim is plausible but unverified. More importantly, the remaining 20% includes `create-plan` and `create-architecture` which are exercised in every phase. If cost control matters, the plan should either patch all files or explicitly document the accepted cost risk from unpatched skills.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 1 before-checks could be more specific about what to verify
The before-checks now test for absent behaviors (e.g., "No `canUseTool` callback in `harness.ts`", "No `reset` subcommand exists"), which is a significant improvement over round 1. However, "Source code has no `canUseTool` callback in `harness.ts`" is verified by reading source, not by running a command. For consistency with the verification-first pattern, consider adding a runnable check — e.g., `grep -c canUseTool tools/dogfood/harness.ts` returns 0.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 2 `phase2EpicComplete()` stdin payload differs from Step 2 task description
Step 2's `phase2EpicComplete()` task says: "Run `/complete` for the epic with stdin: `{"verificationResults": [...]}`." But the existing code (line 341-353) just runs the `/complete` skill with a prompt — no stdin payload to any CLI command. The `/complete` skill handles the CLI transition internally, but the plan should be explicit about whether the harness calls `epic:complete` directly (which needs `verificationResults` stdin) or relies on the skill to do it (with the risk that the skill might not).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 3 quest lifecycle commands have correct structure but `submit-refinement` needs `--override` explanation
Step 3 task item 6 uses `--override` flag on `submit-refinement` but doesn't explain why. The override bypasses the score threshold check. For a test harness running with Haiku (where review scores will likely be low), override is pragmatically necessary. Document the rationale so implementers understand this isn't a shortcut but a deliberate choice for Haiku-quality output.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No explicit task to update the entry point's `switch` statement for `reset` and `all` commands
Step 1 adds a `reset` command and Step 4 adds an `all` command, but neither step includes a task to wire these into the CLI argument parser at the bottom of `harness.ts` (lines 383-446). The existing switch only handles phases "2", "3", "4". An implementer might forget to add the routing. Add explicit tasks to update the entry point switch statement.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Terminology "Step 1-4" vs "Phase 2/3/4" could still cause confusion
The overview explains the terminology split (plan Steps vs goodplan Phases), which is helpful. But within Step 2's tasks, it says "run `goodplan epic:explore --epic core-provider --json`" — is this the harness calling the CLI, or the skill calling the CLI? The plan intermixes "harness calls CLI" and "skill calls CLI" without always being clear which agent performs the action. Consider prefixing with "[harness]" or "[skill]" for CLI commands in task descriptions.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Significant improvement from round 1. The plan now has proper before-checks testing absent behaviors, explicit CLI commands with `--json` flags, `canUseTool` with typed `AskUserQuestionInput`, exit code branching, model patching strategy, and `goodplanJson()` error handling. The remaining issues are mostly about completeness: the slice cycle intermediate transitions are under-specified (could cause state machine errors at runtime), the model patching coverage gap is acknowledged but not quantified, and a few tasks lack explicit wiring instructions. To reach 9+: enumerate all intermediate CLI transitions in `phase2SliceCycle`, make `patchSkillModels()` coverage decision explicit (patch all or document accepted risk), and add explicit entry-point wiring tasks for `reset` and `all` commands.

## Summary
- Critical: 0
- Important: 3
- Minor: 5
