# Merged Review: Phase 1, Iteration 1

**Composite Score: 7.5/10** (Generalist: 7, Agent-Skill: 8)

## Critical (1)

### C1: Dash markers use `--` instead of `---`, breaking resume detection and style consistency
**Sources**: Generalist C1, Agent-Skill MINOR (last item)

The plan specifies em-dash markers (`<!-- partial --- interrupted`) matching audit-architecture's convention. The implementation uses double-hyphens throughout (`<!-- partial -- interrupted`). This affects:
1. Resume detection -- a cross-skill resume detector would fail to match audit-docs markers
2. Style consistency across sibling audit skills (section headers, separators)

**Fix**: Global find-replace `--` with `---` in SKILL.md to match the plan and audit-architecture convention.

## Important (2)

### I1: End-to-end test not completed
**Sources**: Generalist I1, Agent-Skill Score section (point 2)

Both reviewers independently flagged that the plan's verification task ("Run `/audit-docs` on the goodplan repo") was not performed. Skill files are LLM instructions where subtle issues (ambiguous wording, missing context, incorrect CLI syntax) only surface during actual execution. Static review cannot substitute for a live run.

**Fix**: Invoke `/audit-docs` end-to-end on the goodplan repo and verify the report exists and contains findings.

### I2: Audit-architecture still uses old filesystem pattern for side quest creation
**Sources**: Agent-Skill IMPORTANT (first item)

audit-docs correctly uses `goodplan quest:create --json` while audit-architecture still uses the old `mkdir -p .project/side-quests/<name>` + write `goal.md` pattern. audit-docs is correct here -- no change needed to audit-docs. Flag as side quest candidate to update audit-architecture.

**Fix**: Leave audit-docs as-is. Track audit-architecture update separately.

## Minor (3)

### M1: Sub-agent prompt placeholders lack format documentation
**Sources**: Generalist M3, Agent-Skill MINOR (placeholder item)

`{documentation_sources_list}` and `{codebase_reality_summary}` placeholders don't specify expected format (bullet list? JSON? prose?) or which step's output maps to each. The orchestrating agent can infer from context (and audit-architecture works the same way), but explicit mapping (e.g., "Fill `{documentation_sources_list}` with the list from Step 2") would reduce ambiguity.

**Fix**: Add a one-liner per placeholder in SKILL.md Step 4 mapping each placeholder to its source step and expected format.

### M2: Side quest creation pipe syntax needs verification
**Sources**: Generalist M1

Step 5's `echo '...' | goodplan quest:create --json` assumes the CLI reads JSON from stdin. If `--json` only controls output format, the input mechanism would silently fail. Worth confirming before first real execution.

**Fix**: Verify during end-to-end test (I1) or check CLI help for `quest:create`.

### M3: Batch trivial fixes is all-or-nothing
**Sources**: Agent-Skill IMPORTANT (second item, downgraded -- marked MINOR resolution by reviewer)

The "Apply all?" prompt for trivial fixes implies all-or-nothing. Offering partial approval ("Apply all, or review individually?") would handle cases where one "trivial" fix is wrong.

**Fix**: Optional UX improvement -- add "or review individually?" to the batch approval prompt.

## Deduplicated / Not Issues

The following items from individual reviews were deduplicated or determined to not require action:

- **Plan step numbering shift** (Agent-Skill): Implementation correctly added standard lifecycle steps (Load Context, Health, Graceful Stop, Expertise) that the plan omitted. Positive observation, not an issue.
- **Reference file naming** (Agent-Skill): Implementation uses `sub-agent-prompts.md` and `guidance.md` matching audit-architecture, instead of plan's suggested names. Correct choice.
- **doc-discovery-patterns folded into SKILL.md** (Agent-Skill): Content was small enough (~20 lines) that a separate file would be over-engineering. Correct choice.
- **File size** (Agent-Skill): 224 lines in SKILL.md, 552 total -- well within limits. Positive observation.
- **No graceful stop markers for Steps 0, 1, 9** (Generalist M2): Consistent with audit-architecture. Noted for completeness only.
