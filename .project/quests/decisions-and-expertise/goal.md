# Side Quest: Decisions & Expertise Infrastructure

## What We're Building

Foundation infrastructure for two cross-cutting concerns: (1) durable decision tracking so decisions made during brainstorming and architecture don't get lost, and (2) progressive expertise tracking so the agent calibrates communication depth to the user's knowledge level. Also updates workflow.md to reflect the full v2 workflow.

## Dependencies

None — this is the foundation. The other two side quests (architecture-quality, slice-quality-and-health) depend on this.

## What Changes

### New File Convention: `.project/decisions/`

One file per durable decision. A decision belongs here if reversing it would require changes across multiple files or phases.

**File format**: `<date>-<slug>.md` (e.g., `2026-03-17-adopt-event-sourcing.md`)
- **Decision**: What was decided
- **Rationale**: Why this, not the alternatives
- **Date**: When decided
- **Status**: `active` | `superseded by <link>` | `revisiting`
- **Context/Source**: What phase/slice prompted this decision

Superseded decisions link to their replacement — preserves the reasoning chain. An agent seeing a superseded decision follows the link, not the old decision.

**Who writes**: `/explore` (as decisions emerge during brainstorming), `/define-architecture` (architectural choices), `/create-plan` (planning decisions), `/complete-slice` (when architecture updates are approved). Any skill that makes or discovers a durable choice.

**Who reads**: All downstream skills load `.project/decisions/` as context alongside architecture files.

### Expertise Tracking (Progressive Disclosure)

**User-level CLAUDE.md** (`~/.claude/CLAUDE.md`):
- Brief `## Expertise` section (~5 bullet points) with summary assessment
- References specific memory files for detail
- Always loaded, minimal context cost
- Example:
  ```
  ## Expertise
  - Comfortable with: TypeScript, React, PostgreSQL, API design
  - Less familiar with: ML/data pipelines, event-driven architecture
  - Actively learning: event-driven patterns (see memory: expertise_event_driven.md)
  ```

**Auto memory**: Detailed observations with dates, context, and trajectory. Loaded on demand.
- Example entry: "March 2026: Asked basic questions about message ordering during skill-eval explore. After implementing provider slice, gave informed feedback on retry patterns — progressing."
- Trajectory tracking: notes progression over time. Never downgrades without evidence.

### Updated Skills

- **`/start-project`** — after capturing the idea, check existing expertise notes in user-level CLAUDE.md. For domains the idea touches that aren't already covered, ask calibration questions ("This project involves X and Y — how familiar are you with those areas?"). Write/update expertise section in CLAUDE.md + detailed memory file. Don't re-ask what's already known.

- **`/explore`** — write durable decisions to `.project/decisions/` as they emerge during brainstorming. At the end of an exploration session, summarize any decisions made and confirm with the user before writing. Update expertise observations if the conversation reveals new information about the user's knowledge.

- **`/define-architecture`** — load `.project/decisions/` as context alongside architecture files. Write new decisions when architectural choices are made. Update expertise observations opportunistically.

- **`/define-slices`** — load `.project/decisions/` as context. Update expertise observations opportunistically.

- **`/create-plan`** — already has architectural change detection. Load decisions/. When discussing changes, include agent's recommendation with rationale. Calibrate explanation depth to user expertise. Update expertise opportunistically.

- **`/implement-plan`** — already has architectural awareness. Load decisions/. When flagging changes, include recommendation with rationale. Calibrate to expertise.

- **`/complete-slice`** — load decisions/. Write decisions when architecture updates are approved. Update expertise observations based on learnings discussion.

### Cross-Cutting Guidance (applies to all interactive skills)

- **All skills**: load `.project/decisions/` as context alongside architecture files
- **All skills that can change system shape**: pause, explain what's changing, present options with trade-offs, include agent recommendation with rationale, decide together with user, write decision to `decisions/`
- **All interactive skills**: check CLAUDE.md expertise summary at start, update both CLAUDE.md and memory at end if expertise observations changed. Not a formal step — lightweight guidance.

### workflow.md Update

Update the canonical workflow document to reflect the full v2 workflow:

```
start-project (+ expertise calibration)
  → explore (+ decisions/)
  → define-architecture (design tree + design-it-twice + deep modules)
  → refine-architecture (iterative review)
  → define-slices (tracer bullets, three-lens eval)
  → refine-slices (iterative review)
  → [per slice: create-plan → refine-plan → implement-plan → complete-slice (+ system-profile, + debt detection)]

Standalone: /audit-architecture (run when needed)
```

Add decisions/ to the file structure tree. Add expertise tracking description. Update the workflow steps to include refine-architecture and refine-slices. Add system-profile.md to the file structure.

## Success Criteria

- `ls .project/decisions/` shows decision files after running explore + define-architecture on a test project
- User-level CLAUDE.md has `## Expertise` section after running /start-project
- Auto memory has detailed expertise observations
- All interactive skills load decisions/ as context
- Architectural conversations include agent recommendations calibrated to user expertise
- Expertise observations accumulate and update across sessions — not re-asked if already known
- workflow.md reflects the full v2 workflow

## Verification

- [ ] decisions/ file format defined and used correctly by /explore and /define-architecture
- [ ] User-level CLAUDE.md has expertise section after /start-project
- [ ] Memory files have detailed expertise observations with trajectory
- [ ] /define-architecture loads and uses decisions from /explore
- [ ] All skills calibrate communication to expertise level
- [ ] workflow.md updated with v2 workflow, decisions/, system-profile.md, new skills

## Scope Boundaries

**In scope**: decisions/ convention, expertise tracking (CLAUDE.md + memory), cross-cutting guidance updates to all interactive skills, workflow.md update

**Out of scope**: New skills (refine-architecture, refine-slices, audit-architecture), design tree/design-it-twice, tracer bullet slicing, system-profile.md — those are in the other two side quests
