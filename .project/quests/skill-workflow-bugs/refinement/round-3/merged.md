# Merged Feedback — Round 3

Sources: Holistic (9/10), Software Architecture (9/10), Agent Skill (9/10)
Merged score: 9/10 | Critical: 0, Important: 1, Minor: 6

---

## CRITICAL Issues

None.

---

## IMPORTANT Issues

**[IMPORTANT-1]** Bug 1 merge format insufficiently specified for an implementing agent

Raised by: Agent Skill (IMPORTANT); partially overlaps with Software Architecture (MINOR) on the same issue. Agent Skill's domain-specific framing takes precedence.

The plan says "merge into a single guidance paragraph for 'Verification' that covers both writing checkable assertions and describing live end-to-end testing" and "preserving both formats from the original two sections." This is still underspecified. The `guidance.md` file has two related content areas: (a) the narrative quality bar at lines 11–17 explaining what Success Criteria and Verification mean, and (b) the goal.md template at lines 92–100 with distinct `## Success Criteria` and `## Verification` sections. An implementing agent must invent the merged structure without guidance.

Additionally, Software Architecture notes these sections may be intentionally distinct — Success Criteria holds checklist assertions (`- [ ] <what to run> — <expected outcome>`) while Verification holds narrative live-testing prose — and the plan does not justify why merging them is better than clarifying the semantic distinction.

Fix (choose one):
- **(a) If merging:** Add one sentence specifying structure: "The consolidated `## Verification` section should open with checklist-style assertions (`- [ ] ...` format from the old Success Criteria) followed by the narrative live-testing paragraph." Also specify how the Phase 1 "After" state verification accounts for content preservation (not just heading deletion).
- **(b) If not merging:** Scope Bug 1 to removing actual redundant restatement in the template text, keeping both sections but clarifying the semantic distinction in `guidance.md`'s preamble. Update Phase 1 grep verifications accordingly.

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

**[MINOR-1]** Bug 1 task description references line numbers that will age poorly

Raised by: Holistic.

The Bug 1 task says "update `skills/create-slices/SKILL.md` Step 6 sub-step 3 (line ~132)". Line references age poorly. Describe the target by content instead: "the paragraph in Step 6 that mentions 'Success Criteria' and 'Verification'."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2]** Bug 2 insertion point ambiguous; ToC update not mentioned

Raised by: Software Architecture.

The plan says to add the Workflow Action Principle "within or after Section 5" of `cli-interaction.md`. This leaves the implementer to choose the insertion point. `cli-interaction.md` has a Table of Contents with hyperlinked section anchors — adding a subsection without updating the ToC leaves it undiscoverable.

Fix: Specify the exact insertion point (e.g., "add as a new `### Workflow Action Principle` subsection at the end of Section 5, before `## 6. State Orientation`") and add an explicit ToC update step.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3]** Phase 2 diff verification underspecified — will produce false positives

Raised by: Software Architecture.

The plan says "diff extracted Iteration Summary template against the original inline version in refine-plan — no accidental content changes." A naive `diff` between the extracted file and the source file will flag structural differences (surrounding fenced block delimiters, Notes section) as failures even when content is identical. No concrete extraction command is provided.

Fix: Replace the vague `diff` instruction with a concrete check, e.g., "Read both files and confirm the fenced code block content is character-for-character identical" or provide a `sed`-based extraction range and explicit `diff` command.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4]** "Rigid template" directive conflates conversational and non-conversational outputs

Raised by: Software Architecture.

Phase 3b converts outputs in `create-plan` and `create-slices` (e.g., phase context header, progress indicator, slice list proposal) to "rigid inline templates." Some of these are conversational — the skill shows a draft and asks for corrections. The slice list proposal varies by slice count and mode (Add/Revise/Fresh). Grouping these with non-conversational outputs under the same "rigid inline template" directive without distinction risks either awkward outputs or implementer confusion about strictness.

Fix: In Phase 3b tasks for `create-plan` and `create-slices`, add a clarifying note: "Rigid here means a fenced code block showing expected shape with `{placeholders}` — the skill adapts content to context (slice count, mode) while maintaining structural consistency."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5]** Phase 3b verification has no mechanism to catch outputs the plan missed

Raised by: Software Architecture; complementary to Agent Skill's MINOR-1 on vague grep.

The per-skill checklists in Phase 3b verification are derived from the same plan research. If the plan misidentified or missed a structured output, the checklist won't catch it. There is no "fresh enumeration" step.

Fix: Add to Phase 3b Verification a fresh-enumeration grep: `grep -n "^List:\|^Present:\|^Display:\|^Show:" skills/{create-plan,create-slices,complete,refine-slices}/SKILL.md` → confirm all matches are followed by or preceded by a rigid template, not prose only. This addresses both the coverage gap and the vague grep instruction from Agent Skill MINOR-1.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-6]** Phase 1 verification includes TypeScript checks for a markdown-only edit phase

Raised by: Agent Skill.

Phase 1 (Bug Fixes) includes `bun run check`, `tsc --noEmit`, and `bun test`. All three bugs are changes to markdown files (SKILL.md, `cli-interaction.md`) with no TypeScript. These checks will always pass and add noise — an implementing agent may waste time or wonder why they're listed.

Fix: Remove these checks from Phase 1 verification, or add a note: "Included as sanity baseline only — not expected to catch regressions from markdown-only edits."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-7]** Phase 3b verification checklist doesn't clarify refine-plan's status or complete's retained outputs

Raised by: Holistic (two sub-items combined here).

Two related clarity gaps in Phase 3b verification:
1. Phase 3b's verification includes "grep for structured output points" across all skills, but refine-plan was already verified in Phase 3a. The checklist should note it's included for completeness, not re-verification.
2. The per-skill checklist for `complete` lists "Done Summary (inline), Context Load Summary (inline)" but omits the signal-tracking alert and no-divergence message. The plan says these are kept as-is (already semi-rigid/rigid) — but if they're not being changed, they should still appear in the checklist (or be explicitly excluded with a note) so an implementer doesn't wonder if they were missed.

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE

All 7 issues above. No research needed before acting.

---

## RESEARCH_NEEDED

None.

---

## Contradictions Resolved

**Bug 1 severity:** Agent Skill rated the merge format gap as IMPORTANT; Software Architecture rated it MINOR. Agent Skill's framing is more precise (implementation-level detail, domain expertise on skill authoring) — elevated to IMPORTANT. The two reviewers agree on the fix direction; the difference is severity, not substance.

**Bug 1 disposition (merge vs. keep separate):** Software Architecture questions whether merging is the right call; Agent Skill assumes merging is correct and focuses on format precision. Merged feedback presents both options explicitly and defers the disposition choice to the implementer (or a plan revision).

**Phase 3b grep:** Agent Skill flagged the vague grep instruction as MINOR-1; Software Architecture proposed a concrete grep pattern as part of its MINOR-5. Merged into a single MINOR-5 combining both fixes.

---

## Unresolved (USER_INPUT required)

None. All issues have clear, actionable fixes. The Bug 1 disposition (merge vs. keep two sections) is presented as an implementer choice with explicit guidance for each path.
