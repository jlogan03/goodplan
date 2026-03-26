# Software Architecture Review — Round 3

Plan: `/Users/iwhite/Repos/goodplan/.project/quests/skill-workflow-bugs/plan-refining.md`
Iteration: 3 | Prior scores: R1 5/10, R2 8/10

---

## Issues

**[MINOR]** Bug 1 fix targets incorrect location — guidance.md already has both sections by design, not by accident

The research file notes Bug 1 as "NOT FOUND" in SKILL.md — the actual duplication is in `skills/create-slices/references/guidance.md`. Reading that file confirms the `goal.md` template has both `## Success Criteria` (lines 92-95) and `## Verification` (lines 96-101) as *distinct sections* with different semantic roles: Success Criteria holds the checklist assertions (`- [ ] <what to run> — <expected outcome>`) and Verification holds the narrative live-testing prose. These are not accidental duplicates — they serve different audiences (CI checklists vs. human testing narrative). The plan proposes merging them into a single `## Verification` section "that includes both checkable assertions and narrative live-testing instructions", but does not explain why retaining both distinct formats in one section is better than two sections. The plan should either (a) justify why the two-section format confuses implementers in practice with a concrete example, or (b) acknowledge the sections are intentionally distinct and scope the fix to removing any actual redundancy in *real* goal.md files rather than restructuring the template.

Additionally, the plan's Phase 1 "Before" verification check is `grep -n "^## Success Criteria$" skills/create-slices/references/guidance.md` which will match correctly, and the "After" check is `grep -n "^## Success Criteria$" ... → no matches`. But if the intent is to rename (consolidate) rather than delete the content, the "After" state loses the heading-level assertion format that the guidance prescribes. The SKILL.md Step 6 sub-step 3 (line 132–134) currently references both "Success Criteria" and "Verification" and already explains their distinct purposes well. The plan merges this into "a single guidance paragraph for 'Verification'" — but that single paragraph must preserve both behavioral modes (checklist + narrative). The plan doesn't specify how to do this without losing clarity.

Resolution: DIRECTLY_ACTIONABLE

*Fix*: Either (a) keep both sections but clarify the semantic distinction in guidance.md's preamble, scoping Bug 1 only to removing actual redundant restatement in the template text; or (b) if merging is the right call, add explicit prose in the plan task describing what the merged `## Verification` section must contain — checklist subsection + narrative subsection — so the implementer doesn't collapse them into a single blob.

---

**[MINOR]** Bug 2 placement instruction still ambiguous for implementers

The plan says to add the Workflow Action Principle "within or after Section 5" of `cli-interaction.md`. Section 5 is "Interaction Patterns by Role" — a description of orchestrator vs. sub-agent patterns. The principle about not asking permission for workflow-defined actions is orthogonal to role-based patterns; it's a general interaction guideline. Placing it "within or after" Section 5 leaves the implementer to decide insertion point. Round 2 presumably tightened the grep verifications but not the insertion location. Given `cli-interaction.md` has a Table of Contents (ToC) that hyperlinks section anchors, adding a subsection within Section 5 also requires a ToC update (or the new subsection will be undiscoverable via the ToC). The plan does not mention the ToC update.

Resolution: DIRECTLY_ACTIONABLE

*Fix*: Specify the exact insertion point (e.g., "add as a new `### Workflow Action Principle` subsection at the end of Section 5, before `## 6. State Orientation`") and add a ToC update task.

---

**[MINOR]** Phase 2 Verification diff command will silently fail if extraction introduces whitespace changes

The plan says: `diff extracted Iteration Summary template against the original inline version in refine-plan — no accidental content changes`. The Iteration Summary template in refine-plan/SKILL.md lives inside a larger file (lines 251-278 per research). When extracted to `output-templates.md`, the surrounding context (fenced code block delimiters, Notes section) may be omitted or restructured. A naive `diff` of the extracted file against a grep of the source lines will flag every structural difference as a failure even if content is identical. The plan doesn't specify what form the diff command takes — diffing the entire output-templates.md against the full SKILL.md will produce false positives; diffing only the template lines requires a precise extraction command that the plan doesn't provide.

Resolution: DIRECTLY_ACTIONABLE

*Fix*: Replace the vague `diff` instruction with a concrete verification: "Extract lines {N}-{M} from `skills/refine-plan/SKILL.md` (the fenced block starting `### Iteration Summary Template`) and diff against the corresponding block in `output-templates.md` using `diff <(sed -n 'Np,Mq' SKILL.md) output-templates.md`." Or simply state "Read both files and confirm the fenced code block content is character-for-character identical."

---

**[MINOR]** Phase 3b checklist for create-plan and create-slices adds templates for outputs that don't exist as rigid structured points — scope creep risk

The plan's Phase 3b task for `create-plan` converts "semi-rigid phase context header and progress indicator to inline rigid templates." For `create-slices`, it converts the "slice list proposal (Step 4)" and "progress indicator (Step 6)." These are conversational outputs — the skill shows a draft and asks corrections. Making them rigid templates constrains the LLM's output format for inherently iterative, conversational outputs. Unlike Iteration Summary (which is a status dashboard after a completed sub-agent cycle), the "slice list proposal" varies in structure based on how many slices there are and whether the skill is in Add/Revise/Fresh mode. Forcing a single rigid template across these modes may produce awkward outputs when, e.g., there is only 1 slice vs. 12.

This isn't a critical architectural concern since these are display outputs only, but the plan should acknowledge that "rigid template" for conversational outputs means "here is the expected shape" not "here is the exact text to emit word-for-word." The plan currently groups conversational and non-conversational outputs under the same "rigid inline template" directive without distinguishing them.

Resolution: DIRECTLY_ACTIONABLE

*Fix*: In Phase 3b tasks for create-plan and create-slices, add a clarifying note: "Rigid here means a fenced code block showing expected shape with `{placeholders}` — the skill adapts content to context (slice count, mode) while maintaining structural consistency."

---

**[MINOR]** Phase 3b Verification section lists per-skill output point checklists but no mechanism to catch outputs the plan misidentified or missed

The verification approach for Phase 3b is: "for each skill above, grep for structured output points and confirm each one either has an inline rigid template or references shared `output-templates.md`." However, the plan defines *which* outputs need templates based on Round 1-2 research. If the plan misidentified an output point (e.g., missed a structured output in `create-plan` Step 5), the per-skill checklist won't catch it because the checklist is derived from the same plan. There's no "enumerate all structured outputs first, then verify coverage" step — just "verify the specific items the plan listed."

This is a minor gap for this plan's scope, but given that the confirmed goal includes "No structured output point is described in prose only," there should be at least one verification step that does a fresh enumeration: grep each SKILL.md for output display language ("List:", "Present:", "Display:", "Show:") and confirm nothing prose-only remains.

Resolution: DIRECTLY_ACTIONABLE

*Fix*: Add to Phase 3b Verification: `grep -n "^List:\|^Present:\|^Display:\|^Show:" skills/{create-plan,create-slices,complete,refine-slices}/SKILL.md` → confirm all matches are followed by or preceded by a rigid template, not prose only.

---

## Score: 9/10

Round 3 plan is in strong shape. All critical and important issues from prior rounds are resolved. The five remaining issues are minor — two are preciseness gaps in task descriptions that could leave implementers guessing (Bug 1 justification, Bug 2 ToC), two are missing verification rigor (diff command, prose-only grep), and one is a scope clarity note for conversational outputs. None block implementation if the implementer is careful, but any one of them could cause a subtle regression or wasted effort. Addressing the four DIRECTLY_ACTIONABLE fixes would bring this to 9.5+/10.

## Summary

- Critical: 0
- Important: 0
- Minor: 5
