# TypeScript Review -- Round 3: Learnings Directory Pattern

## Issues

**[IMPORTANT]** `StateEvent` type for `COMPLETE_SLICE` / `COMPLETE_QUEST` still uses `LearningInput[]` -- needs `LearningEventEntry[]`

The plan says the RPC layer maps `LearningInput` (with `detail`) to `LearningEventEntry` (with `file`) before building the `StateEvent`. But the plan never explicitly tasks updating the `StateEvent` union in `src/schemas/state-events.ts`. Currently (line 76), `COMPLETE_SLICE` has `learnings: LearningInput[]` and `COMPLETE_QUEST` (line 99) has the same. Under the new design, these should be `learnings: LearningEventEntry[]` since the RPC layer strips `detail` and sets `file` before calling `reduce()`. The `LearningEventEntry` type is defined in Phase 1's schema task, but neither the Phase 1 RPC task nor the schema task mentions updating `state-events.ts`.

This is a compile-time type error: the RPC layer in `buildCompleteEvent()` (line 104-113 in `complete.ts`) constructs the event with `learnings: input.learnings ?? []`. After the change, it would construct entries with `file` instead of `detail`, but the event type still expects `LearningInput[]` (which has `detail`, not `file`). TypeScript will flag this mismatch.

Fix: Add an explicit task to Phase 1 updating `src/schemas/state-events.ts` to change `learnings: LearningInput[]` to `learnings: LearningEventEntry[]` on both `COMPLETE_SLICE` and `COMPLETE_QUEST` event variants. Import `LearningEventEntry` from the learning schema module.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Transition handlers spread `LearningInput` to build `LearningEntry` -- type mismatch after schema change

In `slice-complete.ts` (line 76-79), the current code does:
```ts
const learningEntries: LearningEntry[] = event.learnings.map((l) => ({
    ...l,
    source,
    rollup: l.rollupTo.length > 0,
}));
```
Currently `event.learnings` is `LearningInput[]` (which has `detail`), and the spread produces objects matching `LearningEntry` (which also has `detail`). After the change, `event.learnings` will be `LearningEventEntry[]` (with `file`, no `detail`). The spread `{ ...l, source, rollup }` will produce objects with `file` (from `l`) plus `source` and `rollup` -- this matches the new `LearningEntry` schema (which now has `file` via `learningEntrySchemaNew`).

However, the plan's Phase 1 task for `slice-complete.ts` says "Store `file` field in JSONL entries" but doesn't explicitly note that the type annotation `LearningEntry[]` on the mapped result becomes a union type (`{ ..., file: string } | { ..., detail: string }`). Since the transition handler only produces entries with `file`, the annotation should use `LearningEventEntry` (or the new variant type) rather than the full union `LearningEntry`. Otherwise, downstream code consuming the JSONL entries would need to narrow the union to know whether `file` or `detail` is present.

During the transition period (Phases 1-3), the JSONL content array is typed `LearningEntry[]` which is the union type. This is correct for reading (old entries have `detail`, new entries have `file`). But when constructing new entries, the transition handler should annotate the local array with the narrower `LearningEventEntry` type (or equivalent) before passing to `setEntry()`, which accepts `LearningEntry[]` (the union). This is type-safe because `LearningEventEntry` is a member of the union.

Fix: In the Phase 1 tasks for `slice-complete.ts` and `quest-complete.ts`, note that the local `learningEntries` array should be typed as the new-format variant (e.g., `Array<z.infer<typeof learningEntrySchemaNew>>` or `LearningEventEntry[]`), not the full union. The `setEntry()` content array accepts the union, so the narrow type is assignable.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `deriveSlug` return type should be branded or validated at the call site

The plan specifies `deriveSlug(summary: string, existingSlugs: Set<string>): string`. The return value is used to construct file paths (`learnings/${slug}.md`). A plain `string` return type provides no compile-time guarantee that the slug is valid (non-empty, kebab-case, no path traversal). Consider returning a branded type like `type Slug = string & { readonly __slug: unique symbol }` to prevent accidental use of raw strings as slugs. Alternatively, since the function is a pure utility with a narrow contract, the unit tests (which the plan correctly specifies) may be sufficient -- but the plan should at minimum note that the slug must be validated non-empty after truncation (a summary of all special characters could truncate to an empty string).

Fix: Add a note to the `deriveSlug` task that the function should throw or return a fallback slug (e.g., `"learning-<index>"`) if the derived slug is empty after normalization. This is an edge case but would cause a file named `learnings/.md` otherwise.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 context bundling task says "include the `file` field in the projection" but `LearningSummary` interface needs updating

The `LearningSummary` interface in `src/core/context/types.ts` (line 32-37) currently has `category`, `summary`, `tags`, `source`. The plan's Phase 2 task says "include the `file` field in the projection" for `collectLearnings()`. This requires adding `file?: string` to `LearningSummary` (optional during transition, since old entries won't have it). With `exactOptionalPropertyTypes: true`, the `projectLearning()` function in `learnings.ts` (line 61-68) would need conditional spread to avoid assigning `undefined` to the optional `file` property:

```ts
return {
    category: entry.category,
    summary: entry.summary,
    tags: entry.tags,
    source: entry.source,
    ...("file" in entry ? { file: entry.file } : {}),
};
```

The plan's Phase 2 task should specify this pattern explicitly, since the `LearningEntry` type is now a union and narrowing is required to access `file`.

Fix: Add explicit guidance to the Phase 2 context bundling task about narrowing the `LearningEntry` union (using `"file" in entry`) before including `file` in the projection, and about using conditional spread for `exactOptionalPropertyTypes` compliance.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 2's three IMPORTANT issues (slug derivation ownership, Zod union definition, scope-relative file paths) have all been cleanly resolved in the updated plan. The overview and Phase 1 tasks now clearly specify RPC-layer ownership of slug derivation, the `z.union` approach for the transition schema, and scope-relative `file` paths with verbatim rollup. The remaining issues are: (1) a missing task to update `state-events.ts` types, which will cause a compile error, (2) type annotation precision in transition handlers during the union period, and (3) two minor edge cases around slug validation and `LearningSummary` projection. To reach 9+: add the `state-events.ts` update task and note the union narrowing patterns.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
