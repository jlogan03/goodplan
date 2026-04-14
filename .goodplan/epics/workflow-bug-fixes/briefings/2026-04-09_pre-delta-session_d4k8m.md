# Session Briefing: Delta Step

## What you're doing

Produce the **delta document** — the concrete change plan that maps the goodplan v2 spec (08) against the current codebase and identifies exactly what needs to change: what to modify, add, delete, and in what order.

## Reading order

1. **North Star** (10-north-star.md) — 10-minute overview of the target system, including implementation risks at the bottom. Read this first.
2. **Codebase inventory** (research/2026-04-08_codebase-inventory_a7k2z.md) — structured map of the current codebase. This was produced earlier; verify it's still accurate by spot-checking.
3. **Ideal implementation spec** (08-ideal-implementation.md) — THE spec. 140KB. You don't need to read all of it upfront. Use it as reference as you work through each subsystem. Key sections:
   - S2: Foundational decisions (start here after the North Star)
   - S3: Phases (the phase catalog)
   - S4: Event schemas
   - S5: Invariants
   - S6: CLI commands
   - S7: Reviewer registry
   - S8: Extractors
   - S9: Skill set
   - S10: Agent types
4. **User journey walkthroughs** (09-user-journey-walkthroughs.md) — how the target system feels. Reference when you need to understand how a mechanism works end-to-end.

All files are under `.goodplan/epics/workflow-bug-fixes/brainstorm/` (except the codebase inventory which is under `research/`).

## What the delta should cover

For each major subsystem of the current codebase, compare against 08 and produce:

- **What stays** — code that aligns with the spec and needs no or minimal changes
- **What changes** — code that exists but needs modification (with specific descriptions of what changes)
- **What's new** — code that doesn't exist yet and needs to be written
- **What's retired** — code that the spec explicitly replaces or removes
- **Migration notes** — ordering dependencies, risks, things that need to happen in sequence

### Suggested structure for the delta

1. **CLI** (`src/`) — the biggest change. Current state machine → events + invariants. Map current commands to new command tree. Identify what can be refactored vs rewritten.
2. **Skills** (`plugin/skills/`) — map current skills to the new skill set. Identify splits, merges, and new skills.
3. **Agents** (`plugin/agents/`) — map current agents to the new agent types and contracts.
4. **Hooks** (`plugin/hooks/`) — current hooks vs the new hook-protected model.
5. **Reviewers** (`plugin/reviewers/` if they exist, or wherever they live) — map existing reviewers to the new registry format.
6. **Rubrics** — current rubric format vs new YAML rubric spec.
7. **Test harness** (`tools/dogfood/`) — what changes are needed to test the new system.
8. **`.goodplan/` directory structure** — current vs target, migration path.

## Key design decisions to keep in mind

These are from the user's feedback and are non-negotiable:

- Entity IDs = slugs. Event IDs = UUIDs. Directory names = `<YYYY-MM-DD>_<slug>/`.
- Events + invariants, not a state machine.
- One person per epic. Main has no active epic.
- Slice-land does full spine rollup. Final slice triggers epic completion (no P13).
- All agents get all tools (permissive-first).
- CLI status returns suggested next steps.
- Hook-protected integrity files (events.jsonl, spine); LLM-writable artifact content.
- Existing reviewer set carries over as the bootstrap starting point.

## Implementation risks to carry forward

From the North Star's risks section — these should inform ordering and scoping decisions in the delta:

- **Build the substrate first** (events, invariants, CLI) — everything else depends on it
- **Start with fewer reviewers active per artifact** — expand as calibration improves
- **Context window pressure** — aggressive budgeting in context bundles
- **Validate with a real epic early** — don't build the whole system before testing it end-to-end
- **Spec-to-implementation gap** — 140KB of spec, messy-but-structured is the realistic target

## What NOT to do

- Don't write code. The delta is a planning document.
- Don't try to read all of 08 upfront. Use it as reference per subsystem.
- Don't propose changes to the spec. If something seems wrong, flag it in the delta with a note.
