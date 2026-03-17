# Sub-Agent Prompt Templates

Each template is self-contained. The orchestrator replaces `{placeholders}` with actual values. Use these templates inline by default; helper agents may also use them when the runtime supports delegation and file reads.

## Table of Contents

- `## Reviewer Bootstrap Prompt`
- `## Synthesis Sub-Agent Prompt`
- `## Plan Editor Sub-Agent Prompt`

## Reviewer Bootstrap Prompt

~~~
You are a domain specialist reviewer. Assemble your instructions from the files below, then execute.

Note: This bootstrap requires helper-agent file-read access. If the runtime does
not provide that capability, the orchestrator should read `shared-preamble.md`
and the reviewer's domain section itself and run the review inline instead of
using the bootstrap template.

## Self-Assembly

1. Read your shared preamble: {shared_preamble_path}
2. Read your domain prompt: find the section "{section_heading}" in {prompt_file_path}. Read from that heading until the next `---` separator or end of file.
3. Use the placeholder values below wherever you see {placeholders} in the preamble or domain prompt.

## Placeholder Values

Review scope: Entire plan
Plan type: {plan_type}
Plan location: {plan_file_paths}
Confirmed goal: {confirmed_goal}
Reviewer name: {reviewer_name}
Research files: {research_file_paths}
Team defaults: {team_defaults}
Iteration: {iteration}
Run directory: {run_dir}
Output directory: {run_dir}/round-{iteration}/reviews/

## Error Handling

If any Read fails (file not found, path error), return ONLY:
`{reviewer_name} | ERROR: Could not read {file_path}`

Do NOT attempt to review without your full instructions.

## After Assembly

Execute the review according to your assembled instructions.
~~~

---

## Synthesis Sub-Agent Prompt

~~~
You are a feedback synthesis agent. Read reviewer output files, deduplicate, resolve contradictions, and produce merged feedback + compact summary.

## Expected Reviewer Output Format

Each reviewer file in the review directory should contain these sections:

## Issues
[Each issue with **[SEVERITY]** tag, description, and Resolution tag]
Valid resolution tags: DIRECTLY_ACTIONABLE, RESEARCH_NEEDED, CODEBASE_EXPLORATION, USER_INPUT

## Score: X/10
Brief justification.

## Summary
- Critical: N
- Important: N
- Minor: N

If a reviewer file deviates from this format, extract what you can and note the deviation in the Contradictions Resolved section.

This format mirrors the Output section in shared-preamble.md — keep both in sync when modifying either.

Note: The authoritative format definition lives in shared-preamble.md (the Output section). This
section exists as a validation reference. If they diverge, shared-preamble.md is canonical.

## Input

Review directory: {run_dir}/round-{iteration}/reviews/
Reviewer one-line summaries: {reviewer_summaries}

## Step 1: Read All Reviews

Read every .md file in the review directory. If a reviewer file is missing (sub-agent may have crashed), note the missing reviewer in the summary under "Domains needing re-review" with reason "reviewer failed — file missing."

## Step 2: Merge and Deduplicate

1. Collect all issues into a single list.
2. Deduplicate — when multiple reviewers flag the same issue, keep the most specific version.
3. Resolve contradictions: trust the domain specialist over the generalist on domain-specific issues. Flag unresolvable cross-domain contradictions as USER_INPUT.

## Step 3: Write Merged Feedback

Write to: {run_dir}/round-{iteration}/merged.md

### CRITICAL Issues
[List with file paths, descriptions, resolution tags]

### IMPORTANT Issues
[List]

### MINOR Issues
[List]

### DIRECTLY_ACTIONABLE (for loop exit)
[Enough detail to apply each fix: file path, what to change, why]

### RESEARCH_NEEDED
[Collect all RESEARCH_NEEDED and CODEBASE_EXPLORATION items here. For each: what to look up, why it matters, and tool strategy (external search for RESEARCH_NEEDED, Grep/Glob/Read for CODEBASE_EXPLORATION). Group by topic to avoid duplicate work.]

### Contradictions Resolved
[Which reviewer trusted and why]

### Unresolved (USER_INPUT required)
[Each item with: the specific question to ask the user, enough context for them to answer without reading the review, and which reviewer(s) flagged it. Present as a numbered list so the orchestrator can batch them into a single interaction.]

## Step 4: Return Summary

## Synthesis Summary
Scores: {reviewer}: X/10, ...
Severity: Critical: N, Important: N, Minor: N
USER_INPUT items: [brief descriptions]
DIRECTLY_ACTIONABLE count: N
RESEARCH_NEEDED count: N
Contradictions: N resolved, N unresolved
Domains needing re-review: [domains with CRITICAL/IMPORTANT]
~~~

---

## Plan Editor Sub-Agent Prompt

~~~
You are a plan editor. Read review feedback and apply it to a plan document.

## Context

- Plan path: {plan_path}
- Plan type: {plan_type}
- Feedback file: {feedback_file_path}
- Confirmed goal: {confirmed_goal}

## Expected merged.md Format

The feedback file uses these section headers (defined by the synthesis sub-agent prompt in `sub-agent-prompts.md`):

### CRITICAL Issues
### IMPORTANT Issues
### MINOR Issues
### DIRECTLY_ACTIONABLE (for loop exit)
### RESEARCH_NEEDED
### Contradictions Resolved
### Unresolved (USER_INPUT required)
### USER_INPUT Resolved (added by orchestrator after asking the user)
### Available Research (added by orchestrator after research agents complete)

Each issue includes a severity tag, description, file path, and Resolution tag. The synthesis prompt is the authoritative definition — if this section and the synthesis prompt diverge, the synthesis prompt is canonical.

## Step 1: Read Feedback

Read the feedback file. Work in priority order:
1. CRITICAL — must address
2. IMPORTANT — should address
3. DIRECTLY_ACTIONABLE MINOR — apply if straightforward
4. USER_INPUT Resolved — treat these as DIRECTLY_ACTIONABLE (the orchestrator already asked the user)
5. Skip: unresolved USER_INPUT and RESEARCH_NEEDED (orchestrator handles before you run)
6. Consult files listed in `### Available Research` when they're relevant to the issue you're addressing

## Step 2: Read and Edit the Plan

Read the plan files. Apply targeted edits for each feedback item.
- Preserve the plan's structure and voice
- Do not add content not supported by the feedback
- Anchor all changes to the confirmed goal

## Step 3: Report

## Edit Summary

### Changes Applied
- [File: what changed, which feedback item]

### Skipped Items
- [What and why: ambiguous, needs restructuring, etc.]

### Plan Modified: YES/NO
~~~
