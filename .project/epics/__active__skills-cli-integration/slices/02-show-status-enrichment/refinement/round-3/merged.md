# Round 3 Merged Feedback — 02-show-status-enrichment

Scores: Holistic 9/10, Software-Architecture 9/10, TypeScript 9/10, TUI-CLI 9/10, API-Contract 9/10

---

## CRITICAL Issues

None.

---

## IMPORTANT Issues

### I1 — Phase 1 `completion` boolean in `ArtifactFlags` references a nonexistent concept
**Source:** Software-Architecture (primary — domain specialist on data model)
**Duplicate:** (not raised by others, but confirmed by API-Contract's remark that `completion/` mapping was correctly resolved to `{}` in Phase 3 paths)

The `completion` field in `ArtifactFlags` ("completion (`completion/` directory exists with content)") references a directory concept that does not exist in the state machine, data model, `commitState()` materialization, or any slice on disk. The convention doc (`cli-interaction-conventions.md` line 238) shows it as aspirational. Including a boolean that will always be `false` provides no signal to consumers and sets a precedent for phantom artifact flags.

Fix: Either (a) remove `completion` from `ArtifactFlags` — the `status` field on entity JSON already distinguishes completed entities via `status === "completed"` — or (b) add an explicit Phase 1 task that documents what creates `completion/` directories and when. Option (a) is simpler and consistent with the round-2 Phase 3 resolution. If (a), also update `cli-interaction-conventions.md` example to match.

Resolution: DIRECTLY_ACTIONABLE

---

### I2 — Phase 4 version compat check: try-catch wrapper for `resolveProjectDir()` must be an explicit task
**Source:** TUI-CLI (primary — owns CLI dispatch flow)

The plan mentions wrapping the compat check in a try-catch that silently swallows `DATA_NO_PROJECT` when no `.project/` exists, but it remains prose rather than an explicit task item. Without a discrete task, an implementer could miss it — causing `init` and other commands that create `.project/` to fail with a confusing `DATA_NO_PROJECT` error before they run.

Fix: Add a sub-task: "Wrap entire compat-check block in a try-catch that silently skips the check on `DATA_NO_PROJECT` (thrown by `resolveProjectDir()` when no `.project/` exists)."

Resolution: DIRECTLY_ACTIONABLE

---

### I3 — Phase 4 version stamp guard: `project.json` absence parenthetical is misleading
**Source:** Holistic and Software-Architecture (both raised; Software-Architecture is more precise)

The plan guards against `project.json` absence with the note "(e.g., during `create` phase)." This is misleading: for entities, `begin('create', ...)` runs after `project.json` already exists; the only context where `project.json` might genuinely be absent is a corrupted `.project/` directory or race condition. The guard is defensive robustness, not a phase-specific skip.

Fix: Change the parenthetical to "(e.g., corrupted project or race condition)" so implementers understand this is a defensive guard, not a named-phase exclusion.

Resolution: DIRECTLY_ACTIONABLE

---

### I4 — Phase 1 `show --json` output schema not discoverable via `schema` command (INV-006 gap)
**Source:** API-Contract (primary — owns INV-006 and schema command surface)

The plan states "These schemas are reused by `show --json` output schemas for INV-006 `schema` command compatibility," but the `schema` command (`src/commands/global/schema.ts`) only exposes `args` and `stdinSchema` via `buildCommandDetail()` — there is no `outputSchema` field or `outputSchemaRegistry`. Without extending the `schema` command, the `ArtifactFlags` shape is invisible to skill consumers who call `schema --command slice:show --json`.

Fix: Either (a) add an `outputSchemaRegistry` parallel to `stdinSchemaRegistry` and populate it for `show` commands, or (b) explicitly acknowledge this as a known gap and defer output schema exposure to a later slice (acceptable since INV-006 currently guarantees only args and stdin schemas). The plan must be explicit about which option it takes rather than implying coverage that doesn't exist.

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

### M1 — Phase 4 `parseSemver` Zod validation may throw unstructured `ZodError`
**Source:** TypeScript (domain specialist on Zod patterns)

`parseSemver` is specified to use `z.string().regex(...).parse(...)`, but Zod v4's `.parse()` throws `ZodError`, not `GoodplanError`. This bypasses the structured error path (INV-007).

Fix: Catch `ZodError` and re-throw as `GoodplanError('VALIDATION_INVALID_INPUT', ...)`, or use `.safeParse()` and throw `GoodplanError` on failure — consistent with the `assembleState` validation pattern elsewhere.

Resolution: DIRECTLY_ACTIONABLE

---

### M2 — Phase 1 `detectArtifacts` return type should use overloaded signatures, not a single `ArtifactFlags` union type
**Source:** TypeScript (domain specialist on type narrowing)

`detectArtifacts(tree, entityType)` returns a single `ArtifactFlags` type. With entity-type-specific shapes (epic adds `architectureDefined`, `slicesDefined`; slice/quest omit them), callers need type assertions or guards to access epic-specific fields.

Fix: Use overloaded signatures — `detectArtifacts(tree, 'epic'): EpicArtifactFlags` / `detectArtifacts(tree, 'slice' | 'quest'): SliceArtifactFlags` — so the return type is automatically narrowed at call sites.

Resolution: DIRECTLY_ACTIONABLE

---

### M3 — Phase 3 `resolvePathReferences` `phase` parameter should use a union type, not `string`
**Source:** Software-Architecture (domain specialist on type conventions)

`resolvePathReferences(projectDir, target, phase: string)` uses a broad `string` type. The function maps a finite set of known phases; `BeginPhase | SubmitPhase` (or a dedicated `PathPhase` union) would catch typos at compile time and make the exhaustive default case (`{}`) explicit — consistent with existing narrow union usage in the codebase.

Fix: Type `phase` as `BeginPhase | SubmitPhase | 'complete'` (or define a `PathPhase` union alias).

Resolution: DIRECTLY_ACTIONABLE

---

### M4 — Phase 4 warning output: emoji prefix may not render in restricted terminal environments
**Source:** TUI-CLI (domain specialist on terminal compatibility)

The version mismatch warning is specified with an emoji character. Minimal environments (CI runners, Docker with restricted locales, older Windows cmd.exe) may render it as garbage. The existing codebase uses `pc.yellow("!")` for warnings (e.g., `formatStatusHuman` line 337).

Fix: Replace emoji prefix with `pc.yellow("warning:")` or a plain ASCII prefix, consistent with existing warning style.

Resolution: DIRECTLY_ACTIONABLE

---

### M5 — Phase 2 `formatStatusHuman()` task should list all four renamed artifact fields explicitly
**Source:** TUI-CLI (domain specialist on formatter implementation)

The task says "use `artifacts.architecture.count` instead of `artifacts.architectureFiles`" and "similarly for all renamed artifact fields." The formatter references four fields: `architectureFiles`, `researchFiles`, `brainstormFiles`, `prototypeFiles`. Leaving the others implicit risks partial updates (though type errors would catch them).

Fix: Enumerate all four mappings in the task description.

Resolution: DIRECTLY_ACTIONABLE

---

### M6 — Phase 3 `resolvePathReferences` JSDoc should enumerate `submit-*` phase names explicitly
**Source:** API-Contract

The plan adds a JSDoc task covering begin-phase mapping for submit phases, but should explicitly list the submit phase names (e.g., `submit-plan` resolves same as `plan`) so consumers can look up any phase name without knowing the mapping rule.

Fix: Add explicit `submit-*` → begin-phase examples to the JSDoc.

Resolution: DIRECTLY_ACTIONABLE

---

### M7 — Phase 1 verification: quest verification step uses placeholder `<test-quest>`
**Source:** Holistic

The "After implementation" check references `<test-quest>` as a placeholder. For falsifiable verification, either create a test quest in the verification steps or note that quest verification depends on an active quest existing at verification time.

Fix: Either add a "create a temporary quest" step before quest verification, or annotate the check as conditional on active quest existence.

Resolution: DIRECTLY_ACTIONABLE

---

## Contradictions Resolved

**Version stamp guard phrasing (I3):** Holistic flagged it as a "minor clarification"; Software-Architecture identified the specific misleading claim ("`create` phase" vs. corruption/race-condition). Adopted Software-Architecture's more precise framing.

**`completion` boolean (I1):** API-Contract confirmed the Phase 3 resolution (mapping `{}`) without flagging Phase 1; Software-Architecture identified the residual phantom concept in Phase 1. Both are consistent — no contradiction; Software-Architecture's issue is a gap not caught by API-Contract.

---

## Unresolved (USER_INPUT Required)

None. All issues are DIRECTLY_ACTIONABLE.

---

## DIRECTLY_ACTIONABLE

Count: 11 (I1, I2, I3, I4, M1, M2, M3, M4, M5, M6, M7)

## RESEARCH_NEEDED

Count: 0
