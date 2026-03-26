# Holistic Review (Round 3) — State Command, Convention Doc & Tracer Bullet

## Issues

**[IMPORTANT]** Phase 1 state command bypasses `output()` but plan does not specify error handling path

The plan states the state command writes directly via `deterministicStringify()` + `process.stdout.write()` and does not use the shared `output()` function. This is correct for the happy path (always-JSON output). However, the plan does not specify what happens on the error path. Every other command relies on the top-level error handler in `src/index.ts` which calls `outputError()` — that function checks `args.json` and `args.query` to decide between JSON and human-readable error output. Since the state command is always-JSON, the implementer needs to know: does the top-level handler suffice (it would, because `args.json` or `args.query` will typically be set), or should the state command explicitly set `json: true` in its args to guarantee structured error output even when invoked as bare `goodplan state` (no `--json` flag)? The risk: `goodplan state` with no flags hits an error, the top-level handler sees `json: false` and `query: undefined`, and outputs a human-readable error to stderr instead of structured JSON to stdout. For an LLM-facing command, this is wrong. Add a note to the state command task: "Ensure the error path also outputs JSON — either force `args.json = true` before any code that might throw, or handle errors within the command itself."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 convention doc section 9 references `slice:complete` and `quest:complete` stdin payloads but the plan provides no guidance on deriving their shapes

The plan says section 9 should "document the stdin payload shapes for `slice:complete` and `quest:complete`, since skills need to construct these." The implementer needs to know where to find these shapes. The Zod schemas are in `src/schemas/commands/slice.ts` (`completeSliceInputSchema`) and `src/schemas/commands/quest.ts` (`completeQuestInputSchema`), and they are also exposed via `goodplan schema --json --command slice:complete` (which includes `stdinSchema` from the registry in `schema.ts`). The convention doc task should specify the source: "Derive payload shapes from `goodplan schema --json --command slice:complete` and `goodplan schema --json --command quest:complete`" so the implementer documents the actual schema rather than guessing.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 step 5 references `epic:list --json` but this command has no `--status` filter

The plan says: "For Format B (all slices/epics/quests with states), use `slice:list --json`, `quest:list --json`, `epic:list --json` if available." These commands exist (confirmed in `main.ts`), but they return all entities with their current status — there is no `--status` filter flag to get only active or completed entities. The plan should note that filtering by status must be done client-side (via `--query` on the list output) or clarify that the skill will iterate the full list. This is minor because the implementer will discover it, but explicit guidance avoids a false start.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 Expected Behavior "after" check 4 (`--query '.["activity-log.jsonl"]' --offset 2 --limit 2`) may not produce "different entries" if log has fewer than 4 entries

The verification step says the result should be "different entries" compared to `--limit 2` (which defaults to offset 0). If the activity log has fewer than 4 entries, the offset-2 query could return fewer entries or overlap with the first query. The verification should specify a precondition: "assumes the integration test fixture has at least 5 activity log entries" or use the real `.project/activity-log.jsonl` which has many entries. The manual verification section (step 3-4) correctly uses the real project, but the integration test Expected Behavior needs the fixture precondition documented.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 deprecation note task is present but could be missed because it is buried in the section content description

Round 2 flagged that the deprecation note for `state-and-activity-formats.md` was only mentioned as a sub-bullet of section 6. The plan now has an explicit task: "Add deprecation note to `skills/_shared/references/state-and-activity-formats.md`" — this addresses the round 2 concern. However, the task says "add a note at the top of its state.md section" while the current `state-and-activity-formats.md` file structure should be verified. If the file doesn't have a clearly delineated "state.md section," the implementer may be confused. Consider specifying: "Add a deprecation note at the top of the file (before any content) pointing to `cli-interaction.md`."

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan has addressed all round-2 issues well. The unit test naming is now `state.test.ts` (consistent with codebase convention). The bare-state output behavior now explicitly says "does not use the shared `output()` function" and writes directly via `deterministicStringify()`. The activity-log tail approach now uses `'.["activity-log.jsonl"] | .[-5:]'` with jqjs negative indexing (confirmed supported by research doc) with a fallback. The `start-complete` non-existence is now a standalone bullet. The verification performance assertion is softened to "manual spot-check." The remaining issues are about error-path completeness (one IMPORTANT), convention doc source guidance (one IMPORTANT), and three MINOR clarifications. Resolving the two IMPORTANT items would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
