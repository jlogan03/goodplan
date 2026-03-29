# Zod Research — goodplan-cli

## Version

- **Installed**: `zod@4.3.6` (lockfile-resolved from `^4.0.0`)
- **Major version**: Zod 4 (the ground-up rewrite, formerly "Zod Mini")

## Key APIs the Plan Relies On

### `z.object()` + `z.discriminatedUnion()` — StateEntry tree

The `StateEntry` discriminated union (`"directory" | "json" | "jsonl" | "markdown"`) maps directly to Zod 4's `z.discriminatedUnion()`:

```ts
const stateEntrySchema = z.discriminatedUnion("type", [
  directoryEntrySchema,
  jsonEntrySchema,
  jsonlEntrySchema,
  markdownEntrySchema,
]);
```

Zod 4 upgrade: discriminated unions now **compose** — one discriminated union can be a member of another. Useful if we later nest unions (e.g., `JsonEntry` subtypes). Also supports union and pipe discriminators, not just simple literals.

### `z.enum()` — Status enums

Used for all entity status fields (`epic.status`, `slice.status`, `quest.status`, `decision.status`, `verification.status`, `activityEntry.phase`).

```ts
const epicStatusSchema = z.enum(["proposed", "activated", "completed", "abandoned"]);
type EpicStatus = z.infer<typeof epicStatusSchema>; // "proposed" | "activated" | ...
```

Access enum values at runtime: `epicStatusSchema.enum.proposed` (returns `"proposed"`).

**Zod 4 breaking change**: `z.nativeEnum()` is deprecated. `z.enum()` now accepts native TS enums directly — but we use string literal arrays, so no impact. `.Enum` and `.Values` accessors are **removed**; use `.enum` (lowercase) only.

### `z.infer<>` — Type extraction

Derive TypeScript types from schemas to avoid duplicate type definitions:

```ts
const projectSchema = z.object({ name: z.string(), version: z.string(), ... });
type Project = z.infer<typeof projectSchema>;
```

Also available: `z.input<typeof schema>` for the input type (differs from output when transforms are used). We don't use transforms, so `z.infer` suffices.

### Schema registry — Path-pattern-to-schema mapping

No built-in Zod registry for this; our architecture defines a custom one mapping `RegExp` path patterns to Zod schemas. This is straightforward — just an array of `{ pattern, schema }` pairs iterated by `commitState()` and `assembleState()`.

### JSONL validation

No built-in JSONL support. Strategy: split file by newlines, `JSON.parse` each line, validate each record with `schema.parse()` (or `safeParse()` for error collection). For `commitState()` appends, validate only the new entries before writing.

```ts
// Read
const records = lines
  .filter(line => line.trim() !== "")
  .map(line => learningEntrySchema.parse(JSON.parse(line)));

// Write (append)
const newLines = newEntries
  .map(entry => {
    learningEntrySchema.parse(entry); // validate before write
    return JSON.stringify(entry);
  })
  .join("\n") + "\n";
```

### `safeParse()` vs `parse()`

- `parse()` throws `ZodError` on failure — use for writes (fail fast).
- `safeParse()` returns `{ success, data, error }` — use for reads where we want to collect errors or handle corrupt files gracefully.

## Zod 4 Breaking Changes Relevant to Us

| Change | Impact | Action |
|---|---|---|
| `z.nativeEnum()` deprecated | None — we use `z.enum(["a","b"])` | No action |
| `.Enum` / `.Values` removed | Use `.enum` accessor only | Use `schema.enum.value` |
| `z.record(z.enum(...), ...)` now exhaustive | If we use enum-keyed records, all keys required | Use `z.partialRecord()` if partial needed |
| `ZodType` generics simplified (2 params) | Affects generic schema-accepting functions | Use `ZodType<Output, Input>` not 3-param |
| `z.coerce.*` input type is now `unknown` | None — we don't use coerce schemas | No action |
| `z.ZodTypeAny` removed | Use `z.ZodType` instead | Use `z.ZodType` in registry typing |
| `_def` internals moved | Don't access `._def` | Use public API only |

## Gotchas

1. **Strict objects by default**: Zod 4 objects strip unknown keys by default (same as v3 `.strip()`). For our JSON files this is correct — we want to reject/strip unexpected fields. If we need to preserve unknown keys (forward compat), use `.passthrough()`.

2. **Error formatting**: `ZodError` structure changed in v4. If we surface validation errors to users, test the actual error paths. Use `error.issues` array.

3. **Performance**: Zod 4 is significantly faster than v3 (claims 2-7x). Not a concern for our use case (small config files), but good to know.

4. **Bundle size**: Zod 4 core is ~13KB gzip. Since we compile with Bun, tree-shaking applies. `zod/mini` variant exists for even smaller size but lacks some features — standard `zod` is fine for CLI.

5. **Recursive schemas**: If `StateEntry` needs self-referential typing (directories containing directories), use `z.lazy()`:
   ```ts
   const directoryEntrySchema: z.ZodType<DirectoryEntry> = z.object({
     type: z.literal("directory"),
     contents: z.record(z.lazy(() => stateEntrySchema)),
   });
   ```

6. **Deterministic JSON output**: Zod validates but does not order keys. Our `commitState()` must handle key ordering separately (e.g., `JSON.stringify` with sorted-keys replacer).
