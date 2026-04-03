# Agent Skill Review — plan-slice SKILL.md

## Issues

**[IMPORTANT]** Description triggers overlap with existing create-plan and refine-plan skills
The description field includes phrases like "create-plan and refine-plan workflow" and "end-to-end plan creation". The plan-refined.md explicitly warns: "Avoid bare 'create plan' or 'refine plan' triggers." The current description includes "create and refine plan" as a trigger, which will compete with the existing `/gp:create-plan` and `/gp:refine-plan` skills for triggering. The differentiating triggers ("orchestrated plan slice", "plan and refine a slice") are good, but the "Combines the create-plan and refine-plan workflow" phrasing and "create and refine plan" trigger risk incorrect skill selection.
File: skills/plan-slice/SKILL.md:5
Resolution: DIRECTLY_ACTIONABLE

Suggested fix: Remove "Combines the create-plan and refine-plan workflow into a single pipeline invocation." from the description. Replace the "create and refine plan" trigger with something more distinct like "pipeline plan slice" or "plan-slice pipeline". Keep "plan and refine a slice end-to-end" and "orchestrated plan slice" as the primary differentiators.

---

**[IMPORTANT]** Stagnation detection logic is inconsistent with plan specification
The plan (line 111) specifies: "stops after 2 adjacent no-improvement rounds or 2 net-reduction rounds (any position)". The SKILL.md (lines 286-287) implements stagnation as: "if `scores` has 2+ entries and the last 2 scores are equal or the last score is less than or equal to the previous -> increment stagnation counter. If 2 adjacent rounds with no improvement -> exit." But then line 287 separately tracks `reductionCount` for net reduction. The problem: the stagnation check at line 286 conflates "equal" and "less than" into one condition. A round where the score drops should increment `reductionCount` (net reduction tracker) but the SKILL.md also increments the stagnation counter for it — double-counting drops as both stagnation and reduction. The two conditions should be separate: stagnation = equal scores (no improvement), reduction = lower score.
File: skills/plan-slice/SKILL.md:286
Resolution: DIRECTLY_ACTIONABLE

Suggested fix: Split the condition:
- Stagnation: `score === scores[previous]` (exactly equal, no improvement) -> increment stagnation counter
- Reduction: `score < scores[previous]` -> increment `reductionCount`
Keep the thresholds: 2 adjacent stagnation rounds -> exit, 2 total reduction rounds -> exit.

---

**[IMPORTANT]** Reviewers instructed as read-only but SKILL.md says orchestrator writes their output
Lines 255-258 say reviewers return JSON with review text inline, and the orchestrator writes the output to files. But the reviewer agent tool restrictions (line 123 of plan, line 349-350 of SKILL.md) give reviewers `allowedTools: ["Read", "Grep", "Glob"]` — read-only. This is internally consistent for the reviewer themselves. However, the synthesis agent (line 268) is told to read `$TMPDIR/reviews/{domain}.md` — but these files must be written by the orchestrator between spawning reviewers and spawning synthesis. The SKILL.md says at line 258 "The orchestrator writes each reviewer's full return text to `$TMPDIR/reviews/{domain}.md` using the Write tool" — this is correct as stated but the instruction is buried in a sub-step rather than being a discrete step. An LLM orchestrator could miss this Write step between 4e-ii and 4e-iii.
File: skills/plan-slice/SKILL.md:258
Resolution: DIRECTLY_ACTIONABLE

Suggested fix: Add an explicit step 4e-ii-b between reviewer spawning and synthesis spawning: "Write each reviewer's return text to `$TMPDIR/reviews/{reviewer-name}.md` using the Write tool." Make it a numbered step, not embedded in the reviewer spawn description.

---

**[MINOR]** `submit-plan` command receives empty stdin via echo
Line 205: `echo '' | $GP submit-plan --slice $SLICE_NAME --json`. The `submit-plan` command reads the plan content from stdin. Piping an empty string suggests the plan content is already on disk and the CLI reads it from the slice's plan path. If `submit-plan` actually requires plan content on stdin, this would submit an empty plan. If it reads from disk (which is likely given the architecture), the `echo '' |` is misleading — just run the command without piped input.
File: skills/plan-slice/SKILL.md:205
Resolution: CODEBASE_EXPLORATION

Research: Check whether `gp submit-plan` reads plan content from stdin or from the slice's plan file on disk. If from disk, remove the `echo '' |` prefix. If from stdin, the plan content needs to be piped in (e.g., `cat $TMPDIR/draft/plan.md | $GP submit-plan ...`).

---

**[MINOR]** Missing `requires:` field alignment with plan specification
The plan (line 119) specifies frontmatter should include `user-invocable: true`, which is present. But no other existing skill in the repo uses `user-invocable` in frontmatter — the default is `true` per the Claude Code docs. Including it is harmless but inconsistent with the 18 other skills in the repo that omit it. The epic conventions (line 203) do list it as part of the pipeline skill structure, so this is intentional for the new pattern.
File: skills/plan-slice/SKILL.md:10
Resolution: MINOR

---

**[MINOR]** Context Discipline section could be more specific about what "lightweight summary files" are allowed
The epic conventions (line 13-14) mention "lightweight summary files when user-facing context is needed (re-entry summaries, error details from failed sub-agents)" as acceptable orchestrator reads. The SKILL.md's Context Discipline section (lines 20-24) lists what the orchestrator CAN use but doesn't mention lightweight summary files at all. This is stricter than the conventions allow, which could cause problems if the orchestrator needs to read a small summary for re-entry.
File: skills/plan-slice/SKILL.md:20
Resolution: DIRECTLY_ACTIONABLE

Suggested fix: Add "Lightweight summary files (re-entry context, error details from failed sub-agents)" to the bullet list of allowed context sources.

---

**[MINOR]** No explicit instruction to use the Agent tool's `model` parameter
The epic conventions (line 169) specify "Default model is `opus` for all agents." The agent definitions in `agents/` have `model: opus` frontmatter. However, the SKILL.md spawn instructions (e.g., lines 170-194, 229-239) don't mention passing a model parameter when using the Agent tool. If the Agent tool respects the agent definition's frontmatter model, this is fine. But if the orchestrator needs to explicitly set the model, it's missing.
File: skills/plan-slice/SKILL.md:170
Resolution: CODEBASE_EXPLORATION

Research: Check whether the Agent tool in Claude Code automatically respects agent definition frontmatter `model:` field, or if the orchestrator must pass a `model` parameter explicitly when spawning.

---

**[MINOR]** Cleanup step (4g) says "may be cleaned up" — ambiguous
Line 323: "the temp directory may be cleaned up." This is vague. An LLM orchestrator benefits from clear instructions: either clean up or don't. Since the artifacts are in `/tmp/` they'll be cleaned up by the OS eventually. A clear "Delete the temp directory on success" or "Leave the temp directory for the user to inspect" would be better.
File: skills/plan-slice/SKILL.md:323
Resolution: DIRECTLY_ACTIONABLE

Suggested fix: Replace "the temp directory may be cleaned up" with "delete the temp directory using `rm -rf $TMPDIR`" for success, and keep the preserve-on-error behavior as-is.

## Score: 7/10

The skill follows the orchestrator pattern well: context discipline is enforced, sub-agent tool restrictions are clearly defined, the phase table maps cleanly to CLI statuses, re-entry detection is thorough, and the refinement loop structure matches the epic architecture. The description overlap with existing skills and the stagnation logic inconsistency are the main issues pulling the score down. Fixing the 3 IMPORTANT issues (description overlap, stagnation logic, reviewer output writing step) would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
