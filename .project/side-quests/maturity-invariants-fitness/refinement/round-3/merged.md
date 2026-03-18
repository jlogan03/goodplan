# Merged Feedback — Round 3

## CRITICAL

None.

## IMPORTANT

None.

## MINOR

**[MINOR-1] Phase 4 shared preamble addition uses plan-specific language** (Holistic)
The shared preamble update says "plans must not violate documented system invariants." The shared preamble is used by both `/refine-plan` and `/refine-architecture`. Wording should be neutral: "the document under review must not violate documented system invariants without explicit justification and an amendment step."

**[MINOR-2] Phase 4 SW Architecture reviewer Codebase Exploration Focus uses plan-specific language** (Holistic)
"check maturity levels of subsystems the plan touches" should read "check maturity levels of subsystems the document under review touches" — consistent with the dual-context wording already applied to Holistic criteria 12 and 13.

**[MINOR-3] Phase 4 Holistic reviewer Codebase Exploration Focus uses plan-specific language** (Holistic)
"documented system constraints that plans must respect" should read "documented system constraints that the document under review must respect."

**[MINOR-4] Phase 3 refine-architecture editor guardrail — "evidence annotation" is undefined** (Software Architecture)
"Maturity level changes require evidence annotation explaining the justification" uses a term not defined elsewhere. Existing guardrails use concrete patterns (e.g., "FLAGGED: Change to {subsystem} may affect decision {decision-file}."). The maturity guardrail should specify a concrete format, e.g.: "MATURITY CHANGE: {subsystem} from {old} to {new} — justification: {evidence}" in the edit summary. Without a concrete format, implementers will invent ad-hoc annotations the orchestrator can't reliably detect.

**[MINOR-5] Phase 4 SW Architecture reviewer criterion 12 omits Developing subsystem scrutiny** (Software Architecture)
Criterion 12 flags plans modifying "a maturing or foundational subsystem" but skips the Developing level. The design spec's change protocol (line 150) says Developing subsystems need "deliberate" changes. Criterion should read "developing, maturing, or foundational" with escalating scrutiny (light check for Developing, full justification for Maturing+).

**[MINOR-6] Phase 2 Step 8h fitness candidate creation lacks iteration limit** (Agent Skill)
Step 8h ("Present to user") has no guidance on revision rounds or exit condition, unlike Step 8g (invariants) which has an explicit stub/exit path. Add: "Accept after one round of user feedback — this is a starting point, not a final specification."

**[MINOR-7] Phase 4 implement-plan shared-preamble wording is awkward for code review context** (Agent Skill)
"implementation must not violate documented system invariants without explicit justification and an amendment step" — the phrase "amendment step" makes sense for plan review but is awkward for code review (where reviewers see `git diff HEAD`). Consider: "implementation must not violate documented system invariants — flag violations as CRITICAL with a note to discuss invariant amendment if the violation is intentional."

Note: MINOR-1 and MINOR-7 both address the implement-plan shared preamble but from different angles. MINOR-1 targets the `/refine-plan`/`/refine-architecture` shared preamble (neutralizing plan-specific language); MINOR-7 targets the implement-plan shared preamble (fixing awkward "amendment step" wording for code-diff context). These are distinct artifacts and both apply.

## DIRECTLY_ACTIONABLE

1. MINOR-1: Neutralize shared preamble wording ("plans must not violate" → "document under review must not violate")
2. MINOR-2: Neutralize SW Architecture reviewer Codebase Exploration Focus ("plan touches" → "document under review touches")
3. MINOR-3: Neutralize Holistic reviewer Codebase Exploration Focus ("plans must respect" → "document under review must respect")
4. MINOR-4: Define concrete annotation format for maturity guardrail in refine-architecture editor guardrails
5. MINOR-5: Extend criterion 12 to include Developing subsystems with escalating scrutiny
6. MINOR-6: Add iteration limit / exit condition to Step 8h user presentation
7. MINOR-7: Reword implement-plan shared preamble to fit code-review context

## RESEARCH_NEEDED

None.

## Contradictions Resolved

None — all three reviewers flagged distinct issues with no overlapping contradictions.

## Unresolved

None.
