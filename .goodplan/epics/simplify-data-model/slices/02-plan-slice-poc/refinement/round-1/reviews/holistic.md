# Holistic Review — Plan-Slice PoC

## Issues

**[IMPORTANT]** Severity level mismatch between plan and installed reviewer system

The plan's Phase 1 task for `review-preamble.md` specifies severity levels "CRITICAL, IMPORTANT, SUGGESTION, NITPICK" but the confirmed goal and the existing installed reviewer infrastructure (v1.0.3 `shared-preamble.md` line 70) uses "CRITICAL, IMPORTANT, MINOR". The plan itself uses "MINOR" nowhere in the reviewer definition but then the installed preamble this content will be extracted from uses MINOR. This inconsistency will cause reviewer agents to emit severities that the synthesis agent and orchestrator exit-condition logic don't expect.

Resolution: DIRECTLY_ACTIONABLE

Fix: Align the severity levels in Phase 1's review-preamble task to match the existing system: CRITICAL, IMPORTANT, MINOR. If SUGGESTION/NITPICK are intentional additions, the synthesis agent and exit-condition logic must also be updated to handle them.

---

**[IMPORTANT]** Architecture doc says `skills:` for agent content injection but plan correctly uses `@` references — residual contradiction in epic architecture

The epic architecture `_overview.md` line 69 states: "The `skills:` frontmatter field lists named skills whose full SKILL.md bodies are injected into the agent's context at startup. Each injectable reference must therefore be a skill directory with a SKILL.md file." But two paragraphs earlier (line 41-42) and the key decisions section both say `skills:` frontmatter is broken (issue #25834) and to use `@` references instead. The plan correctly uses `@` references throughout. However, line 69's instruction that shared references "must therefore be a skill directory with a SKILL.md file" is wrong for `@` references — they can be plain `.md` files in `skills/_shared/references/`, which is what the plan does.

This is not a plan defect (the plan is correct), but the contradictory architecture doc will confuse subsequent slices building on this pattern. The plan should include a task to fix this contradiction in the epic architecture doc, or at minimum note it as a known inconsistency.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a task (Phase 1 or a cross-cutting task) to update the epic architecture `_overview.md` to remove the stale `skills:` frontmatter paragraph at line 69 and replace it with the `@` reference mechanism that was validated in the prototype.

---

**[IMPORTANT]** Phase 3 re-entry for `plan-refined` status offers "re-refine or view" but doesn't define what re-refine means operationally

The plan states: "if slice status is `plan-refined`, offers to re-refine or view existing plan." But the plan doesn't specify what happens during re-refinement. Does it: (a) run the full refinement loop again on the existing plan? (b) go back to Q&A? (c) reset status to `planning`? Without this, an implementer will have to guess. The status-to-phase mapping in the epic architecture conventions.md should inform this, but the plan doesn't reference it.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a bullet under re-entry detection specifying: re-refine spawns the refinement loop (Phase 2's coordinator -> reviewers -> synthesis -> editor cycle) on the existing plan without re-running Q&A. Status transitions back to `planning` before re-refinement starts, then back to `plan-refined` on completion.

---

**[IMPORTANT]** No cleanup of the temp working directory

The plan creates `/tmp/gp-plan-slice-<name>-<ts>/` for working artifacts but never mentions cleanup. Over multiple runs (especially during development and testing), these accumulate. The plan should specify when the temp directory is cleaned up — either after successful `submit-plan`, or left for debugging with a note about manual cleanup.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a task or note in Phase 3 specifying: temp directory is preserved on failure (for debugging) and optionally cleaned up on successful plan submission. At minimum, log the temp directory path so the user knows where artifacts live.

---

**[MINOR]** Phase 1 agent count will likely exceed 7

The plan lists 7 agent files in Phase 1's expected behavior. However, the epic architecture `_overview.md` lists additional agents needed by other pipeline skills: `explore-phase.md`, `architecture-phase.md`, `refine-phase.md`, `slices-phase.md`, `implement-phase.md`. While this PoC only needs the 7 listed agents, the architecture's agent directory example shows more. This is fine for the PoC scope — just noting that the "7 files" assertion in expected behavior is correct for this slice but the agents/ directory will grow in subsequent slices.

Resolution: DIRECTLY_ACTIONABLE

Fix: No change needed, but consider adding a comment in the expected behavior noting these are the PoC agents and more will be added in subsequent slices.

---

**[MINOR]** Phase 2 expected behavior checks `grep agents` on plugin.json but the actual field is `"agents": "./agents"` — grep would match but the test is fragile

The expected behavior check `cat dist/gp-plugin/.claude-plugin/plugin.json | grep agents` will match the word "agents" anywhere in the JSON, not specifically the `"agents"` key. A more precise check would be `jq '.agents'` or `grep '"agents"'`.

Resolution: DIRECTLY_ACTIONABLE

Fix: Change the expected behavior check to use `jq '.agents'` or at minimum `grep '"agents"'` for precision.

---

**[MINOR]** Phase 4 `verifyOrchestratorDiscipline()` needs clearer definition of "orchestrator-level reads" vs "sub-agent reads"

The task says "Distinguishes orchestrator-level reads from sub-agent reads (sub-agent reads are expected and allowed)" but doesn't specify how this distinction is made. The Agent SDK session transcript likely doesn't clearly separate orchestrator tool calls from sub-agent tool calls in a flat list. The implementation will need to understand the transcript format.

Resolution: CODEBASE_EXPLORATION

Explore: Check `tools/dogfood/utils.ts` and Agent SDK transcript format to understand how tool calls are attributed to orchestrator vs sub-agent. Look at existing test scripts (test-plugin-skills.ts, test-onboard.ts) for patterns of parsing tool call records.

---

**[MINOR]** Documentation update task missing

The plan doesn't include tasks for updating documentation. While this is a PoC and the agents/skills being created are the documentation (self-documenting via frontmatter and body content), the CLAUDE.md file references to skills and the agent SDK harness section should be updated to mention the new `test-plan-slice.ts` harness script. This is low severity since the CLAUDE.md update can happen in a later slice.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a minor task in Phase 4 to update the Agent SDK Test Harness table in CLAUDE.md with the new `test-plan-slice.ts` entry.

## Score: 7/10

The plan is well-structured with clear phasing, good expected behavior sections, and solid alignment with the confirmed goal. It correctly handles the `@` reference mechanism, temp-dir artifact pattern, and context discipline constraints. However, four IMPORTANT issues bring the score down: the severity level mismatch could cause runtime failures in the review pipeline, the architecture doc contradiction will confuse future implementers, the re-entry behavior is underspecified, and temp directory lifecycle is unaddressed. Fixing these four items would bring the score to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
