## Issues

**[IMPORTANT]** Shared legend file inlining creates drift risk — contradicts single-source goal

The plan says `maturity-legend.md` is a "single shared reference file so all skills reference one canonical copy," but then instructs Phase 1 tasks to "inline the content from that file" into both `shared-preamble.md` and `sub-agent-prompts.md`. If the content is literally inlined (copy-pasted) into two locations, a future editor updating `maturity-legend.md` must also update those two spots — exactly the drift the shared file was supposed to prevent. The plan should clarify the mechanism: either (a) the orchestrator reads `maturity-legend.md` at runtime and interpolates it via a `{maturity_legend}` placeholder (keeping one source of truth), or (b) the plan explicitly states that the inline text must be kept in sync manually and the verification step catches drift. Option (a) is strongly preferred since both implement-plan and refine-plan already have placeholder-filling machinery. This affects Phase 1 tasks 3 and 4, Phase 2 task 3, and the Phase 3 preamble inheritance assumption.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 SKILL.md line reference may be fragile

The plan references "line 86" of implement-plan's SKILL.md for the insertion point. The current line 86 does contain the `conventions.md` loading instruction, so the reference is accurate today. However, line numbers shift as the file is edited. Consider also including the surrounding text anchor (e.g., "after the line: 'Also load `.project/conventions.md` if it exists'") so the implementing agent can locate the insertion point even if line numbers have shifted. The plan partially does this already but the line number is given primary weight.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 Step 0b insertion point not precisely anchored

Phase 2 says to add maturity extraction "In Step 0b (Load Plan and Prepare Working Copy), after loading the plan." Step 0b has seven sub-steps (detect plan type, duplicate, check splitting, preserve original, operate on copy, derive slug, derive scope). "After loading the plan" is ambiguous — it could mean after sub-step 1 (detect plan type) or after all seven sub-steps. The create-plan pattern (Step 3, sub-step 4) places maturity extraction right after architecture loading. Since refine-plan's Step 2b already loads architecture via codebase context discovery, the maturity extraction should logically go in Step 2b (after architecture is loaded), not Step 0b (which is about plan mechanics). This would also mirror the implement-plan Phase 1 pattern more closely, where maturity extraction is adjacent to architecture loading.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is well-structured with consistent patterns across all three phases, correct file references verified against the codebase, and clear verification steps. The round-1 issues have been addressed effectively: language is definitive, maturity-conventions.md alignment is correct, and the consumer guide update is included. The one IMPORTANT issue — the inlining-vs-placeholder tension for the shared legend — is a real design gap that could undermine the stated single-source-of-truth goal if not resolved. Fixing that and the two minor anchor improvements would bring this to 10.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
