# Expertise Tracking

Track the user's domain expertise to calibrate explanation depth. Two-layer system: a brief always-loaded summary in CLAUDE.md, backed by detailed auto memory files per domain.

## Two-Layer System

1. **CLAUDE.md section** (`~/.claude/CLAUDE.md` → `## Expertise`) — brief summary, always loaded, minimal context cost. This is the "at a glance" view skills use to set calibration depth.
2. **Auto memory files** (`~/.claude/projects/<project>/memory/expertise_<domain>.md`) — detailed observations with dates, context, and trajectory. Used when a skill needs to decide whether to upgrade/downgrade a domain rating.

## CLAUDE.md `## Expertise` Section Format

Add this section to `~/.claude/CLAUDE.md`:

```markdown
## Expertise
- Comfortable with: <comma-separated list>
- Less familiar with: <comma-separated list>
- Actively learning: <item> (see memory: expertise_<domain>.md)
```

Rules:
- Keep to ~5 bullet points max.
- Categories are progressive: items move from "less familiar" → "actively learning" → "comfortable" as evidence accumulates.
- Never downgrade without clear evidence (e.g., user explicitly says they've forgotten something).
- Update in place — don't append history here; that belongs in memory files.

## Auto Memory File Convention

- **Path**: `~/.claude/projects/<project>/memory/expertise_<domain>.md`
- **Naming**: `expertise_` prefix (underscore, per auto memory convention) + kebab-case domain. Examples: `expertise_event-driven.md`, `expertise_react.md`, `expertise_python-async.md`.
- **Format**: Standard auto memory frontmatter (`name`, `description`, `type: user`) + dated observations.

Example file:

```markdown
# expertise_event-driven.md

Tracking user expertise with event-driven architecture.

## Observations

- March 2026: Asked basic questions about message ordering during skill-eval explore. After implementing provider slice, gave informed feedback on retry patterns — progressing.
- March 2026: Independently proposed dead-letter queue strategy during architecture review — moving toward comfortable.
```

Track progression over time. Cite specific interactions as evidence.

## When to Create/Update

### `/start-project`

Distinct calibration step after idea capture:
1. Read existing expertise notes from CLAUDE.md and any relevant memory files.
2. Identify domains the new project idea touches that aren't already covered.
3. For uncovered domains, ask: "This project involves X and Y — how familiar are you with those areas?"
4. Update CLAUDE.md `## Expertise` section and create/update memory files as needed.
5. Don't re-ask about domains already tracked with sufficient confidence.

### All Interactive Skills

Formal step at end of each run:
1. Check if the conversation revealed new expertise information (questions asked, corrections needed, independent insights offered).
2. If yes: update CLAUDE.md `## Expertise` section + write/update the relevant memory file with a dated observation.
3. If no: skip silently — don't mention it.

## Calibration Depth

Adjust explanation detail based on the user's expertise level for each topic:

| Level | Behavior |
|---|---|
| **Comfortable with** | Terse explanations. Use jargon freely. Skip foundational context. |
| **Actively learning** | Most thorough treatment. Explain trade-offs, link concepts, provide examples. |
| **Less familiar with** | More context than comfortable, but don't overwhelm. Define key terms, explain why before how. |

## Extension Policy

- **Additive fields** (new metadata in CLAUDE.md or memory files): safe to add without coordination.
- **Format changes** that alter the CLAUDE.md section structure or memory file convention: require updating all consumer skills.

Current consumers: `/start-project` (calibration), `/explore`, `/define-architecture`, `/define-slices`, `/create-plan`, `/complete-slice` (expertise check), `/project-status` (display).
