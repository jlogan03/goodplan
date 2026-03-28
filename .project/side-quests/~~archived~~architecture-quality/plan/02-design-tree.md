# Phase 2: Define-Architecture — Design Tree Interrogation

Add a two-pass design tree to the define-architecture flow: a broad pass before design-it-twice (surface constraints and key questions) and a deep pass after (flesh out the chosen design's details).

### Context

The current define-architecture flow goes: conventions → propose file list → write files. This is one-shot — the agent proposes an architecture, iterates on corrections, and writes. There's no systematic exploration of the decision space before committing.

The design tree adds structured interrogation: the agent walks down decision branches ("Your system has these subsystems. How do they communicate? If async, ordering guarantees?"), pursuing follow-ups immediately, tracking what's resolved vs open. This surfaces constraints and hidden requirements that would otherwise emerge late during implementation.

**Two passes with different purposes**:
- **Broad pass** (new Step 5, after conventions): Surface subsystems, communication patterns, key constraints, data ownership — enough structure to generate meaningfully different designs in design-it-twice
- **Deep pass** (new Step 7, after design-it-twice): For the chosen design, resolve every remaining detail branch until the architecture is fully specified

**Tracking**: In-memory during the conversation. The agent presents progress ("5 of 8 branches resolved"). Resolved decisions are written to `.project/decisions/`. The architecture files capture the final resolved state — no separate design-tree.md artifact.

### Tasks

- [ ] Read current `~/.claude/skills/define-architecture/SKILL.md` to understand the existing flow
- [ ] Restructure the skill flow. Current steps become:
  - Step 1-3: unchanged (load references, load context, re-entry check)
  - Step 4: Conventions phase (unchanged)
  - **Step 5 (new): Design tree — broad pass**
  - **Step 6 (new): Design-it-twice** (Phase 3 of this plan)
  - **Step 7 (new): Design tree — deep pass**
  - Step 8: Write architecture files (was Step 5)
  - Step 9: CLAUDE.md update (was Step 6)
  - Step 9b: Expertise check (was Step 6b)
  - Step 10: Write back state (was Step 7)
  - Step 11: Done summary (was Step 8)

- [ ] Write Step 5 — Design tree (broad pass):
  1. Start from idea.md and conventions. Identify the top-level architectural questions: what are the subsystems? How do they communicate? What's the data model? What are the hard constraints (performance, scale, compliance)?
  2. For each question, ask the user. Each answer may raise follow-up questions — pursue them immediately (tree-walk, not breadth-first).
  3. Track resolved vs open branches in-memory. Present progress periodically: "Resolved: [list]. Open: [list]."
  4. Use expertise calibration: explain unfamiliar patterns in detail, reference familiar ones casually.
  5. When a durable decision emerges, propose and write to `.project/decisions/` (existing decision writing mechanism from decisions-and-expertise quest).
  6. Stop when enough structure exists for design-it-twice: at minimum, subsystem boundaries, communication patterns, and key constraints must be resolved.
  7. Summarize: "Here's what we've established: [summary]. These are the major architectural areas where we have choices: [list]. Next: I'll generate multiple design options for each."

- [ ] Write Step 7 — Design tree (deep pass):
  1. Take the chosen design from design-it-twice (Step 6).
  2. Walk every remaining detail branch: API contracts between subsystems, error handling strategies, data flow specifics, edge cases the broad pass deferred.
  3. Same interaction pattern: ask, follow up, track resolved/open, write decisions.
  4. Stop when all branches are resolved. If a branch can't be resolved without implementation experience, mark it as "deferred to implementation" and note it for the implementing agent.
  5. Summarize: "Architecture fully specified. [N] decisions recorded. [M] details deferred to implementation. Ready to write files."

- [ ] Update graceful stop handling (Step 5e equivalent) to cover the new steps:
  - Stopped during broad pass: state = `define-architecture in-progress — design tree broad pass`
  - Stopped during deep pass: state = `define-architecture in-progress — design tree deep pass, [design] chosen`
  - Existing graceful stop cases for conventions and file writing remain

- [ ] Renumber all subsequent steps and update all internal step references

### Verification

- Read updated `define-architecture/SKILL.md` — confirm Steps 5 and 7 exist with design tree logic
- Step 5 ends with a summary suitable for design-it-twice input
- Step 7 takes design-it-twice output and resolves all remaining branches
- Graceful stop covers new steps
- All step numbers are consistent (no gaps, no duplicates, internal references updated)
- Decision writing guidance references `decisions-format.md` (carried over from decisions-and-expertise quest)
