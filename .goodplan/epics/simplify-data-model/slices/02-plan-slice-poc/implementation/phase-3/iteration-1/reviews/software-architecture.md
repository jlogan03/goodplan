# Software Architecture Review — Phase 3: Plan-Slice Orchestrator Skill

**Reviewer:** Software Architecture
**Artifact:** `skills/plan-slice/SKILL.md` (359 lines)
**Review context:** a code implementation
**Iteration:** 1

## Issues

**[IMPORTANT]** submit-plan piped empty string is fragile and unnecessary
The skill instructs `echo '' | $GP submit-plan --slice $SLICE_NAME --json` (line 206). However, `submit-plan` does not require stdin content — the schema (`submitPlanInputSchema`) only validates `slice`/`quest` target flags. Piping an empty string works but is misleading and fragile (suggests the command expects stdin). The `submit-plan` command description explicitly states "No stdin needed." Just call `$GP submit-plan --slice $SLICE_NAME --json` directly.
File: skills/plan-slice/SKILL.md:206
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** submit-refinement scores format mismatch
The skill constructs `echo '{"scores":{"overall":'$FINAL_SCORE'}}' | $GP submit-refinement --slice $SLICE_NAME --json` (line 311). The `submitRefinementInputSchema` expects `scores: z.record(z.string(), z.number())` — a map of criterion names to numbers. Using `"overall"` as the only key works syntactically, but the rest of the system (existing `refine-plan` skill, architecture conventions) passes per-reviewer scores, not a single aggregate. This creates an inconsistency in the scores record format. The orchestrator has individual reviewer scores from the synthesis return — pass them as `{"scores":{"holistic":N,"software-architecture":N,...}}` for consistency with the existing convention.
File: skills/plan-slice/SKILL.md:311
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing `reconsiderWhen`/`validUntil` condition evaluation
The epic architecture conventions (conventions.md, "reconsiderWhen / validUntil Evaluation" section) specify that the orchestrator must load active conditions via CLI (`gp decision:list --json`, `gp learning:list --json`) before spawning `plan-phase`, and include them in the task prompt. The `plan-phase` agent is designed to evaluate these (see its "Evaluate conditions" instruction, line 49 of `agents/plan-phase.md`). The skill omits this entirely — neither loading conditions nor passing them to the plan-phase agent.
File: skills/plan-slice/SKILL.md:168
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Stagnation detection logic is overly aggressive
The exit condition in 4e-iv (line 286) triggers stagnation when "the last 2 scores are equal or the last score is less than or equal to the previous." Equal scores across 2 rounds is common and not necessarily stagnation — reviewers may focus on different issues while maintaining the same aggregate score. The architecture specifies: "Warn if net score doesn't rise between adjacent rounds. Stop after 2 adjacent no-improvement rounds." The skill conflates the warning with the stop condition. It should warn on the first no-improvement round but only exit after 2 consecutive no-improvement rounds.
File: skills/plan-slice/SKILL.md:286
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Context discipline violation: orchestrator reads Q&A output path
The orchestrator creates the Q&A file at `$TMPDIR/qa/plan-qa.md` (Step 3e) and then passes the path to the plan-phase agent (Step 4b). This is correct. However, the skill does not explicitly instruct the orchestrator to avoid reading this file itself after writing it. While the current flow likely works because the orchestrator wrote it, the context discipline section states the orchestrator "MUST NOT use the Read tool on architecture files, plan drafts, source code, or agent definitions." The Q&A file is user-facing content the orchestrator itself generated, so it's a gray area — but being explicit about what's in-scope for orchestrator reads would prevent drift.
File: skills/plan-slice/SKILL.md:20
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Missing `--json` flag on `gp slice:plan` in Step 3b
Line 97 shows `$GP slice:plan --slice $SLICE_NAME --json` which is correct. But the skill doesn't specify what to do with the JSON response (verify success, check transition). Other CLI calls (like Step 1 scope resolution) explicitly say to use the response. Minor consistency gap.
File: skills/plan-slice/SKILL.md:97
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Reviewer agent tool restriction mismatch with conventions
The Sub-Agent Tool Restrictions table (line 344) says reviewers get `Read, Grep, Glob`. However, the architecture conventions state "Do not restrict tools by default — sub-agents inherit all parent tools and should be trusted to use what they need." The restriction is fine for reviewers (read-only makes sense), but the skill's `allowedTools` / `disallowedTools` fields in the spawn blocks are pseudo-code — Claude Code Agent tool doesn't accept these parameters. The spawning convention should match whatever mechanism is actually used (e.g., instructions in the task prompt telling the agent what tools to use/avoid).
File: skills/plan-slice/SKILL.md:344
Resolution: CODEBASE_EXPLORATION

**[MINOR]** No handling for `start-plan` ContextBundle `references` overflow
Step 4a calls `start-plan` which returns a `ContextBundle` with `inline` content and a `references` array for paths that exceeded the inline budget. The orchestrator passes both to the plan-phase agent (Step 4b). Good. But there's no guidance on what happens if the references list is very large — should the orchestrator truncate, prioritize, or let the plan-phase agent decide? For PoC this is fine, but worth noting for future hardening.
File: skills/plan-slice/SKILL.md:148
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The skill correctly implements the orchestrator pattern from the epic architecture: flat agent hierarchy, CLI-driven status transitions, front-loaded interaction, and autonomous refinement loop. Module boundaries are clean — the orchestrator delegates all content work to agents and operates on CLI output + structured returns. The phase table and re-entry detection are well-designed.

The score is held back by: (1) the missing `reconsiderWhen`/`validUntil` evaluation, which is an explicit architectural convention this skill must follow; (2) the `submit-refinement` scores format inconsistency, which creates a data contract mismatch with the existing system; (3) the overly aggressive stagnation detection that could prematurely terminate refinement loops.

To reach 9+: fix the four IMPORTANT issues (condition evaluation, scores format, stagnation logic, submit-plan stdin). The MINOR items are genuine but non-blocking.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
