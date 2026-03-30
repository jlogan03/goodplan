# Merged Feedback — audit-docs-and-tests (Round 3)

## CRITICAL Issues

None.

---

## IMPORTANT Issues

**[IMPORTANT-1] `quest:create` invocation uses `--json` flag inconsistently and without output capture**
Flagged by: holistic, agent-skill (agent-skill flags as CODEBASE_EXPLORATION; holistic flags as DIRECTLY_ACTIONABLE)

The plan specifies `echo '{"name":"fix-stale-docs","goal":"..."}' | goodplan quest:create --json` in Phase 1 Step 5 and Phase 2 Step 6. The `--json` flag controls output format, not stdin parsing — the piped JSON input format is correct. However: (a) the `--json` flag may or may not be valid on `quest:create`; this needs verification against the actual CLI help. (b) The plan does not specify what to do with the `quest:create` output — the resulting quest name should be captured and included in the audit report's "Side Quests Created" section. (c) The `--json` flag appears inconsistently: audit-tests Step 6 includes it while the overview section omits it.

Resolution: RESEARCH_NEEDED — verify `quest:create --json` is valid; then make the invocation consistent and add a note to capture the quest name for the report.

**[IMPORTANT-2] audit-docs Step 2 epic-scope discovery does not specify which subdirectories to include**
Flagged by: holistic

Step 2 says "if active epic, include `.project/epics/<name>/` documentation in scope" but doesn't list which subdirectories. Without this, an implementer may over-include brainstorm scratch files or under-include epic architecture. Authoritative subdirectories to include: `architecture/`, `slices/` (goal and plan files). Subdirectories to exclude: `research/`, `brainstorm/`, `prototypes/`.

Resolution: DIRECTLY_ACTIONABLE — add the explicit include/exclude list to Step 2 of audit-docs.

---

## MINOR Issues

**[MINOR-1] Resume marker fragility — text must exactly match resume detection logic**
Flagged by: software-architecture

The per-step graceful stop markers use descriptive text (e.g., `<!-- partial — interrupted during source discovery`). Resume detection in Step 1 parses this marker text and maps it back to the corresponding step. The plan should note that the marker text strings are canonical keys — the resume logic must match them exactly, and implementers must not change marker wording without updating resume detection. Low risk given the markers are well-structured, but worth calling out explicitly.

Resolution: DIRECTLY_ACTIONABLE — add a note near the graceful stop section that marker strings are canonical and must not be changed without updating resume detection.

**[MINOR-2] Shared severity levels and findings table format duplicated across all three audit skills**
Flagged by: software-architecture

`audit-docs`, `audit-tests`, and `audit-architecture` each define their own `references/guidance.md` with identical severity level definitions (Critical/Important/Minor) and findings table schema (Severity/Description/Evidence/Suggested Action). The `skills/_shared/references/` directory exists for exactly this purpose. Consider extracting shared audit conventions to `_shared/references/audit-conventions.md` to reduce drift risk. Acceptable to defer since all audit skills are new and some duplication preserves skill independence.

Resolution: DIRECTLY_ACTIONABLE — flag as a post-completion improvement; add a note in the plan or a follow-up task to consolidate into `_shared/references/audit-conventions.md`.

**[MINOR-3] Coverage map schema pseudo-code may mislead implementers**
Flagged by: holistic, agent-skill (holistic provides more actionable resolution)

Step 3 of audit-tests shows an illustrative schema `{ source: string, testFile: string | null, hasTests: boolean }` with a parenthetical disclaimer that it's a mental model. The schema notation is unusual for a skill prompt (executed by an LLM, not compiled code) and could prompt an implementer to build this as literal in-memory data structure. Rephrase to prose: "For each source file, determine whether a corresponding test file exists. Track which source files have coverage and which don't."

Resolution: DIRECTLY_ACTIONABLE — replace the schema notation with prose in audit-tests Step 3.

**[MINOR-4] Both skills omit `mkdir -p .project/audits` before writing the report**
Flagged by: holistic

audit-docs Step 6 and audit-tests Step 7 write to `.project/audits/<type>-<date>.md` but neither includes `mkdir -p .project/audits`. The audit-architecture skill explicitly includes this step. Add it to both skills' report-writing steps.

Resolution: DIRECTLY_ACTIONABLE — add `mkdir -p .project/audits` to audit-docs Step 6 and audit-tests Step 7.

**[MINOR-5] "Track audit-architecture divergence" task in Phase 2 should be a post-completion note, not a build task**
Flagged by: holistic

The last Phase 2 task ("propose a side quest to update audit-architecture to use `quest:create`") is triggered after Phase 2 verification succeeds. Listing it as a checkbox build task implies it blocks Phase 2 completion. Move it to a "Post-Completion" note after the Phase 2 Verification section, or clearly mark it as a non-blocking follow-up.

Resolution: DIRECTLY_ACTIONABLE — reposition this item as a post-completion note.

**[MINOR-6] `doc-discovery-patterns.md` reference file may be over-engineered**
Flagged by: agent-skill

audit-architecture handles its equivalent discovery inline in SKILL.md Step 2 without a separate reference file. audit-docs Step 2 already enumerates what to scan (READMEs, `docs/`, `.project/` files, CLAUDE.md, JSDoc-heavy files). Extracting glob patterns to a separate file adds a reference load the orchestrator must perform but could instead be inline. If the file is kept, Step 2 must explicitly instruct the orchestrator to read it.

Resolution: DIRECTLY_ACTIONABLE — either inline the patterns into SKILL.md Step 2 (matching audit-architecture's approach) or add an explicit "read doc-discovery-patterns.md" instruction at the start of Step 2.

**[MINOR-7] Reviewer sub-agent output destination is unspecified**
Flagged by: agent-skill

Phase 1 Step 4 and Phase 2 Step 4 say "each reviewer writes findings to a file; orchestrator synthesizes" but don't specify where. audit-architecture's reviewers return findings inline in their agent response (not written to disk). The plan should clarify: reviewers return findings inline in their response (option A, consistent with audit-architecture) or write to a specified path (option B, needs path). Option A is preferred for consistency and avoids file cleanup.

Resolution: DIRECTLY_ACTIONABLE — clarify in both Step 4s that reviewers return findings inline in their response, matching audit-architecture's pattern.

**[MINOR-8] `test-patterns.md` has same over-engineering concern as `doc-discovery-patterns.md`**
Flagged by: agent-skill

Same reasoning as MINOR-6 for Phase 2's `test-patterns.md`. Test discovery patterns may be complex enough to justify a separate file (framework-specific conventions, source-to-test mapping across jest/vitest/bun), so this is a closer judgment call. If kept, Step 2 of audit-tests must explicitly instruct the orchestrator to read it.

Resolution: DIRECTLY_ACTIONABLE — implementer's call; if kept, add explicit read instruction in Step 2.

**[MINOR-9] Same-day re-runs overwrite the audit report**
Flagged by: agent-skill

Both skills use `<type>-<date>.md` as the report filename. Running twice on the same day overwrites the first report. This matches audit-architecture's existing pattern, so this plan introduces no new risk. Either note explicitly that same-day re-runs overwrite, or use a timestamp suffix (e.g., `docs-2026-03-27T14-30.md`). Lowest-friction fix: add a note in the plan that this is intentional and consistent with audit-architecture.

Resolution: DIRECTLY_ACTIONABLE — add a one-line note that same-day re-runs overwrite the previous report (consistent with audit-architecture).

---

## DIRECTLY_ACTIONABLE

Items that can be addressed in the plan without further research:

1. IMPORTANT-2 — specify epic subdirectory include/exclude list in audit-docs Step 2
2. MINOR-1 — add note that graceful stop marker strings are canonical
3. MINOR-2 — add follow-up task to consolidate severity defs into `_shared/references/audit-conventions.md`
4. MINOR-3 — replace coverage map schema notation with prose
5. MINOR-4 — add `mkdir -p .project/audits` to audit-docs Step 6 and audit-tests Step 7
6. MINOR-5 — move "track audit-architecture divergence" task to post-completion note
7. MINOR-6 — inline doc-discovery patterns or add explicit read instruction
8. MINOR-7 — clarify reviewer output is inline response, not written to file
9. MINOR-8 — inline test-patterns or add explicit read instruction
10. MINOR-9 — add note that same-day re-runs overwrite (consistent with audit-architecture)

Total DIRECTLY_ACTIONABLE: 10

---

## RESEARCH_NEEDED

1. IMPORTANT-1 — verify that `goodplan quest:create --json` is a valid invocation (i.e., that `--json` is accepted as a flag and does not interfere with stdin parsing). Run `goodplan quest:create --help` or inspect the CLI source to confirm. Then: normalize invocation across all examples and add output-capture note.

Total RESEARCH_NEEDED: 1

---

## Contradictions Resolved

**quest:create `--json` flag interpretation** — holistic and agent-skill both flag this issue. holistic marks it DIRECTLY_ACTIONABLE (just clean up examples and add capture note), while agent-skill marks it CODEBASE_EXPLORATION (verify the flag is valid). The agent-skill reviewer is the domain specialist on CLI tool invocation correctness. Resolution: treat as RESEARCH_NEEDED — verify first, then apply the fix. The merge elevates this to IMPORTANT-1 with RESEARCH_NEEDED resolution.

**Coverage map schema** — holistic (MINOR) and agent-skill (MINOR) both flag it; holistic provides the more actionable rewrite. Merged into MINOR-3 using holistic's suggested prose replacement.

Contradictions resolved: 2
Unresolved contradictions: 0

---

## Unresolved (USER_INPUT required)

None.

---

## Available Research

**R1 resolved**: `goodplan quest:create --json` is valid. The CLI schema confirms `--json` is an accepted flag with `"default": false`. Stdin parsing (`{name, goal}`) is independent of the `--json` flag. Action: normalize all `quest:create` invocations to include `--json` consistently and add output-capture note.
