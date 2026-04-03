# Merged Review Feedback — Data Model Changes Plan (Round 2)

All 3 reviewers confirmed all round-1 issues (1C + 6I + 4M) are resolved. Consensus score: **8/10**.

## Deduplicated Issues

### IMPORTANT-1: Resolve type export strategy for unified overview schema (3 reviewers)

All three reviewers flagged that the plan asks "whether existing types are preserved as sub-shapes or replaced" but does not answer the question. The decision matters because these types (`Overview`, `EpicOverview`, `EpicOverviewItem`, `OverviewItem`, `SliceOverviewItem`) are imported across `helpers.ts`, `task-lifecycle.ts`, `slice-plan.ts`, `complete.ts`, and test files.

**Merged recommendation:** Preserve item-level schemas (`overviewItemSchema`/`OverviewItem`, `sliceOverviewItemSchema`/`SliceOverviewItem`, `epicOverviewItemSchema`/`EpicOverviewItem`) as building blocks of the unified schema. Replace the wrapper types (`overviewSchema`/`Overview`, `epicOverviewSchema`/`EpicOverview`) with `unifiedOverviewSchema`/`UnifiedOverview`. The old `{ items: [...] }` wrappers become inner shapes. This minimizes import churn while making the consolidated type the primary API.

Sources: holistic MINOR, software-architecture IMPORTANT, typescript IMPORTANT

---

### IMPORTANT-2: Split RPC tasks — `complete.ts` epicComplete derivation needs explicit task (2 reviewers)

`complete.ts` line ~309 reads `getJson<EpicOverview>(newState, "epics/overview.json")` to derive `epicComplete`. The plan mentions `complete.ts` but groups it with `migrate.ts` in one bullet. These are structurally different changes: `complete.ts` is a read-path change (path + `.epics` instead of `.items`), while `migrate.ts` is a write-path restructuring.

**Fix:** Add a standalone Phase 3 task: "Update `complete.ts` epicComplete derivation (~line 309): change path from `epics/overview.json` to `overview.json`, access `.epics` instead of `.items`, and update the `EpicOverview` type import to `UnifiedOverview`."

Sources: holistic IMPORTANT, typescript IMPORTANT

---

### IMPORTANT-3: Clarify `task-lifecycle.ts` task — helpers encapsulate overview access (2 reviewers)

Software-architecture flags that `task-lifecycle.ts` CONVERT_TASK constructs overview paths dynamically (`${targetNamespace}/overview.json`) and needs guidance on how to adapt. TypeScript review notes the file actually delegates to helper functions and never directly references overview paths — updating the helpers is sufficient.

**Merged resolution:** These are complementary, not contradictory. The dynamic path construction exists in `getJson<Overview>(state, ...)` calls, but the helpers already abstract most access. Fix: (a) Make helpers fully encapsulate overview access so `task-lifecycle.ts` never constructs overview paths directly, and (b) reword the Phase 3 task to clarify that `task-lifecycle.ts` changes are transitively covered by the helper updates, removing it as a separate task to avoid confusion.

Sources: software-architecture IMPORTANT, typescript IMPORTANT

---

### IMPORTANT-4: Phase 2 `mapLearningInputs` — tighten code location and check semantics (1 reviewer)

The plan's conditional spread pattern is correct but should specify the exact insertion point: "In the `entries.push({ ... })` call at ~line 144 of `mapLearningInputs`, add `...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {})` alongside the existing field mappings." Use `!== undefined` rather than truthiness, since `validUntil` is `string[] | undefined` and an empty array is valid.

Source: holistic IMPORTANT

---

### IMPORTANT-5: Phase 1 entityPath validation — document excluded types and insertion point (2 reviewers)

Holistic: The plan lists four acceptable entity paths but doesn't explain why `decision` and `project` are excluded. Software-architecture: The validation must happen in `begin()` between `loadState` and `buildBeginEvent` (since `buildBeginEvent` lacks state access), using state tree navigation.

**Merged fix:** Add to the entityPath validation task: (a) "Acceptable paths: epics, slices, quests, tasks. Decisions excluded (circular self-reference); project excluded (all decisions are already project-scoped)." (b) "Validate in `begin()` after `loadState` and before `buildBeginEvent`, using `resolve()` or `getJson()` against the loaded `ProjectState` tree."

Sources: holistic IMPORTANT, software-architecture MINOR — elevated to IMPORTANT (combined scope)

---

### MINOR-1: Phase 3 `migrate.ts` is a structural rewrite, not a path update (2 reviewers)

Both holistic and typescript note that `migrate.ts` changes are understated. The migration builder constructs separate `epicsContents["overview.json"]` and `questsContents["overview.json"]` entries. The task requires restructuring `buildMigrationState()` to produce a single root `overview.json` with `{ epics, quests, tasks }`, merging data from three sources into one `JsonEntry`.

**Fix:** Reword the `migrate.ts` task: "Update `buildMigrationState()` to write a single `overview.json` with `{ epics, quests, tasks }` structure instead of separate entries. Merge `epicsContents["overview.json"]`, `questsContents["overview.json"]`, and `tasksContents["overview.json"]` into one root-level `JsonEntry`."

Sources: holistic MINOR, typescript MINOR

---

### MINOR-2: Phase 4 HMAC — stale entries and atomic writes (2 reviewers)

Software-architecture: The migration should use `commitState` or equivalent atomic write to prevent crash between data write and HMAC update. TypeScript: When old overview files are removed, their HMAC entries become stale — migration must add entry for `overview.json` AND remove entries for `quests/overview.json` and `tasks/overview.json`.

**Merged fix:** Add to Phase 4 migration task: (a) Use `commitState` or equivalent atomic write pattern for data+HMAC consistency, (b) explicitly remove stale HMAC entries for old overview paths to prevent `gp verify` phantom mismatches.

Sources: software-architecture MINOR, typescript MINOR

---

### MINOR-3: Phase 3 HMAC verification is a no-op — annotate accordingly (1 reviewer)

The HMAC system walks the entire state tree generically with no path-specific logic. The verification task is correct as defense-in-depth but should be annotated as "verification-only, no code change expected" to prevent the implementer from searching for path-specific HMAC logic.

Source: software-architecture MINOR

---

### MINOR-4: Phase 1 `decision:show` human-readable format unspecified (1 reviewer)

The plan says "Update `decision:show` to include new fields" but doesn't specify formatting. Fix: Display `entityPath` as "Scope: \<path\>" (omit if absent), `reconsiderWhen` as "Reconsider when:" header with bullet items (omit if absent).

Source: holistic MINOR

---

### MINOR-5: Phase 2 `processLearnings` pass-through verification (1 reviewer)

Add a brief note to Phase 2 task 4: "Verified: `processLearnings` in `helpers.ts` passes `LearningEventEntry` objects as-is without field-by-field reconstruction, so `validUntil` flows through automatically once the schema includes it."

Source: typescript MINOR

---

## Summary

| Severity | Count | Key themes |
|----------|-------|------------|
| Critical | 0 | — |
| Important | 5 | Type export decision, complete.ts split, task-lifecycle clarity, mapLearningInputs precision, entityPath docs |
| Minor | 5 | migrate.ts rewrite scope, HMAC stale entries + atomicity, HMAC no-op annotation, decision:show format, processLearnings note |

**To reach 9+:** Resolve the type export decision (IMPORTANT-1), split complete.ts into its own task (IMPORTANT-2), and clarify that task-lifecycle.ts is transitively covered by helper updates (IMPORTANT-3). These three changes address the most-flagged issues across all reviewers.
