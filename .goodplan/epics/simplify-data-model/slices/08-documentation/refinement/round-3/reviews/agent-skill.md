# Agent Skill Review — Round 3

## Issues

**[IMPORTANT] Phase 1 start-epic rewrite: `learningInputSchema` field mismatch in plan description**
The plan's Phase 2 Bug A describes the `learningInputSchema` as having fields `{ category, summary, detail, tags, rollupTo, validUntil }` — which is correct per `src/schemas/records/learning.ts`. However, the Phase 1 rewrite of start-epic does not involve learnings at all, so this is fine for Phase 1. But the Bug A task description says `validUntil` is `string[]` while the actual schema uses `z.array(z.string()).optional()` — the plan correctly marks it optional with `?`. No real issue here on closer inspection. Withdrawing.

**[IMPORTANT] Phase 2 Bug C: verification criteria source is unclear**
Bug C says "the existing completion-epic agent reads the epic's verification criteria (from `gp epic:show --json`) and independently assesses whether each criterion is met." However, the `epic:complete` CLI schema (`completeEpicInputSchema`) requires `verificationResults` as a non-empty array of `verificationResultSchema` objects. The plan doesn't specify the shape of `verificationResultSchema` (which has `index: number, passed: boolean, notes?: string`). The implementer needs to know this shape to construct the payload correctly. The plan should reference the actual schema: `{ index: number, passed: boolean, notes?: string }`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3: `/complete\b` word boundary won't work in basic grep**
The Before/After verification patterns use `\b` word boundary (e.g., `/complete\b`), but basic `grep` does not support `\b` — only `grep -P` (Perl regex) or `grep -E` with `\b` on some systems. macOS `grep` does not support `-P`. The plan should use a POSIX-compatible pattern instead, such as `/complete$` (end of field in the table) or `/complete ` (followed by space). The plan's Phase 3 Verification section correctly uses POSIX patterns (`/complete\b` is in the Before/After expected behavior, not the verification commands), but the Before/After sections are also meant to be runnable checks. Either switch to `grep -E` with `[^d]` suffix pattern or note that Before/After checks use extended regex.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 Step 2 status handling could reference `nextCommands` from CLI**
The plan's Step 2 (Pre-activation Check) lists specific status-to-message mappings for `created`, `explored`, `slices-defined`, etc. The `gp epic:show --json` output includes a `nextCommands` field that provides exactly this guidance. The plan already mentions using `nextCommands` for the catch-all "Any other status" case, but could simplify the explicit mappings by always consulting `nextCommands` first and only falling back to hardcoded messages when the field is absent. This would make the skill more resilient to future status additions. Not blocking — the current approach works.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 Bug B: goal synthesis instruction could be more precise**
The plan says to synthesize the `goal` value from "the recommendation's `description` + `scope` fields." The completion-epic agent's return schema (Step 4e) defines recommendations as `{ type, description, scope?, priority }`. Since `scope` is on side-quest recommendations (not all types), the plan should clarify that `scope` comes from the recommendation object's `scope` field (which is `"small"|"medium"|"large"` for side quests), and the goal synthesis should read more like: "Follow up: {description}. Estimated scope: {scope}." or just "{description}" if scope is not present. The current plan text is adequate but could be slightly clearer.
Resolution: DIRECTLY_ACTIONABLE

No issues found.

Actually, let me correct — there are issues above. Let me restructure.

## Issues

**[IMPORTANT] Phase 2 Bug C: `verificationResultSchema` shape not specified**
The plan instructs the implementer to construct `verificationResults` for the `epic:complete` payload but never specifies the required object shape. The actual schema (from `src/schemas/entities/epic.ts` via `completeEpicInputSchema`) is `{ index: number, passed: boolean, notes?: string }`. Without this, the implementer must reverse-engineer the schema from source code. Add the shape to the Bug C task description where it says "returning its assessments as part of its structured output."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3: `\b` word boundary in grep patterns is not portable on macOS**
The Before/After expected behavior sections use `\b` in grep patterns (e.g., `/complete\b`, `/explore\b`, `/create-plan\b`, `/refine-plan\b`). macOS ships with BSD grep which does not support `\b` without `-E` or `-P` flags, and `-P` is not available on macOS. The verification section at the bottom of Phase 3 also uses `\b`. Replace `\b` with POSIX-compatible alternatives: `/complete[^d]` or `'/complete '` (with trailing space or end-of-line anchor). Alternatively, add `grep -E` flag consistently.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 Step 2: hardcoded status messages could use CLI `nextCommands`**
The start-epic rewrite lists explicit per-status error messages with hardcoded skill recommendations. The CLI's `epic:show --json` already provides `nextCommands` for each status. Consulting `nextCommands` first (falling back to hardcoded messages) would make the skill resilient to future status additions without skill updates.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 Bug B: `scope` field semantics could be clearer**
The plan says to synthesize the quest goal from "description + scope fields" but `scope` in the recommendation schema is `"small"|"medium"|"large"` — a size estimate, not a scope description. The goal synthesis example `"Follow up: {description}. Scope: {scope}"` would produce "Scope: small" which reads oddly. Consider using "Estimated effort: {scope}" or just omitting the size from the goal string (it's metadata, not part of the goal statement).
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
The plan is thorough, well-sequenced, and implementation-ready after two rounds of refinement. The remaining issues are minor precision gaps — the IMPORTANT items are about implementer clarity (schema shape, grep portability) rather than correctness of approach. The skill workflow design, triggering accuracy, reference organization, and verification approach are all sound. Phase 1's rewrite structure follows the established CLI-first pattern correctly. Phase 2's bug fixes are well-scoped. Phase 3's systematic sweep has precise file targeting. The E2E gate in Phase 5 is the right completion criterion.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
