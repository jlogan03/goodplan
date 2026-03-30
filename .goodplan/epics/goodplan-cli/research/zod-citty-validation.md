# Zod + Citty Validation Research

## Summary

Zod works well with citty for CLI input validation. Citty has no built-in Zod integration, but its `setup` hook provides a clean injection point for schema validation before `run()` executes. Zod is pure JS with zero native deps, so it works in `bun build --compile` binaries without issues. For a compiled CLI, `@zod/mini` (~1.9 KB gzipped) keeps the size impact minimal.

---

## 1. Does citty have built-in Zod integration?

**No.** Citty's arg validation is limited to type coercion (`string`, `boolean`, `positional`, `enum`, `number`) and `required` checks. There is no plugin or hook for schema-level validation. Citty does not reference Zod or any external validation library.

## 2. Can Zod validate citty args after parsing?

**Yes, straightforwardly.** Citty's `setup()` hook runs after arg parsing but before `run()`. This is the natural place to validate parsed args (or stdin-derived JSON) with Zod:

```typescript
import { defineCommand } from "citty";
import { z } from "zod"; // or @zod/mini

const InputSchema = z.object({
  name: z.string().min(1),
  count: z.number().int().positive(),
});

export default defineCommand({
  args: {
    name: { type: "string", required: true },
    count: { type: "string", description: "number of items" },
  },
  setup({ args }) {
    // Validate + transform after citty parses raw CLI args
    const result = InputSchema.safeParse({
      name: args.name,
      count: args.count ? Number(args.count) : undefined,
    });
    if (!result.success) {
      throw new Error(`Invalid input: ${result.error.message}`);
    }
    // Attach validated data for run() — use context or module-level var
  },
  run({ args }) {
    // args are validated at this point
  },
});
```

For **stdin JSON/JSONL validation**, Zod works identically — parse JSON in `setup()` or `run()`, validate with schema, fail fast on bad input.

### Practical pattern: reusable validation wrapper

```typescript
function withValidation<T>(schema: z.ZodType<T>, handler: (data: T) => Promise<void>) {
  return defineCommand({
    args: { input: { type: "string", description: "JSON input" } },
    async run({ args }) {
      const raw = args.input ? JSON.parse(args.input) : await readStdin();
      const data = schema.parse(raw); // throws on invalid
      await handler(data);
    },
  });
}
```

## 3. Does Zod work in `bun build --compile` binaries?

**Yes.** Zod has zero native dependencies — it is pure JavaScript/TypeScript. `bun build --compile` bundles all JS into a single executable. Zod works in Node, Deno, Bun, and browsers. No special configuration needed.

## 4. Zod bundle size impact

| Variant | Gzipped size | Notes |
|---|---|---|
| zod v3 | ~13 KB | Monolithic, no tree-shaking |
| zod v4 | ~5.6 KB | 2.3x smaller than v3 |
| @zod/mini (v4) | ~1.9 KB | Tree-shakable, function-based API |
| Actual per-schema (mini) | ~1.4–2 KB | Depends on features used |

For a compiled CLI binary (not a browser bundle), the gzipped size is less relevant — what matters is the uncompressed JS size added to the binary. Zod v4 core is reasonable; `@zod/mini` is negligible.

**Zod v4 also claims 14x faster parsing** than v3 — irrelevant for CLI single-shot validation, but nice to have.

## 5. Lighter alternatives

| Library | Bundle (gzip) | Strengths | Weaknesses for CLI |
|---|---|---|---|
| **@zod/mini** | ~1.9 KB | Familiar Zod API, tree-shakable | Slightly less ergonomic than full Zod |
| **Valibot** | ~1.0–1.4 KB | Smallest bundle, modular | Different API, smaller ecosystem |
| **TypeBox** | ~4 KB + validator | JSON Schema compatible, fast | Needs separate validator (ajv) |
| **ArkType** | ~12+ KB | Fastest runtime validation | Heaviest bundle, slow initialization |

### Recommendation for compiled CLI

**Use `@zod/mini` or full Zod v4.** Rationale:
- Bundle size barely matters for a compiled binary (we're not shipping to browsers)
- Zod has the largest ecosystem — error formatting, OpenAPI integration, ecosystem libraries
- `@zod/mini` gives us the option to be lean if we later care about binary size
- Zod's `z.infer<>` for deriving TypeScript types from schemas is the best DX
- Valibot would save ~3 KB gzipped — not worth the ecosystem trade-off in a CLI context

## 6. Integration pattern for goodplan CLI

Recommended approach for the goodplan CLI:

1. **Citty handles CLI arg parsing** — types, defaults, help text, subcommands
2. **Zod handles structured data validation** — JSON objects from stdin, JSONL entries, config files
3. **Validation happens in `setup()` or early in `run()`** — fail fast with clear error messages
4. **Schemas are co-located with commands** — each command defines its input schema

```
src/
  commands/
    create-epic.ts      # defineCommand + Zod schema for epic input
    explore.ts           # defineCommand + Zod schema for exploration params
  schemas/
    epic.ts              # shared Zod schemas for .project/ file formats
    slice.ts
  lib/
    validation.ts        # helpers: parseStdinJson(), validateJsonl(), etc.
```

### Citty args vs Zod validation — division of responsibility

| Concern | Handled by |
|---|---|
| Flag names, aliases, help text | citty args definition |
| Required vs optional flags | citty `required` |
| Basic type (string/bool/number) | citty type coercion |
| Complex validation (ranges, patterns, object shapes) | Zod schema |
| Stdin JSON/JSONL parsing + validation | Zod schema |
| Cross-field validation | Zod `.refine()` or `.superRefine()` |
| Error messages for invalid structured input | Zod error formatting |

## Open questions

- **Zod v4 stability**: Zod v4 was released mid-2025. Check if any breaking changes are still landing before committing to v4 vs v3.
- **Standard Schema**: Zod v4 implements the Standard Schema spec — could be useful if we later swap validation libraries without changing consumer code.
- **Import style for tree-shaking**: `import * as z from "zod/v4-mini"` tree-shakes better than `import { z } from "zod/v4-mini"` with esbuild (and likely Bun's bundler, which uses esbuild internally). Worth testing.

## Sources

- [citty GitHub](https://github.com/unjs/citty)
- [Zod v4 release notes](https://zod.dev/v4)
- [@zod/mini documentation](https://zod.dev/packages/mini)
- [Valibot comparison page](https://valibot.dev/guides/comparison/)
- [Zod v4 bundle size discussion](https://github.com/colinhacks/zod/issues/4637)
- [ArkType vs Zod vs Valibot 2026 comparison](https://pockit.tools/blog/zod-valibot-arktype-comparison-2026/)
- [Bun bundler docs](https://bun.com/docs/bundler)
