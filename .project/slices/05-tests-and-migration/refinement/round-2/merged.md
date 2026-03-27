# Merged Feedback — Slice 05: Tests and Migration (Round 2)

### CRITICAL Issues

None.

### IMPORTANT Issues

**IMP-1: `migrate` belongs in a `PROJECT_SCOPE_COMMANDS` set, not `STDIN_ENTITY_COMMANDS`**
Sources: Holistic, Software Architecture, TUI/CLI (minor)

`STDIN_ENTITY_COMMANDS` is specifically for commands whose stdin payload has required entity-identifying fields (e.g., `epic:create` with `name`). `migrate`'s stdin is `{round, answers}` — no entity identifier. Adding it there silences the fitness test but misrepresents the command's nature and weakens the guard for future commands.

Fix: Create a `PROJECT_SCOPE_COMMANDS` set (or `WHOLE_PROJECT_COMMANDS`) containing `migrate`. Add a comment that these commands operate on the entire project rather than targeting a specific entity. This preserves the semantic integrity of `STDIN_ENTITY_COMMANDS`.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-2: Phase 1 `startContext.test.ts` task should be decisive, not conditional**
Sources: Holistic, Software Architecture, TypeScript/JS

The plan says to conditionally check whether `sliceSequence` at line 43 should be removed or skipped. Research already confirms: it's a raw JSON blob (not `epicSchema`-validated), `sliceSequence` was removed from `epicSchema` in slice 01, and the test passes either way. The conditional language adds implementer ambiguity.

Fix: State definitively: "Remove `sliceSequence` from the fixture at line 43 for consistency with `epicSchema`."

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-3: `buildMigrationState` types `epicJsonContent` as `Record<string, unknown>` — type safety hole**
Source: TypeScript/JS

The loose type hides schema violations at compile time — this is how `sliceSequence` survived in migration output. `commitState` silently strips unknown keys via Zod parse, masking bugs.

Fix: Type `epicJsonContent` using `z.input<typeof epicSchema>` (or the inferred `Epic` type) so future schema changes are caught at compile time.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-4: Phase 3 architecture doc updates should enumerate all stale `slices/` path references**
Source: Software Architecture

The State Key Dependencies table (lines 235-240) has 8+ stale `slices/<name>/` references across `CREATE_SLICE`, `BEGIN_PLAN`, `COMPLETE_PLAN`, `COMPLETE_REFINEMENT_ROUND`, `COMPLETE_SLICE`, and `COMPLETE_EPIC` rows. The `hasChild` guards at lines 262-263 also use stale paths. The "event type definitions" may actually be a no-op (already updated). Without explicit enumeration, an implementer may update only some rows.

Fix: Enumerate that all State Key Dependencies table rows for slice events need `slices/<name>/` changed to `epics/<epic>/slices/<name>/`, and the `hasChild` examples need the same treatment. Note that event type definitions may already be correct.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-5: Phase 2 re-migration warning should use structured output, not raw stderr**
Sources: TypeScript/JS, TUI/CLI

The codebase doesn't use `console.error` — all output goes through `output()` utility. Since `migrate` uses a JSON Q&A protocol, a raw stderr write would bypass structured output patterns. An LLM orchestrator reading stderr could also misinterpret warning text as failure.

Fix: Add the warning as a `warning` field in the structured JSON result (consistent with INV-007's structured error responses), keeping output machine-parseable for the `/migrate` skill. If stderr is used, prefix with `[warn]` and emit before Q&A begins (not after).

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-6: Phase 2 integration test `sliceSequence` removal count is wrong — 2 not ~8**
Source: TypeScript/JS

`sliceSequence` appears at ~8 locations in `tests/integration/migrate.test.ts`, but 6 are in Q&A *input* data (should remain). Only lines 212 and 439 are output assertions that should be removed. The plan's "~8 locations" estimate would lead to incorrectly removing input data references.

Fix: Change to "remove `sliceSequence` from 2 output assertion locations (lines 212, 439). Q&A input references remain unchanged."

Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

**MIN-1: Phase 2 Expected Behavior "before" check incorrectly mentions `STATE_ALREADY_INITIALIZED` guard**
Source: Holistic

The unit tests test `buildMigrationState` (pure function), not the RPC guard. The integration tests don't test the guard either. The before check's mention is misleading.

Fix: Update to: "failures related to `sliceSequence` assertions and stale path references."

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-2: Phase 2.5 missing build success verification**
Source: Holistic

If `bun run build` fails silently, `install:cli` uses a stale binary.

Fix: Add explicit build success check before proceeding to install.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-3: Phase 3 before/after checks use imprecise grep for `totalSlices`**
Source: Holistic

Fix: Use `goodplan status --json | jq '.artifacts.totalSlices'` for concrete value checks.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-4: Phase 2 unit test line numbers may shift — prefer grep-based guidance**
Source: TypeScript/JS

Fix: Note "all `sliceSequence` references in output assertions" instead of listing specific line numbers.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-5: `renameProjectDir` timestamp format and collision handling unspecified**
Source: TypeScript/JS

Fix: Specify ISO 8601 compact format (`YYYYMMDD-HHmmss`) for readability, retain `fs.existsSync` guard, document naming convention.

Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE

All 11 issues (6 IMPORTANT, 5 MINOR) are directly actionable.

### RESEARCH_NEEDED

None. The TUI/CLI reviewer flagged `CODEBASE_EXPLORATION` for stderr convention checking, but this was resolved by the TypeScript/JS reviewer's finding that no stderr utility exists and the recommendation to use structured JSON output instead.

### Contradictions Resolved

1. **`migrate` exemption category**: Holistic suggested `READ_ONLY_COMMANDS` as an alternative; Software Architecture and TUI/CLI both recommended `PROJECT_SCOPE_COMMANDS`. The domain specialists' recommendation (`PROJECT_SCOPE_COMMANDS`) is more semantically precise — `migrate` is not read-only. Resolved in favor of `PROJECT_SCOPE_COMMANDS`.

2. **Re-migration warning channel**: Software Architecture says "stderr is the correct channel." TypeScript/JS says "no stderr utility exists, use structured JSON." TUI/CLI says "if stderr, use `[warn]` prefix." Resolved: TypeScript/JS recommendation (structured JSON `warning` field) is most consistent with codebase patterns and INV-007. If stderr is chosen as fallback, emit before Q&A with `[warn]` prefix per TUI/CLI.

3. **`startContext.test.ts` handling**: All three reviewers flagged this. Holistic and Software Architecture said "remove it." TypeScript/JS said "remove it" but noted possible compile-time implications. No actual contradiction — all agree on removal. Merged as single IMP-2.

### Unresolved (USER_INPUT required)

None.
