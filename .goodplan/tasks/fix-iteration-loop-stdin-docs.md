# Fix iteration-loop.md stdin format documentation

## Problem

The `plugin/skills/_references/iteration-loop.md` skill reference documents wrong stdin formats for three `refine:*` commands. This causes the LLM to burn 5-15 extra turns per command guessing the correct format during refinement loops.

Found during v2 E2E validation run (2026-04-13).

## Specific Issues

### 1. `refine:synthesize` — completely wrong stdin format

**Skill says:**
```bash
echo '{"criticalCount":<n>,"importantCount":<n>,"minorCount":<n>}' | $GP refine:synthesize $SCOPE_FLAG --artifact-type $ARTIFACT_TYPE --json
```

**CLI actually expects** (`src/schemas/commands/refine.ts` → `refineSynthesizeInputSchema`):
```bash
echo '{"synthesis":{"sha":"<sha>","size":<n>,"path":"<path>","mediaType":"text/markdown"}}' | $GP refine:synthesize $SCOPE_FLAG --artifact-type $ARTIFACT_TYPE --json
```

The CLI needs a ContentRef to the synthesis document (stored as a git blob), not a count summary.

### 2. `refine:revise` — missing stdin documentation

**Skill says:**
```bash
$GP refine:revise $SCOPE_FLAG --artifact-type $ARTIFACT_TYPE --json
```
(No stdin shown)

**CLI actually expects** (`refineReviseInputSchema`):
```bash
echo '{"artifact":{"sha":"<sha>","size":<n>,"path":"<path>","mediaType":"text/markdown"}}' | $GP refine:revise $SCOPE_FLAG --artifact-type $ARTIFACT_TYPE --json
```

### 3. `refine:score` findings — required fields not documented

**Skill says:**
```bash
echo '{"dimensions":[...],"findings":[...]}' | $GP refine:score ...
```
(Ellipsis only for findings format)

**CLI actually expects** (`reviewerFindingSchema` with `.strict()`):
```json
{
  "dimensions": [{"name": "<dim>", "score": <n>}],
  "findings": [{"severity": "BLOCKING|CRITICAL|IMPORTANT|MINOR", "dimension": "<name>", "description": "<text>"}]
}
```

The `.strict()` on the Zod schema means ANY extra fields (like `id`, `title`, `count`, `summary`) cause rejection.

## Impact

- LLM spends 16+ attempts on `refine:synthesize` before spawning an Explore agent to grep for the schema
- LLM gives up on findings for `refine:score` and sends empty arrays, losing valuable review signal
- Each refinement round costs extra $2-5 in wasted turns
- The LLM self-corrects eventually but the cost adds up across architecture + slices + plan refinement loops

## Fix

Update `plugin/skills/_references/iteration-loop.md` with:
1. Correct ContentRef-based stdin examples for `refine:synthesize` and `refine:revise`
2. Show the full `git hash-object -w` → ContentRef → stdin pipeline
3. Document the exact finding fields with a concrete example (severity, dimension, description)
4. Note that schemas are `.strict()` — no extra fields allowed

## Files to Change

- `plugin/skills/_references/iteration-loop.md` — primary fix
- `plugin/skills/_references/cli-interaction.md` — may also reference these commands
- Consider: `plugin/skills/plan-slice/SKILL.md` — if it has inline refine command examples

## Additional Fix Ideas (from user)

### 1. CLI error responses should include the expected format

When `refine:score` gets invalid stdin, instead of just:
```
Error: Invalid input: expected string, received undefined
```

It should say:
```
Error: Invalid input: expected string at 'findings[0].dimension'

Expected stdin format:
{
  "dimensions": [{"name": "string", "score": number}],
  "findings": [{"severity": "BLOCKING|CRITICAL|IMPORTANT|MINOR", "dimension": "string", "description": "string"}]
}
```

This would eliminate the guessing loop entirely — one error, one fix.

### 2. CLI should expose input/output formats on demand

`gp schema --command refine:score --json` already exists but the LLM doesn't always know to call it. Options:
- Make `gp <command> --help` show stdin schema + example inline (not just args)
- Make error messages reference the schema command: "Run `gp schema --command refine:score` for the expected format"
- Consider `gp refine:score --show-stdin-schema` for quick inline access

### 3. Comprehensive `--help` output

`gp refine --help` should describe the full refinement loop lifecycle:
- Which subcommands exist and their order (start → score → synthesize → revise → evaluate → converge/stuck)
- What each command expects as stdin (with examples)
- What each command returns as stdout
- When to use each (e.g., "call score once per reviewer per round")

This would serve as a self-contained reference the LLM can read without needing to grep source code.

### Implementation Priority

These fixes have compounding value:
1. **Error format fix** (highest ROI) — every failed call becomes self-documenting
2. **Help stdin examples** (medium ROI) — LLM can check before calling
3. **Lifecycle documentation** (lower ROI) — the skill reference should handle this, but CLI help is a good fallback

### 4. Skills must specify exact CLI interaction contracts

Every place a skill tells the LLM to call a CLI command must include:
- **Exact subcommand** with all required flags
- **Exact stdin shape** — complete JSON with field names, types, and constraints (not ellipsis)
- **Expected stdout shape** — what the command returns on success, what fields to read
- **Error cases** — what exit codes mean, what to do on failure

This applies to all skills, not just iteration-loop.md. Audit all skill files for CLI interactions that use shorthand (`[...]`, `<payload>`, etc.) and replace with concrete schemas.

**Example of bad (current):**
```bash
echo '{"dimensions":[...],"findings":[...]}' | $GP refine:score $SCOPE_FLAG --artifact-type $ARTIFACT_TYPE --reviewer $REVIEWER_ID --json
```

**Example of good (target):**
```bash
# Record one reviewer's score for the current refinement round.
# Call once per reviewer per round, after the reviewer agent returns.
#
# Stdin: JSON object
#   dimensions: array of {name: string, score: number}  (strict — no extra fields)
#   findings:   array of {severity: "BLOCKING"|"CRITICAL"|"IMPORTANT"|"MINOR",
#                         dimension: string, description: string,
#                         location?: string}  (strict — no extra fields)
#
# Stdout (--json): {ok: true, event: "<uuid>", entity: "epic:<name>"}
# Exit 0 on success, 2 on validation error, 3 on state error

echo '{"dimensions":[{"name":"holistic","score":8}],"findings":[{"severity":"IMPORTANT","dimension":"holistic","description":"Missing error handling for edge case"}]}' \
  | $GP refine:score --epic $EPIC_NAME --artifact-type $ARTIFACT_TYPE --reviewer $REVIEWER_ID --json
```

**Scope:** This is a cross-cutting concern across all skills. Files to audit:
- `plugin/skills/_references/iteration-loop.md` (refinement commands)
- `plugin/skills/_references/cli-interaction.md` (general CLI patterns)
- `plugin/skills/create-epic/SKILL.md` (epic lifecycle commands)
- `plugin/skills/plan-slice/SKILL.md` (plan + refine commands)
- `plugin/skills/implement-slice/SKILL.md` (chunk + refine commands)
- `plugin/skills/land-slice/SKILL.md` (land + learning commands)
- `plugin/skills/create-side-quest/SKILL.md` (side-quest commands)
- Any other skill that references `$GP` commands
