# Software Architecture Review: Phase 3 — Command Framework

## Issues

**[IMPORTANT]** `output.ts` imports from `src/core/data/json.ts` — Commands layer reaches into Data Layer internals
The `output` function in `src/util/output.ts` imports `deterministicStringify` directly from `src/core/data/json.ts`. Per the architecture, the dependency direction is Commands -> RPC Layer -> Data Layer. A utility module (`src/util/`) importing directly from `src/core/data/` creates an implicit coupling between the Commands layer and the Data Layer's internal implementation. `deterministicStringify` is a general-purpose utility (alphabetical key sorting for JSON), not a data-layer concern. It should either live in `src/util/` as a shared utility or be re-exported through a clean public API surface from the Data Layer.
File: src/util/output.ts:2
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `--quiet` flag defined in `globalArgs` but not implemented in `output()`
The `globalArgs` in `src/commands/main.ts` defines `--quiet` as a global flag, and `output.ts` accepts `quiet?: boolean` in its `OutputArgs` interface, but `output()` never checks or uses the `quiet` value. Per the architecture (`conventions.md`), `--quiet` should produce "minimal output for scripting." A flag that is defined, accepted, and silently ignored violates the principle that the interface should not promise behavior it doesn't deliver. Either implement `--quiet` behavior now (suppress output or print minimal form) or remove it from `globalArgs` until a later phase implements it.
File: src/util/output.ts:16
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `validateInput` strips global flags (`json`, `quiet`, `verbose`) from the merged object
When `validateInput` is called with the full `args` object from citty (which includes global flags like `json`, `quiet`, `verbose`), those flags will be included in the merged object passed to `schema.safeParse()`. If the Zod schema uses `.strict()` or doesn't include those keys, validation will fail. If it uses `.passthrough()`, those flags leak into the validated output. The architecture says commands merge flags + stdin and validate against a Zod schema from `src/schemas/commands/`. The `validateInput` function needs to either: (a) strip known global flags before merging, or (b) document that command schemas must account for global flags. This is a latent bug that will surface when the first real command uses `validateInput`.
File: src/util/validate.ts:23
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `GoodplanError.detail` typed as `string | undefined` but architecture shows `detail` as object
The `commands-api.md` error example shows `detail` as an object: `{ "slice": "01-auth", "currentStatus": "implementing", ... }`. However, `GoodplanError.detail` is typed as `string | undefined`, and `ErrorOutput` (from `error-output.ts`) also types `detail` as `z.string().optional()`. This means richer structured error details will require a type change later. Consider typing `detail` as `unknown` or `Record<string, unknown> | string | undefined` now to avoid a breaking internal change.
File: src/util/errors.ts:27
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `index.ts` directly accesses `mainCommand.subCommands` — tight coupling to citty internals
`getKnownSubcommands()` reaches into `mainCommand.subCommands` and inspects it as a plain object. This works today because `subCommands` is `{}`, but citty supports `Resolvable<T>` for subcommands (value or function returning `T | Promise<T>`). If subcommands are ever lazily loaded, this will break silently. The pre-dispatch validation is good architectural thinking (catching unknown commands before citty's dispatch), but it should be resilient to the resolvable pattern.
File: src/index.ts:32
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No test coverage for `src/index.ts` top-level runner
The `main()` function in `src/index.ts` contains significant orchestration logic: global flag pre-parsing, unknown command detection, error mapping to exit codes, and citty error translation. None of this is tested. The unit tests cover the individual utilities (`output`, `stdin`, `validate`, `errors`) but the integration point that wires them together is untested. This is the most likely place for regressions when new commands are added.
File: src/index.ts:47
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The implementation demonstrates solid architectural judgment: using `runCommand` instead of `runMain` for exit code control, pre-parsing global flags for error formatting, structured error types with namespaced codes, and clean separation of output/stdin/validation utilities. The module boundaries are mostly well-drawn and responsibilities are clear. However, the cross-layer import of `deterministicStringify`, the unimplemented `--quiet` flag, and the `validateInput` global-flag leak are structural issues that will compound as the codebase grows. Fixing these three IMPORTANT items would bring the score to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
