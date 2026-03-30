# Merged Feedback — Round 3

### CRITICAL Issues

None.

### IMPORTANT Issues

**IMP-1** INV-004 fitness function checks wrong invariant condition (Software Architecture)

The `stateless-commands.test.ts` plan says: "verify every mutation command includes at least one of `--slice`, `--epic`, `--quest`, `--id` as a required argument." This is factually wrong. Several mutation commands do not have these flags as required args: `epic:create`, `quest:create`, and `decision:create` (which use stdin for `name`/`id`) and `learning:rollup` (which uses `--from`/`--to`). The real INV-004 invariant is that no mutation command relies on ambient/session state. The fitness function should verify that every mutation command either has a required entity-identifying flag OR accepts a required `name`/`id` field in its stdin schema. As written, the test would produce false failures for create commands and miss the actual invariant.

Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

**MIN-1** Epic workflow test chain omits required BEGIN steps (Software Architecture)

`workflow-epic.test.ts` chains: `submit-explore` -> `submit-architecture` -> define slices -> `epic:activate`. This skips the begin commands (`epic:explore`, `epic:define-architecture`, `epic:define-slices`) that must precede each corresponding `submit-*` command. The state machine requires BEGIN before COMPLETE for each phase; submitting without beginning would produce `STATE_INVALID_TRANSITION`. Also, `epic:activate` requires at least one verification criterion (`STATE_MISSING_VERIFICATIONS`), so `epic:add-verification` must be called before activate.

Correct chain: `epic:explore` -> `submit-explore` -> `epic:define-architecture` -> `submit-architecture` -> `epic:define-slices` -> `submit-slices` -> `epic:add-verification` -> `epic:activate`.

This subsumes the Holistic MIN about "define slices" being descriptive — the full correct command sequence resolves both issues.

Resolution: DIRECTLY_ACTIONABLE

**MIN-2** `slice:create` stdin shape inconsistent with actual command (Software Architecture)

`workflow-slice.test.ts` specifies stdin `{ "name": "test-slice", "epic": "test-epic" }` for `slice:create`. The actual command takes `--epic` as a required flag and `name` via stdin only. Correct form: stdin `{ "name": "test-slice" }` with `--epic test-epic` passed as a flag argument.

Resolution: DIRECTLY_ACTIONABLE

**MIN-3** `globalSetup` file not named as a task deliverable (Holistic / TypeScript)

The plan configures `globalSetup` in `vitest.config.ts` and says `buildBinary()` uses `globalSetup`, but no task explicitly creates the global setup file itself (e.g., `tests/global-setup.ts`). Additionally, Vitest `globalSetup` runs in a separate module context from test files, so `buildBinary()` in the helper and the `globalSetup` export are two separate pieces: `globalSetup` compiles to a well-known path (e.g., `./goodplan` in project root), and `buildBinary()` in helpers simply returns/asserts that known path exists. The plan should name the global setup file as a deliverable and clarify this bridging mechanism.

Resolution: DIRECTLY_ACTIONABLE

**MIN-4** `transition-completeness.test.ts` doesn't specify how to count `StateEvent` union members at runtime (TypeScript)

The plan says "verify the key count in `handlerRecord` matches the `StateEvent` union member count," but `StateEvent` is a TypeScript discriminated union with no runtime representation. The plan does not specify how to derive the expected count. Options: (a) hardcode the count (fragile), (b) parse `state-events.ts` source to count exported union members (consistent with the purity test's source-parsing approach), (c) import all event schemas individually and count them. The plan should pick one approach; option (b) is consistent with existing patterns in the plan.

Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE (for loop exit)

1. Fix INV-004 fitness function to check that every mutation command either has a required entity-identifying flag or a required `name`/`id` stdin field (IMP-1)
2. Correct the epic lifecycle test chain to include BEGIN steps and `epic:add-verification` before `epic:activate` (MIN-1)
3. Fix `slice:create` test spec: `epic` moves from stdin to `--epic` flag (MIN-2)
4. Name `tests/global-setup.ts` (or equivalent) as a task deliverable and clarify the `globalSetup`-to-helper bridging pattern (MIN-3)
5. Specify the runtime approach for counting `StateEvent` union members in `transition-completeness.test.ts` (MIN-4)

### RESEARCH_NEEDED

None.

### Contradictions Resolved

**Holistic MIN (define slices phrasing) vs Software Architecture MIN (epic chain missing BEGIN steps):** These flags overlap — both concern the epic lifecycle test chain. The Software Architecture reviewer's more specific finding (missing BEGIN commands and missing `epic:add-verification`) subsumes the Holistic reviewer's narrower concern about "define slices" being descriptive. Merged into MIN-1 using the Software Architecture finding as authoritative.

### Unresolved (USER_INPUT required)

None.
