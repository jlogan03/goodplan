# Merged Feedback — Round 4

## IMPORTANT (2)

### 1. Phase 3: `\x60` hex escape does not match backtick on macOS BSD grep
**Source:** holistic

The `/explore` verification grep uses `'/explore[ )\x60"]'` but macOS BSD grep treats `\x60` as literal `x60`, not a hex escape for backtick. This silently misses `/explore` followed by backtick — the most common delimiter in markdown.

**Fix:** Replace `\x60` with a literal backtick in the character class:
``grep -rn '/explore[` )"]' skills/ agents/ --include='*.md' | grep -v '\$GP \|gp \|/gp:explore'``

### 2. Phase 2: `notes` field is required in `verificationResultSchema`, not optional
**Source:** software-architecture

Bug A and Bug C tasks describe `verificationResultSchema` with `notes?: string` (optional). The actual schema at `src/schemas/entities/epic.ts` line 30-34 defines `notes: z.string().min(1)` — required, not optional. Payloads omitting `notes` will fail Zod validation.

**Fix:** Remove the `?` from `notes` in both Bug A and Bug C task descriptions. Ensure Bug C notes that the agent must always provide a non-empty `notes` string.

## MINOR (5)

### 3. Phase 3: bare-name verification grep false-positives on `cli-interaction.md`
**Source:** holistic

The bare-name grep (`refine-plan\|refine-architecture\|...`) matches legitimate CLI command names in `cli-interaction.md` (e.g., `start-refine-architecture`). Verification would fail even after all stale references are fixed.

**Fix:** Exclude `cli-interaction.md` from the bare-name check: `| grep -v cli-interaction.md`

### 4. Phase 3: `_shared/references/README.md` line 19 bare-name reference not covered by tasks
**Source:** holistic

`README.md` has its own copy of the "refine-plan, refine-architecture" text that would be caught by verification but no task instructs the implementer to update it.

**Fix:** Add a task to update `README.md` bare-name references, or expand the `iteration-loop.md` task scope.

### 5. Phase 3: status-logic.md line range "~108-114" should be "~107-114"
**Source:** holistic

First data row of the Slice/Quest States table starts at line 107, not 108.

**Fix:** Change "lines ~108-114" to "lines ~107-114".

### 6. Phase 3: explore/SKILL.md task under-counts occurrences on line 58
**Source:** agent-skill

Line 58 contains TWO `/explore` references (prose + example invocation) but the task only mentions one. Both would be caught by the verification grep (space delimiter), so this is cosmetic.

**Fix:** Note both occurrences in the task description.

### 7. Phase 1: Pre-activation architecture guard is redundant with CLI status guard
**Source:** agent-skill

The `architecture/_overview.md` existence check is redundant — `epic:activate` already requires `slices-refined` status which implies architecture exists. Not harmful, but should be documented as a UX guard (better error message) rather than a correctness guard.

**Fix:** Add a comment acknowledging this is belt-and-suspenders for UX.

## Scores

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| holistic | 9/10 | 0 | 1 | 3 |
| software-architecture | 9/10 | 0 | 1 | 0 |
| agent-skill | 9/10 | 0 | 0 | 2 |
| repo-tooling-docs (carried from R3) | 9/10 | 0 | 0 | — |
| **Merged** | **9/10** | **0** | **2** | **5** |
