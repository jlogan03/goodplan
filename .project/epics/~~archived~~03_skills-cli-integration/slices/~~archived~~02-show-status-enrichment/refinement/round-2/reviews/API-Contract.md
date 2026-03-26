## Issues

**[IMPORTANT]** Phase 4 `checkCompatibility` "minor-ahead" semantics ambiguous for CLI-behind case
The plan defines `checkCompatibility` returning `'minor-ahead'` but uses it for two distinct scenarios: (1) CLI minor > data minor (same major), and (2) CLI minor < data minor (same major). The epic spec (`cli-changes.md` lines 193-194) treats these differently: CLI >= data is "compatible" while CLI < data (same major, lower minor) gets a warning. The plan's four variants (`compatible`, `minor-ahead`, `major-ahead`, `major-behind`) only encode three directions — `minor-ahead` could mean the CLI is ahead or behind. The description in the task says "same major, minor differs" which conflates both directions. Clarify: `compatible` = same major AND CLI >= data; `minor-behind` = same major AND CLI minor < data minor (warn); drop `minor-ahead` since that case is covered by `compatible`. Alternatively, rename to `cli-minor-behind` to make directionality unambiguous.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase ordering rationale contradicts itself on Phase 4 timing
The overview states "Phase 4 (semver/1.0.0 bump) must be done before or concurrently with Phase 2, since Phase 2 introduces a breaking schema change." But the phases are numbered 1-2-3-4, implying sequential order where Phase 2 comes before Phase 4. If Phase 2 is implemented before Phase 4, the breaking change ships without the version boundary. The plan should either: (a) reorder Phase 4 before Phase 2, (b) split Phase 4 so the version bump happens in Phase 2's tasks, or (c) add a dependency note that Phase 4's version bump task must execute before Phase 2's schema change. As-is, an implementer following phase order would introduce the breaking change before the version boundary exists.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 `paths` on `SubmitResult` should return same paths as corresponding `begin` phase — not documented in task list
The plan's Phase 3 path resolution section mentions "`submit-*` phases return the same paths as their corresponding `begin` phase" in the mapping list, but the task for "Modify RPC `submit()`" just says "call `resolvePathReferences()`, add `paths` to result" without specifying that submit needs to resolve the phase that was begun, not the submit phase itself. The `submit()` function receives a `SubmitInput` with `phase` field values like `"plan"`, `"refinement"`, `"implementation"` — these need mapping back to the begin-phase path resolution. Add a note that `submit()` must resolve the begin-phase equivalent to get the correct path mapping.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 `ArtifactFlags` schema placement in `src/schemas/entities/` may not align with INV-006
The plan says to place `ArtifactFlags` Zod schema in `src/schemas/entities/` because "artifact flags describe entity properties." But INV-006 requires `schema` command output to reflect actual command signatures. The `show --json` output schema (which includes `ArtifactFlags`) needs to be discoverable by the `schema` command. If the schema command derives output shapes from `src/schemas/commands/`, placing `ArtifactFlags` in `src/schemas/entities/` is fine as long as the `show` command's output schema in `src/schemas/commands/` imports and composes it. The plan mentions "These schemas are reused by `show --json` output schemas for INV-006 `schema` command compatibility" but doesn't include a task to create the `show` output schema in `src/schemas/commands/`. Verify the `schema` command can discover the enriched output shape, or add a task to create it.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 4 version stamp in RPC layer lacks specificity on which mutations trigger it
The plan says "in the RPC mutation path (`begin()`, `submit()`, `complete()`), after `reduce()` produces new state, check if CLI version > `project.json.version` and update it." This is correct per round-1 feedback (moved from `commitState()` to RPC layer). However, `begin()` for read-like phases (e.g., `begin("explore", ...)` which just transitions status) and `submit()` both modify state. The plan should confirm: is the version stamp on every mutation, or only on mutations that use new features? The epic spec says "when the CLI writes data that uses new minor-version features." Always-stamping is simpler and the plan seems to intend this, but explicitly stating "stamp on every RPC mutation" vs "stamp only when new features are used" would remove ambiguity. Always-stamping is the pragmatic choice — recommend making it explicit.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
All round-1 IMPORTANT issues have been addressed: `completion` boolean added, error code namespaced to `VALIDATION_*`, version stamp moved to RPC layer, `formatStatusHuman()` update task added, `detectArtifacts()` placed in `src/core/artifacts.ts`, state tree used for file listing, `PathReferences` JSDoc documented, Zod validation on `parseSemver`, four-variant compatibility check, warning format specified, breaking change annotation included, `context?` scoping note added. The plan is now substantially more complete. The remaining issues are: a semantic ambiguity in the `minor-ahead` compatibility variant that could lead to wrong behavior at runtime, and a phase ordering contradiction that could ship a breaking change before the version boundary. Both are fixable without restructuring.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
