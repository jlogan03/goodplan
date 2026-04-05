# Merged Review Feedback — Phase 1: Rewrite start-epic Skill

## Score: 8/10

## IMPORTANT (2)

### I1 — `$GP` variable used but never defined

The skill uses `$GP` in all bash code blocks but never assigns `GP="gp"`. Non-orchestrator skills (explore, task, status, upgrade) use bare `gp` directly. Start-epic is not an orchestrator, so it should use bare `gp` for consistency with its category.

- File: `skills/start-epic/SKILL.md:22`
- Resolution: Replace `$GP` with `gp` throughout, or add `GP="gp"` in Step 0.
- Source: agent-skill

### I2 — `test -f` for architecture file contradicts "no direct filesystem reads" claim

Step 3 uses `test -f <epic-path>/architecture/_overview.md`, which is a direct filesystem check. The skill intro claims "no direct filesystem reads of state files or directory manipulation." Two sub-issues:

1. **Verification criteria mismatch**: The plan's grep verification (`grep -c 'ls -d\|test -f\|mv .goodplan'`) returns 1 instead of expected 0 because of this `test -f`. The plan *intended* to catch v1.0.3-style state file checks, not this legitimate architecture guard. Fix: narrow the grep pattern to exclude the architecture guard.

2. **Principle vs. practice**: Either remove the `test -f` guard entirely (since `epic:activate` already validates `slices-refined` status), or soften the intro claim to "no direct state mutations" rather than "no direct filesystem reads."

- File: `skills/start-epic/SKILL.md:83`
- Resolution: (a) Adjust intro wording to "no direct state mutations" AND fix verification grep, or (b) remove the `test -f` guard and rely on CLI validation.
- Source: generalist (verification mismatch), agent-skill (principle contradiction)

## MINOR (3)

### M1 — Duplicate trigger phrase in frontmatter

Line 5-6 lists `'start epic'` twice in the Common triggers list. Pre-existing issue carried over from the old version.

- File: `skills/start-epic/SKILL.md:5`
- Resolution: Remove the duplicate.
- Source: generalist, agent-skill (both flagged independently)

### M2 — Missing version compatibility check logic

Step 0 checks CLI availability but does not compare the version against `requires: gp >= 1.0.0` from the frontmatter. Other skills include explicit version comparison logic after the `--version --json` call. Current wording only handles "CLI not available," not "CLI too old."

- File: `skills/start-epic/SKILL.md:25`
- Resolution: Add version comparison logic matching the pattern in explore/task/status skills.
- Source: agent-skill

### M3 — Step 4 architecture loading source is ambiguous

Step 4 references loading architecture file paths from `epic:show` JSON but doesn't hint at the field name. A note like "use the `architectureFiles` field" would reduce ambiguity for non-orchestrator agents.

- File: `skills/start-epic/SKILL.md:92`
- Resolution: Add field name hint.
- Source: agent-skill

## Not Carried Forward

- **generalist M2** (epic:show before epic:list ordering): Reviewer explicitly noted this is a reasonable tradeoff, not a defect. Dropped.

## Plan Adherence

All 8 plan steps implemented correctly. Plan-refined.md checkboxes updated. All v1.0.3 artifacts confirmed absent. Context Discipline callout present and correct.
