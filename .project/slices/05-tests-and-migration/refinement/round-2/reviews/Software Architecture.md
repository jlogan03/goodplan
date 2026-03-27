# Software Architecture Review (Round 2)

## Issues

**[IMPORTANT]** Phase 1 fitness test exemption uses wrong semantic category

The plan says to add `migrate` to `STDIN_ENTITY_COMMANDS` with a comment. `STDIN_ENTITY_COMMANDS` is specifically for commands whose stdin payload contains required entity-identifying fields (e.g., `epic:create` stdin has `name`). `migrate` doesn't fit this category — its stdin payload is `{round, answers}`, not entity fields. Adding it to `STDIN_ENTITY_COMMANDS` silences the test but misrepresents the command's nature.

Create a separate `PROJECT_SCOPE_COMMANDS` set (or similar name like `WHOLE_PROJECT_COMMANDS`) for commands that legitimately operate on the entire project rather than targeting a specific entity. Add `migrate` there. This maintains the fitness test's semantic clarity — if a future command is accidentally added to `STDIN_ENTITY_COMMANDS` instead of getting proper entity args, the test should catch it. Mixing unrelated exemption categories weakens the guard.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 architecture doc updates miss stale slice paths in State Key Dependencies table

The plan lists `state-machine-api.md` updates for "State Key Dependencies table (`slices/` -> `epics/<epic>/slices/`), Directory-Based Guards section, event type definitions." This is correct in scope, but the State Key Dependencies table (lines 235-240) contains 8+ stale `slices/<name>/` references across `CREATE_SLICE`, `BEGIN_PLAN`, `COMPLETE_PLAN`, `COMPLETE_REFINEMENT_ROUND`, `COMPLETE_SLICE`, and `COMPLETE_EPIC` rows. Meanwhile the `hasChild` guards at lines 262-263 also use stale `slices/<name>` paths.

The plan should enumerate that the State Key Dependencies table rows for all slice events need `slices/<name>/` changed to `epics/<epic>/slices/<name>/`, and the `hasChild` examples need the same treatment. Without explicit enumeration, an implementer may update only some rows. The event type definitions (lines 53-61) actually look correct already — `CREATE_SLICE` has `epic: string` field — so "event type definitions" may be a no-op for this doc.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `startContext.test.ts` task could be more decisive

The plan says: "check `sliceSequence` at line 43: if it appears in an `epicSchema`-validated fixture, remove it; if it's a raw JSON blob not validated against the schema, note as latent inconsistency and skip." Codebase exploration confirms it's a raw JSON blob (no `epicSchema` import in the file). The plan should just say "remove `sliceSequence` from the fixture's epic.json content at line 43 since it's no longer in `epicSchema`" — this is safe cleanup, not a conditional. Leaving stale fields in fixtures creates confusion for future readers who compare fixtures against schemas.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 re-migration stderr warning placement could interfere with Q&A protocol

The plan says to "emit a stderr warning" when `project.json` exists. Since `migrate` uses a multi-round Q&A protocol via stdout JSON, stderr is the correct channel. However, the plan doesn't specify when in the flow to emit the warning — before the first Q&A round, or at the final commit step? If emitted too late (after Q&A is already underway), the skill driving the migration may not surface it to the user. Recommend emitting immediately after the `project.json` existence check (before any Q&A), so the driving skill sees it at the start.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is substantially improved from round 1. All critical issues are resolved: Phase 1 now correctly lists only the failing test files with specific line numbers and path changes, Phase 2.5 explicitly addresses the build-and-install dependency for Phase 3, and the `.project-old/` timestamped backup addresses re-migration collision. The migration test assertions are now enumerated with specific line numbers. The remaining issues are semantic correctness (fitness test category) and completeness of the architecture doc update enumeration. Fixing the two IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
