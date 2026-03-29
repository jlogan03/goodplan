# Agent Skill Review — Final Integration (Iteration 1)

## Issues

**[IMPORTANT]** implement-plan has no initiative architecture awareness

The `initiative-conventions.md` consumer guide explicitly lists `/implement-plan` as reading both "current state" from top-level architecture and "target" from initiative architecture. However, the `implement-plan` SKILL.md has zero references to initiatives, `__active__`, or two-layer architecture. Its sub-agent prompt in `references/sub-agent-prompts.md` hardcodes `.project/architecture/` as the only architecture path. The `codebase-context-discovery.md` shared reference (which implement-plan delegates to) also has no initiative awareness.

By contrast, `refine-plan` correctly handles this: its SKILL.md Step 2b includes "Initiative architecture awareness" with explicit instructions to read `initiatives/__active__*/architecture/` alongside top-level, and its `shared-preamble.md` tells reviewers to check initiative architecture.

When implementing a slice within an active initiative, the implementation agent will only see top-level architecture (which may be a scaffold for first initiatives) and miss the initiative's target architecture entirely. This means implementations could diverge from the intended architecture.

Fix: Add initiative architecture awareness to `implement-plan` matching what `refine-plan` does:
1. Add to SKILL.md Step 2b (or create a Step 2b if it doesn't exist): "If `initiatives/__active__*/architecture/` exists, read it alongside top-level architecture. Flag any conflicts."
2. Update `references/sub-agent-prompts.md` implementation agent prompt to check for initiative architecture alongside `.project/architecture/`.
3. Update `references/shared-preamble.md` to match refine-plan's version (which already includes the initiative architecture note for reviewers).
4. Consider adding initiative awareness to `codebase-context-discovery.md` so both skills benefit.

File: ~/.claude/skills/implement-plan/SKILL.md:73
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** codebase-context-discovery.md lacks initiative architecture awareness

This shared reference is used by both `/refine-plan` and `/implement-plan` for Step 2b. It has no mention of initiatives or the two-layer architecture model. While `/refine-plan` compensates by adding its own initiative check after calling this reference, `/implement-plan` does not.

The shared reference should be the canonical place for this logic since both skills need it. Currently the initiative awareness is fragmented: refine-plan has it inline, implement-plan lacks it entirely.

Fix: Add a section to `codebase-context-discovery.md` (after section 1 or as a new section) that checks for initiative architecture:
```
## Initiative Architecture
If `.project/initiatives/__active__*/architecture/` exists, read its `_overview.md` and note in the context summary. Compare against top-level `.project/architecture/` and flag any conflicts between current reality and initiative target.
```

File: ~/.claude/skills/_shared/references/codebase-context-discovery.md:1
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Shared references README is stale — lists only 2 of 12 files

The README at `~/.claude/skills/_shared/references/README.md` only lists `state-and-flow-formats.md` and `initiative-conventions.md` in its Files table. The directory actually contains 12 files including `decisions-format.md`, `expertise-tracking.md`, `maturity-conventions.md`, `iteration-loop.md`, `dependency-research.md`, `codebase-context-discovery.md`, `reviewers-cross-cutting.md`, `team-defaults.md`, and `system-profile-format.md`.

This makes it harder to discover which shared references exist.

Fix: Update the table to include all files with one-line purpose descriptions.

File: ~/.claude/skills/_shared/references/README.md:11
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** define-architecture description mentions `.project/conventions.md` which is not initiative-scoped

The `define-architecture` frontmatter description says "writing `.project/conventions.md` and architecture files." The conventions.md is always project-level (Step 4 confirms this), which is correct — but the description could mislead users into thinking conventions.md is initiative-scoped like the architecture files. This is only confusing, not incorrect.

No action needed unless it causes triggering issues. Noting for awareness.

File: ~/.claude/skills/define-architecture/SKILL.md:5
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Strong integration overall. All 15 initiative-aware skills load `initiative-conventions.md` at Step 0 or early enough. Trigger descriptions consistently mention initiative behavior. Progressive disclosure is well-handled — skills default to the no-initiative fallback path cleanly. No stale `/start-project` references remain in any skill files. The state machine is consistently referenced and applied.

The score is held back by the implement-plan gap: it is the most-used skill in the workflow and currently has zero initiative architecture awareness despite being listed as a consumer in the conventions file. This is a functional gap that will surface during actual initiative slice implementation. Fixing the two IMPORTANT issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
