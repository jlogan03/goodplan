# Codebase Context: list-pagination

## Current List Command Output Patterns

All 6 list commands follow the same structure:

1. Load state via `loadState(projectDir)`
2. Read items from data layer (`getJson` or `getJsonl`)
3. Branch on output mode:
   - **JSON mode** (`args.json || args.query`): `output({ items }, args)` (some include extra fields like `filter`)
   - **Human mode** (`!args.quiet`): build `lines[]` array with `picocolors` formatting, join with `\n`, pass to `output()`
   - **Quiet mode**: no output

JSON envelope is always `{ items: [...] }` except:
- `task:list` adds `{ items, filter }` where filter is `"open" | "all"`
- `slice:list` has `{ items }` where items include an `epic` field

### Commands and data sources

| Command | Data source | Extra args |
|---|---|---|
| `learning:list` | `getJsonl<LearningEntry>(state, "learnings.jsonl")` | `--source <scope>` |
| `epic:list` | `getJson<Overview>(state, "epics/overview.json")` | none |
| `quest:list` | `getJson<Overview>(state, "quests/overview.json")` | none |
| `slice:list` | `getJson<EpicOverview>(state, "epics/overview.json")` | `--epic`, `--all` |
| `task:list` | `getJson<Overview>(state, "tasks/overview.json")` | `--all` |
| `decision:list` | `getJsonl<DecisionEntry>(state, "decisions.jsonl")` | none |

### Human output format

All use indented lines with `picocolors` bold/dim formatting. Pattern:
```
  {bold name}  {status}{dim (completed date)}
```
Variations: `learning:list` shows category/summary/source; `task:list` shows title/status/created.

## `parseNonNegativeInt` Location and Signature

**File:** `src/commands/global/state.ts` (lines 114-124)
**Scope:** Local `function` (not exported)

```ts
function parseNonNegativeInt(value: string | undefined, name: string): number | undefined
```

- Returns `undefined` for `undefined` or `""` input
- Uses `Number.parseInt(value, 10)` (not `Number()`)
- Validates: `isFinite`, `>= 0`, `String(parsed) === value` (rejects floats, leading zeros, etc.)
- Throws `GoodplanError("VALIDATION_INVALID_INPUT", ...)` on bad input

**Plan implication:** Must be extracted to a shared location (e.g., `src/util/pagination.ts`) since it's currently private to `state.ts`.

## Current Global Args Structure

**File:** `src/commands/global-args.ts`

```ts
export const globalArgs = {
  json:    { type: "boolean", default: false },
  quiet:   { type: "boolean", default: false },
  query:   { type: "string", required: false },
  verbose: { type: "boolean", default: false },  // reserved, not wired
  force:   { type: "boolean", default: false },
}
```

Also exports `parseInlineBudget()` for the `--inline` flag (used only by `state` command).

**Note:** `validate.ts` has a hardcoded `GLOBAL_FLAG_KEYS` set: `["json", "quiet", "query", "verbose", "help", "version", "force"]`. Adding `limit` and `offset` to global args will require updating this set, otherwise they'll leak into stdin-merged validation for mutating commands.

## How `--query` Works

**File:** `src/util/query.ts` — `applyQuery(data, expr)` compiles a jq expression via `@michaelhomer/jqjs`.

In list commands, `--query` is handled transparently by `output()`:
- `output(data, args)` checks `args.query` first, calls `applyQuery(data, args.query)`, writes result
- List commands just pass `{ items }` to `output()` and query applies to the full envelope

In `state` command, `--query` is handled manually with pagination applied **after** query:
1. `applyQuery(serialized, args.query)` runs jq
2. If result is array, apply `offset`/`limit` via `slice()`

**Plan implication:** The plan says pagination applies "before `--query`" but the existing `state` command applies it **after** `--query`. The plan should clarify which semantics the list commands will use. For list commands, pagination on `items` before passing to `output()` (which then applies `--query`) makes sense since the items array is the primary data.

## Existing Test Patterns

**Integration test infrastructure** (`tests/integration/helpers.ts`):
- `withFixture(name, fn)` — copies fixture from `tests/fixtures/{name}` to temp dir, sets `GOODPLAN_DIR` env var, runs callback with `{ tmpDir, env, bin }`
- `runCommand(bin, args, options)` — spawns compiled binary, auto-parses JSON when `--json` in args
- `runChain(bin, commands, options)` — sequential command execution
- Tests use `describe/it` from vitest

**Example pattern** (`tests/integration/state.test.ts`):
```ts
it("state --json --query --limit returns limited entries", async () => {
  await withFixture("slice-in-progress", ({ bin, env }) => {
    const result = runCommand(bin, ["state", "--json", "--query", '...', "--limit", "2"], { env });
    expect(result.exitCode).toBe(0);
    const entries = result.json as unknown[];
    expect(entries.length).toBe(2);
  });
});
```

Fixtures live in `tests/fixtures/`. The `slice-in-progress` fixture has enough data (activity-log.jsonl with 4+ entries) to test pagination.

**No existing integration tests for list commands.** All current integration tests cover `state`, `--version`, workflow commands, and migrations.

## Concerns and Opportunities

1. **`GLOBAL_FLAG_KEYS` in `validate.ts`** must be updated to include `"limit"` and `"offset"`, or these flags will leak into Zod validation for mutating commands that use `validateInput()`. This is not mentioned in the plan.

2. **Pagination semantics mismatch**: The `state` command applies pagination **after** `--query`. For list commands, the plan proposes pagination **before** `--query`. This is actually correct (different use cases) but should be explicitly documented so both behaviors coexist without confusion.

3. **Human-mode pagination**: The plan should clarify whether `--limit`/`--offset` affect human output too, or only JSON. Currently, `state` only paginates in `--query` mode. List commands would benefit from paginating in all modes since the items array is explicit.

4. **`slice:list --all` grouping**: When paginating `slice:list --all` in human mode, pagination would break the epic-grouped display. The `items` array is flat (each has an `epic` field), so pagination on the flat array is straightforward for JSON but may produce confusing human output (partial epic groups).

5. **Existing `output()` function**: The `output()` utility in `src/util/output.ts` accepts `OutputArgs { json?, quiet?, query? }`. If pagination is added, the interface needs extending OR pagination must be applied before calling `output()`. The plan's approach of slicing the items array before passing to `output()` avoids changing the `output()` interface.

6. **No list command tests exist yet** — this is a good opportunity to add them, but fixture data for all 6 entity types would need to be verified/created.

## Recent Development Activity

Recent commits touching affected files (last 3 months):
- `4ce3ef5` — Universal `--query` & Schema Command (added query support)
- `5b8fc59` — Decision & Learnings CLI (created decision:list, learning:list)
- `b27df7d` — Quest RPC & CLI (created quest:list)
- `33062d6` — Slice CLI commands (created slice:list)
- `d0d6673` — Epic CLI commands (created epic:list)
- `2a5d804` — Task capture CLI (created task:list)
- `aa1320b` — Added `--force` flag to global args
- `651aea0` — Self-verifying error codes (affected validate.ts)

No recent refactoring of list commands. All were created in their current form and haven't been modified since.
