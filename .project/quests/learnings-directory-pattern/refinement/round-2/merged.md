# Merged Feedback — Round 2

## CRITICAL Issues

None.

## IMPORTANT Issues

**I1. Slug derivation described in both state machine and RPC layer — contradictory ownership**
(Holistic, Software Architecture, TypeScript — all three flag this)

Phase 1 tasks for `slice-complete.ts` and `quest-complete.ts` say "derive slug from `summary`" and "set `file` to `learnings/<slug>.md`." The overview and RPC layer task say the RPC layer derives the slug, writes the `.md` file, and constructs the `StateEvent` with `file` instead of `detail`. These contradict each other. The state machine must not derive slugs — it should receive entries with `file` already set by the RPC layer.

Fix: Remove slug derivation from the state machine task descriptions (`slice-complete.ts`, `quest-complete.ts`). The state machine receives entries that already have `file` set (by the RPC layer) and stores them via `setEntry()`. Only the RPC layer task should mention slug derivation and `.md` file writing.

Resolution: DIRECTLY_ACTIONABLE

---

**I2. `LearningInput` type gap — event payload needs `file` field, not `detail`**
(Holistic)

`COMPLETE_SLICE` and `COMPLETE_QUEST` events carry `learnings: LearningInput[]` where `LearningInput` has `detail: z.string()`. If the RPC layer derives slugs and constructs `file` paths before building the event, then `LearningInput` is the wrong type for the event payload. The plan needs an intermediate type or must change the event type to carry entries with `file` instead of `detail`.

Fix: Introduce `LearningEventEntry` (with `file` instead of `detail`) for the state event payload, or transform `LearningInput[]` into the new schema variant before building the event. The RPC layer maps `LearningInput` -> `LearningEventEntry` (deriving slug, writing `.md`, setting `file`), and the event carries `LearningEventEntry[]`.

Resolution: DIRECTLY_ACTIONABLE

---

**I3. RPC layer file-write sequencing contradicts itself (before vs after reduce)**
(Software Architecture, TUI and CLI)

The plan says the RPC layer "(1) extracts `detail`, (2) derives the slug, (3) writes the `.md` file to disk, (4) constructs the `StateEvent` with `file` instead of `detail`." This means `.md` files are written *before* `reduce()`. But step 4 (constructing the event) must happen *before* `reduce()` too — so file writing happens pre-reduce. If `reduce()` fails, orphan `.md` files remain on disk. The current RPC pattern is load -> build event -> reduce -> commit.

Fix: Reorder: (1) derive slug and set `file` on the event payload (no disk write), (2) call `reduce()`, (3) on success write `.md` files to disk, (4) `commitState()`. This preserves the load-reduce-commit pattern and avoids orphan files. The `detail` text remains available from the original input payload for writing after reduce succeeds.

Resolution: DIRECTLY_ACTIONABLE

---

**I4. `file` path semantics (scope-relative vs absolute) unspecified — affects rollup logic**
(Software Architecture, TypeScript, Holistic)

The plan says rollup creates "JSONL entries at the target scope with `file` paths pointing to the target's `learnings/` directory." But if `file` is scope-relative (always `learnings/<slug>.md`), the path doesn't change during rollup — only the scope context changes. The plan's description is misleading.

Fix: Explicitly state that `file` is scope-relative (always `learnings/<slug>.md`). Rolled-up JSONL entries keep the same `file` value verbatim. The RPC layer handles the physical file copy from `<source-scope>/learnings/<slug>.md` to `<target-scope>/learnings/<slug>.md`. Remove "paths pointing to the target's directory" language from the state machine task.

Resolution: DIRECTLY_ACTIONABLE

---

**I5. Zod union schema needs precise definition for `exactOptionalPropertyTypes`**
(TypeScript)

The plan says "use a union or keep both fields optional" with a refinement. Under `exactOptionalPropertyTypes: true`, Zod's `.optional()` adds `| undefined` which conflicts. The correct approach is `z.union([schemaWithDetail, schemaWithFile])` using two distinct object schemas — producing a clean discriminated union type.

Fix: Specify the schema as:
```ts
const learningEntrySchemaLegacy = z.object({ ..., detail: z.string().min(1) });
const learningEntrySchemaNew = z.object({ ..., file: z.string().min(1) });
export const learningEntrySchema = z.union([learningEntrySchemaNew, learningEntrySchemaLegacy]);
```

Resolution: DIRECTLY_ACTIONABLE

---

**I6. `learning:list` human output format for `file` field still unspecified**
(TUI and CLI)

The plan says "optionally show the file path alongside the summary" without specifying the format or whether a flag controls it. Current human format is `{category} {summary} ({source})`.

Fix: Specify that the `file` field is omitted from human output (JSON-only). File paths are primarily useful for programmatic consumers using `--json`. This keeps human output clean and is simplest.

Resolution: DIRECTLY_ACTIONABLE

---

**I7. Phase 2 Expected Behavior "before" check not falsifiable**
(Holistic)

The "before" check `goodplan state --json --query '.learnings["foo.md"]'` returning null doesn't test something that changes — `assembleState` already picks up `.md` files in directories. The "before" should test something Phase 2 actually changes, e.g., that `learning:list --json` does NOT include a `file` field.

Resolution: DIRECTLY_ACTIONABLE

---

**I8. Missing skill reference files in Phase 3 task list**
(Agent Skill)

Two references are missed:
- `skills/create-plan/references/guidance.md` line 13: bare `learnings.md` in Context Loading list
- `skills/audit-architecture/SKILL.md` line 116: second bare `learnings.md` reference (plan only addresses line 69)

Fix: Add an explicit task for `create-plan/references/guidance.md`. Note both occurrences (lines 69 and 116) in the `audit-architecture/SKILL.md` task.

Resolution: DIRECTLY_ACTIONABLE

---

**I9. Phase 2 `state --inline` verification command incomplete**
(TUI and CLI)

The Expected Behavior says the state query "returns markdown content (with `--inline`) or `true` (without)" but the verification command doesn't include `--inline`. Add `--inline` explicitly to the command that expects markdown content.

Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**M1. Phase 4 schema tightening order risk** (Holistic, Software Architecture)
Schema tightening before migration runs will cause `assembleState()` validation failures on existing data. Reorder: migration logic first, verification that all JSONL entries pass the tightened schema, then schema tightening last.
Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 1 `slice-complete.ts` and `quest-complete.ts` share identical learnings processing** (Software Architecture)
A shared helper function (e.g., in `transitions/helpers.ts`) would reduce duplication. Current code already has shared helpers like `appendActivityLog`.
Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 3 Expected Behavior grep patterns miss bare `learnings.md` references** (Agent Skill)
The after-check `grep -rc '\.project/learnings\.md' skills/` won't catch bare `learnings.md` (without `.project/` prefix) like line 116 of `audit-architecture/SKILL.md`. Add a broader grep: `grep -c 'learnings\.md' skills/audit-architecture/SKILL.md` with expected count adjustments.
Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 3 skill task descriptions should distinguish read-vs-template references** (Holistic)
Some skills read `.project/learnings.md` for content (need CLI replacement), others mention `learnings.md` in CLAUDE.md template instructions (need path update). The plan treats both the same ("Replace reference") which could confuse implementers.
Resolution: DIRECTLY_ACTIONABLE

**M5. `create-architecture/SKILL.md` Step 9 line 302 `ls` command needs specific change noted** (Agent Skill)
The actual content is an `ls` command checking `learnings.md` — task should specify changing to `learnings/` directory check, and updating the accompanying comment.
Resolution: DIRECTLY_ACTIONABLE

**M6. Phase 1 Expected Behavior grep patterns may false-positive** (Holistic)
`grep -c 'file: z.string' src/schemas/records/learning.ts` could match unrelated schemas. More precise after-checks: `grep -c 'deriveSlug' src/util/slug.ts` for utility existence, `grep -c 'deriveSlug' src/core/rpc/complete.ts` for RPC usage.
Resolution: DIRECTLY_ACTIONABLE

**M7. `learning:list --json` breaking change not documented** (TUI and CLI)
Phase 2 says "breaking change, accepted pre-1.0" but no task to document in changelog. Add a task to note the breaking change.
Resolution: DIRECTLY_ACTIONABLE

**M8. Phase 4 migration error paths lack specific exit codes** (TUI and CLI)
Per INV-007: corrupt `learnings.md` = validation error (exit 2), missing file = data error (exit 1). Verification should assert specific codes, not just "non-zero".
Resolution: DIRECTLY_ACTIONABLE

**M9. Migration cleanup of `learnings.md` from `PROJECT_MARKDOWN_FILES` needs rationale** (Holistic)
The removal from `PROJECT_MARKDOWN_FILES` in `migrate.ts` should note that migration now converts to per-file format instead of copying verbatim.
Resolution: DIRECTLY_ACTIONABLE

**M10. `LearningSummaryWithDetail` type construction not specified** (TypeScript)
Plan should commit to one approach: either overloaded `collectLearnings` signature or simpler "caller reads files" approach keeping the function unchanged.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

All 19 issues (9 IMPORTANT + 10 MINOR) are directly actionable.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **Slug derivation ownership**: Holistic flagged contradictory descriptions (state machine vs RPC layer both deriving slugs). Software Architecture and TypeScript flagged the same issue with more specificity. All three agree the RPC layer should be the sole owner. Merged as I1 using the most specific fix (Software Architecture's formulation).

2. **RPC file-write timing**: Software Architecture said write pre-reduce and clean up on error OR defer to post-reduce. TUI and CLI also flagged the contradiction. Both recommend post-reduce writing. Merged as I3 with the post-reduce approach since it preserves the existing load-reduce-commit pattern.

3. **`file` path semantics**: Software Architecture and TypeScript both flagged the rollup path ambiguity. Software Architecture proposed scope-relative. TypeScript agreed. Holistic raised the same concern differently ("RPC layer handles actual file copy"). All aligned on scope-relative. Merged as I4.

## Unresolved (USER_INPUT required)

None.
