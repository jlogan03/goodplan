# Phase 2: Expertise Tracking Convention

Create the shared reference file that defines the expertise tracking system: CLAUDE.md section format, auto memory file convention, and update triggers.

### Tasks

- [ ] Create `~/.claude/skills/_shared/references/expertise-tracking.md` with the following sections:

  **Two-layer system**:
  1. **CLAUDE.md section** (`~/.claude/CLAUDE.md` → `## Expertise`) — brief, always loaded, minimal context cost
  2. **Auto memory files** (`~/.claude/projects/<project>/memory/expertise_<domain>.md`) — detailed observations with dates, context, and trajectory

  **CLAUDE.md `## Expertise` section format**:
  ```markdown
  ## Expertise
  - Comfortable with: <comma-separated list>
  - Less familiar with: <comma-separated list>
  - Actively learning: <item> (see memory: expertise_<domain>.md)
  ```
  - Keep to ~5 bullet points max
  - Categories are progressive: items move from "less familiar" to "actively learning" to "comfortable" as evidence accumulates
  - Never downgrade without clear evidence (e.g., user explicitly says they've forgotten something)

  **Auto memory file convention**:
  - Path: `~/.claude/projects/<project>/memory/expertise_<domain>.md`
  - Naming: `expertise_` prefix + kebab-case domain (e.g., `expertise_event_driven.md`, `expertise_react.md`)
  - Format: standard auto memory frontmatter (`name`, `description`, `type: user`) + dated observations with context and trajectory notes
  - Example entry: "March 2026: Asked basic questions about message ordering during skill-eval explore. After implementing provider slice, gave informed feedback on retry patterns — progressing."
  - Trajectory tracking: note progression over time. Evidence-based: cite specific interactions.

  **When to create/update**:
  - `/start-project`: distinct calibration step after idea capture. Check existing expertise notes first — don't re-ask what's already known. For domains the idea touches that aren't covered, ask: "This project involves X and Y — how familiar are you with those areas?"
  - All interactive skills: formal step at end of each run. Check if the conversation revealed new expertise information. If so, update CLAUDE.md section + write/update memory file. If not, skip silently.

  **Calibration depth**: adjust explanation detail based on expertise level. "Comfortable with" topics get terse explanations. "Less familiar" topics get more context. "Actively learning" topics get the most thorough treatment.

### Verification

- File exists at `~/.claude/skills/_shared/references/expertise-tracking.md`
- Contains all sections: two-layer system description, CLAUDE.md format with example, memory file convention with example, update triggers for start-project and other skills, calibration depth guidance
- Format is clear enough that a skill implementer could add the expertise step from this reference alone
