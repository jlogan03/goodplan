## Issues

**[IMPORTANT]** Missing `completion` boolean in Phase 1 artifact shape
The epic architecture's `cli-interaction-conventions.md` (line 238) defines the slice artifact shape as including a `completion` boolean alongside `goal`, `exploreComplete`, `plan`, `planRefined`, `implementation`, and `abandoned`. The plan's Phase 1 task list omits `completion` entirely. This is a contract discrepancy -- skills consuming `show --json` per the convention doc will expect this field. The `detectArtifacts()` function and `ArtifactFlags` Zod schema must include `completion: boolean` (checking for a `completion/` directory or similar marker).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 breaking change lacks migration guidance for consumers
The plan acknowledges that renaming `architectureFiles` to `architecture` (etc.) in `status --json` is a breaking change. However, there is no documentation of the migration path for existing consumers. The convention doc (`cli-interaction-conventions.md`) references the new shape but nothing tells current `status --json` users what changed or when. Since this is a pre-1.0 project and the only consumers are internal skills, this is manageable -- but the plan should explicitly note in Phase 2's tasks that the convention doc update must include a "Changed in 1.0.0" annotation or equivalent, and Phase 4's version bump to 1.0.0 should document this as a breaking change in a changelog or similar artifact.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `BeginResult` and `SubmitResult` types in current code lack `paths?` and `context?` fields that the RPC architecture spec defines
The plan's Phase 3 adds `paths?` to `BeginResult`, `SubmitResult`, and `CompleteResult`. However, the current `BeginResult` (line 103-108 of `src/core/rpc/types.ts`) also lacks `context?: ContextBundle` which the RPC architecture spec (line 195-196) includes. Similarly, `SubmitResult` (line 135-141) lacks `context?: ContextBundle` which the spec (line 180) includes. The plan correctly scopes Phase 3 to `paths?` only, but the task "Define `PathReferences` type in `src/core/rpc/types.ts`" should note that `context?` fields on `BeginResult` and `SubmitResult` are out of scope for this slice (deferred to a later slice). This avoids confusion during implementation where a developer might notice the spec mismatch and try to fix it within this slice.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `VERSION_MAJOR_MISMATCH` error code doesn't fit existing error code namespace taxonomy
The plan says to register `VERSION_MAJOR_MISMATCH` in `src/util/errors.ts` but doesn't specify which namespace. The existing namespaces are `DataErrorCode`, `StateErrorCode`, `ValidationErrorCode`, and `InternalErrorCode`. A version mismatch is neither a data read error nor a validation error nor a state machine error. The research file raises this question but the plan doesn't resolve it. Options: (a) add a new `VersionErrorCode` type, (b) place it in `ValidationErrorCode` since it's a pre-dispatch check similar to input validation. Option (b) is simpler and consistent with exit code 2 (validation/usage errors). The plan should specify the chosen namespace explicitly to avoid implementation ambiguity.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 compatibility rules differ from epic architecture spec
The plan says `major-mismatch` (CLI major < data major) should exit with code 2. The epic architecture spec (`cli-changes.md` lines 188-194) defines four scenarios including "CLI major > data major" (warn) and "CLI major < data major" (error). The plan's `checkCompatibility()` returns only three variants: `'compatible' | 'minor-mismatch' | 'major-mismatch'`. This conflates "CLI too old" and "CLI too new" into a single `major-mismatch` case. The spec treats them differently (warn vs error). The function should return four variants or encode directionality: `'compatible' | 'minor-ahead' | 'major-ahead' | 'major-behind'` (or similar), matching the spec's four-row compatibility table.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 path mappings incomplete -- missing some begin phases
The `resolvePathReferences()` mapping covers the major phases but omits several `BeginPhase` values: `create`, `create-decision`, `activate`, `add-verification`, `update-verification`, `update-decision`, `rollup`, `abandon`. The plan says "Other phases -> `{}`" which is correct for most, but `abandon` writes `abandoned.md` and `create` creates the entity directory. Consider whether `create` should return `{ entity: "<dir>/" }` and `abandon` should return `{ abandoned: "<dir>/abandoned.md" }` for consistency. At minimum, document the design decision that these phases intentionally return empty paths.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 `assembleState()` vs `loadState()` choice undocumented
The plan says `show` commands should call `assembleState()` to get the state tree for artifact detection, but the current `show` commands use `loadState()` (which is cached and faster). The research file notes `loadState()` is sufficient. The plan's task says "call `assembleState()`, resolve the slice's directory" but doesn't explain the choice. Since `loadState()` returns the same `ProjectState` tree and the entity must already exist, the plan should explicitly say "use `loadState()` (already in the command)" rather than introducing `assembleState()`, which handles uninitialized projects unnecessarily.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 version stamp on `commitState()` has no contract test
The plan says "when the CLI writes data using new features, update `project.json.version` to the CLI's current version" via stamping on `commitState()`. This is an implicit contract -- the version auto-advances on any mutation. There's no test proposed to verify this behavior. Add a unit test: after any RPC mutation, `project.json.version` should equal the CLI's `VERSION` constant (or at minimum, be >= the previous version).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No schema validation test for Phase 1's new `ArtifactFlags` response shape
Phase 1 adds a new `ArtifactFlags` Zod schema and spreads it into `show --json` output. The plan includes unit and integration tests for `detectArtifacts()` but doesn't mention a schema validation test ensuring the combined `show --json` output still passes its response schema. Since INV-005 requires schema validation on reads and writes, and INV-006 requires `schema` output to reflect actual command signatures, the plan should include a test that `slice:show --json` output validates against the (updated) response schema.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10
The plan covers the right scope and the phases are logically sequenced. However, there are five IMPORTANT issues: a missing field in the artifact contract (`completion` boolean), a breaking change without migration documentation, undocumented scoping decisions on `context?` fields, an unresolved error code taxonomy question, and a compatibility check function that doesn't match the spec's four-case table. Resolving these would bring the score to 9+. The plan is structurally sound but has enough contract-level gaps that implementing as-is would produce an API surface inconsistent with the epic architecture spec.

## Summary
- Critical: 0
- Important: 5
- Minor: 4
