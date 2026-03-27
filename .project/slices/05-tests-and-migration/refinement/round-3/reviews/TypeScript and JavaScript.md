## Issues

**[IMPORTANT]** Phase 2 `warning` field requires `migrationResultSchema` update but plan does not mention it
The plan says to include a `warning` field in the structured JSON response when `project.json` exists (re-migration scenario). However, `migrationResultSchema` in `src/commands/global/migrate/schemas.ts` is a `z.discriminatedUnion` with two variants (`questions` and `complete`), neither of which has a `warning` field. Adding `warning` to the RPC response without updating the schema means: (1) with `exactOptionalPropertyTypes: true`, the TypeScript compiler will reject the extra property on the typed result object, and (2) even if bypassed, `migrationResultSchema.parse()` will strip the field (Zod strips unknown keys by default). The plan must add a task to update `migrationResultSchema` — either add `warning: z.string().optional()` to both discriminated union variants, or add it only to the `questions` variant (since the warning is emitted on the first Q&A response, before completion). Without this, the `warning` field silently disappears from output, defeating the purpose.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `z.input<typeof epicSchema>` may not be the right type for `epicJsonContent` construction
The plan says to type `epicJsonContent` using `z.input<typeof epicSchema>`. In Zod v4, `z.input` represents the *input* type (before transforms/defaults/coercions), while `z.infer` represents the *output* type (after parsing). Since `epicSchema` has no transforms or defaults, `z.input` and `z.infer` produce the same type in this case, so it works. However, the codebase consistently uses `z.infer` everywhere (confirmed: 10+ usages of `z.infer` in `src/`, zero usages of `z.input`). Using `z.input` here introduces an inconsistency. The plan should use `z.infer<typeof epicSchema>` (i.e., the existing `Epic` type exported from `src/schemas/entities/epic.ts`) for consistency. The `Epic` type is already defined and exported — no need for `z.input`. Additionally, verify that the `epicSchema` import is added to `migrate.ts` (currently it imports from `./schemas.ts` but not from `../../schemas/entities/epic.js`).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 `renameProjectDir` timestamp generation lacks implementation detail for `exactOptionalPropertyTypes` compatibility
The plan specifies `YYYYMMDD-HHmmss` format but doesn't specify the implementation approach. JavaScript's `Date` methods (`getFullYear()`, `getMonth()`, etc.) return numbers that need zero-padding. The implementer should use a helper like `new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)` mapped to the `YYYYMMDD-HHmmss` format, or manual string interpolation with `.padStart(2, '0')`. This is minor since the implementer will figure it out, but a one-liner suggestion in the task would prevent an unnecessary formatting bug (e.g., `getMonth()` returns 0-indexed months).
Resolution: DIRECTLY_ACTIONABLE

No issues found with: Phase 1 test fixture updates, fitness test `PROJECT_SCOPE_COMMANDS` approach, `startContext.test.ts` cleanup, Phase 2 `sliceSequence` removal logic, Phase 2.5 build/install sequence.

## Score: 8/10

All round-2 issues were addressed well. The plan is functionally sound and correctly identifies the work. Two remaining type-safety concerns: (1) the `warning` field addition without schema update would silently fail at runtime — this is the most impactful gap, and (2) `z.input` vs `z.infer` is a consistency issue that could confuse future readers. To reach 9+: add the `migrationResultSchema` update task, and switch from `z.input` to `z.infer`/`Epic` type.

## Summary
- Critical: 0
- Important: 2
- Minor: 1
