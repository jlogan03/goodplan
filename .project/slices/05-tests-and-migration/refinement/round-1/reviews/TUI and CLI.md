## Issues

**[IMPORTANT]** Migrate command description and help text not updated after removing project.json guard

Phase 2 removes the `STATE_ALREADY_INITIALIZED` guard from `rpcMigrate`, allowing re-migration of initialized projects. However, the plan does not include updating the `migrateCommand` definition in `src/commands/global/migrate.ts`, which currently says:

- `meta.description`: "Requires .project/ to exist and .project/project.json to NOT exist."
- JSDoc comment (line 19): ".project/project.json must NOT exist (already migrated)"
- JSDoc "Preconditions" block explicitly lists the project.json constraint

After Phase 2, these descriptions will be inaccurate — the command will accept projects with `project.json`, but the help text will tell users it won't. This is a direct violation of INV-006 (schema output reflects actual command signatures) in spirit: the command's own description contradicts its behavior.

Add a task to Phase 2 to update `src/commands/global/migrate.ts`: revise the `meta.description`, JSDoc preconditions, and the file-level comment to reflect that `migrate` now supports re-migration of initialized projects.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No user-facing messaging for re-migration behavior change

Phase 2 changes `migrate` from rejecting initialized projects to accepting them. This is a significant behavior change — a user who previously got a clear "Project is already initialized" error will now silently enter Q&A mode, potentially overwriting their existing state. The plan includes no:

1. Warning/confirmation when re-migrating an initialized project (e.g., "This project is already initialized. Re-migration will rebuild state from directory contents. Proceed?")
2. Documentation of what happens to existing state during re-migration (is `.project-old/` backup created? Is existing state merged or replaced?)

At minimum, add a task to emit a warning or informational message to stderr when `project.json` exists, explaining that re-migration will rebuild state. This follows the existing pattern of helpful error reporting (INV-007) and prevents accidental data loss. The Q&A protocol is LLM-driven (stdin/stdout JSON), so a stderr warning won't break the protocol but will alert human debuggers.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fitness test exemption rationale is imprecise

The plan says to add `migrate` to the `READ_ONLY_COMMANDS` exemption list in `stateless-commands.test.ts` with the note "it has no entity-identifying arg but is read-only at the command level; actual mutations happen via stdin piping." But `migrate` is not read-only — it writes `.migration-in-progress.json`, calls `commitState()`, and creates backup directories. The fitness test's `READ_ONLY_COMMANDS` set specifically lists commands that don't mutate state.

A more accurate approach: `migrate` should be in a separate exemption category (or added to `STDIN_ENTITY_COMMANDS` if the stdin payload can be considered entity-identifying), with a comment clarifying it's exempt because it operates on the entire project scope rather than targeting a specific entity. The current plan's comment would mislead future maintainers about the command's behavior.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 verification uses installed CLI but tests use locally-built binary

Phase 2 verification says: "Manual check: on a test fixture with `project.json`, `echo '' | goodplan migrate --json` proceeds to Q&A instead of rejecting." This uses the installed CLI, but the code changes are in the repo's source. The installed CLI won't have the Phase 2 changes until it's rebuilt and reinstalled. The verification should use the locally-built binary against a test fixture, consistent with the test infrastructure pattern: `echo '' | ./goodplan migrate --json` in a fixture directory, or simply rely on the integration test assertion.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is solid on test path fixes (Phase 1) and doc updates (Phase 3). The CLI-specific gap is in Phase 2: changing `migrate`'s behavior from rejecting initialized projects to accepting them without updating the command's own description/help text or providing any user-facing indication of the behavior change. Fixing the two IMPORTANT issues (command description update, re-migration warning) would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
