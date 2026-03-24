# Merged Review Feedback — Round 2

## CRITICAL Issues

None.

## IMPORTANT Issues

**I1. Phase ordering: Phase 4 version bump must precede Phase 2's breaking schema change**
Flagged by: Holistic, API Contract
The overview states Phase 4 must be done before or concurrently with Phase 2, but phases are numbered 1-2-3-4, placing Phase 4 last. An implementer following phase order would ship the breaking change before the version boundary exists. Fix: either (a) reorder so the version bump comes before Phase 2, (b) merge the version bump into Phase 2 as its first task, or (c) explicitly state the breaking change ships under 0.0.1 (acceptable for pre-1.0 internal-only software but must be stated).
Resolution: DIRECTLY_ACTIONABLE

**I2. `ArtifactFlags` Zod schema belongs in `src/schemas/commands/`, not `src/schemas/entities/`**
Flagged by: Holistic, Software Architecture, TypeScript, TUI-CLI, API Contract
`src/schemas/entities/` contains schemas for persisted JSON entities. `ArtifactFlags` is a computed projection that only appears in command output — it is never persisted. The existing `statusResultSchema` in `src/schemas/commands/status.ts` is the precedent. Place `ArtifactFlags` in `src/schemas/commands/` (e.g., `show.ts` or `artifacts.ts`).
Resolution: DIRECTLY_ACTIONABLE

**I3. Phase 3 `completion/` directory mapping references nonexistent concept**
Flagged by: Holistic
The plan maps `slice:complete` and `quest:complete` to `{ completion: "<dir>/completion/" }`. No `completion/` directory concept exists in the RPC layer or data model. The complete flow writes to `learnings.jsonl`, `architecture-deltas.jsonl`, and entity JSON. The mapping should either be `{}` or reference actual completion artifacts.
Resolution: DIRECTLY_ACTIONABLE

**I4. Phase 3 `paths` vs `architecturePaths` coexistence strategy undocumented**
Flagged by: Software Architecture
`CompleteResult` already has `architecturePaths` (state-tree-relative paths). Adding `paths` (absolute filesystem paths) creates two path mechanisms with different semantics. Add a note: (1) `paths` is the canonical forward-looking mechanism; (2) `architecturePaths` is retained for backward compat; (3) new consumers should use `paths`; (4) `architecturePaths` removal deferred to a future slice.
Resolution: DIRECTLY_ACTIONABLE

**I5. Phase 3 `PathReferences` as `Record<string, string>` still underspecified**
Flagged by: TypeScript
Round 1 flagged that `Record<string, string>` loses type safety with `noUncheckedIndexedAccess`. The plan mentions JSDoc but has no explicit task item for it. Add a task: "Add JSDoc on `resolvePathReferences` documenting guaranteed keys per phase (e.g., `slice:plan` always returns `{ plan: string }`)." Alternatively, define per-phase path interfaces as a discriminated union.
Resolution: DIRECTLY_ACTIONABLE

**I6. Phase 4 `checkCompatibility` `'minor-ahead'` is ambiguous — doesn't encode directionality**
Flagged by: Holistic, TypeScript, API Contract
The spec distinguishes CLI minor > data minor (compatible) from CLI minor < data minor (warn). The plan's `'minor-ahead'` conflates both. Fix: if `compatible` covers CLI >= data (same major), then `minor-ahead` must mean data is ahead — rename to `cli-minor-behind` or `minor-mismatch` for clarity. Or: `compatible` = same major AND CLI >= data; drop `minor-ahead` since that case is `compatible`; add `minor-behind` = same major AND CLI < data.
Resolution: DIRECTLY_ACTIONABLE

**I7. Phase 4 version warning uses `outputError()` which is wrong for non-error warnings**
Flagged by: TUI-CLI
`outputError()` writes structured `{ error: {...} }` JSON to stdout — designed for errors, not warnings. Using it for warnings would pollute structured command output. Use `process.stderr.write()` for human mode and suppress in `--json`/`--quiet` modes.
Resolution: DIRECTLY_ACTIONABLE

**I8. Phase 4 version compat check cannot access `--quiet` flag at dispatch point**
Flagged by: TUI-CLI
At the planned check location in `src/index.ts`, only `globalFlags.json` is available. `parseGlobalFlags()` does not extract `--quiet`. Fix: extend `parseGlobalFlags()` to also extract `quiet: boolean`.
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**M1. Phase 4 version stamp in RPC layer: extract shared helper for three mutation paths**
Flagged by: Software Architecture
The same stamping logic must be added in `begin.ts`, `submit.ts`, `complete.ts`. Extract a shared `stampVersionIfNeeded()` helper to avoid triple-implementation risk.
Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 4 compatibility check placement — `resolveProjectDir()` not centralized in dispatch path**
Flagged by: Software Architecture
`resolveProjectDir()` is called inside each command's `run()`, not in the dispatch path. The plan should be explicit: add a new `resolveProjectDir()` call in the dispatch path (accepting minor redundancy) or use a shared pre-command hook.
Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 1 `detectArtifacts` task should mention `getDir()` helper**
Flagged by: TypeScript
The plan says "resolve the slice's directory in the tree" without naming the `getDir()` helper from `tree.ts`. Make this explicit.
Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 3 conditional spread for `exactOptionalPropertyTypes` should apply consistently**
Flagged by: TypeScript
Since `resolvePathReferences` always returns an object (never `undefined`), the conditional spread is unnecessary — just always include `paths`. State this once, applying to all three result types.
Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 3 expected behavior missing `complete` assertion**
Flagged by: TUI-CLI
All Phase 3 expected behavior assertions test `BeginResult` types. No `CompleteResult` assertion. Since `paths` is added to all three result types, expected behavior should cover all three.
Resolution: DIRECTLY_ACTIONABLE

**M6. Phase 3 `submit` path resolution should use begin-phase mapping**
Flagged by: API Contract
The task for modifying `submit()` doesn't specify that submit must resolve the begin-phase equivalent to get correct path mapping.
Resolution: DIRECTLY_ACTIONABLE

**M7. Phase 1 `ArtifactFlags` schema placement and INV-006 `schema` command discoverability**
Flagged by: API Contract
Verify the `schema` command can discover the enriched `show` output shape, or add a task to create the output schema in `src/schemas/commands/`.
Resolution: CODEBASE_EXPLORATION

**M8. Phase 4 version stamp: explicitly state "stamp on every RPC mutation"**
Flagged by: API Contract
The plan implies always-stamping but doesn't explicitly confirm. State it to remove ambiguity.
Resolution: DIRECTLY_ACTIONABLE

**M9. Phase 4 version stamping: guard against `project.json` absence**
Flagged by: TypeScript
`getJson<Project>(newState, 'project.json')` returns `Project | undefined`. Note the guard or state that version stamping is skipped for the `create` phase.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

I1, I2, I3, I4, I5, I6, I7, I8, M1, M2, M3, M4, M5, M6, M8, M9

## RESEARCH_NEEDED

None.

## CODEBASE_EXPLORATION

M7 — Verify `schema` command can discover `ArtifactFlags` via `show` output schema.

## Contradictions Resolved

1. **ArtifactFlags severity**: Holistic rated this MINOR; Software Architecture and TypeScript rated it IMPORTANT. Trusting Software Architecture (domain specialist for schema placement): resolved as IMPORTANT (I2).

2. **`minor-ahead` severity**: Holistic rated this MINOR; TypeScript and API Contract rated it IMPORTANT. Trusting TypeScript and API Contract (domain specialists for type semantics): resolved as IMPORTANT (I6).

3. **`completion/` directory mapping severity**: Holistic promoted this from round-1 MINOR to IMPORTANT. No other reviewer flagged it. Keeping at IMPORTANT — the mapping references a concept that does not exist in the codebase.

## Unresolved (USER_INPUT required)

None.
