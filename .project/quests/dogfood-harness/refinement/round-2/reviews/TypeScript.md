# TypeScript and JavaScript Review — Dogfood Harness Plan (Round 2)

## Issues

**[IMPORTANT]** `canUseTool` return type in plan uses wrong shape: `{ allowed: true, answer: ... }`

Step 1's "Rewrite `runSkill()`" task says to return `{ allowed: true, answer: ... }`. The SDK's `PermissionResult` type is `{ behavior: 'allow', updatedInput?: Record<string, unknown> }` or `{ behavior: 'deny', message: string }`. The correct return shape for auto-answering `AskUserQuestion` is `{ behavior: 'allow', updatedInput: { questions: ..., answers: ... } }` as documented in the research file (`agent-sdk-harness.md` section 2). The plan should use the SDK's actual type shape — `behavior: 'allow'` with `updatedInput`, not `allowed: true` with `answer`.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `AskUserQuestionInput` import cast is `as` assertion, not true narrowing

Step 1's "Rewrite `runSkill()`" task says to "import `AskUserQuestionInput` type from SDK's `sdk-tools.d.ts` for type-safe narrowing of the `Record<string, unknown>` input (no `as any`)". The plan correctly avoids `as any`, but the approach is still a type assertion (`input as AskUserQuestionInput`). Since `canUseTool`'s `input` parameter is `Record<string, unknown>`, and `AskUserQuestionInput` has a `questions` tuple type, `as` is the only practical option here (there is no runtime discriminator to narrow on). The plan should explicitly acknowledge this is a safe `as` cast guarded by the `toolName === "AskUserQuestion"` check, so the implementer knows this is an accepted exception to the "avoid `as`" rule — not an oversight.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `goodplanJson` fix should use Zod or explicit shape check, not just try/catch

Step 1's "Harden `goodplanJson()`" task says to check `result.ok` before parsing and wrap `JSON.parse` in try/catch. This addresses the crash, but the function still returns `as T` with no runtime validation. Since the project uses Zod and the CLAUDE.md mandates schema validation at module boundaries, consider having `goodplanJson` accept a Zod schema parameter: `goodplanJson(args, schema)` returning `z.infer<typeof schema>`. This would catch CLI output shape changes at runtime rather than silently producing wrong data. Not blocking since the harness is a tool (not library code), but worth noting for robustness.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `patchSkillModels()` string replacement is fragile — no type safety for file paths

Step 1's `patchSkillModels()` / `restoreSkillModels()` task reads and modifies skill files with string replacement of `"opus"` and `"sonnet"` with `"haiku"`. The file paths are hardcoded strings with no existence check. If the skill files move or the string patterns change, the replacement silently does nothing. The plan should specify: (a) verify files exist before patching (throw if missing), (b) verify the replacement actually changed something (warn if no substitutions made — indicates the skill files changed format), (c) use `finally` for restore (already specified, good).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 2 `phase2SliceCycle` missing `submit-plan` / `submit-refinement` / `submit-implementation` CLI transitions

Step 2's `phase2SliceCycle(name)` task lists running `/create-plan`, `/refine-plan`, `/implement-plan`, `/complete` skills but doesn't mention the `submit-*` CLI commands needed between each skill and the next state transition (analogous to `submit-explore` in Step 1). The transition tables require explicit submit commands to advance state. The existing harness code (Step 1's `phase2SliceCycle`) also lacks these. If the skills handle submissions internally, this should be noted; if not, the plan needs `submit-plan`, `submit-refinement`, and `submit-implementation` calls with friction fallbacks like `phase2Explore` has.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1's critical issues (C4 result narrowing, C5 `as any`) are both addressed in the revised plan. The `canUseTool` task now correctly references `AskUserQuestionInput` from `sdk-tools.d.ts` instead of `as any`, and the logging task switches to `message.type === "result" && message.subtype === "success"`. The remaining issues are lower severity: the `canUseTool` return shape uses a non-existent `{ allowed: true }` instead of the SDK's `{ behavior: 'allow' }`, the `as AskUserQuestionInput` cast should be explicitly acknowledged as an accepted exception, and the slice cycle is missing submit transitions. To reach 9+: fix the `PermissionResult` return shape to match the SDK type, and clarify submit-command transitions in `phase2SliceCycle`.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
