# Merged Feedback — Round 3

## Scores
- Software Architecture: 9/10
- Agent Skill: 9/10

## Summary
Critical: 0 | Important: 0 | Minor: 5

All critical and important issues from previous rounds have been resolved. The remaining items are clarity improvements for implementers and do not affect correctness.

---

## Issues

**[MINOR-1] `activeSlice` type: optional (undefined) not nullable**
Source: Software Architecture

The plan describes `activeSlice` as nullable (`{ name, status } | null`). The actual `StatusResult` type in `rpc-layer-api.md` defines it as optional (`{ name: string; status: string; phase: string } | undefined`). The plan should say "absent (undefined)" rather than "null", so implementers write `activeSlice !== undefined` rather than `activeSlice !== null`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] `--inline` flag accepts optional byte budget**
Source: Agent Skill

The plan uses bare `--inline` (triggers `DEFAULT_INLINE_BUDGET`, ~32KB). The flag also accepts `--inline=<bytes>` (parsed via `parseInlineBudget`). Add one sentence in Phase 2 or Phase 3: "Note: `--inline` accepts an optional `=<bytes>` suffix to control context budget (default: ~32KB)." Without this, an implementer hitting context limits during sub-agent spawning won't know the lever exists.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] `submit-explore` parenthetical "(writes `explore-complete.md`)" is misleading**
Source: Agent Skill

Phase 2 says `submit-explore` "(writes `explore-complete.md`)". In reality `submit-explore` only transitions the state machine (`COMPLETE_EXPLORE`); `explore-complete.md` is a skill-written LLM artifact, as it is today. The parenthetical should be removed or replaced with "(skill writes `explore-complete.md`; this command transitions state only)".

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4] `submit-refine-architecture` smoke test may fail the score-threshold guard**
Source: Agent Skill

Smoke test step 10 (`goodplan submit-refine-architecture --epic smoke --json`, with dummy scores) may be rejected by the score-threshold circuit breaker. The smoke test should either (a) provide scores that pass the threshold, or (b) use `--override` and note why. Without this clarification, a confusing guard error will appear at step 10.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5] Smoke test steps 11-16 are outside slice scope — annotate as optional**
Source: Software Architecture + Agent Skill (duplicate)

Steps 11-16 exercise `epic:define-slices`, `submit-slices`, `epic:refine-slices`, `submit-refine-slices`, `epic:add-verification`, and `epic:activate`. These are not part of the 4 skills being migrated in this slice (audit-architecture, explore, create-architecture, refine-architecture). Including them is fine for full-lifecycle confidence, but they should be annotated: "Steps 1-10 validate this slice's scope; steps 11-16 are optional full-lifecycle verification."

Resolution: DIRECTLY_ACTIONABLE
