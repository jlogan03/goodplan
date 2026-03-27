# Merged Feedback — Slice 05: Tests and Migration (Round 3)

### CRITICAL Issues

None.

### IMPORTANT Issues

**IMP-1: `warning` field in `MigrationResult` requires `migrationResultSchema` update**
Phase 2 adds a `warning` field to the structured JSON response for re-migration, but `migrationResultSchema` in `src/commands/global/migrate/schemas.ts` is a `z.discriminatedUnion` with two variants (`questions` and `complete`), neither of which has a `warning` field. Without a schema update: (a) `exactOptionalPropertyTypes: true` will reject the extra property at compile time, and (b) Zod strips unknown keys by default, so the field silently disappears from output. The plan must add a task to update `migrationResultSchema` — either add `warning: z.string().optional()` to both variants, or add it only to the `questions` variant (since the warning is emitted on the first Q&A response).
*(Flagged by: Software Architecture, TypeScript and JavaScript — merged; both identified the same root cause with consistent recommendations)*

Resolution: DIRECTLY_ACTIONABLE

**IMP-2: `epicJsonContent` should use `z.infer`/`Epic` type, not `z.input`**
The plan specifies `z.input<typeof epicSchema>` for typing `epicJsonContent`. While `z.input` and `z.infer` produce the same type here (no transforms/defaults), the codebase consistently uses `z.infer` (10+ usages, zero `z.input` usages). The existing `Epic` type is already exported from `src/schemas/entities/epic.ts`. Use `z.infer<typeof epicSchema>` or the `Epic` type alias for consistency. Also verify the `epicSchema` import is added to `migrate.ts`. Additionally, note the task ordering dependency: remove `sliceSequence` first, then apply the type annotation, and verify the resulting object satisfies the type exactly.
*(Flagged by: Software Architecture, TypeScript and JavaScript — merged; Architecture flagged ordering dependency, TS flagged `z.input` vs `z.infer` inconsistency)*

Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

**MIN-1: Phase 3 `state-machine-api.md` task should clarify Directory-Based Guards section**
The plan mentions "update Directory-Based Guards section" without specifying what stale references exist there. Minor because the implementer has enough latitude via the "verify before changing" note.
*(Flagged by: Holistic)*

Resolution: DIRECTLY_ACTIONABLE

**MIN-2: Phase 1 "before" check failure count discrepancy (5 files / 8 cases vs research's 4 files / 8 failures)**
The before check says "5 failing test files with 8 total failing test cases" but research identified 4 files. The 5th file (`result-paths.test.ts`) was omitted from research but does have failures. Actual total may be 9 failures. Minor because the implementer will run `bun test` and see actuals.
*(Flagged by: Holistic)*

Resolution: DIRECTLY_ACTIONABLE

**MIN-3: Phase 2.5 installs skills unconditionally but no skill files changed**
`bun run install:skills` is included but no skill files are in scope. Harmless but unnecessary — could be made conditional or noted as a no-op verification.
*(Flagged by: Software Architecture)*

Resolution: DIRECTLY_ACTIONABLE

**MIN-4: `startContext.test.ts` fixture cleanup is cosmetic, not a bug fix**
The plan correctly includes removing `sliceSequence` from the fixture, but should note this won't cause test failures if omitted — it's a consistency fix.
*(Flagged by: Software Architecture)*

Resolution: DIRECTLY_ACTIONABLE

**MIN-5: Phase 3 `_overview.md` maturity table update is vague**
Should say "verify maturity levels remain appropriate; no changes expected" rather than the open-ended "update if warranted."
*(Flagged by: Software Architecture)*

Resolution: DIRECTLY_ACTIONABLE

**MIN-6: Phase 2 timestamp generation for backup naming lacks implementation detail**
`YYYYMMDD-HHmmss` format specified but no implementation approach given. Minor since implementer will figure it out, but noting `getMonth()` is 0-indexed would prevent a formatting bug.
*(Flagged by: TypeScript and JavaScript)*

Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE

All 8 issues (2 IMPORTANT + 6 MINOR) are directly actionable.

### RESEARCH_NEEDED

None.

### Contradictions Resolved

**`z.input` vs `z.infer` for `epicJsonContent`**: Software Architecture recommended keeping `z.input` but adding ordering notes. TypeScript and JavaScript recommended switching to `z.infer`/`Epic` type for codebase consistency. **Resolution**: Trust the TypeScript domain specialist — use `z.infer<typeof epicSchema>` or the existing `Epic` type alias, since the codebase has zero `z.input` usages and 10+ `z.infer` usages. The ordering dependency noted by Architecture is still valid and preserved in IMP-2.

### Unresolved (USER_INPUT required)

None.
