# Phase 04 Review: Universal --query & Schema Command

**Reviewer:** Generalist
**Score:** 7/10
**Critical: 1, Important: 2, Minor: 3

---

## Critical

### C1: `--query` is broken on most commands (only works with explicit `--json`)

Every command except `status` and `schema` gates on `if (args.json)` before passing structured data to `output()`. When a user passes `--query` without `--json`, these commands fall into the `else` branch and pass a pre-formatted human-readable string to `output()`. The `output()` function will then apply the jq expression to a plain string instead of structured data, producing wrong results or null.

For example, `epic:list --query '.items[0].name'` (without `--json`) hits `src/commands/epic/list.ts:32` where `if (args.json)` is false, so it formats human text and calls `output(lines.join("\n"), args)`. The jq expression runs against a string, not the `{ items }` object.

The plan explicitly requires: "`--query` auto-implies `--json` (verify `status --query '.project.name'` works without explicit `--json`)". This was done for `status` and `schema` by changing their guards to `if (args.query || args.json)`, but the same fix was **not applied** to any other command. All ~35 other commands with `if (args.json)` guards need the same `|| args.query` treatment.

**Files affected:** Every command file in `src/commands/` that has `if (args.json)` branching -- `epic/list.ts`, `decision/list.ts`, `slice/list.ts`, `quest/list.ts`, `epic/show.ts`, `decision/show.ts`, `slice/show.ts`, `quest/show.ts`, `epic/create.ts`, `decision/create.ts`, `decision/update.ts`, `learning/list.ts`, `learning/rollup.ts`, and all subagent submit commands, etc.

---

## Important

### I1: Command registry is a maintenance burden with high drift risk

The plan called for a parallel registry to avoid relying on internal citty properties. The implementation delivers a 335-line manual registry in `src/commands/global/schema.ts` that duplicates every command's name, description, and arg definitions. While the drift-detection test (INV-006) catches missing/extra keys, it does **not** validate that descriptions or arg definitions match the actual command definitions. A command could change its description or add/remove a flag and the test would still pass. The registry is a second source of truth that will silently diverge on content.

Consider: the drift test only checks `keys` match, not that the arg shapes or descriptions match. This partially satisfies INV-006 but leaves a gap.

### I2: `outputError` and `outputUnexpectedError` query handling is inconsistent with `output()`

In `output()`, when `args.query` is set, the jq expression is applied to the data. But in `outputError()` (line 55) and `outputUnexpectedError()` (line 74), `args.query` only triggers JSON output mode -- it does **not** apply the query to the error object. This means if a command errors with `--query`, the error output is full JSON rather than filtered. This is arguably correct behavior (errors shouldn't be jq-filtered), but it's undocumented and the inconsistency could confuse consumers expecting uniform behavior.

---

## Minor

### M1: `stdinSchemaRegistry` omits `learning:rollup` stdin schema

`learning:rollup` accepts `--from` and `--to` as CLI flags rather than stdin, so it may not need a stdin schema entry. However, the registry comment says "Only commands that accept stdin input are listed here" but doesn't clarify the distinction. If `learning:rollup` or any future command accepts both flags and stdin, this could become a gap.

### M2: Schema test passes empty string for optional args instead of undefined

In `schema.test.ts` line 19-20, `command: args.command ?? ""` and `query: args.query ?? ""` pass empty strings when the arg is absent. Empty string is truthy for `args.command` check at line 402 of schema.ts (`if (args.command)`), which would cause `buildCommandDetail("")` to be called with empty string. This works only because empty string is falsy in JS. The intent would be clearer with `undefined`.

### M3: `globalArgDefs` in schema.ts duplicates `globalArgs` from global-args.ts

The `globalArgDefs` object at line 79-84 of `schema.ts` manually mirrors the definitions in `src/commands/global-args.ts`. If `globalArgs` changes (e.g., a new global flag is added), `globalArgDefs` must be updated separately. This could be derived programmatically from `globalArgs`.
