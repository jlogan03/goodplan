# Software Architecture Review — Rename to gp (Round 2)

## Issues

**[IMPORTANT]** `PROJECT_DIR_NAME` constant is not exported or reused — plan perpetuates the duplication pattern

The plan correctly lists the three hardcoded `.project` literals in `src/` (`project.ts`, `init.ts`, `migrate.ts`) as separate tasks. However, all three sites are independently constructing the same value. `src/core/data/project.ts` already has `const PROJECT_DIR_NAME = ".project"` but it is not exported, so `init.ts` and `migrate.ts` cannot reference it. The plan changes each literal individually without consolidating them. This means the next rename (or any future directory name change) will face the exact same multi-site update problem.

The architectural improvement is: export `PROJECT_DIR_NAME` from `project.ts` and import it in `init.ts` and `migrate.ts` instead of hardcoding the string. This is a one-line export plus two import changes, and it eliminates a class of future bugs. The plan should add this as a sub-task within the `src/core/data/project.ts` task entry (export the constant) and update the `init.ts` and `migrate.ts` task entries to import and use it rather than hardcoding `".goodplan"`.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `renameProjectDir` backup naming is derived from `projectDir` path, not the constant — the plan's task description may mislead

The plan task for `src/core/rpc/migrate.ts` says to "change `.project-old-<timestamp>` backup dir prefix to `.goodplan-old-<timestamp>`". But looking at the actual code (line 437), the backup dir is constructed as `` `${projectDir}-old-${timestamp}` `` — it appends `-old-<timestamp>` to whatever `projectDir` path is passed in. This means if `projectDir` correctly resolves to `.goodplan/`, the backup will automatically be `.goodplan-old-<timestamp>` with no code change needed in `renameProjectDir` itself. The references in comments and JSDoc (lines 430, 492, 947) do need updating, but the function body is path-derived, not hardcoded.

The plan task as written implies changing code logic when only comments need updating. This could lead the implementer to introduce a hardcoded `.goodplan-old` string where currently none exists, making the code worse. The task should clarify: update comments/JSDoc only in `renameProjectDir`; the function body is already correct because it derives from `projectDir`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 catch-all task ("All remaining `src/` files") is vague about JSDoc vs user-facing strings

The catch-all task says to update "string literals, error messages, JSDoc, and comments." But the scope decisions table says `.project/architecture/*.md` references are left as-is, and `GOODPLAN_DIR` env var name stays. The catch-all doesn't specify which `.project` references are user-facing strings that must change vs internal documentation/JSDoc that may reference the directory conceptually. For example, `src/core/data/assemble.ts` has JSDoc saying "reads the `.project/` filesystem into a ProjectState tree" — should this say `.goodplan/` or does it fall under the "internal documentation" exception?

A clearer rule: all JSDoc and comments that describe the directory name should update to `.goodplan/` (they describe what the code does). The "leave as-is" exception only applies to files managed by the installed CLI (`.project/architecture/*.md`). The plan should state this rule explicitly in the catch-all task.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No explicit verification that `GOODPLAN_DIR` env var still works with the new directory name

The Expected Behavior section verifies `./gp init`, `./gp status`, and lifecycle commands, but none of the verification items test the `GOODPLAN_DIR` override path — the mechanism used by all integration tests and potentially by external tooling. Adding one verification item like `GOODPLAN_DIR=/tmp/test/.goodplan ./gp status --json` would confirm the env var override continues to work with the new directory layout.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 issues were well-addressed: init.ts and migrate.ts are now explicit tasks, the test file count was corrected to 25+, and the fixture/GOODPLAN_DIR atomicity requirement is documented. The remaining issues are about consolidating the directory name constant (preventing future duplication) and clarifying the migrate.ts task to avoid introducing unnecessary hardcoding. To reach 9+: export and reuse `PROJECT_DIR_NAME`, clarify the `renameProjectDir` task description, and add a GOODPLAN_DIR verification item.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
