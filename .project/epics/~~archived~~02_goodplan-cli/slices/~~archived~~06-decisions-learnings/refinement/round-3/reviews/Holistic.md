# Holistic Review (Round 3) -- Decisions, Learnings & Full Status

## Issues

**[MINOR]** Phase 3 `countFiles` helper placement lacks specificity

Phase 3 says "add a Data Layer helper (e.g., `countFiles(projectDir, subpath, glob)` in `src/core/data/`)" but does not specify which file to put it in. The existing Data Layer files are `assemble.ts`, `commit.ts`, `load.ts`, `project.ts`, `tree.ts`, `schema-registry.ts`. None are an obvious home for a glob-based file counter. The task should specify creating a new file (e.g., `src/core/data/files.ts`) or placing it in an existing file (e.g., `project.ts` which already handles project directory resolution). Without this, the implementer must make a judgment call that could conflict with codebase conventions.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 schema command's `commandRegistry` approach could drift silently despite the unit test

The plan says "add a unit test that asserts every command registered in citty has a corresponding registry entry with matching name" to prevent drift. However, citty does not expose a public API to enumerate registered commands (the plan itself acknowledges this). The test would need to either: (a) import the citty command tree and inspect internal properties (fragile), or (b) maintain a hardcoded list of expected command names (also drift-prone). The plan should specify the exact mechanism for the "registered in citty" side of the assertion -- e.g., import the `subCommands` object from `main.ts` and compare its keys against the registry keys.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `decision:list` and `decision:show` use `loadState` + `getJsonl` but no existing list/show command uses `getJsonl`

All existing list commands (epic:list, slice:list, quest:list) read from `overview.json` via `getJson`. Decisions use `decisions.jsonl` (no overview.json). The plan correctly identifies this but does not flag that `getJsonl` may not be importable from the same module path used by existing commands. Looking at the codebase, `getJsonl` is in `src/core/tree.ts` (state machine's tree helpers) while existing list commands import `getJson` from `src/core/data/tree.ts` (Data Layer's tree helpers) or `src/core/tree.ts`. The implementer needs to use the correct import path. This is minor since TypeScript will catch a wrong import, but explicitly noting the import source would prevent confusion.

Resolution: DIRECTLY_ACTIONABLE

---

## Round 2 Issues -- Verification of Fixes

All round 2 issues have been addressed in the current plan text:

- **I1 (commands-api.md deviation):** Fixed -- Phase 2 now includes an explicit task: "Update `commands-api.md` to show the correct `decision:create` stdin shape (`{ id, domain, title, summary }`)."
- **I2 (completedSlices counting):** Fixed -- Phase 3 now specifies "`completedSlices` = items where `status === "completed"`, `totalSlices` = all items regardless of status."
- **M1 (decision:show consistency):** Was already correct, confirmed no action needed.
- **M2 (quest creation context in E2E):** Fixed -- Phase 4 step 11 now specifies `{ goal: "..." }` stdin payload.
- **M3 (rollup error code):** Fixed -- Phase 1 now specifies `STATE_INVALID_TRANSITION` for invalid source path in ROLLUP_LEARNINGS.

## Score: 9/10

The plan is comprehensive, well-structured, and addresses all aspects of the confirmed goal. All critical and important issues from rounds 1 and 2 have been resolved. The four phases are logically ordered with clear dependencies. Expected Behavior sections have concrete before/after checks with specific commands. Verification sections are thorough and test-inclusive. The remaining issues are all minor implementation guidance that an experienced implementer could resolve but would benefit from explicit specification. The plan correctly respects all documented invariants (INV-001 through INV-007), particularly INV-003 (state machine purity), INV-006 (schema accuracy), and INV-005 (schema validation). No fitness functions are affected since all subsystems are still at "candidate" maturity. This plan is ready for implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
