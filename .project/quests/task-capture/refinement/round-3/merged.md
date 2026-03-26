# Merged Feedback — Round 3

## CRITICAL Issues

None.

## IMPORTANT Issues

**[IMPORTANT-1] `buildCreateEvent()` must NOT receive a `create-task` case — use `buildBeginEvent()` instead**

The Phase 1 exhaustive-switch list incorrectly includes `buildCreateEvent()` (in `begin.ts`) as a site that needs a new `"create-task"` case. `buildCreateEvent()` handles the `"create"` phase with target-type dispatch and is not the right place for `"create-task"`, which is its own dedicated `BeginPhase`. The correct site is a new `case "create-task"` in `buildBeginEvent()` that directly constructs the `CREATE_TASK` event — which Phase 2 already describes correctly. Remove `buildCreateEvent()` from the exhaustive-switch item list to avoid dead code or a confusing branch.

Source: holistic
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2] CONVERT_TASK epic creation spec is missing four required `epicSchema` fields**

Phase 1 CONVERT_TASK handler step 5 specifies the epic JSON as `{ name, goal, status: "created", created: ts, updated: ts }`. The `epicSchema` requires four additional fields that are absent: `verifications: []`, `refinement: null`, `sliceSequence: []`, and `activated: null`. Without these, the created epic will fail Zod validation at `commitState` time (INV-005). The reference implementation is `handleCreateEpic` which writes `{ name, status: "created", goal, verifications: [], refinement: null, sliceSequence: [], created, activated: null, updated }`. The plan must specify the full epic shape in step 5.

Source: software-architecture, api-contract (corroborating)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-3] `goal` concatenation in CONVERT_TASK is unspecified — produces malformed strings when `description` is absent or undefined**

Both quest and epic creation in CONVERT_TASK step 5 express `goal` as `task.title + description`. If `description` is `undefined` (it's an optional field on `taskSchema`), naive concatenation produces `"Fix error handlingundefined"`. The plan must specify the exact construction: use `task.title` alone when `description` is absent, or `task.title + "\n\n" + description` (or another explicit separator) when present — with a guard or conditional expression. This affects both the quest and epic creation paths.

Source: holistic (slugification/derivation concern), typescript (goal concatenation), api-contract (concatenation format)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4] `addEpicToOverview` helper signature and return type must be made explicit**

The plan says to create `addEpicToOverview` in `helpers.ts` to parallel `addQuestToOverview` but doesn't specify the signature or return type. The helper must: accept `(state: ProjectState, epicName: string, status: string, ts: string)`, produce overview items shaped `{ name, status, created, completed: null }` (matching `handleCreateEpic`'s existing pattern), operate on `epics/overview.json` instead of `quests/overview.json`, and return `ProjectState`. Crucially, it must NOT add a `title` field to epic overview items (epics don't have titles). Make the signature explicit in the plan.

Source: typescript
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-5] Slugification logic for `/capture` skill's `name` derivation must be specified**

`taskCreateInputSchema` requires `name: string`. The `/capture` skill auto-derives this by slugifying the task title. Without an explicit spec, different implementations produce inconsistent slugs (`"fix-error-handling"` vs `"fix_error_handling"` vs `"fixerrorhandling"`). The plan should specify the slugification rule (e.g., lowercase, replace spaces and special characters with hyphens, collapse consecutive hyphens, truncate to N chars) either in the skill's SKILL.md or as a shared utility function. There is likely no existing slugify utility to reuse.

Source: holistic
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**[MINOR-1] `previousStatus` in Expected Behavior must be `"none"`, not `null`**

Phase 2 Expected Behavior shows `task:create` returning `previousStatus: null`. The `BeginResult.previousStatus` field is typed as `string` (not `string | null`), and `buildBeginResult()` returns the string `"none"` when the entity does not yet exist (matching the `oldEpic?.status ?? "none"` pattern). Update the Expected Behavior to show `previousStatus: "none"`.

Source: holistic, api-contract (corroborating)
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] `mapToBeginPhase()` and `resolveForBeginPhase()` live in `paths.ts`, not `begin.ts`**

Phase 1 task item 7 in the exhaustive-switches list states `mapToBeginPhase()` is in `src/core/rpc/begin.ts`. This is incorrect — both `mapToBeginPhase()` and `resolveForBeginPhase()` live in `src/core/rpc/paths.ts`. `buildBeginEvent()` alone lives in `begin.ts`. Correct item 7 to reference `paths.ts`.

Source: software-architecture
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] `convertedTo`, `droppedReason`, and `description` on task entity must use conditional spread (not `undefined` values)**

The plan correctly documents the conditional spread pattern for the overview `title` field but does not repeat the reminder for `convertedTo`, `droppedReason`, and `description` on the task entity itself. With `exactOptionalPropertyTypes: true`, setting any of these to `undefined` is invalid — they must be omitted entirely via conditional spread (e.g., `...(description ? { description } : {})`). Explicitly note this requirement in the CREATE_TASK handler spec.

Source: typescript
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4] `task:list` JSON output shape should be defined as a named Zod schema (`taskListResultSchema`)**

The plan defines `taskCreateInputSchema` in `src/schemas/commands/task.ts` but doesn't specify an output schema for `task:list`. For INV-006 compliance and type safety, the `{ items, filter: "open" | "all" }` response shape should be captured as `taskListResultSchema` (analogous to `statusResultSchema` in `src/schemas/commands/status.ts`). This keeps the contract explicit and enables `goodplan schema` to expose it.

Source: typescript
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5] `task:list` `registerCommand()` must include `all` in its `args` record and description**

The plan's Phase 2 `schema.ts` registration for `task:list` must: (a) include `all` as an optional boolean arg (mirroring how `slice:list` includes `epic`), so `goodplan schema --json` shows the `--all` flag (INV-006 compliance); and (b) update the description to explain the default filter and `filter` field in JSON output (e.g., "List tasks. Defaults to open tasks only; use --all to include converted/dropped. JSON includes filter field.").

Source: tui-cli
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-6] CONVERT_TASK step 5 goal separator must be explicit for the `goal` field contract**

The API contract should document the exact format for `goal` construction (same as IMPORTANT-3 above, but specifically for the schema contract perspective). The `questSchema` requires `goal: z.string().min(1)`, so the concatenation must be non-empty. Document the exact derivation rule in the Expected Behavior section.

Source: api-contract
Note: This is a sub-aspect of IMPORTANT-3. If IMPORTANT-3 is resolved, this is automatically resolved.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-7] Phase 2 verification should explicitly call out `--json` flag verification**

The verification section describes a manual human-readable flow. Since the primary consumers are LLM skills using `--json`, the verification section should explicitly instruct: run the full create/list/show/drop/convert cycle with `--json` flags and verify output shapes match the Expected Behavior section. This is the most direct verification for CLI commands.

Source: tui-cli
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-8] Phase 1 goal concatenation in CONVERT_TASK step 5 needs separator clarification**

Step 5 goal construction (`task.title + description`) could produce `"Fix error handlingmigrate.ts has wrong error codes"` without a separator. This is a sub-aspect of IMPORTANT-3 (applies even if description is present but no separator is specified). Covered by resolving IMPORTANT-3.

Source: holistic
Note: Fully covered by IMPORTANT-3 resolution.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

All issues are directly actionable. Count: 8 distinct items (MINOR-6 and MINOR-8 resolve via IMPORTANT-3).

1. Remove `buildCreateEvent()` from exhaustive-switch list; use `buildBeginEvent()` for `"create-task"` (IMPORTANT-1)
2. Add four missing epic fields to CONVERT_TASK step 5: `verifications: []`, `refinement: null`, `sliceSequence: []`, `activated: null` (IMPORTANT-2)
3. Specify explicit `goal` construction rule with undefined guard in CONVERT_TASK step 5 (IMPORTANT-3 / resolves MINOR-6, MINOR-8)
4. Specify `addEpicToOverview` signature: `(state, epicName, status, ts) => ProjectState`, item shape `{ name, status, created, completed: null }`, no `title` field (IMPORTANT-4)
5. Specify slugification rule for `/capture` skill's `name` derivation from title (IMPORTANT-5)
6. Change Expected Behavior `previousStatus: null` → `previousStatus: "none"` (MINOR-1)
7. Correct file attribution: `mapToBeginPhase()` and `resolveForBeginPhase()` are in `paths.ts`, not `begin.ts` (MINOR-2)
8. Add conditional spread reminder for `convertedTo`, `droppedReason`, `description` on task entity (MINOR-3)
9. Add `taskListResultSchema` to `src/schemas/commands/task.ts` for `task:list` output shape (MINOR-4)
10. Add `all` arg to `task:list` `registerCommand()` and update description (MINOR-5)
11. Update verification section to explicitly run `--json` flag cycle (MINOR-7)

## RESEARCH_NEEDED

None.

## Contradictions Resolved

**1. `previousStatus` value for creation (`null` vs `"none"`)**
holistic and api-contract both flag this. holistic says `buildBeginResult()` defaults to `"none"` (line 311 of begin.ts). api-contract corroborates with the `oldEpic?.status ?? "none"` pattern. Both agree the correct value is `"none"`. No contradiction — both reviewers concur. Expected Behavior should be updated to `"none"`.

**2. `addEpicToOverview` item shape (should `title` be included?)**
typescript explicitly notes it must NOT add a `title` field to epic overview items. holistic does not address this. Deferring to typescript (domain specialist on type shapes). Epic overview items use `{ name, status, created, completed: null }` — no `title`.

**3. `goal` concatenation format**
holistic, typescript, and api-contract all flag this with slightly different proposed separators. None contradict each other — all agree a separator/guard is needed. The plan should pick one format and document it explicitly (e.g., `task.title + (description ? "\n\n" + description : "")`).

## Unresolved (USER_INPUT required)

None. All issues are DIRECTLY_ACTIONABLE.
