# Zod v4 toJSONSchema API

Researched: 2026-03-25 | Source: WebSearch + Context7

---

## 1. Import & Call Syntax

```typescript
import * as z from "zod";

z.toJSONSchema(schema);
z.toJSONSchema(schema, options);
```

No separate import needed — `toJSONSchema` is a top-level export on the `z` namespace.

### Options

```typescript
interface ToJSONSchemaParams {
  target?: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0";  // default: "draft-2020-12"
  io?: "input" | "output";           // default: "output"
  unrepresentable?: "throw" | "any"; // default: "throw"
  cycles?: "ref" | "throw";          // default: "ref"
  reused?: "ref" | "inline";         // default: "inline"
  metadata?: $ZodRegistry<Record<string, any>>;
  uri?: (id: string) => string;
  override?: (ctx: { zodSchema; jsonSchema }) => void;
}
```

## 2. Example Input/Output

### Input schema

```typescript
const MySchema = z.object({
  name: z.string(),
  role: z.enum(["admin", "user", "viewer"]),
  tags: z.array(z.string()),
  active: z.boolean(),
  nickname: z.nullable(z.string()),
});
```

### Output (Draft 2020-12)

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "role": { "enum": ["admin", "user", "viewer"] },
    "tags": { "type": "array", "items": { "type": "string" } },
    "active": { "type": "boolean" },
    "nickname": { "oneOf": [{ "type": "string" }, { "type": "null" }] }
  },
  "required": ["name", "role", "tags", "active", "nickname"],
  "additionalProperties": false
}
```

Key observations:
- `z.nullable()` produces `oneOf: [<inner>, {type: "null"}]`
- `additionalProperties: false` is included by default in output mode
- `required` includes all non-optional fields (nullable fields ARE required — null is a valid value)

## 3. Metadata / Annotations

Both `.describe()` and `.meta()` carry through to JSON Schema output:

```typescript
const schema = z.object({
  firstName: z.string().describe("Your first name"),
  lastName: z.string().meta({ title: "last_name" }),
  age: z.number().meta({ examples: [12, 99] }),
});

z.toJSONSchema(schema);
// =>
// {
//   type: "object",
//   properties: {
//     firstName: { type: "string", description: "Your first name" },
//     lastName: { type: "string", title: "last_name" },
//     age: { type: "number", examples: [12, 99] }
//   },
//   required: ["firstName", "lastName", "age"]
// }
```

All `.meta()` fields are copied directly into the JSON Schema output. You can use any JSON Schema annotation keyword: `title`, `description`, `examples`, `default`, `deprecated`, etc.

## 4. Nested Objects & Arrays of Objects

Fully supported. Nested objects produce nested `type: "object"` nodes. Arrays of objects produce `type: "array"` with `items` containing the object schema.

```typescript
const Address = z.object({ street: z.string(), city: z.string() });
const User = z.object({
  name: z.string(),
  address: Address,
  friends: z.array(z.object({ name: z.string() })),
});

z.toJSONSchema(User);
// => nested structure as expected
```

### Cycles / Recursive Schemas

Cyclic references resolve via `$ref` by default (`cycles: "ref"`). Register schemas in `z.globalRegistry` with an `id` to control `$ref` names:

```typescript
z.globalRegistry.add(User, { id: "User" });
z.globalRegistry.add(Post, { id: "Post" });
```

You can also convert an entire registry at once:

```typescript
z.toJSONSchema(z.globalRegistry);
// => { schemas: { User: {...}, Post: {...} } }
```

## 5. Gotchas & Limitations

### Unrepresentable types (throws by default)

These Zod types have no JSON Schema equivalent and will throw unless you set `unrepresentable: "any"`:

- `z.bigint()`, `z.symbol()`, `z.undefined()`, `z.void()`
- `z.date()`, `z.map()`, `z.set()`
- `z.transform()`, `z.nan()`, `z.custom()`

Workaround: use `override` callback to manually map them:

```typescript
z.toJSONSchema(z.date(), {
  unrepresentable: "any",
  override: (ctx) => {
    if (ctx.zodSchema._zod.def.type === "date") {
      ctx.jsonSchema.type = "string";
      ctx.jsonSchema.format = "date-time";
    }
  },
});
```

**Important:** unrepresentable types throw *before* `override` runs, so you must also set `unrepresentable: "any"` when using override for these types.

### Optional fields lose optionality metadata

`z.optional(z.string())` produces `{ type: "string" }` and removes the field from `required` — but there is no explicit marker in the JSON Schema that the field was optional vs just not required. This is correct per JSON Schema spec, but downstream tools that need to distinguish "optional" from "not present" may need workarounds.

The `override` callback can inject custom metadata (e.g., `$comment`) if needed. A [GitHub issue (#4164)](https://github.com/colinhacks/zod/issues/4164) requested built-in support but was closed as "not planned."

### additionalProperties behavior

- **Output mode** (default): `additionalProperties: false` is included for `z.object()`
- **Input mode** (`io: "input"`): `additionalProperties` is omitted
- `z.strictObject()`: always includes `additionalProperties: false`
- `z.looseObject()`: never includes it

### Refinements don't translate

`z.refine()` and `z.superRefine()` validation logic has no JSON Schema representation. The structural type is emitted but runtime-only checks are silently dropped.

### String format mappings (useful reference)

| Zod | JSON Schema |
|---|---|
| `z.email()` | `format: "email"` |
| `z.uuid()` | `format: "uuid"` |
| `z.url()` | `format: "uri"` |
| `z.ipv4()` | `format: "ipv4"` |
| `z.iso.datetime()` | `format: "date-time"` |
| `z.iso.date()` | `format: "date"` |
| `z.base64()` | `contentEncoding: "base64"` |

## 6. Relevance to Our Use Case

For the CLI migration Q&A protocol, `z.toJSONSchema()` lets us:
1. Define question schemas in Zod (with `.describe()` for prompts)
2. Convert to JSON Schema at runtime for structured output / validation
3. Keep a single source of truth — Zod schema drives both TS types and JSON Schema

No third-party dependency needed (unlike Zod v3 which required `zod-to-json-schema`).
