# Software Architecture Review: Tracer Bullet Plan (Round 3)

## Round 2 Fix Verification

Both IMPORTANT and all three MINOR items from round 2 were verified against the current plan:

- **IMPORTANT 1 (citty error code mapping):** FIXED. Phase 3 line 100 now enumerates the full mapping: `CLIError` with `E_UNKNOWN_COMMAND` → exit 2, `EARG` → exit 2, `GoodplanError` → exit based on error code (1 generic, 2 validation, 3 state), all other errors → exit 1. This is precise and actionable.

- **IMPORTANT 2 (init cwd check):** FIXED. Phase 4 line 125 now explicitly uses `fs.existsSync` with a note clarifying NOT to use `resolveProjectDir()`, and explains why (walk-up would find a parent's `.project/`). The boundary is enforced at the spec level.

- **MINOR 1 (goal.md mismatch):** FIXED. Phase 6 verification header now reads "per plan verification list" rather than "from goal.md".

- **MINOR 2 (error-output.ts naming):** FIXED. The file is now `src/schemas/error-output.ts`, clearly distinct from `src/util/errors.ts`.

- **MINOR 3 (badcommand --json 2>&1):** This is correctly resolved. Line 89 (`badcommand 2>&1`) is the non-JSON case where errors correctly go to stderr — merging streams is appropriate for shell verification. Line 90 (`badcommand --json`) explicitly notes "stdout shows" the JSON error. The two-line structure is now clear.

## Issues

No issues found.

The plan is architecturally sound across all evaluation criteria:

**Module boundaries**: Clear separation across phases. Commands (`src/commands/`), data layer (`src/core/data/`), schemas (`src/schemas/`), and utilities (`src/util/`) have non-overlapping responsibilities. The plan explicitly warns against mixing concerns (e.g., `resolveProjectDir()` in init).

**Dependency direction**: Flows strictly downward: commands → data layer → schemas. No upward dependencies planned. `src/util/` is a leaf with no dependencies on other src modules. The state machine is not introduced in this slice, which keeps the layering clean.

**Layering**: Phase separation in the plan mirrors the intended layering. Schemas (Phase 2) before commands framework (Phase 3) before commands (Phases 4-5) before binary (Phase 6). Each phase has concrete verification before the next phase builds on it.

**Data flow and state management**: Data ownership is clear. `project.json` is the single source of truth, read and written through `readProject()` / `writeProject()`. StatusResult is a read-only projection, documented explicitly as always-null for active pointers in this slice. No ambient mutable state.

**Testability**: Tests are woven into each phase rather than deferred. Phase 2 includes schema round-trip tests and GOODPLAN_DIR resolution. Phase 3 includes stdin unit tests. Phase 4 includes init unit tests using temp directories. The data layer (`json.ts`, `project.ts`) is isolated from commands and injectable via fixture directories.

**Module depth**: The plan specifies narrow public interfaces (`readProject()`, `writeProject()`, `readEntity<T>()`, `writeEntity<T>()`, `output()`, `readStdin()`, `validateInput()`) that hide significant implementation complexity (deterministic sorting, Zod validation, TTY detection, size limits, stdin/args merge). This is the right abstraction depth for a tracer bullet.

**Caller friction**: The `validateInput(schema, args, stdin)` pattern consolidates merge semantics and validation into a single call. Callers don't need to understand the stdin/flag precedence rules or Zod internals. The `output(data, args)` function similarly hides JSON mode, deterministic stringify, and stream routing.

**Maturity awareness**: All subsystems touched by this slice are Experimental (per `architecture/_overview.md` Subsystem Maturity table). No justification for changes or migration plans is required at this maturity level.

**Invariant compliance**: INV-002 (deterministic JSON) is addressed in Phase 2's `writeEntity<T>` spec. INV-005 (schema validation) is enforced on both read and write paths in `json.ts`. INV-007 (structured errors) is addressed via the error code mapping in Phase 3 and `GoodplanError` in Phase 2. INV-001, INV-003, INV-004 are explicitly out of scope for this slice (state machine and RPC layer not introduced yet), which is appropriate.

**Verification approach appropriateness**: Each phase uses direct execution (`bun run src/index.ts` or `./goodplan`) to verify the compiled behavior. The Phase 6 binary verification sequence is comprehensive (9 checks covering init, duplicate-init, status JSON, status human, jqjs, unknown command, help, and NO_COLOR) and uses the actual binary rather than interpreter mode. This is the most direct verification method for a CLI tracer bullet.

## Score: 10/10

Both round-2 IMPORTANT items landed cleanly with no unintended side effects. No new architectural issues introduced. The plan is complete, well-layered, and ready for implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 0
