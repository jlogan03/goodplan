# Merged Review: Phase 1 — Upgrade Step 9 — Refactor Intelligence

Reviewers: Generalist (9/10), agent-skill (8/10)
Critical: 0 | Important: 1 | Minor: 2

---

## CRITICAL Issues

None.

---

## IMPORTANT Issues

### [I-1] guidance.md (d2) omits state update directive

The SKILL.md Graceful Stop (d2) says "treat as case (d) for state purposes" — giving clear guidance on state.md and flow-log updates on re-entry. The guidance.md (d2) describes only recovery behavior and omits this directive. An agent that re-enters during Step 9 and reads (d2) from guidance.md alone won't know what to write to state.md.

Mitigation: SKILL.md is the authoritative source and is loaded at Step 1, so the full (d2) is already in context. But consistency between the two files matters for re-entry reliability.

Source: agent-skill (domain-specific; trusted over generalist's positive observation on this point)
File: `/Users/iwhite/.claude/skills/complete/references/guidance.md` line ~61
Resolution: DIRECTLY_ACTIONABLE

**Fix:** Add "Treat as case (d) for state purposes." to the start of the (d2) entry in guidance.md, matching SKILL.md phrasing exactly.

---

## MINOR Issues

### [M-1] Skip-all flow-log entry format is underspecified

guidance.md Action Handling says: `Log refactor-intelligence: skipped to flow-log`. The flow-log uses structured JSONL (`{"ts":...,"phase":...,"scope":...,"status":...,"summary":...}`). The plain string doesn't match this format. An agent will likely interpret it correctly (as a summary value), but the ambiguity is real.

Both reviewers flagged this independently. agent-skill provides the more specific version with an alternative of omitting the log entirely (since Step 10's final flow-log entry captures overall result anyway).

Files: SKILL.md (plan source) and guidance.md line ~159
Resolution: DIRECTLY_ACTIONABLE

**Fix (option A):** Replace with: `Append to flow-log: {"ts":"<timestamp>","phase":"complete","scope":"<scope>","status":"in-progress","summary":"refactor-intelligence: skipped"}`
**Fix (option B):** Replace with: "Proceed to the next step without a flow-log entry." (Step 10 captures the overall result.)

### [M-2] Pre-implementation commit detection assumes phase name `"implement-plan"`

The Pre-implementation Commit Detection section looks up `"phase":"implement-plan"` in the flow-log. If implement-plan logs under a different key (e.g., `"implement"` or `"implementation"`), the lookup silently fails and git diff analysis is skipped. The fallback (use other detection sources) is safe, so severity is low.

Source: agent-skill
File: guidance.md line ~129
Resolution: RESEARCH_NEEDED

---

## DIRECTLY_ACTIONABLE

1. **[I-1]** Add "Treat as case (d) for state purposes." to (d2) in guidance.md.
2. **[M-1]** Clarify the skip-all flow-log entry — either spell out the full JSON format or explicitly say no log entry is needed.

---

## RESEARCH_NEEDED

1. **[M-2]** Check `/Users/iwhite/.claude/skills/implement-plan/SKILL.md` for the exact `phase` value written to flow-log on completion. Verify it matches `"implement-plan"` as assumed in the Refactor Intelligence Protocol.

---

## Contradictions Resolved

- **(d2) guidance.md coverage:** Generalist noted the condensed guidance.md version as acceptable given SKILL.md is verbose/authoritative. agent-skill flagged the missing state directive as an actual gap. These are not contradictory — generalist observed structural consistency, agent-skill identified a behavioral gap within it. agent-skill's more specific finding is retained as IMPORTANT.

---

## Unresolved (USER_INPUT required)

None.
