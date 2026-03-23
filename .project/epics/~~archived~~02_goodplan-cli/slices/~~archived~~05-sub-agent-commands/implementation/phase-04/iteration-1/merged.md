# Merged Review: Phase 04 — Context Bundling Module

**Consensus Score: 8/10** | Critical: 0, Important: 4, Minor: 4

---

## Important Issues

### I1. Double `as unknown as` casts in `priorities.ts` undermine type safety

Raised by: Generalist, SoftwareArchitecture, TypeScript (most specific: TypeScript)

`getPriorityTable` returns `PRIORITY_TABLES[phase] as unknown as ContentSource[]` and `resolveSourcePath` casts back `(source as unknown as InternalSource).path`. The internal `InternalSource` type uses `(rt: ResolvedTarget) => string | undefined` while the public `ContentSource.path` declares `(target: Target) => string`. These are genuinely incompatible signatures — the double cast hides that no consumer could call `source.path(target)` correctly.

Fix: Either (a) change `ContentSource.path` to `string | ((rt: ResolvedTarget) => string | undefined)` and drop the `InternalSource` type entirely, or (b) keep the split but use a proper adapter function in `resolveSourcePath` rather than raw casts. Option (a) is simpler.

**Files**: `src/core/context/priorities.ts:163-176`, `src/core/context/types.ts:44`

---

### I2. Priority tables diverge from architecture spec for several phases

Raised by: Generalist, SoftwareArchitecture (most specific: SoftwareArchitecture)

`rpc-layer-api.md` and `transition-tables.md` specify content sources the implementation omits:

1. **explore**: Spec says "completed epics, completed quests, pending quests" — entirely absent from `exploreSources`. Implementation has only epic goal, research, brainstorm, conventions.
2. **plan / implementation / complete**: Spec says "active decisions, recent learnings" in the inline priority list. Implementation handles these via `collectDecisions`/`collectLearnings` into separate top-level fields, meaning they are never inlined under the `--inline` budget. This may be intentional (structured data, not markdown), but is undocumented.
3. **refine-architecture**: Spec says "active decisions" in priority list — absent (handled by `collectDecisions` instead).
4. **slices / refine-slices**: Spec says "learnings" in priority list — absent.
5. **complete**: Spec says "implementation results" as a content source — not present.

The decisions/learnings-via-separate-collector pattern appears to be a deliberate architectural choice but is undocumented. The `explore` phase's missing quest/epic history has no code path at all.

**Files**: `src/core/context/priorities.ts:71-142`

---

### I3. Unsafe `as` cast in `learnings.ts` bypasses category validation

Raised by: TypeScript

`collectLearnings` casts `entry.category as LearningSummary["category"]` without verifying the value is one of the four allowed literals (`"domain" | "worked" | "didnt-work" | "do-differently"`). `LearningEntry` schema defines `category` as `z.string().min(1)` (open string), so any string passes Zod validation. A stored learning with a non-standard category silently produces an invalid `LearningSummary`.

Fix: Define valid categories as a `Set` and filter/skip non-matching entries, or use a type-safe narrowing check. Consistent with INV-005 (schema validation at boundaries).

**Files**: `src/core/context/learnings.ts:50`

---

### I4. `complete` phase in `submit.ts` throws but is not tested

Raised by: Generalist

`buildSubmitEvent` correctly throws for `phase === 'complete'`, but there is no test for this error path. The addition of `"complete"` to `SubmitPhase` was part of this phase's tasks.

**Files**: `src/core/rpc/submit.ts:107-110`

---

## Minor Issues

### M1. `resolveContentSource` extracts `goal` field with insufficient narrowing

Raised by: Generalist, TypeScript (most specific: TypeScript)

`collect.ts` line 103-105 does `(content as { goal: string }).goal` after checking `"goal" in content`. The `in` operator confirms presence but not type. For soundness: narrow with `typeof (content as Record<string, unknown>).goal === "string"` before using.

**Files**: `src/core/context/collect.ts:103-108`

---

### M2. `DecisionSummary` allows `superseded` status but `collectDecisions` always filters it out

Raised by: Generalist

The type permits `superseded`, but it is never returned. Either remove `superseded` from the type or document the filtering invariant on the type itself.

**Files**: `src/core/context/types.ts:22`, `src/core/context/decisions.ts:22-23`

---

### M3. Test files import from `data/tree.js` re-export shim instead of canonical `tree.js`

Raised by: SoftwareArchitecture, TypeScript

All context test files import `ProjectState` / `DirectoryEntry` from `../../../src/core/data/tree.js`, while the source module imports from `../tree.js`. Functionally equivalent (re-export shim), but if the shim changes, tests could break independently of source. Note: this matches the existing test convention elsewhere in the codebase.

**Files**: `tests/unit/context/collect.test.ts:8`, `decisions.test.ts:3`, `learnings.test.ts:3`, `startContext.test.ts:3`

---

### M4. `explore`/`architecture` path functions don't guard against undefined `epicName`

Raised by: SoftwareArchitecture

Path functions like `` (rt) => `epics/${epicName(rt)}/epic.json` `` will produce `epics/undefined/epic.json` if `epicName` returns `undefined`. Other phases guard against this by returning `undefined` from the path function. Explore/architecture are epic-scoped so this may never trigger, but it is inconsistent with the defensive pattern elsewhere.

**Files**: `src/core/context/priorities.ts:106`

---

## Acknowledged / No Action Required

- **`SubmitPhase` includes `"complete"` not in spec** (TypeScript M): The plan calls for a Phase 5 doc update; code comment documents rationale; runtime guard in place. No immediate action.
- **Test for dynamic path uses simplified function** (Generalist M3): Folded into M3 above — the `data/tree.js` import inconsistency is the root concern; the parameter realism issue is lower priority.

---

## Strengths

- Clean module boundary: context module is pure (no I/O imports), depends only on tree types, correct dependency direction.
- Budget design contract ("first entry always inlined") is well-documented and thoroughly tested including multi-byte edge case.
- Deduplication in `startContext` (first-occurrence-wins) is a good defensive measure.
- Internal decomposition (types, priorities, collect, budget, decisions, learnings, index) follows narrow-interface/deep-implementation well.
- 57 tests across 6 files covering all documented behaviors and edge cases.
- `startContext` signature taking `state` rather than loading internally improves testability and keeps the module pure.
