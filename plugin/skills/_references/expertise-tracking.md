# Expertise Tracking

Track the user's domain expertise to calibrate explanation depth. Expertise data is stored in a single plugin-managed file at `${CLAUDE_PLUGIN_DATA}/expertise.md`.

## Plugin Data Guard

`${CLAUDE_PLUGIN_DATA}` is substituted by Claude Code for marketplace-installed plugins. For local plugins (e.g., test harnesses), the variable is NOT substituted and the literal string remains. Before any read or write to the expertise file, run this guard:

```bash
if [ -z "${CLAUDE_PLUGIN_DATA}" ] || [ "${CLAUDE_PLUGIN_DATA}" = '${CLAUDE_PLUGIN_DATA}' ]; then
  echo 'CLAUDE_PLUGIN_DATA not resolved — skipping expertise tracking'
else
  # proceed with read/write to ${CLAUDE_PLUGIN_DATA}/expertise.md
fi
```

The literal-string check (`= '${CLAUDE_PLUGIN_DATA}'`) catches cases where the variable was not substituted.

If the guard fails, skip expertise tracking silently. Do not error or prompt the user.

## Expertise File Format

File: `${CLAUDE_PLUGIN_DATA}/expertise.md`

```markdown
## Expertise
- **Primary language:** <language> (<details>)
- **Strong areas:** <comma-separated list>
- **Less familiar with:** <comma-separated list>
- **Actively learning:** <item> (<context>)
- **Role indicators:** <description>
- **Onboarded:** <project> (<date>)
```

Rules:
- Keep to ~5-7 bullet points max.
- Categories are progressive: items move from "less familiar" → "actively learning" → "strong areas" as evidence accumulates.
- Never downgrade without clear evidence (e.g., user explicitly says they've forgotten something).
- Update in place — don't append history; keep the file as a concise current snapshot.
- Create the file if it does not exist. Create the parent directory if needed (`mkdir -p`).

## When to Create/Update

### `/create-epic`

Distinct calibration step after idea capture:
1. Run the plugin data guard. If it fails, skip expertise tracking.
2. Read existing expertise from `${CLAUDE_PLUGIN_DATA}/expertise.md` (if it exists).
3. Identify domains the new project idea touches that aren't already covered.
4. For uncovered domains, ask: "This project involves X and Y — how familiar are you with those areas?"
5. Update `${CLAUDE_PLUGIN_DATA}/expertise.md` as needed.
6. Don't re-ask about domains already tracked with sufficient confidence.

### All Interactive Skills

Formal step at end of each run:
1. Check if the conversation revealed new expertise information (questions asked, corrections needed, independent insights offered).
2. If yes: run the plugin data guard, then update `${CLAUDE_PLUGIN_DATA}/expertise.md` with the new information.
3. If no: skip silently — don't mention it.

## Calibration Depth

Adjust explanation detail based on the user's expertise level for each topic:

| Level | Behavior |
|---|---|
| **Strong areas** | Terse explanations. Use jargon freely. Skip foundational context. |
| **Actively learning** | Most thorough treatment. Explain trade-offs, link concepts, provide examples. |
| **Less familiar with** | More context than strong areas, but don't overwhelm. Define key terms, explain why before how. |

## Extension Policy

- **Additive fields** (new metadata in expertise.md): safe to add without coordination.
- **Format changes** that alter the file structure: require updating all consumer skills.

Current consumers: `/gp:create-epic` (calibration), `/gp:explore`, `/gp:plan-slice`, `/gp:complete-epic` (expertise check), `/gp:status` (display), `/gp:audit`, `/gp:init`.
