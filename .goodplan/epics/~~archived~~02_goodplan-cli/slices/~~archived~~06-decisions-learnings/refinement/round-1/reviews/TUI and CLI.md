# TUI and CLI Review

## Issues

**[IMPORTANT]** Flag naming inconsistency: `decision:show` uses `--decision` instead of `--id`
Phase 2 Expected Behavior says `decision:show --decision use-postgres` but the architecture (`commands-api.md` line 109) specifies `decision:show --id <id>`. The plan's task description also says `--decision` flag. This diverges from the architecture and from the `decision:update --id <id>` pattern in the same plan. The flag should be `--id` for both `decision:show` and `decision:update`, matching the architecture spec. Additionally, `--id` is more natural for decisions since they use string IDs (not entity-name patterns like `--epic`, `--slice`, `--quest`).
File: `02-decision-and-learnings-cli.md`
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Flag naming inconsistency: `learning:show` uses `--scope` instead of `--id`, and changes command semantics
Phase 2 task says `learning:show --scope` and describes it as returning "scope-level learnings.jsonl entries" (plural). The architecture (`commands-api.md` line 119) specifies `learning:show --id <id>` — a single learning entry by ID. The plan has effectively turned `learning:show` into a duplicate of `learning:list --scope`. Either (a) follow the architecture and make `learning:show --id <id>` return a single `LearningEntry`, or (b) if learnings don't have IDs and single-entry show isn't useful, drop `learning:show` from scope and document why it deviates. Currently the plan has 7 commands but the architecture also specifies 7 (4 decision + 3 learning), so the count aligns — but the semantics of `learning:show` do not.
File: `02-decision-and-learnings-cli.md`
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Flag naming inconsistency: `learning:list` uses `--scope` instead of `--source`
Phase 2 task says `learning:list --scope`. The architecture (`commands-api.md` line 118) specifies `learning:list [--source <scope>]`. Use `--source` to match the architecture. This matters for consistency — when the `schema` command (Phase 4) introspects flags, they must match what the architecture and help text promise.
File: `02-decision-and-learnings-cli.md`
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `--query` on status Expected Behavior uses wrong flag in Phase 4
Phase 4 Expected Behavior line says `bun run src/index.ts status --query '.project.name'` (without `--json`) should work. This is correct per the architecture (--query implies --json). However, the "Before implementation" check says `epic:list --json --query '.items[0].name'` should fail. Currently `epic:list` doesn't spread `--query` in its args, so citty will silently ignore it rather than erroring. The "before" check should use a more reliable absence signal — e.g., verify the output is unfiltered (returns full JSON, not just the name). Otherwise the before/after contrast is unreliable.
File: `04-universal-query-and-schema.md`
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `z.toJsonSchema()` vs `z.toJSONSchema()` — plan uses wrong casing
Phase 4 task says "derive JSON Schema from the actual Zod schema objects using `z.toJsonSchema()`". The research file (`zod-v4-toJsonSchema.md`) explicitly warns that the correct function name is `z.toJSONSchema()` (all-caps JSON) and that `z.toJsonSchema` will be `undefined` at runtime. This will cause a runtime crash if the plan is followed as written.
File: `04-universal-query-and-schema.md`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Schema command `--json` description could be clearer
Phase 4 says schema output is "always JSON (human-readable formatting by default, raw with `--json`)". The architecture says the same. But the plan doesn't specify what "human-readable formatting" means for a JSON payload — indented JSON? colored keys? The existing `output()` function in human mode expects a pre-formatted string, not a JSON object. The plan should clarify that schema's human-mode output uses indented/pretty-printed JSON (like `JSON.stringify(data, null, 2)`) or a custom formatter — otherwise the implementer may pass a raw object to `output()` in human mode, which falls through to `deterministicStringify` (single-line, no color).
File: `04-universal-query-and-schema.md`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 status human output doesn't specify empty-state handling
Phase 3 describes sections for the human-readable status output (Project, Active Work, Progress, Artifacts, Recommendations/Warnings) but doesn't specify what to show when sections are empty. The current stub handles "no active work" gracefully. The plan should carry forward that pattern — e.g., when artifact counts are all zero, show "No artifacts yet" rather than a table of zeros; when no active epic/slice/quest, show the existing "No active work" message. Without this guidance, the implementer may produce verbose zero-filled output for fresh projects.
File: `03-full-status-command.md`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Missing `--quiet` mode specification for new commands
Phase 2 mentions testing `--quiet` modes but doesn't specify what `--quiet` outputs for each new command. Existing commands suppress all output in quiet mode (via the `output()` function's `args.quiet` check). However, the `decision:create` and `decision:update` human-readable descriptions (`{id}: none -> active`, `{id}: {previousStatus} -> {newStatus}`) suggest these are the "minimal" outputs. Should `--quiet` suppress even these, or should it print just the transition line? The existing pattern (`output()` returns early on quiet) means quiet = no output at all, which seems correct, but the plan should be explicit.
File: `02-decision-and-learnings-cli.md`
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured and follows the proven bottom-up phasing pattern. CLI patterns (citty defineCommand, globalArgs spread, stdin reading, output formatting) are consistent with the existing codebase. However, multiple flag naming inconsistencies with the architecture spec (`--decision` vs `--id`, `--scope` vs `--source`, `--scope` vs `--id` on learning:show) would produce a CLI surface that diverges from what `commands-api.md` documents. Since the `schema` command (Phase 4) introspects these definitions for LLM consumers, flag naming correctness is critical for the system to work end-to-end. The `z.toJsonSchema` casing bug would cause a runtime failure. Fixing the 5 IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
