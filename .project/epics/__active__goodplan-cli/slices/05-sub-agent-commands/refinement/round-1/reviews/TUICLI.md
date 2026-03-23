## Issues

**[IMPORTANT]** Phase 3: quest:create uses stdin for name+goal but architecture shows no stdin for quest:create

The plan says `quest:create` reads stdin JSON `{name, goal}` and has no flags beyond global args. The architecture `commands-api.md` confirms `quest:create` takes stdin `{ "name": "...", "goal": "..." }`. However, the plan also says "No `--epic` flag (quests are project-scoped)" but never mentions whether the `--quest` flag is accepted (and ignored) for consistency. More importantly, `slice:create` requires `--epic` as a required flag for target identification per INV-004, but `quest:create` has no target flag at all since the quest name comes from stdin. This is fine architecturally (the entity doesn't exist yet), but the help text should make it clear that the quest name is provided via stdin, not a flag -- this deviates from the `--quest` pattern used by all other quest commands and could confuse users. The plan's description text for `quest:create` is sufficient but should explicitly call out that this is a creation command (name from stdin, not flag) in the help text, matching the `slice:create` pattern where the name also comes from stdin.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5: `--inline` flag parsing strategy not defined as a shared utility

Phase 5 describes parsing `--inline` in each of the 8 `start-*` commands: "citty parses as string; `"true"` -> default budget (20480), numeric string -> custom budget, absent -> no inlining (references only)." This parsing logic is repeated across all 8 commands. The plan should specify extracting this to a shared utility (e.g., `parseInlineBudget(args.inline)` in a shared module or in `global-args.ts`), matching the existing pattern where `globalArgs` centralizes shared flag definitions. Without this, there will be 8 copies of the same coercion logic, which is a maintenance burden and a source of inconsistency bugs. The `commands-api.md` spec mentions `--inline` as a "Common Workflow Flag" but the plan doesn't create a shared parser.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5: `start-*` commands directory placement inconsistent with plan description

Phase 5 says "Create `src/commands/subagent/start-plan.ts`" -- placing start commands in the `subagent/` directory alongside `submit-*` commands. This is good and matches the existing convention. However, Phase 5's final task says "Update `.project/conventions.md` repo structure: add `src/commands/quest/`, `src/commands/subagent/start-*`". The plan should be explicit that ALL 8 start commands go in `src/commands/subagent/` to match the existing `submit-*` pattern. The individual task items do say `src/commands/subagent/`, so this is consistent, but the overview says "8 `start-*` CLI commands" and the phase description should confirm the directory. Minor consistency point, but worth nailing down since the codebase exploration shows the `subagent/` directory is already established.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3: quest:show human-readable output should account for missing `epic` field

The plan says `quest:show` returns the full `quest.json`. Looking at `slice:show`, the human-readable output includes `(epic: ${slice.epic})`. Since quests have no `epic` field, the quest:show human-readable formatting should not attempt to display an epic. The plan doesn't specify the human-readable format for quest:show -- it only says "Returns full `quest.json`". The implementer should follow the slice:show pattern but omit the epic line and the `deferred` line (quests have neither field). The plan should specify the human-readable output format to avoid implementer guesswork.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3: quest:list human-readable output format unspecified

Similar to quest:show, the plan says quest:list "Returns `{ items: [...] }`" but doesn't specify the human-readable format. Looking at slice:list, it shows `name  status  (epic: ...)  (completed ...)`. Quest list items won't have an `epic` field. The plan should note the human-readable format explicitly, even if it's "follow slice:list pattern, omit epic".

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5: start-* commands don't specify human-readable output mode

The plan specifies that `start-*` commands return `ContextBundle` JSON, but doesn't address what happens when `--json` is not passed (human-readable mode). Since these are sub-agent commands (primarily consumed by LLMs), human-readable mode is less critical, but the existing `submit-*` commands do have human-readable output. The plan should specify: either (a) `start-*` always output JSON (ignore --json flag), or (b) human-readable mode shows a summary like "Context for plan phase: 3 files inlined (12KB), 5 references, 2 decisions, 1 learning". Without this, the implementer will either omit human-readable or improvise inconsistently.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5: E2E verification step 4 references `--inline` without `--json`

Step 4 says: `goodplan start-plan --slice 01-auth --inline --json` -> "verify ContextBundle has `inline` map...". This is correct. But step 6 says: `goodplan start-plan --slice 01-auth --json` (no --inline) -> "verify `inline` is empty". The ContextBundle type has `inline: Record<string, string>` -- when no `--inline` flag is passed, should `inline` be `{}` (empty object) or should the field be absent? The plan says "absent -> no inlining (references only)" but ContextBundle always has the `inline` field. The plan should clarify: without `--inline`, is `inline` always `{}` and all content goes to `references`? This is the natural interpretation but worth making explicit.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4: budget.test.ts "single large entry exceeds budget -> still inlined" needs clarification

The plan says "single large entry exceeds budget -> still inlined (first entry always included)". This is a good design decision (guarantees at least one entry is always inlined so the sub-agent gets something), but it should be documented in the `applyBudget` function's JSDoc, not just in the test description. The plan should note this as a contract: "The first priority entry is always inlined regardless of budget."

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured and closely follows established codebase patterns. The quest lifecycle commands mirror the proven slice pattern, and the `start-*` commands logically extend the existing `submit-*` pattern in the `subagent/` directory. The main gaps are: (1) no shared `--inline` parsing utility despite 8 commands needing the same coercion logic, (2) missing human-readable output specifications for several commands (quest:list, quest:show, start-*), and (3) minor ambiguities around the `--inline` absent case for ContextBundle. Addressing the shared `--inline` parser and specifying human-readable formats would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 5
