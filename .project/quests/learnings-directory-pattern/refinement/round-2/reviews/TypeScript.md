# TypeScript Review — Round 2: Learnings Directory Pattern

## Issues

**[IMPORTANT]** State machine derives slugs but slug derivation needs string manipulation — verify no I/O leakage

Phase 1 tasks direct `slice-complete.ts` and `quest-complete.ts` to "derive slug from `summary`" and "set `file` to `learnings/<slug>.md`." The plan also says the RPC layer "derives the slug, writes the `.md` file." This is duplicated: both the state machine and the RPC layer are described as deriving slugs. Since the RPC layer is the one that writes the `.md` file (per the C1 fix), the slug derivation should happen exclusively in the RPC layer, and the `StateEvent` passed to `reduce()` should already have `file` instead of `detail`. The state machine transition handlers should receive entries with `file` already set — they should not call `deriveSlug()` themselves.

Looking at the current code: `buildCompleteEvent()` in `complete.ts` (line 81-134) constructs the `StateEvent` from `CompleteInput`. Currently it passes `learnings: input.learnings ?? []` directly. Under the new design, the RPC layer should: (1) extract `detail` from each `LearningInput`, (2) call `deriveSlug()`, (3) write the `.md` file, (4) construct a modified learning entry with `file` replacing `detail` before passing to `reduce()`. The plan's Phase 1 tasks for `slice-complete.ts` and `quest-complete.ts` saying "derive slug from `summary`" contradicts the RPC-layer ownership described in the overview and the Phase 1 RPC task.

Fix: Remove slug derivation from the state machine tasks (`slice-complete.ts`, `quest-complete.ts`). The state machine receives entries that already have `file` set (by the RPC layer). The transition handlers simply write those entries to the JSONL via `setEntry()` as they do today, but with `file` instead of `detail`. Only the RPC layer task should mention slug derivation and `.md` file writing.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `learningEntrySchema` union approach needs precise Zod definition

The plan says "Use a union or keep both fields optional: `detail: z.string().min(1).optional()` and `file: z.string().min(1).optional()` with a refinement that at least one is present." With `exactOptionalPropertyTypes: true`, this has a subtlety: Zod's `.optional()` adds `| undefined` to the type, which conflicts with `exactOptionalPropertyTypes` (where `undefined` is not assignable to an optional property). The correct Zod approach is `z.union([schemaWithDetail, schemaWithFile])` using two distinct object schemas — one with `detail: z.string().min(1)` (no `file`), one with `file: z.string().min(1)` (no `detail`). This produces a discriminated union type where each variant has exactly the fields present, avoiding the `undefined` assignment issue.

The plan mentions conditional spread (`...("file" in entry ? { file: entry.file } : {})`) which is correct for constructing objects, but the schema definition itself should be a `z.union` to produce the cleanest inferred type. The plan should specify the exact Zod definition rather than offering two alternatives ("union or keep both fields optional") — these produce different types under strict TS.

Fix: Specify the schema as:
```ts
const learningEntrySchemaLegacy = z.object({ ..., detail: z.string().min(1) }); // no file
const learningEntrySchemaNew = z.object({ ..., file: z.string().min(1) }); // no detail
export const learningEntrySchema = z.union([learningEntrySchemaNew, learningEntrySchemaLegacy]);
```
This produces `LearningEntry = { ..., file: string } | { ..., detail: string }` — clean discriminated union, no optional-vs-undefined issues.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Rollup file path rewriting in the state machine is underspecified for type safety

The plan says the state machine creates "JSONL entries at the target scope with `file` paths pointing to the target's `learnings/` directory." Looking at `handleRollupLearnings()` (line 72-77), it currently iterates `sourceLearnings` and pushes matching entries to the target. Under the new design, each rolled-up entry's `file` path (e.g., `learnings/some-slug.md`) stays the same because it's relative to the scope directory. But the plan says "file paths pointing to the target's `learnings/` directory" — if the path is just `learnings/<slug>.md` (scope-relative), no rewriting is needed. The plan should clarify whether `file` is scope-relative or absolute. If scope-relative (which matches the `learnings/<slug>.md` format in Phase 1), then rollup JSONL entries can keep the same `file` value, and only the RPC layer needs to physically copy the `.md` file to the target scope's directory.

Fix: Explicitly state that the `file` field is scope-relative (always `learnings/<slug>.md`). Rollup JSONL entries keep the same `file` value. The RPC layer handles the physical file copy from `<source-scope>/learnings/<slug>.md` to `<target-scope>/learnings/<slug>.md`. Remove the confusing "paths pointing to the target's directory" language from the state machine tasks — the paths don't change.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `LearningSummaryWithDetail` type construction not specified

The plan mentions "Define a `LearningSummaryWithDetail` type (extending `LearningSummary` with `detail: string`) or use conditional spread." The round-1 merged feedback (I8) flagged this. The plan should commit to one approach. Given that `collectLearnings()` returns `LearningSummary[]` and the inline variant adds `detail`, the cleanest approach is a generic return type or overloaded signature:

```ts
export function collectLearnings(state: ProjectState, scope?: string, inline?: false): LearningSummary[];
export function collectLearnings(state: ProjectState, scope: string, inline: true): LearningSummaryWithDetail[];
```

Or simpler: return `LearningSummary[]` always, and have the caller read the `.md` file content separately when inline is requested (since the state tree already has the markdown entries loaded). This avoids complicating the function signature.

Fix: Pick one approach. The overload signature is type-safe but adds complexity. The simpler "caller reads files" approach keeps `collectLearnings` unchanged and moves inline resolution to the CLI command layer.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 schema tightening should use `z.object` not manual type manipulation

The plan says Phase 4 "Make `file` required and remove the `detail` optional field from `learningEntrySchema`." This is straightforward — replace the `z.union` with the single new schema. But the plan should note that all code paths that construct `LearningEntry` objects must be updated: the `source` and `rollup` fields are injected by the state machine (line 76-79 in `slice-complete.ts`), and with the schema change, the spread pattern `{ ...l, source, rollup: ... }` needs to produce an object matching the new schema (with `file`, without `detail`). Since the RPC layer now strips `detail` and adds `file` before passing to `reduce()`, the `LearningInput` spread in the transition handler will no longer have `detail` — but TypeScript won't flag excess properties in spreads. Verify there are no stale `detail` references in the state machine after Phase 4.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan has addressed the two critical issues from round 1 (INV-003 purity and non-breaking schema transition). However, the slug derivation responsibility is still described in two places (state machine tasks and RPC layer tasks), creating ambiguity about which layer owns it. The Zod union vs optional approach needs to be pinned down for `exactOptionalPropertyTypes` correctness. The rollup file path semantics (scope-relative vs absolute) need explicit specification. To reach 9+: remove slug derivation from state machine tasks, commit to `z.union` for the transition schema, and clarify that `file` is scope-relative.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
