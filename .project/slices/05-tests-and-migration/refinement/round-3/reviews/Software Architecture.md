# Software Architecture Review — Slice 05: Tests and Migration (Round 3)

## Issues

**[IMPORTANT]** `warning` field in `MigrationResult` requires schema change not addressed in the plan

Phase 2 adds a `warning` field to the structured JSON response for re-migration scenarios ("Project is already initialized. Re-migration will rebuild state from directory contents."). However, the `MigrationResult` type is a discriminated union defined in `src/commands/global/migrate/schemas.ts` (lines 192-216) with exactly two variants: `{ status: "questions", round: ... }` and `{ status: "complete", summary: ... }`. Neither variant has a `warning` field, and adding one requires modifying `migrationResultSchema`. The plan does not mention updating the schema, which means the `warning` field would either: (a) be silently stripped by Zod validation (INV-005 enforces validation on every write), or (b) require a schema change that isn't scoped. The plan should explicitly add a task to update `migrationResultSchema` to include an optional `warning` field on the relevant variant(s), or alternatively emit the warning as an initial response before the Q&A protocol starts (a new discriminated variant like `{ status: "warning", message: string }`).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `epicJsonContent` typing as `z.input<typeof epicSchema>` will cause a compile error after `sliceSequence` removal

Phase 2 has two tasks that interact: (1) remove `sliceSequence` from `buildMigrationState` output (line 256), and (2) type `epicJsonContent` as `z.input<typeof epicSchema>`. The current code at line 250 uses `Record<string, unknown>` and includes `sliceSequence`. If task (2) is applied before task (1), the compiler will flag `sliceSequence` as not in the schema (good). But the plan also needs to add the `refinement` field handling -- looking at `epicSchema`, it expects `name`, `status`, `goal`, `verifications`, `refinement`, `created`, `activated`, `updated`. The current `buildMigrationState` output at line 250 already has all of these except potentially `updated` (it has `updated: ts`). This should work, but the plan should note the task ordering dependency: remove `sliceSequence` first, then apply the type annotation, and verify the resulting object satisfies `z.input<typeof epicSchema>` exactly. If there is any mismatch (e.g., extra fields the schema doesn't accept, or missing optional fields), the stricter typing will surface it. This is actually a benefit of the change, but the plan should acknowledge the potential for additional field adjustments.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2.5 installs skills unconditionally but no skill changes are in scope

Phase 2.5 includes `bun run install:skills` but the plan's scope does not modify any skill files. This is harmless but unnecessary -- it introduces a step that could fail (e.g., if the install script has issues) without providing value. Consider making it conditional ("install updated skills if any changed" is already the task text, but the verification section doesn't check for this condition).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `startContext.test.ts` fixture cleanup is cosmetic but correctly scoped

The plan's Phase 1 includes removing `sliceSequence` from the `startContext.test.ts` fixture at line 43. This is not a failing test -- the fixture is a raw JSON blob used as inline state, not validated against `epicSchema`. The cleanup is good for consistency but the plan should note it won't cause test failures if omitted. It's correctly categorized as a consistency fix rather than a bug fix.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 architecture doc updates lack specificity on `_overview.md` maturity table changes

The plan says "update subsystem maturity table if warranted by the epic's cross-cutting changes" for `_overview.md`. This is vague -- the epic touched all 5 subsystems. The current maturity table shows all subsystems at "Developing" status. If no maturity level changes are warranted (likely correct since all subsystems remain at Developing), the plan should say "verify maturity levels remain appropriate; no changes expected" rather than leaving it open-ended.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured with clear phase ordering, accurate codebase references (line numbers, file paths, failure counts all verified against the actual codebase), and appropriate separation of concerns across phases. The Phase 2.5 build-install step correctly addresses the installed-vs-repo CLI separation. The two IMPORTANT issues are genuine gaps: the `warning` field needs schema support (without it, the feature either silently fails or violates INV-005), and the `epicJsonContent` typing task has an ordering dependency that should be explicit. Addressing these two items would bring the score to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
