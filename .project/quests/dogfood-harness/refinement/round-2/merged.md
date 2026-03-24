# Merged Review Feedback — Dogfood Harness Plan (Round 2)

## Scores

| Reviewer | Score |
|---|---|
| Holistic | 7/10 |
| Software Architecture | 8/10 |
| TypeScript | 8/10 |
| CLI | 8/10 |

---

### CRITICAL Issues

None.

---

### IMPORTANT Issues

**IMP-1: `phase2SliceCycle` missing intermediate CLI submit commands and recovery fallbacks**
Flagged by: Holistic, TypeScript, CLI (most specific: CLI)

Step 2's `phase2SliceCycle(name)` lists running `/create-plan` -> `/refine-plan` -> `/implement-plan` -> `/complete` skills but does not enumerate the `submit-*` CLI commands needed between each skill invocation:
- After `/create-plan`: `submit-plan --slice <name> --json` (planning -> plan-created)
- After `/refine-plan`: `submit-refinement --slice <name> --override --json` with `{"scores":{...}}` stdin (refining -> plan-refined)
- After `/implement-plan`: `submit-implementation --slice <name> --json` (implementing -> implementation-complete)
- After `/complete`: `slice:complete --slice <name> --json` with `{"verificationPassed": true, "deferred": [...], "learnings": [...], "architectureDelta": [...]}` stdin

The harness should follow the same fallback pattern as `phase2Explore`: check if state transitioned after each skill, and if not, attempt the explicit submit command as recovery. `submit-refinement` requires `--override` because Haiku-generated scores may not meet the threshold. `submit-plan` and `submit-implementation` require empty stdin.

**IMP-2: `phase2Architecture()` missing `epic:define-architecture` CLI call**
Flagged by: Holistic, Software Architecture

The existing `phase2Architecture()` code calls `runSkill("create-architecture", ...)` directly without first running `goodplan epic:define-architecture --epic core-provider --json` to transition the epic from `explored` to `defining-architecture`. The plan's Step 2 task text describes the correct sequence but does not explicitly say "add the missing `epic:define-architecture` call to the existing function." Make the task explicit.

**IMP-3: `patchSkillModels()` coverage gap and robustness concerns**
Flagged by: Holistic (coverage), Software Architecture (robustness), TypeScript (fragility)

Three related sub-issues:
1. **Coverage**: Only 2 files patched (`iteration-loop.md`, `implement-plan/SKILL.md`) but research identifies 6+ files with model references. The unpatched files include `create-plan` and `create-architecture` which are exercised in every phase. Either patch all files or explicitly document the accepted cost risk.
2. **Concurrent session risk**: Patching shared skill files could affect other Claude sessions. The `finally` block mitigates crash recovery, but a startup check should detect previously-patched files (e.g., if `"haiku"` appears where `"opus"` should be).
3. **Silent failure**: No existence check on files before patching, and no verification that replacements actually changed something. If file paths move or string patterns change, the replacement silently does nothing.

**IMP-4: `canUseTool` return type uses wrong shape**
Flagged by: TypeScript

Step 1's `canUseTool` callback returns `{ allowed: true, answer: ... }` but the SDK's `PermissionResult` type is `{ behavior: 'allow', updatedInput?: Record<string, unknown> }` or `{ behavior: 'deny', message: string }`. Fix to use `{ behavior: 'allow', updatedInput: { questions: ..., answers: ... } }`.

**IMP-5: Phase 4 manual filesystem copy — clarify INV-001 compliance**
Flagged by: Software Architecture

Phase 4's manual copy of `architecture-proposal/` to `architecture/` reads like a state machine bypass (INV-001 tension). Clarify that the copy is NOT a state mutation — it is a free-form markdown operation (LLM-owned content). `submit-architecture` is the actual state transition that goes through the state machine. One sentence of clarification prevents confusion during implementation.

**IMP-6: `phase2EpicComplete` and slice `/complete` stdin payloads under-specified**
Flagged by: Software Architecture, CLI, Holistic

Two completion steps lack concrete payload specifications:
- Epic `/complete` needs `{"verificationResults": [{"index": 0, "passed": true, "notes": "..."}]}` — the plan says `[...]` without the shape.
- Slice `/complete` needs `{"verificationPassed": true, "deferred": [...], "learnings": [...], "architectureDelta": [...]}` — the plan relies on the skill to construct this but has no fallback.

The plan should specify exact payload shapes and add post-skill verification that checks the entity reached `completed` status, with manual CLI fallback if the skill didn't submit.

---

### MINOR Issues

**MIN-1: Step 1 before-checks should include runnable verification commands**
Flagged by: Holistic. Add `grep -c canUseTool tools/dogfood/harness.ts` returns 0, etc.

**MIN-2: `submit-refinement --override` rationale undocumented**
Flagged by: Holistic, CLI. Explain that `--override` is required because Haiku-quality scores won't meet the threshold — this is deliberate, not a shortcut.

**MIN-3: No explicit task to wire `reset` and `all` into entry point switch statement**
Flagged by: Holistic. Steps 1 and 4 add these commands but neither includes a task to update the CLI argument parser at lines 383-446.

**MIN-4: "[harness]" vs "[skill]" prefixes for CLI command attribution**
Flagged by: Holistic. Task descriptions intermix "harness calls CLI" and "skill calls CLI" without always being clear which agent performs the action.

**MIN-5: `AskUserQuestionInput` cast should be explicitly acknowledged as accepted exception**
Flagged by: TypeScript. The `as AskUserQuestionInput` cast is guarded by `toolName === "AskUserQuestion"` — note this as an accepted `as` usage so implementers don't treat it as an oversight.

**MIN-6: `goodplanJson` could accept Zod schema parameter for runtime validation**
Flagged by: TypeScript. Instead of returning `as T`, accept `goodplanJson(args, schema)` returning `z.infer<typeof schema>`. Not blocking since harness is a tool, but improves robustness.

**MIN-7: `reset` command should verify `.project/` removal succeeded before proceeding**
Flagged by: CLI. Handle case where `rm -rf .project/` fails (permissions, locks) and where nondet-eval directory doesn't exist.

**MIN-8: Phase 4 friction log entry should specify content**
Flagged by: CLI. Provide the exact `logFriction()` call with severity, source, and description so implementer doesn't have to invent it.

**MIN-9: No automated tests for harness helper functions**
Flagged by: Software Architecture. Note that `goodplan()`, `goodplanJson()`, `logFriction()`, `runSkill()` are candidates for unit testing in a follow-up. Add `bun tsc --noEmit tools/dogfood/harness.ts` as a smoke check.

---

### DIRECTLY_ACTIONABLE

All issues are directly actionable:
- IMP-1 through IMP-6 (6 items)
- MIN-1 through MIN-9 (9 items)

Total: 15 directly actionable items.

---

### RESEARCH_NEEDED

None.

---

### Contradictions Resolved

**C-1: Holistic vs Software Architecture on `phase2Architecture` severity**
Holistic rated the missing `epic:define-architecture` call as IMPORTANT; Software Architecture rated it as MINOR (noting the task description text is correct, just the existing code is wrong). Resolution: rated as IMPORTANT (IMP-2) because the task text is ambiguous — an implementer modifying the existing function could miss it, per Holistic's more specific reasoning about implementer interpretation.

---

### Unresolved (USER_INPUT required)

None.
