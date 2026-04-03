# Agent Skill Review — Phase 1: Shared References & Agent Definitions (Iteration 2)

## Issues

**[IMPORTANT]** Plan-phase agent still references ContextBundle abstraction that does not exist
The iteration 1 MINOR issue about `ContextBundle.inline` and `ContextBundle.references` in the plan-phase agent inputs was flagged for simplification, but it was not addressed. Lines 21-22 of `agents/plan-phase.md` still say:
- "Inline context — key content from `ContextBundle.inline` (architecture, conventions already read and budgeted by the orchestrator)"
- "Reference paths — `ContextBundle.references` file paths for content that exceeded the inline budget (read these as needed)"

`ContextBundle` is a future abstraction not part of this slice. The plan-slice orchestrator (Phase 3) will pass concrete file paths. These inputs should describe what the orchestrator will actually provide: architecture file paths to read, conventions file content, etc. Referencing a non-existent API makes the agent definition confusing for the implementer building the orchestrator in Phase 3.
File: agents/plan-phase.md:21-22
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Synthesis agent does not clarify whether it reads the original artifact
Iteration 1 flagged that the synthesis agent instructions say to "Read all reviewer outputs" but don't state whether it should also read the original artifact. This was not addressed. For context discipline, the synthesis agent should explicitly state it operates purely on reviewer outputs (if that's the intent) or should add the artifact path to inputs. Given the architecture's emphasis on context discipline, an explicit statement either way prevents unnecessary context consumption.
File: agents/synthesis.md:21
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `plan-format.md` extracted to shared references but original not updated to reference it
The `skills/create-plan/references/plan-format.md` file is identical to the new `skills/_shared/references/plan-format.md`. The plan intended to extract this content to a shared location. However, the original file still exists as an independent copy rather than being replaced with a reference (e.g., `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/plan-format.md`) or a symlink. Two identical copies will drift over time. This is minor because both are currently identical and this can be addressed in Phase 3 when the create-plan skill is refactored, but worth tracking.
File: skills/create-plan/references/plan-format.md
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All three IMPORTANT issues from iteration 1 are correctly fixed:

1. **Architecture `_overview.md` line 69** — now correctly describes `@${CLAUDE_PLUGIN_ROOT}/path` references instead of the broken `skills:` frontmatter mechanism. The description is accurate and references issue #25834.
2. **Reviewer tool restriction guidance** — all three reviewer agents now have a `**Note:**` line stating they run with read-only tools (Read, Grep, Glob) and should return review content inline without writing files.
3. **Editor tool restriction guidance** — the editor agent now has a `**Note:**` line listing Read, Grep, Glob, Write, and Edit tools with explicit "no sub-agent spawning."

Additionally, the refinement-coordinator and plan-phase agents also have appropriate tool notes (read-only for coordinator; Read/Grep/Glob/Write for plan-phase). The synthesis agent has Read/Grep/Glob/Write tools noted. All agent definitions are consistent in their tool restriction documentation.

The `review-preamble.md` return format correctly shows `"filesWritten": []` with explanatory text that the orchestrator writes review files, not the reviewers — this is consistent with the reviewer agents' inline return format. The iteration 1 concern about the empty array is resolved by the architecture change where reviewers return inline JSON and the orchestrator writes the files.

The remaining IMPORTANT issue (ContextBundle reference) is a holdover from iteration 1 that was not addressed, but it does not block implementation — it's a clarity issue that will cause minor confusion in Phase 3 if not fixed. The two MINOR items are documentation polish. Fixing the ContextBundle reference would bring this to a solid 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
