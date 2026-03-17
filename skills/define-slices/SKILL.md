---
name: define-slices
description: >
  Reviews project context and interactively defines ordered vertical slices with
  concrete, verifiable success criteria. Writes sequencing.md and per-slice goal.md
  files. Requires idea.md from /start-project. Recommended after /define-architecture.
  Common triggers: 'define slices', 'break this into slices', 'what should we build
  first', 'let's plan the slices', 'define vertical slices', 'what's our build order',
  'slices', 'what should we build', 'add a slice', 'new slice'.
---

# Define Slices

Interactive dialogue that proposes, iterates, and writes an ordered set of vertical slices. Each slice must deliver a complete end-to-end flow that can be verified by actually executing the code — not just by unit or integration tests. Re-entrant — detects existing slices and offers to add, revise, or start fresh.

## Step 1 — Load References

Use the Read tool to load `references/guidance.md` (relative to this skill's directory). It contains conversation guidance, templates for sequencing.md and goal.md, re-entry rules, CLAUDE.md update instructions, and graceful stop cases.

Also load `~/.claude/skills/_shared/references/decisions-format.md` for the decisions format and Loading Protocol.

## Step 2 — Load Context

1. Read `.project/idea.md`. If absent, use AskUserQuestion to tell the user: "No idea.md found — run /start-project first to capture your project idea." Then stop.

2. Read `.project/conventions.md`. If absent, mention `/define-architecture` is recommended for richer context but proceed without it.

3. Read `.project/architecture/_overview.md` and other architecture files. If architecture/ is empty or absent, warn but proceed — ground slices in idea.md scope/constraints instead.

4. Read `.project/learnings.md` if it exists.

5. Load `.project/decisions/` following the Loading Protocol in `decisions-format.md`: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions inform slice boundaries and ordering.

6. Check for existing slices by running: `ls .project/vertical-slices/sequencing.md .project/vertical-slices/*/goal.md 2>/dev/null`

Present summary listing only what was found: "Found: idea.md, conventions.md, N architecture files, learnings.md. Existing slices: [list or 'none']." Omit items that don't exist rather than showing them in brackets.

## Step 3 — Re-entry Check

- **No existing slices** → proceed to Step 4.
- **Existing sequencing.md and/or goal.md files** → list what was found. Use AskUserQuestion with three options: "Add new slices to existing set" / "Revise existing slices" / "Start fresh"
  - **Add** → read existing sequencing.md and goal.md files as context. Propose only new slices. New slices get the next available NN prefix. The ordering in sequencing.md is the source of truth for execution order (not NN prefix). Merge new slices at appropriate positions and present the combined list for approval. Rewrite sequencing.md with merged list.
  - **Revise** → present existing slices. Before modifying any slice, check for downstream artifacts (`plan.md`, `plan-refined.md`, `refinement/`, `implementation/` inside the slice directory). If found, warn the user that downstream work exists. Iterate on changes. Directories are never deleted — only sequencing.md and goal.md files are overwritten.
  - **Start fresh** → proceed to Step 4 (existing files will be overwritten).

Follow calibration depth guidance in `~/.claude/skills/_shared/references/expertise-tracking.md`.

## Step 4 — Propose Slices

1. Based on idea.md, architecture, and conventions, propose an initial set of slices. Ground each slice in specific architecture subsystems or flows. Order so each builds on the last. **Each slice must deliver a complete end-to-end flow** that the implementing agent can verify by actually running the code — executing scripts, calling APIs, interacting with a UI in the browser, or running the system and inspecting its output. If a proposed slice can't be verified this way, it's too thin or too abstract — merge it with another slice or redefine it.

2. Present as a numbered list with: name, one-line description, key dependencies, brief ordering rationale.

3. Ask: "What needs changing? Add, remove, reorder, or rename slices. Or say 'looks good' to proceed to details."

4. Iterate. When user is satisfied, use AskUserQuestion: "Looks good — proceed to details" / "I have more changes".

Throughout Steps 4 and 6, when a durable decision emerges (see threshold in `decisions-format.md`), propose the decision text to the user and confirm via AskUserQuestion before writing. Run `mkdir -p .project/decisions/` before the first write. Write in the format specified by `decisions-format.md`. Track all decisions written during this run and summarize them in Step 10 (Done Summary).

## Step 5 — Write sequencing.md Draft

Run `mkdir -p .project/vertical-slices/` before writing. Using the sequencing.md template from guidance.md, write `.project/vertical-slices/sequencing.md` with the full ordered list, dependencies, and rationale.

## Step 6 — Define Each Slice

Re-load `references/guidance.md` (relative to this skill's directory) to ensure templates are in context.

For each slice in order:

1. Draft the full goal.md using the goal.md template from guidance.md.
2. Focus on **Success Criteria** and **Verification** — these are the most important parts of each goal.md:
   - Each success criterion must specify: what to run (command, script, browser action, API call) and what the expected outcome is. Reject vague criteria like "works correctly" or "tests pass".
   - The **Verification** section must describe the minimum live end-to-end verification the implementing agent should perform after the slice is built. This is not unit tests — it's running the actual system and confirming the flow works. Examples: "Start the dev server, navigate to /dashboard in browser, create a new item, verify it appears in the list and persists after refresh." Or: "Run the CLI with `tool analyze src/`, verify it prints a summary table with at least 3 rows." Think about what a human would do to convince themselves this slice actually works, and write that down.
3. Present the draft and ask for corrections.
4. Iterate until satisfied.
5. Create the directory and write goal.md:
   ```bash
   mkdir -p .project/vertical-slices/NN-slice-name/
   ```
   Write goal.md with the Write tool.
6. Show progress: "Defined N of M slices. Next: [next slice]."

**Graceful stop** — if the user says "that's enough" or "stop here" mid-slice:

Load `~/.claude/skills/_shared/references/state-and-flow-formats.md` for state.md format. Then handle by case:

- **(a) No files written** → don't touch state.md or flow-log.jsonl. Tell user nothing was written. Stop.
- **(b) sequencing.md written but no goal.md files** → if state.md does not exist, create it with the Write tool. Update state.md Current Phase to `define-slices in-progress — stopped after writing sequencing.md`. Generate a UTC timestamp by running: `date -u +%Y-%m-%dT%H:%M:%SZ`. Append to flow-log.jsonl with `"status":"started"`. Update CLAUDE.md to reference sequencing.md (follow Step 8 logic). Stop.
- **(c) sequencing.md + some goal.md files written** → if state.md does not exist, create it with the Write tool. Update state.md Current Phase to `define-slices in-progress — stopped after writing sequencing.md, <comma-separated list of goal.md files written>`. Generate a UTC timestamp by running: `date -u +%Y-%m-%dT%H:%M:%SZ`. Append to flow-log.jsonl with `"status":"started"`. Update CLAUDE.md to reference sequencing.md (follow Step 8 logic). Stop.

## Step 7 — Finalize sequencing.md

If any slice names, ordering, or dependencies changed during Step 6 iteration, rewrite `.project/vertical-slices/sequencing.md` to reflect the final state.

## Step 8 — CLAUDE.md Update

Re-load `references/guidance.md` (relative to this skill's directory) for the CLAUDE.md update instructions. Also read `~/.claude/skills/define-architecture/references/guidance.md` for the full Project Context section format.

Add sequencing.md reference to CLAUDE.md. **Idempotency:** first check if sequencing.md is already referenced in CLAUDE.md — if so, skip this step.

The line to add to the "Read these" list:
```
- `.project/vertical-slices/sequencing.md` — slice ordering and dependencies
```

**Three-case logic for CLAUDE.md update:**

1. **No CLAUDE.md** → create it with the Write tool. Include the full Project Context section from guidance.md format, with sequencing.md referenced.

2. **CLAUDE.md exists but has no `## Project Context` section** → use the Edit tool to append the Project Context section at the end. Ensure a blank line before the new section header.

3. **Existing `## Project Context` section** → read CLAUDE.md fully. Extract old_string from `## Project Context` heading through (but not including) the next `## ` heading. If no subsequent `## ` heading exists, old_string runs through EOF. The old_string MUST include the `## Project Context` heading for unique matching. Add the sequencing.md reference line to the "Read these" list. Replace with the Edit tool. If Edit fails to match (e.g., trailing whitespace), fall back: read the full file, construct the replacement, and rewrite the entire CLAUDE.md with the Write tool.

After updating: "Updated CLAUDE.md so future sessions will see your slice sequencing."

## Step 8b — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise? (CLAUDE.md `## Expertise` section is already in context.)

- **If yes**: Read `~/.claude/skills/_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently — no Read, no output, no AskUserQuestion.

## Step 9 — Write Back State

Load `~/.claude/skills/_shared/references/state-and-flow-formats.md` for state.md and flow-log.jsonl formats.

Generate a UTC timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ`

If state.md does not exist, create it using the Write tool.

Update `.project/state.md` using the 4-section format from the shared formats reference. Set:
- Current Phase: `define-slices complete — sequencing and goal.md files written`
- Active Slice: unchanged (or `none (working at project level)` if project-level)
- Work Stack: unchanged
- Next Step: `/create-plan` for the first unplanned slice

Append to `.project/flow-log.jsonl`:
```bash
echo '{"ts":"<timestamp>","phase":"define-slices","scope":"project","status":"complete","summary":"<one-sentence summary>"}' >> .project/flow-log.jsonl
```

## Step 10 — Done Summary

List all slices defined. Recommend `/create-plan` for the first unplanned slice.

## Error Handling

If a Write tool call fails, retry once. If it fails again, inform the user of the specific file that could not be written and continue with remaining files.
