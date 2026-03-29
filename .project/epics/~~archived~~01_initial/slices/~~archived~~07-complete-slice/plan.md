# Plan: `/complete-slice` Skill

## Overview

Build the `/complete-slice` Claude Code skill — closes out a completed slice or side quest by synthesizing learnings, proposing architecture updates, reviewing remaining slice goals, and asking about cleanup. This is the reflection point in the workflow where the team pauses to capture what was learned before moving on.

Simpler than most skills — primarily reads and synthesizes existing artifacts, then writes a few files. The key interaction is surfacing architecture changes and slice goal updates for the user to approve or reject.

## Phase 1: Reference Files

Create reference files at `~/.claude/skills/complete-slice/references/`.

### Tasks

- [ ] Create `references/formats.md` — state.md 4-section format and flow-log.jsonl entry format. Copy from existing skills. Add sync comment referencing `.project/skill-conventions.md` as canonical source. Scope note: complete-slice uses the slice or side-quest path as scope.

- [ ] Create `references/guidance.md` — conversation guidance:
  - Scope resolution: same pattern as create-plan (argument → state.md → scan for first slice where implementation is complete but no completion/learnings.md exists → AskUserQuestion)
  - Artifact loading: what to read and where to find it (plan-refined.md or plan-refined/, implementation/ phase results, refinement/ review history, research/, after-implementation-fixes-and-polish.md, any existing completion/ files)
  - Learnings synthesis strategy: four questions (domain learnings, plan quality, surprises, what we'd do differently). Focus on actionable insights, not restating what was built. Compare plan expectations vs. implementation reality.
  - Architecture update protocol: read current architecture files, compare against what was actually built. Flag divergence. For each proposed change: explain what changed, why, and impact on other subsystems. Use AskUserQuestion with agent recommendation. Only update architecture files the user approves. Write decisions to `decisions/` for approved changes.
  - Remaining slice review: read each unimplemented slice's goal.md, assess whether learnings warrant updates. Propose changes but don't apply without approval. Flag if new slices or side quests are needed.
  - Graceful stop: (a) no files written → don't touch state; (b) learnings written but no architecture updates yet → state shows in-progress; (c) everything done → normal completion
  - Learnings.md format: top-level learnings.md uses newest-first ordering, each entry has a source tag linking to the per-slice file

### Verification
- `ls ~/.claude/skills/complete-slice/references/` shows formats.md, guidance.md
- Each file under 3KB

## Phase 2: Write SKILL.md

Create `~/.claude/skills/complete-slice/SKILL.md`.

### Tasks

- [ ] Create SKILL.md with YAML frontmatter:
  - `name: complete-slice`
  - `description:` — covers what it does, when to invoke, trigger phrases. Mention outputs (completion/learnings.md, updated learnings.md, potential architecture updates). Trigger phrases: 'complete this slice', 'finish this slice', 'wrap up', 'complete slice', 'slice is done', 'we're done with this slice'.

- [ ] Write the skill body with these steps:

  **Step 1 — Load References**
  Load `references/guidance.md`.

  **Step 2 — Determine Scope**
  Same pattern as create-plan:
  1. Argument → resolve path or name
  2. No argument → state.md active slice
  3. Fallback → scan for first slice with implementation artifacts but no completion/learnings.md
  4. AskUserQuestion if ambiguous
  5. Verify the slice/quest has implementation artifacts (plan-refined exists, implementation/ has content). If not, tell user the slice doesn't appear to be implemented yet and stop.

  **Step 3 — Load Artifacts**
  Read all implementation artifacts for the scope:
  1. `plan-refined.md` (or `plan-refined/` directory — read _overview.md + phase files)
  2. `implementation/` — read phase results and review files (last iteration's merged.md for each phase gives the best summary)
  3. `refinement/` — read the last round's merged.md for plan refinement context
  4. `research/` — scan for research files (provides context on what was investigated)
  5. `after-implementation-fixes-and-polish.md` (if exists)
  6. `.project/architecture/` — current architecture for comparison
  7. `.project/decisions/` — existing decisions for context
  8. `.project/learnings.md` — existing learnings to avoid duplication
  Present summary: "Found: plan (N phases), M implementation reviews, K research files, [fixes-and-polish]. Architecture: N files."

  **Step 4 — Synthesize Learnings**
  Draft `completion/learnings.md` by analyzing the gap between plan and implementation:
  1. What did we learn about the problem domain that we didn't know before?
  2. What worked well in the plan? What didn't?
  3. What surprised us during implementation? (Check implementation reviews for recurring issues, unexpected blockers, plan deviations)
  4. What would we do differently next time?
  5. Are there any patterns or anti-patterns worth calling out for future slices?

  Present the draft to the user. Iterate on corrections. Write `completion/learnings.md` when approved.

  **Step 5 — Roll Up to Top-Level Learnings**
  Read `.project/learnings.md`. Add new entries at the top (newest first). Each entry: heading, `_Source: <slice-name>_` tag, 2-3 sentence summary of the actionable insight. Don't duplicate existing entries — check for overlap first.

  **Step 6 — Propose Architecture Updates**
  Compare what was actually built (from implementation artifacts) against the canonical architecture files. For each divergence:
  1. Explain what changed and why
  2. Assess impact on other subsystems
  3. Present agent recommendation: update architecture to match reality, or flag as technical debt to address later
  4. Use AskUserQuestion: "Update architecture? / Flag as tech debt / Skip"
  5. For approved updates: edit the relevant architecture file, write a decision to `.project/decisions/`
  If no divergences found, tell the user: "Architecture files still accurately describe the system."

  **Step 7 — Review Remaining Slices**
  Read each unimplemented slice's `goal.md` and `.project/vertical-slices/sequencing.md`. For each, assess:
  1. Does anything we learned warrant updating this goal?
  2. Should the ordering change based on what we now know?
  3. Are new slices or side quests needed?
  Present findings. For each proposed change, use AskUserQuestion. Apply approved changes.

  **Step 8 — Cleanup Check**
  Ask: "Do you want a cleanup/refactor pass before moving to the next slice?" If yes, help scope it — is it a quick inline fix or does it warrant a side quest with its own plan?

  **Step 9 — Write Back State**
  Load `references/formats.md`. Update state.md. Set Next Step to the next unimplemented slice's `/create-plan` (or `/explore` if it needs exploration first). Append to flow-log.jsonl.

  **Step 10 — Done Summary**
  List: learnings written, architecture updates made (if any), slice goal changes (if any), recommended next step.

  **Error handling:** Retry failed Write/Edit calls once.

- [ ] Review SKILL.md size — must be under 500 lines

### Verification
- `wc -l ~/.claude/skills/complete-slice/SKILL.md` — under 500 lines
- `head -6` — valid YAML frontmatter
- `ls ~/.claude/skills/complete-slice/references/` — formats.md and guidance.md exist
- All `references/` paths in SKILL.md match files created in Phase 1

## Phase 3: Manual End-to-End Test

**This phase is a manual test run by the developer.**

Test in goodplan-2 after a slice has been implemented via /implement-plan.

**Test 1 — Full run after implementation:**
- Run `/complete-slice` after implementing the first slice
- Verify it loads all artifacts (plan, implementation reviews, research)
- Verify learnings are substantive (not restating what was built)
- Verify top-level learnings.md is updated (newest first, no duplicates)
- Verify architecture comparison finds divergences (or confirms alignment)
- Verify remaining slice goals are reviewed with proposals

**Test 2 — No implementation artifacts:**
- Run on a slice that has a plan but hasn't been implemented
- Verify it tells the user and stops gracefully

**Test 3 — Side quest completion:**
- Run on a side quest directory
- Verify scope resolution works for non-numbered directories

## What to verify
- [ ] Scope resolution works (argument, state.md, auto-detect)
- [ ] All artifacts loaded (plan, implementation/, refinement/, research/)
- [ ] Learnings are actionable insights, not implementation recaps
- [ ] Top-level learnings.md updated with newest-first entries
- [ ] Architecture divergences detected and surfaced with recommendations
- [ ] Remaining slice goals reviewed with proposed updates
- [ ] Cleanup check offered
- [ ] state.md and flow-log updated on completion
