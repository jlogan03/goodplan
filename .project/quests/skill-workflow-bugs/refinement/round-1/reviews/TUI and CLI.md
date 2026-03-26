## Issues

**[IMPORTANT]** Bug 4 sibling detection uses wrong interaction mechanism for CLI context
The plan says to "emit a follow-up question asking the LLM whether they should be included" after detecting unknown siblings. But the migration protocol is a structured multi-round Q&A over stdin/stdout (the CLI emits questions as JSON, the LLM answers via piped stdin). It is NOT a skill with access to `AskUserQuestion`. The plan needs to specify that sibling detection either (a) adds a new question to the current round's question set (extending the protocol), or (b) adds a new round to the protocol. The plan's current wording ("emit a follow-up question asking the LLM") is ambiguous about the mechanism and could lead the implementer to attempt an `AskUserQuestion` call from within CLI code, which is not possible. Additionally, the research file notes that `copyMarkdownFiles()` already copies ALL `.md` files from source directories — so the actual bug may not be about copying at all, but about accurately detecting what was copied for status mapping or informing the LLM. The plan should clarify what the sibling detection is actually for before implementation begins.
Resolution: USER_INPUT

**[IMPORTANT]** Bug 4 plan tasks mention adding schema to wrong file
The plan says "Add the sibling scan schema to `src/commands/global/migrate/schemas.ts`." The schemas file contains Zod schemas for the structured Q&A response types (inventory, epic detail, confirmation). A "sibling scan" is an internal filesystem operation, not a response schema from the LLM. If sibling detection is a server-side scan that produces a new question, the new question's response schema goes in schemas.ts, but "sibling scan schema" is misleading. If the detection result is emitted as part of an existing question, no new schema is needed. The task description should specify exactly what data shape needs a schema and why.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 verification for refine-slices output templates lacks CLI-testable check
Phase 3 adds Iteration Summary and Completion Summary template references to refine-slices, which currently has zero output templates. The verification section says "grep for structured output points and confirm each one either has an inline rigid template or references shared output-templates.md." This is a static file check, not a behavioral verification. For a TUI/CLI reviewer, the most direct verification is to confirm that the iteration loop display step (Step 3, sub-step 4: "Display iteration summary to user") actually references the template and would produce correctly formatted output. The plan should add a verification step that reads the final refine-slices SKILL.md and confirms the display instruction references the shared template by name, not just that the file mentions "output-templates.md" somewhere.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 project-status verification is weak
The plan says "Run `/project-status` twice -- confirm identical output structure." This is good behavioral verification but does not account for the fact that project-status templates are self-contained (not being moved to shared templates). The plan correctly notes "Already fully rigid -- no changes needed. Verify templates are still correct after other changes." However, running project-status twice only tests project-status itself, not whether other skills' template changes inadvertently broke anything. Since project-status is explicitly unchanged, this verification adds little value. A more useful check would be to run `bun run check` to confirm no type errors were introduced across the skill installation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No verification that CLI `--json` output formatting remains stable after migrate.ts changes
Bug 4 modifies `src/core/rpc/migrate.ts` to add sibling scanning logic. The migration command uses structured JSON output for its multi-round Q&A protocol. The plan includes "Run `bun test` -- all tests pass including new sibling detection tests" but does not specify verifying that the existing migration protocol's JSON output shape is unchanged for rounds that do not involve siblings. This matters because the migration output is consumed by LLMs parsing JSON -- any shape change is a breaking contract change.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 Context Load Summary template may conflict with CLI error output conventions
The plan proposes a "Context Load Summary Template" standardizing the "Loaded: [files]. Context: [summary]. Missing: [list]" pattern. This output is presented to the user in the terminal. The plan should note that "Missing: [list]" output must not be confused with CLI error output (which follows INV-007's structured `{ error: { code, message, detail? } }` shape). Since context load summaries are LLM-generated markdown (not CLI JSON output), this is low risk, but the template should clarify that "Missing" items are informational, not errors, to avoid confusing users who see "Missing" in their terminal.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan is solid on Phases 1-2 for the skill-file bugs and template extraction. However, Bug 4 (migration sibling detection) has significant ambiguity about the interaction mechanism -- the migration protocol is a CLI-driven multi-round JSON Q&A, not a skill with AskUserQuestion, and the research file itself questions whether the bug is even about file copying. This needs USER_INPUT to clarify intent before implementation. Phase 3 verification could be strengthened with behavioral checks rather than grep-only validation. To reach 9+: resolve the Bug 4 mechanism question, tighten the migrate.ts task description to specify exact protocol changes, and add verification that confirms template-formatted output is actually produced (not just that template references exist in files).

## Summary
- Critical: 0
- Important: 3
- Minor: 3
