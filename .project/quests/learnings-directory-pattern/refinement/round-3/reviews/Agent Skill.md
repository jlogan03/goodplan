## Issues

**[IMPORTANT]** `cli-interaction.md` payload examples and schema documentation still show `detail` field — plan misses updates to this shared reference
The plan's Phase 3 task for `skills/_shared/references/cli-interaction.md` says "Update data ownership table" to add `learnings/*.md` as CLI-owned. However, this file also contains the authoritative payload documentation for `slice:complete` and `quest:complete` (lines 422, 428, 443). These show `"detail": "..."` in the learnings array schema and example. Since the `learningInputSchema` still accepts `detail` (the CLI maps it to a `file` internally), the payload docs are technically still correct during the transition period — but after Phase 4 tightens the schema, these examples become misleading. The plan should add a task to update the payload schema documentation in `cli-interaction.md` (lines 422-428 at minimum) as part of Phase 3 or Phase 4, so skills constructing payloads know the `detail` field is what the CLI will write to disk. At minimum, add a note in the Phase 3 task that the payload examples still show `detail` and that this is intentional (since `learningInputSchema` is unchanged), or update the docs to explain the CLI-side mapping.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 Verification section's broader grep pattern has a gap for reference files
The Verification section at line 129 says `grep -r 'learnings\.md' skills/` should only match `completion/learnings.md` references. This is a good broader check. However, `skills/_shared/references/cli-interaction.md` line 611 has `plan-learnings-and-feedback.md` in the "What Stays Direct" list, which also matches the `learnings\.md` pattern. This isn't a false positive in the sense of monolithic file references — it's a plan filename. The verification instruction should note this expected match alongside `completion/learnings.md` to avoid confusion during execution.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `epic-conventions.md` directory diagrams show `learnings.md` under `completion/` — task description should clarify these are preserved
The plan's Phase 3 task says "Update any directory structure diagrams that show `learnings.md` to show `learnings/` directory instead." The two `learnings.md` entries in `epic-conventions.md` (lines 66 and 97) are both under `completion/` — these represent `completion/learnings.md`, the re-entry artifact that is explicitly preserved. The task description should clarify that these specific `learnings.md` entries must NOT be changed, and that the directory diagrams need a new `learnings/` directory entry added alongside the existing `completion/learnings.md`. As written, an implementer could mistakenly rename the `completion/learnings.md` entries.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
Round 2's two IMPORTANT issues (missing `create-plan/references/guidance.md` task and second bare reference in `audit-architecture/SKILL.md`) are both addressed. The plan now has explicit tasks for every skill file that references `.project/learnings.md`, with read-vs-template annotations and accurate line references. The broader grep patterns catch bare `learnings.md` without the `.project/` prefix. The one remaining IMPORTANT issue is that `cli-interaction.md` — the authoritative payload documentation for skills — has payload examples and schema docs showing `detail` that need at least a clarifying note. The two MINOR issues are about preventing implementer confusion in verification and directory diagram tasks.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
