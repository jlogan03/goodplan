# Software Architecture Review — Phase 04: Universal --query & Schema Command

## Issues

**[IMPORTANT]** `--query` silently ignored on most commands due to `args.json` guard pattern

Most commands (e.g., `epic:list`, `decision:list`, `slice:list`, `quest:show`, and all mutation commands) gate structured data through an `if (args.json)` check before calling `output()`. When a user passes `--query` without `--json`, these commands fall into the human-readable `else` branch and pass a pre-formatted string to `output()`. The `output()` function then applies the jq expression to a string instead of structured data, producing incorrect results or null.

The `status` command was fixed (line 369: `if (args.query || args.json)`), but the same pattern exists across ~20+ other command files that were not updated. The plan task says "--query on `epic:list`, `decision:list`, `status`" should work, but `epic:list` and `decision:list` still use the old `if (args.json)` guard.

Fix: Update all commands that have the `if (args.json) { output(structured, args) } else { output(formatted, args) }` pattern to include `args.query` in the guard: `if (args.json || args.query)`. Alternatively, refactor `output()` to always receive structured data and let it handle formatting internally — but that's a larger change.

File: src/commands/epic/list.ts:32
File: src/commands/decision/list.ts:31
File: (and ~20 other command files with the same pattern)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Command registry is a parallel data source that can diverge from actual command definitions — INV-006 partially satisfied

The drift-detection test (schema.test.ts lines 147-179) only checks that registry keys match `subCommands` keys — it does not verify that arg definitions (types, required, defaults, descriptions) match the actual citty command definitions. A command could change its `--epic` flag from required to optional, and the registry would report stale metadata with no test failure. The plan explicitly states the registry "must capture: name, description, and args" and the test should assert "matching name" — but matching args were also called for.

INV-006 says "schema output reflects actual command signatures" and suggests "compare its flags and input schema against the actual command definition and assert equality." The current test only checks key presence, not arg shape equality.

Fix: Extend the drift-detection test to iterate each command's `args` property from the citty definition and compare against the registry entry's `args`. This requires accessing citty's internal command structure (the `args` property on each subCommand value). If citty doesn't expose this cleanly, the test could at minimum compare arg key sets.

File: tests/unit/commands/schema.test.ts:147
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `globalArgDefs` in schema.ts duplicates `globalArgs` from global-args.ts — drift risk

The `globalArgDefs` object (schema.ts lines 79-84) manually re-declares the same four global flags that already exist in `globalArgs` (global-args.ts). If a global flag is added, renamed, or its description changed in `global-args.ts`, the duplicate in `schema.ts` will silently diverge. This is exactly the kind of drift INV-006 is designed to prevent.

Fix: Derive `globalArgDefs` from the actual `globalArgs` object by mapping its entries, or import `globalArgs` and transform it into the registry's `ArgDefinition` shape programmatically.

File: src/commands/global/schema.ts:79
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Schema command human-readable output is raw JSON — inconsistent with other commands

The `schema` command outputs `JSON.stringify(data, null, 2)` for human-readable mode (lines 408, 415). While the plan explicitly says "Human-readable output: indented JSON," this is inconsistent with every other command in the system which uses picocolors-formatted text for human mode. For a command whose primary consumer is LLMs (who would use `--json`), this is acceptable but worth noting as an inconsistency.

File: src/commands/global/schema.ts:408
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `outputError` and `outputUnexpectedError` query handling is incomplete

Both error output functions (output.ts lines 55, 74) check `args.json || args.query` to decide JSON vs stderr output. However, when `args.query` is set, they output the full error object as JSON without applying the jq query to it. This means `--query '.error.code'` on an error response would return the full error object, not just the code. This is arguably fine (errors are exceptional), but it breaks the contract that `--query` always filters output.

File: src/util/output.ts:55
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The core extraction of `applyQuery` to a shared module and integration into `output()` is clean. The `schema` command satisfies INV-006's spirit with a parallel registry and Zod-derived JSON Schema. However, the `--query` flag being silently broken on most commands (the first IMPORTANT issue) is a significant gap — the phase's central goal is "lift --query to shared output()" but the lift is incomplete because callers still gate on `args.json`. The duplicate `globalArgDefs` introduces exactly the kind of drift the schema command is designed to prevent.

To reach 9+: fix the `args.json` guard in all commands so `--query` works universally (the phase's stated goal), derive `globalArgDefs` from the actual source, and strengthen the drift-detection test to compare arg shapes.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
