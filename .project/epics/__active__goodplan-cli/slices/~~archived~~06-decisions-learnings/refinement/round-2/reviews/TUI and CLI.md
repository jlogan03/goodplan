# TUI and CLI Review (Round 2)

## Issues

**[IMPORTANT]** Phase 4 `--query` precedence over `--quiet` lacks exit code specification
Phase 4 tasks state "`--query` overrides `--quiet` (if both passed, `--query` wins and returns filtered output)". This is clear for output behavior but does not specify the exit code when `--query` produces `null` (empty result). The plan says "empty result -> output `null`" but the architecture (`commands-api.md` line 276) says "empty result (null/undefined) -> exit 0, prints `null`". The plan should explicitly state exit 0 for null query results to avoid implementers defaulting to a non-zero exit for "no data". This matters for scripting consumers who chain `--query` with `$?` checks.
File: `04-universal-query-and-schema.md`
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 schema command introspection approach needs more specificity on what metadata to capture
Phase 4 says "extract command metadata into a parallel registry at registration time (e.g., a `commandRegistry` map built in `main.ts` alongside `defineCommand` calls)". This is the right approach since citty lacks public introspection, but the plan doesn't specify which metadata fields to capture per command. The architecture (`commands-api.md` lines 224-229) says the schema output should include `{ name, description, args }`. The registry must capture at minimum: command name, description string, and the full args definition (with types, required, default, description for each flag). Without this explicit specification, the implementer may capture only name+description and miss flag metadata — which would make `schema --command <name>` unable to return per-flag detail. The plan should enumerate the fields to capture in the registry entry type.
File: `04-universal-query-and-schema.md`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 `decision:list` human output doesn't specify column alignment
Phase 2 says the human-readable output is a "table with id, status, domain, title" but doesn't specify alignment. Existing list commands (`epic:list`, `quest:list`) use simple `pc.bold(name)  status` formatting without table alignment. For decisions, where IDs and domains can vary in length, misaligned columns will look messy. The plan should either: (a) follow the existing simple `bold(id)  status  domain  title` pattern without alignment (consistent with `epic:list`), or (b) specify column padding. Option (a) is recommended for consistency.
File: `02-decision-and-learnings-cli.md`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 human output section order not specified for visual hierarchy
Phase 3 lists sections "Project, Active Work (epic/slice/quest), Progress, Artifacts, Recommendations/Warnings" but doesn't specify visual separators between sections. The current stub uses empty lines between groups. The plan mentions "use picocolors for section headers, status indicators, and severity coloring" and "omit sections with no data" but should specify the separator pattern (empty line between sections, like the existing stub) to maintain consistency. Without this, the implementer may use `---` dividers or other patterns that diverge from the existing convention.
File: `03-full-status-command.md`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 E2E walkthrough step 10 tests `schema --command slice:complete` but doesn't verify the stdin schema field names
Step 10 says "verify stdin schema includes verificationPassed, learnings, etc." The "(etc.)" is vague — the implementer should verify all required fields of `completeSliceInputSchema` are present in the JSON Schema output (`verificationPassed`, `deferred`, `learnings`, `architectureDelta`). Listing the expected fields explicitly ensures the E2E actually validates completeness rather than spot-checking one or two fields.
File: `04-universal-query-and-schema.md`
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round 1 issues (flag naming inconsistencies, `learning:show` duplication, `toJsonSchema` casing) are resolved. The plan now correctly uses `--id` for `decision:show` and `decision:update`, `--source` for `learning:list`, drops `learning:show`, and uses `z.toJSONSchema()` with the correct casing. The command count is correctly updated to 6 (4 decision + 2 learning). The Phase 4 "before" check is improved to verify "returns full unfiltered JSON" rather than relying on citty silently ignoring unknown flags. The schema human-readable output is specified as `JSON.stringify(data, null, 2)`. The status empty-state pattern is specified ("omit sections with no data"). The remaining issues are specification gaps (query exit codes, registry metadata fields) and minor formatting guidance — none affect correctness of the CLI surface design. Addressing the 2 IMPORTANT items would bring this to 10.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
