---
name: audit-docs
description: >
  Audit documentation against the actual codebase. Spawns parallel reviewers to
  find stale docs, undocumented APIs, and cross-doc inconsistencies. Batches
  trivial fixes for approval, confirms substantive changes, and proposes side
  quests for gaps. Common triggers: 'audit docs', 'check documentation',
  'are the docs up to date', 'documentation audit', 'review docs'.
requires: gp >= 1.0.0
---

# Audit Docs

Compare documentation files against the actual codebase. Three functions:

1. **Staleness detection** — docs referencing removed code, APIs, config, or features
2. **Gap detection** — undocumented public APIs, exports, CLI commands, config options
3. **Consistency checking** — cross-references between docs that contradict each other, and code examples that won't work

Produces actionable output: batched trivial fixes (with approval), individual substantive fixes, and side quest proposals for large-scope gaps.

**Does NOT use `iteration-loop.md`** — the pattern here (parallel reviewers, classify-and-act, batch approval) is structurally distinct from the review-iterate loop.

## Step 0 — Version Check

Read `../_shared/references/cli-interaction.md` for CLI interaction conventions and error handling patterns.

Verify CLI availability and compatibility:

```bash
"${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp" --version --json
```

If the command fails (not found, non-zero exit), stop: "The `gp` CLI is required but not found. Ensure the goodplan plugin is installed and enabled — run `/plugin` to check."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop: "This skill requires gp >= 1.0.0 but found X.Y.Z. Upgrade the CLI."

## Step 1 — Load Context

**1a. Load learnings and conventions**: Load learnings via `gp learning:list --json`. Read `.goodplan/conventions.md` (if it exists).

**1b. Load recent activity-log**: Query recent activity for project context:

```bash
gp state --json --query '[.["activity-log.jsonl"][]] | .[-20:]'
```

**1c. Expertise check (load)**: Read `## Expertise` section from `~/.claude/CLAUDE.md` to calibrate communication depth.

**1d. Resume detection**: Glob `.goodplan/audits/docs-*.md` and read the most recent. If it contains a `<!-- partial — interrupted` marker, present the partial report and ask: resume from where it left off, or start fresh?

**1e. Read guidance**: Read `references/guidance.md` for severity levels, reviewer output format, and side quest template.

## Step 2 — Discover Documentation Sources

**2a. Resolve epic scope**: Detect the active epic via CLI:

```bash
gp status --json
```

Check the `.activeEpic` field. If an active epic exists, include `.goodplan/epics/<activeEpic.name>/` documentation in scope alongside project-level docs. Epic subdirectories to include: `architecture/`, `slices/` (goal and plan files). Epic subdirectories to exclude: `research/`, `brainstorm/`, `prototypes/` (scratch/exploratory content, not authoritative docs).

**2b. Discover documentation files**: Scan the following sources using Glob and Read:

- **Project workflow docs**: `.goodplan/architecture/**/*.md`, `.goodplan/conventions.md`, `.goodplan/idea.md`
- **Learnings**: `.goodplan/learnings/*.md`
- **CLAUDE.md files**: `CLAUDE.md`, `.claude/CLAUDE.md` (repo-level), `~/.claude/CLAUDE.md` (user-level — read-only, don't audit content but check if references are valid)
- **README files**: `README.md`, `**/README.md`
- **Docs directories**: `docs/**/*.md`, `documentation/**/*.md`
- **Inline documentation**: Scan TypeScript source files for JSDoc comments and module-purpose comments (`/** @module */`, file-level `/**` blocks). Focus on `src/**/*.ts` files with significant JSDoc presence
- **CLI help text**: Run `gp --help` and `gp <command> --help` for each top-level command to capture CLI documentation surface

Record what was found — build a list of all documentation sources with their paths and a brief summary of what each covers.

**Graceful stop marker for this step**: `<!-- partial — interrupted during source discovery. Sources found so far: {list}. -->`

## Step 3 — Read Codebase Reality

Read actual exports, public APIs, module structure, CLI commands, configuration options, and environment variables. Build a map of "what exists" to compare against "what's documented":

- **Public API surface**: Scan `src/` for exported functions, types, and interfaces. Focus on `index.ts` barrel exports and files referenced by other modules
- **CLI commands**: Read command files (typically `src/commands/`) to build the actual command surface with flags, options, and descriptions
- **Configuration**: Check for config files, environment variables, and runtime options
- **Module structure**: Map the directory structure and inter-module dependencies

The goal is a concrete "codebase reality" snapshot that reviewers can compare against the documentation discovered in Step 2.

**Graceful stop marker for this step**: `<!-- partial — interrupted during codebase reading. Sources discovered. Codebase map partial: {modules_read}. -->`

## Step 4 — Spawn Reviewer Sub-Agents

Read `references/sub-agent-prompts.md` for self-contained reviewer templates.

Spawn three parallel reviewers (model: `"opus"`):

1. **Staleness reviewer**: Finds docs referencing removed code, APIs, config, or features. Input: documentation sources list + codebase reality map.
2. **Gap reviewer**: Finds undocumented public APIs, exports, CLI commands, config options. Input: codebase reality map + documentation sources list.
3. **Consistency reviewer**: Finds cross-references between docs that contradict each other, and code examples that won't work. Input: documentation sources list + codebase reality map.

Each reviewer returns findings inline in their agent response (not written to disk). The orchestrator (this skill) synthesizes all findings in Step 5.

**Placeholder mapping**: Fill `{documentation_sources_list}` with the bullet-list of documentation sources discovered in Step 2 (paths + brief summaries). Fill `{codebase_reality_summary}` with the codebase reality map built in Step 3 (exports, CLI commands, module structure, config).

**Graceful stop marker for this step**: `<!-- partial — interrupted during reviewer spawning. Reviewers launched: {list}. Reviewers not launched: {list}. -->`

## Step 5 — Classify and Act on Findings

Merge findings from all reviewers. Deduplicate (same issue reported by multiple reviewers collapses to one finding). Classify each finding into one of three action categories:

### Trivial fixes (typos, dead links, stale single-line references)

Batch all trivial fixes and present them via AskUserQuestion:

> "Found N trivial documentation fixes. Apply all, or review individually? [list of fixes with file paths and descriptions]"

- **If approved**: Apply all fixes.
- **If rejected**: Skip all trivial fixes. Note them as "deferred" in the audit report with the full list of skipped items. Continue to substantive findings.

### Substantive fixes (rewrites, new doc sections, structural changes)

Present each substantive fix individually with a diff preview. Use AskUserQuestion for individual confirmation:

> "Substantive fix: [description]. Proposed change: [diff preview]. Apply?"

### Large scope (missing entire doc sections, documentation strategy gaps, cross-cutting inconsistencies)

Propose as a side quest:

```bash
echo '{"name":"<descriptive-name>","goal":"<specific goal with files and scope>"}' | gp quest:create --json
```

Capture the output to extract the created quest name for inclusion in the audit report's "Side Quests Created" section.

**Graceful stop marker for this step**: `<!-- partial — interrupted during finding classification. Findings classified: {N}. Fixes applied: {N}. Remaining: {N}. -->`

## Step 6 — Write Audit Report

```bash
mkdir -p .goodplan/audits
```

Write findings to `.goodplan/audits/docs-<YYYY-MM-DD>.md`. Same-day re-runs overwrite the previous report.

Report format:

```markdown
# Documentation Audit — <YYYY-MM-DD>

## Findings Summary
| # | Severity | Category | Finding | Action |
|---|----------|----------|---------|--------|
| 1 | ... | staleness/gap/inconsistency | ... | fixed / deferred / side-quest-name |

## Staleness Findings
<findings with evidence: file paths, specific stale references, what changed in code>

## Gap Findings
<findings with evidence: undocumented APIs/commands, missing docs, file paths>

## Consistency Findings
<findings with evidence: contradicting references, broken code examples, file paths>

## Fixes Applied
<list of trivial and substantive fixes that were applied, with file paths>

## Side Quests Created
<list with quest names and goals>

## Deferred Findings
<findings user chose not to address now, with rationale>
```

**Graceful stop marker for this step**: `<!-- partial — interrupted during report writing. Findings complete. Report incomplete. -->`

## Step 7 — Refresh Project Health

Update `.goodplan/project-health.md` with findings from this audit.

1. **Read**: Read `.goodplan/project-health.md` (if it exists) and `../_shared/references/project-health-format.md` for the canonical format.

2. **If missing**: Create `.goodplan/project-health.md` using the format from `project-health-format.md`, populating initial content derived from audit findings:
   - **Health**: Areas where documentation is stale or missing indicate maintenance gaps
   - **Technical Debt**: Documentation drift is documentation debt — docs that should match code but don't
   - **Extensibility**: Gap findings about undocumented APIs indicate onboarding friction

3. **If exists**: Update relevant sections, writing `<!-- Last updated by: audit-docs, <date> -->` at the end of each updated section:
   - **Health**: Incorporate staleness findings — areas where docs are stale indicate neglected zones
   - **Technical Debt**: Incorporate gap and staleness findings as documentation debt
   - **Extensibility**: Incorporate gap findings about undocumented APIs and onboarding paths
   - **Recent Changes**: Not updated by audit (this is slice-driven)

4. **Confirm before writing**: Present a brief summary of proposed changes before writing. Proceed unless the user objects.

**Graceful stop marker for this step**: `<!-- partial — interrupted during project-health refresh. Audit report complete. Project-health.md not updated. -->`

## Step 8 — Graceful Stop

If the user says "stop" or "that's enough" at any point during the audit, write a partial report with the appropriate step-specific marker from the step where execution was interrupted. The markers are documented inline at each step above.

On resume (detected in Step 1d): read the partial report, identify which step was interrupted from the marker, and continue from where it left off.

## Step 9 — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise?

- **If yes**: Read `../_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently.

## When to Ask the User

Only stop and ask when you encounter:
- Ambiguity about whether a documentation gap is intentional (e.g., internal-only API deliberately undocumented)
- Documentation changes that would invalidate existing plans or active side quests
- Multiple valid interpretations of how code maps to documentation
- The batch-approval flow in Step 5 (always ask before applying fixes)

Do NOT ask for permission to continue between analysis steps.

## References

- **CLI interaction**: `../_shared/references/cli-interaction.md` — CLI conventions, error handling, invocation patterns
- **Guidance**: `references/guidance.md` — severity levels, reviewer output format, side quest template
- **Sub-agent prompts**: `references/sub-agent-prompts.md` — self-contained reviewer agent prompts
- **Expertise tracking**: `../_shared/references/expertise-tracking.md`
