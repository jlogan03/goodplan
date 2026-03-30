# Phase 8 Review: `/complete-slice` + `/refine-slices` Scope Resolution

**Reviewer**: Generalist
**Score**: 8/10
**Findings**: Critical: 1, Important: 1, Minor: 2

---

## Critical

### 1. Archive step (Step 10b) missing initiative slice example

Step 10b shows archive commands for vertical slices and side quests but omits initiative slices. When completing an initiative slice (`initiatives/__active__<name>/vertical-slices/<slice>/`), there is no example showing the correct `mv` command. The agent must infer the pattern, which risks incorrect archive paths (e.g., archiving at the wrong directory level).

**Plan requirement**: "Update scope resolution in SKILL.md" — scope resolution was updated throughout, but the archive step was not extended to cover the new scope type.

**Fix**: Add a third example to Step 10b:
```bash
# For initiative slices:
mv .project/initiatives/__active__<name>/vertical-slices/<slice> \
   '.project/initiatives/__active__<name>/vertical-slices/~~archived~~<slice>'
```

---

## Important

### 2. `guidance.md` artifact loading references `vertical-slices/sequencing.md` without initiative qualification

Line 14 of `guidance.md` lists project-level artifacts to load: `.project/architecture/`, `decisions/`, `learnings.md`, `vertical-slices/sequencing.md`. This last path is not parameterized for initiative scope. The SKILL.md Step 8 correctly references the initiative's `vertical-slices/sequencing.md`, but the guidance file (which is the operational reference the agent re-reads during execution) still points to only the top-level path. An agent following guidance.md during artifact loading could miss the initiative-scoped sequencing file.

**Fix**: Change to: `vertical-slices/sequencing.md` (or initiative's `vertical-slices/sequencing.md` for initiative slices).

---

## Minor

### 3. `refine-slices` flow-log scope example could be clearer

Step 5 in `refine-slices/SKILL.md` gives an example scope of `initiatives/__active__<name>/vertical-slices` for initiative-scoped runs. This is correct but the surrounding text says "slices-root relative to .project/" which could be misread. Suggestion: add a concrete example like `initiatives/__active__payments/vertical-slices`.

### 4. Two-layer architecture in `guidance.md` point 2 says "Reads (reconciliation)" for `/complete` slice

The guidance.md architecture update protocol point 2 says the agent reads initiative architecture for "reconciliation" — but per the plan and initiative-conventions.md, reconciliation is what `/complete` does at initiative completion, not at slice completion. At slice completion it reads for "alignment verification." The SKILL.md Step 6 uses the correct terminology. Minor terminology inconsistency in guidance.md.

---

## Plan Adherence Summary

| Plan Task | Status |
|---|---|
| `/complete-slice` scope resolution updated | Done correctly |
| `/complete-slice` auto-detect extended with initiative glob | Done correctly |
| `/complete-slice` two-layer architecture model | Done correctly in SKILL.md Step 6; minor term mismatch in guidance.md |
| `/complete-slice` description updated | Done correctly |
| `/refine-slices` scope resolution with `<slices-root>` parameterization | Done correctly |
| `/refine-slices` sequencing.md path parameterized | Done correctly |
| `/refine-slices` run directory parameterized | Done correctly |
| `/refine-slices` manifest construction paths updated | Done correctly |
| `/refine-slices` description updated | Done correctly |
| Verification: no hardcoded `vertical-slices/` without initiative variant | Mostly clean — guidance.md artifact loading (Important #2) and archive step (Critical #1) are the gaps |
