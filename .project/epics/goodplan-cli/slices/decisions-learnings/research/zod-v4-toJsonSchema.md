# Zod v4 `toJSONSchema` Research

**Zod version installed:** 4.3.6 (package.json specifies `^4.0.0`)
**Fetch date:** 2026-03-22

---

## Does it exist?

Yes. Zod v4 ships first-party JSON Schema conversion as `z.toJSONSchema()`.

**Important:** The function name is `toJSONSchema` (all-caps JSON), NOT `toJsonSchema` (camelCase).
There is no `toJsonSchema` alias — using that name will fail at runtime.

## API Signature

```ts
// Single schema → JSON Schema object
z.toJSONSchema(schema: $ZodType, params?: ToJSONSchemaParams): JSONSchema

// Registry → map of JSON Schema objects (keyed by id)
z.toJSONSchema(
  registry: $ZodRegistry<{ id?: string }>,
  params?: RegistryToJSONSchemaParams
): { schemas: Record<string, JSONSchema> }
```

## `ToJSONSchemaParams`

```ts
type ToJSONSchemaParams = {
  /** JSON Schema version to target. Default: "draft-2020-12" */
  target?:
    | "draft-04" | "draft-4"
    | "draft-07" | "draft-7"
    | "draft-2020-12"
    | "openapi-3.0"
    | ({} & string);   // escape hatch for custom targets

  /** Registry for metadata lookup. Schemas with `id` are extracted as $defs.
   *  Default: z.globalRegistry */
  metadata?: $ZodRegistry<Record<string, any>>;

  /** How to handle unrepresentable types. Default: "throw" */
  unrepresentable?: "throw" | "any";

  /** How to handle cycles. Default: "ref" (break via $defs) */
  cycles?: "ref" | "throw";

  /** How to handle reused schemas. Default: "inline" */
  reused?: "ref" | "inline";

  /** Whether to extract input or output type for transforms/defaults/coercions.
   *  Default: "output" */
  io?: "input" | "output";

  /** Custom override function applied to each converted node. */
  override?: (ctx: {
    zodSchema: $ZodTypes;
    jsonSchema: JSONSchema.BaseSchema;
    path: (string | number)[];
  }) => void;
}
```

`RegistryToJSONSchemaParams` extends `ToJSONSchemaParams` with:
```ts
uri?: (id: string) => string;  // converts id values to external $ref URIs
```

## Behaviour Notes

- `z.object()` schemas get `additionalProperties: false` by default.
- `.describe("…")` maps to JSON Schema `description`.
- `.meta({ title, examples, … })` maps metadata fields directly onto the JSON Schema node.
- Any schema registered in `z.globalRegistry` with an `id` is automatically extracted as a `$def`.

## Basic Usage

```ts
import * as z from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number().int().min(0),
});

z.toJSONSchema(schema);
// => {
//   type: "object",
//   properties: { name: { type: "string" }, age: { type: "integer", minimum: 0 } },
//   required: ["name", "age"],
//   additionalProperties: false,
// }

z.toJSONSchema(schema, { target: "openapi-3.0" });
z.toJSONSchema(schema, { unrepresentable: "any" });  // don't throw on e.g. ZodFunction
```

## Reverse: JSON Schema → Zod (experimental)

Zod 4.3.6 also ships `z.fromJSONSchema()` for the reverse direction, but it is marked experimental.

## Gotchas

1. **Name is `toJSONSchema`, not `toJsonSchema`.** Calling `z.toJsonSchema` will be `undefined` at runtime.
2. **Default `unrepresentable: "throw"`** — schemas containing `z.function()`, `z.symbol()`, etc. will throw unless you pass `unrepresentable: "any"`.
3. **`additionalProperties: false` on objects** — this is the default output; if you need open objects for JSON Schema consumers that reject extra properties during serialisation, you may need to override.
4. **`target` default is `"draft-2020-12"`** — some AI/OpenAPI tooling expects `"draft-07"` or `"openapi-3.0"`; specify explicitly.
5. **`io: "input" | "output"`** — relevant when schemas include `.default()`, `.coerce`, or `.transform()`. Default is `"output"` (post-transform type). Pass `"input"` to get the pre-transform JSON Schema.
6. **`draft-4` vs `draft-04`** — both spellings accepted (normalised internally), but `"draft-04"` is canonical.

## Source Files (in installed package)

- `node_modules/zod/src/v4/core/to-json-schema.ts` — `ToJSONSchemaParams` type, `JSONSchemaGeneratorParams` interface
- `node_modules/zod/src/v4/core/json-schema-processors.ts` — `toJSONSchema` function implementation
- `node_modules/zod/src/v4/classic/external.ts` — re-exports `toJSONSchema` into the public `z` namespace
