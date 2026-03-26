# API Contract Review (Round 2)

Reviewer: API Contract Reviewer
Architecture: skills-cli-integration

## Prior Issues Resolution

All 16 issues from round 1 have been addressed:

1. **CRITICAL: `--name` flag in conventions doc** -- Fixed. Conventions doc now uses `--epic`, `--slice`, `--quest` throughout.
2. **CRITICAL: `COMPLETE_QUEST` type names** -- Fixed. `state-machine-api.md` now uses `LearningInput[]` and `ArchitectureDeltaInput[]` consistently.
3. **IMPORTANT: `state` command missing from `commands-api.md`** -- Fixed. `state` is now in Global Commands with `--json`, `--query`, `--offset`, `--limit` flags.
4. **IMPORTANT: `--offset`/`--limit` not in flag tables** -- Fixed. Documented as `state`-specific flags in the Global Commands table.
5. **IMPORTANT: `BeginResult` missing `context`/`paths`** -- Architecture spec is the forward target; implementation will catch up during this epic.
6. **IMPORTANT: `CompleteResult` missing `paths`** -- Same as above; spec is correct, implementation is deferred.
7. **IMPORTANT: `Target` type missing `project`/`rollup` variants** -- Fixed. `Target` now includes `{ type: 'project' }` and `{ type: 'rollup'; from: string; to: string }`.
8. **IMPORTANT: `show` commands missing `artifacts` field** -- `cli-changes.md` section 2 defines this as a planned enhancement for this epic. Acceptable as-is.
9. **IMPORTANT: `StatusResult` not reflecting file arrays** -- Fixed. `StatusResult` now has `{ count: number; files: string[] }` shape for architecture, research, brainstorm, prototypes.
10. **IMPORTANT: `rollup` in `begin()` mismatch** -- Fixed. `rollupLearnings()` is now a dedicated function with `RollupResult` return type, factored out of `begin()`.
11. **MINOR: `activity:list` reference** -- Fixed. Conventions doc now uses `goodplan state --json --query '.["activity-log.jsonl"]'` instead.
12. **MINOR: `CREATE_QUEST` missing `goal`** -- Fixed. `state-machine-api.md` now includes `goal: string` on `CREATE_QUEST`.
13. **MINOR: `detail` type inconsistency** -- `StateError.detail` remains `Record<string, unknown>` in the spec. `ErrorOutput` schema in implementation allows `string | Record<string, unknown>`. The broader shape at the output boundary is acceptable since `StateError` is internal; the Commands layer can wrap string details.
14. **MINOR: `--archive` flag** -- Fixed. Removed entirely per change #9.
15. **MINOR: `submit-plan` example with content payload** -- Fixed. Conventions doc now shows `stdin: "" | goodplan submit-plan`.
16. **MINOR: `DecisionEntry` missing `context` field in jq example** -- Fixed. The jq example using `.context` has been removed.

## New Issues

### 1. IMPORTANT: `conventions.md` routing table omits `start-*` commands and is inconsistent with `rpc-layer-api.md`

**File:** `conventions.md` lines 10-14
**Resolution:** Update the routing table to include all three routing types

The conventions doc defines three command routing types but the description for read-only workflow commands lists `start-*`, `status` as routing through RPC Layer with no state machine. However, `rpc-layer-api.md` line 120-121 shows `start-*` commands routing to `startContext()` which is a peer module, not the RPC Layer proper. The Command-to-RPC Routing table (line 120) routes `start-*` to `startContext(phase, ...)` and the context-api.md architecture diagram (line 12-15) shows Commands connecting to Context directly. The routing description should clarify: `start-*` commands go Commands -> Context module (peer of RPC), not Commands -> RPC -> Data Layer.

---

### 2. IMPORTANT: `submit-refinement` disambiguates via `--slice`/`--quest` but `submit-plan` and `submit-implementation` do not document disambiguation

**File:** `commands-api.md` lines 50-52, 131-136
**Resolution:** Document disambiguation for all `submit-*` commands that serve both slice and quest

The command-to-event mapping table (line 50) notes that `submit-plan` maps to `COMPLETE_PLAN` or `COMPLETE_QUEST_PLAN` but does not explain how to disambiguate. Only `submit-refinement` (line 51) explicitly mentions `--slice` or `--quest` flags. The sub-agent command signatures (lines 132-136) show `--slice <name>|--quest <name>` syntax for all `submit-*` and `start-*` commands, which is correct. But the mapping table should be consistent -- either all submit commands note the disambiguation or none do.

---

### 3. IMPORTANT: `SubmitPhase` type uses `'refinement'` but `BeginPhase` uses `'refine-plan'` for the same conceptual phase

**File:** `rpc-layer-api.md` lines 35-60
**Resolution:** Document the rationale or align naming

`BeginPhase` uses `'refine-plan'` (line 44) which maps to `BEGIN_REFINEMENT` / `BEGIN_QUEST_REFINEMENT`. `SubmitPhase` uses `'refinement'` (line 54) which maps to `COMPLETE_REFINEMENT_ROUND` / `COMPLETE_QUEST_REFINEMENT_ROUND`. The asymmetry is understandable (begin = the action of starting, submit = the phase being submitted), but it means the Commands layer must maintain a mapping between the command verb (`refine-plan`) and the submit phase name (`refinement`). This is not called out anywhere and could cause confusion during implementation. A brief note explaining the naming convention would prevent mistakes.

---

### 4. MINOR: `context-api.md` and `rpc-layer-api.md` duplicate the per-phase content priority table

**File:** `context-api.md` lines 58-69, `rpc-layer-api.md` lines 336-347
**Resolution:** Designate one as the source of truth and cross-reference from the other

Both files contain identical per-phase content priority tables. If one is updated without the other, they will drift. `context-api.md` should be the source of truth (it owns context bundling), and `rpc-layer-api.md` should reference it.

---

### 5. MINOR: `ContextBundle` is defined identically in both `context-api.md` and `rpc-layer-api.md`

**File:** `context-api.md` lines 39-44, `rpc-layer-api.md` lines 289-295
**Resolution:** Same as issue 4 -- designate a single source of truth

The `ContextBundle` interface definition is duplicated verbatim. Cross-reference from `rpc-layer-api.md` to `context-api.md`.

---

### 6. MINOR: `plan-created` to `COMPLETE_REFINEMENT_ROUND` skip path in transition table has no content guard

**File:** `transition-tables.md` line 74
**Resolution:** Add a note about whether `plan.md` existence is implicitly guaranteed

The transition table shows `plan-created` + `COMPLETE_REFINEMENT_ROUND` -> `plan-refined` (skip path: first round passes). This happens when refinement scores pass on the first round. However, there is no explicit `hasChild` guard for `plan.md` on this path. It is likely implicitly guaranteed since reaching `plan-created` requires `COMPLETE_PLAN` which has the `plan.md` guard, but the skip path introduces `COMPLETE_REFINEMENT_ROUND` directly from `plan-created` without `BEGIN_REFINEMENT` in between. A note confirming this is safe (because `plan-created` implies `plan.md` exists) would help implementers.

---

### 7. MINOR: `cli-interaction-conventions.md` `stdin: ""` syntax is not standard shell

**File:** `cli-interaction-conventions.md` lines 98-99, 151, 158
**Resolution:** Clarify that `stdin: ""` is a Claude Code tool API convention, not shell syntax

The conventions doc shows `stdin: "" | goodplan ...` as the pattern for empty stdin. This is valid in Claude Code's tool calling context but is not valid shell syntax. Since skills are Claude Code prompts (not shell scripts), this is functionally correct, but it could confuse a reader who interprets the examples as shell commands. A brief note like "Note: `stdin: ""` is the Claude Code tool API convention for piping empty input" would clarify.

---

### 8. MINOR: `StatusResult` artifact shapes are inconsistent -- some use `{ count, files }` objects, others use plain numbers

**File:** `rpc-layer-api.md` lines 353-367
**Resolution:** Document the rationale for the split

`StatusResult.artifacts` uses `{ count: number; files: string[] }` for `architecture`, `research`, `brainstorm`, and `prototypes`, but plain `number` for `decisions`, `learnings`, `completedSlices`, and `totalSlices`. The rationale is likely that the file-array items have LLM-readable file names while the numeric items are JSONL record counts. This is reasonable but should be stated explicitly so implementers don't accidentally flatten or expand the wrong fields.

## Score: 9/10

The architecture has improved substantially from round 1. All 16 prior issues are resolved. The cross-file consistency is now strong: `state-machine-api.md`, `rpc-layer-api.md`, `commands-api.md`, `context-api.md`, and `cli-interaction-conventions.md` align on type names, flag names, command surfaces, and event payloads. The implementation code (`state-events.ts`, `main.ts`, `error-output.ts`) matches the spec for all types that have been built. The new `context-api.md` cleanly defines the Context module's position and contracts.

Remaining issues are minor cross-reference hygiene (duplicated tables between context-api and rpc-layer-api), a naming asymmetry in `BeginPhase` vs `SubmitPhase` that should be documented, and a routing clarification in the conventions doc. None of these would cause skills to construct invalid CLI invocations.

**What's working well:**
- Entity-specific flags (`--epic`, `--slice`, `--quest`) are consistent everywhere
- `StateEvent` union in architecture matches `src/schemas/state-events.ts` exactly
- `Target` type properly includes all variants including `project` and `rollup`
- `COMPLETE_QUEST`/`COMPLETE_SLICE` use correct input types (`LearningInput`, `ArchitectureDeltaInput`)
- Error contracts are consistent: structured `{ error: { code, message, detail? } }` with exit codes 1/2/3
- `goodplan state` command is properly specified with flags, serialization format, and jq examples
- Cross-cutting operations (`rollupLearnings`, `addVerification`, `createDecision`) are cleanly factored as dedicated functions
- Versioning strategy is well-defined with clear compatibility rules

## Summary

- Critical: 0
- Important: 3
- Minor: 5
