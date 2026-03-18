# Phase 3: Manual End-to-End Test

**This phase is a manual test run by the developer — not an autonomous task.**

**Tests run in order.** Test 3 assumes Test 1 was run in the same project (it uses the files written by Test 1).

## How to run

Test in `goodplan-2/` (or a fresh test project with `idea.md` and exploration output).

**Test 1 — Full run with exploration output:**
- Ensure `idea.md` exists and at least one brainstorm or research file is present
- Run `/define-architecture` with no args
- Verify context summary is presented before proceeding
- Go through conventions phase: verify it drafts from context, takes feedback, writes `conventions.md`
- Go through architecture phase: verify it proposes relevant files (with descriptions), writes each before moving on
- Verify progress indication shown after each file write
- Verify CLAUDE.md is updated with correct Project Context section
- Verify state.md and flow-log updated correctly

**Test 2 — Graceful stop:**
- During a fresh run (or after resetting), say "that's enough" after 2 architecture files have been written
- Verify state.md shows Current Phase: `define-architecture in-progress — stopped after writing conventions.md, architecture/_overview.md` (or whatever files were actually written)
- Verify CLAUDE.md Project Context references only the files actually written
- Verify no further files are written after the stop

**Test 3 — Re-entry on partial architecture:**
- Run in the same project used for Test 1 (which has conventions.md and architecture/ files)
- Delete two of the architecture files written in Test 1
- Run `/define-architecture` again
- Verify it lists existing files and asks continue vs. start fresh (batched prompt, not per-file)
- Choose "Continue" — verify it focuses on the missing files

**Test 4 — No exploration output:**
- Run on a project with only `idea.md` (no brainstorm/research files, empty or absent brainstorm/ and research/ directories)
- Verify it proceeds gracefully with just idea.md as context
- Verify the conventions draft is still specific and actionable despite having no exploration context
- Verify the "Also check" entries for brainstorm/research are absent from CLAUDE.md when those directories are empty or don't exist (not just present with empty dirs)

**Test 5 — Missing idea.md:**
- Run on a project with no `.project/idea.md`
- Verify the skill outputs a message like "No idea.md found — run /start-project first to capture your project idea." and stops

## What to verify
- [x] Context summary is shown before any Q&A begins
- [x] Conventions phase produces specific, actionable `conventions.md` (not vague placeholders)
- [x] Architecture files are written incrementally (each file written before the next begins)
- [x] File applicability is inferred from idea.md and confirmed with user for ambiguous cases
- [x] CLAUDE.md Project Context section is correct — no phantom entries for nonexistent files
- [x] Re-entry detects existing files and focuses on gaps
- [x] Graceful stop leaves state.md with "in-progress" status and correct phase string
- [x] state.md and flow-log updated on completion
- [x] `/project-status` after completion recommends `/define-slices`

## Verification commands
- `cat .project/conventions.md` — specific content, not placeholders
- `ls .project/architecture/` — correct files for this project type
- `cat CLAUDE.md` — Project Context section lists existing files only
- `tail -3 .project/flow-log.jsonl` — define-architecture entry present
