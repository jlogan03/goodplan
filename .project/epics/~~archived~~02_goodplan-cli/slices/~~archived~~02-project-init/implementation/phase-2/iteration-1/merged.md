# Merged Review — Phase 2: Entity Schemas (Iteration 1)

**Reviewers:** Generalist (9/10), Software Architecture (8/10), TypeScript (9/10)
**Composite: 0 Critical, 3 Important, 4 Minor**

## Important (3)

### I-1: Extract duplicated `scoreEntrySchema` / `refinementSchema` to shared.ts
All three reviewers flagged this. `scoreEntrySchema` and `refinementSchema` are identically defined in both `src/schemas/entities/slice.ts` (lines 17-26) and `src/schemas/entities/quest.ts` (lines 17-26). The data model confirms identical structure. Extract to `src/schemas/shared.ts` (which already hosts `timestampSchema` and `versionSchema`) and import from both files.
- Raised by: Generalist, Software Architecture, TypeScript

### I-2: `isStateError` type guard too permissive — add `message` check
The guard checks `"code" in result && typeof result.code === "string"` but does not verify `message` exists. Any object with a string `code` property would pass. Adding `&& "message" in result && typeof (result as StateError).message === "string"` makes the guard precise at no cost. Risk is low since only the state machine constructs these objects, but tighter checking is free.
- File: `src/schemas/state-events.ts` (lines 9-18)
- Raised by: Generalist, TypeScript

### I-3: `StateEvent` type only covers `INIT_PROJECT` — document incremental intent
The `StateEvent` discriminated union defines only `{ type: "INIT_PROJECT"; name: string }`. The architecture specifies ~30+ event types. Since Phase 4 only implements the INIT_PROJECT transition, this is pragmatic, but add a `// TODO: remaining events added in future slices` comment to signal intent.
- File: `src/schemas/state-events.ts` (line 1)
- Raised by: Software Architecture

## Minor (4)

### M-1: `overview.json` status field accepts empty string
`status` uses `z.string()` without `.min(1)` while `name` uses `z.string().min(1)`. Consider adding `.min(1)` for consistency.
- File: `src/schemas/entities/overview.ts` (line 6)
- Raised by: Generalist

### M-2: `decision.date` uses `z.string().min(1)` instead of date-format validator
The data model shows ISO 8601 dates. Consider `z.string().date()` (Zod 4) or a regex pattern to strengthen validation per INV-005.
- File: `src/schemas/records/decision.ts` (line 9)
- Raised by: Software Architecture

### M-3: `learning.category` is open string, but RPC API defines fixed enum
The RPC layer specifies `'domain' | 'worked' | 'didnt-work' | 'do-differently'`. The schema uses `z.string().min(1)`. Consider `z.enum([...])` to catch invalid categories at the data boundary, or add a comment explaining intentional looseness for forward-compatibility.
- File: `src/schemas/records/learning.ts` (line 4)
- Raised by: Software Architecture

### M-4: `activity-log.ts` has optional `detail` field not in data model
The `activityEntrySchema` includes `detail: z.string().optional()` but the data model example shows no `detail` field. Either document in the data model or remove for consistency.
- File: `src/schemas/records/activity-log.ts` (line 10)
- Raised by: Software Architecture

## Dropped / Resolved

- **`learnings.jsonl` pattern ordering** (Generalist, TypeScript): Both patterns are correctly anchored; the project-level `^learnings\.jsonl$` cannot match nested paths regardless of ordering. Both resolve to the same schema. No action needed.
- **`import type { z }` in schema-registry.ts** (Generalist): Correct per `verbatimModuleSyntax`. Pure style note, no action.
