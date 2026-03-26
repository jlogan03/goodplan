# Agent Skill Reviewer — Round 3

## Issues

**[IMPORTANT]** `readStdin` returns `Record<string, unknown>` — incompatible with `{ round, answers }` envelope

`readStdin()` enforces that stdin JSON must be a plain object (`typeof parsed !== "object" || Array.isArray(...)`), and it returns `Record<string, unknown>`. This works fine for the migration protocol since `{ round, answers }` is an object. However, the plan says "Parse stdin using `readStdin()` as-is... Then parse the returned record through `migrationResponseSchema.safeParse()` directly in `rpcMigrate()`."

This is correct — no problem with the approach itself. But the plan should make explicit that `migrationResponseSchema` wraps the top-level envelope as an object (not a discriminated union at the top level), and that `answers` is a nested array. One subtle issue: the plan defines `MigrationAnswer` as `{ id: string, data: T }` but when the answer arrives via stdin as JSON, `data` is `unknown`. The `validateAnswer<T>` helper must be called on each answer individually after round-dispatch — the plan says this but doesn't specify where answer-level validation happens (in `rpcMigrate()` or in separate round handlers). The implementer may need to infer this. Not a blocker, but could lead to validation logic scattered inconsistently.

Resolution: DIRECTLY_ACTIONABLE

Add a note to Phase 2's stdin handling task: "validate each answer's `data` against the corresponding round's Zod schema in the round dispatch logic, not in a general-purpose validator — answer-level schema is keyed by the `id` field matched against the question list for the current round."

---

**[IMPORTANT]** SKILL.md description field has competing concerns that may dilute trigger accuracy

The proposed description includes trigger phrases: "migrate project, convert project to goodplan, import existing project, set up goodplan from existing .project directory." These are good. But the description also opens with a long functional description ("Migrate a pre-CLI .project/ directory to CLI-managed state. Use when DATA_NO_PROJECT error occurs but old-format .project/ exists."). The `DATA_NO_PROJECT` trigger condition is a reactive/error-driven trigger — the user won't phrase their prompt as "I got DATA_NO_PROJECT." This is valuable internal guidance but may not help triggering. The description must satisfy both: the agent reads it to decide when to trigger AND it must match natural user language.

Recommended fix: front-load the natural user phrases, move the `DATA_NO_PROJECT` condition to the SKILL.md body as an alternate entry-point detection note. This keeps the description concise and trigger-phrase-dense.

Resolution: DIRECTLY_ACTIONABLE

Reorder the description: lead with trigger phrases and plain-language summary, move the error-condition trigger to the skill body (Step 2 already handles this — detecting `STATE_ALREADY_INITIALIZED` and `DATA_NO_PROJECT`). Keep description under ~200 chars.

---

**[IMPORTANT]** `stdinSchemaRegistry` registration for multi-round protocol is architecturally awkward — plan should document the trade-off explicitly

The plan says: "Register a discriminated union of all round response types (keyed by `round` field), since multi-round schemas share the same command entry point." The `stdinSchemaRegistry` maps one schema per command name. A discriminated union keyed by `round` is one approach, but it means `goodplan schema --command migrate --json` will return a union schema that the skill must re-interpret. This is more complex than single-command schemas.

The key issue: `stdinSchemaRegistry[commandName]` is used at runtime in `goodplan schema` to expose the shape to callers. A discriminated union works syntactically, but the LLM consuming `goodplan schema --command migrate --json` will see a union and may have difficulty constructing valid payloads without additional context. The plan should either:
1. Document why the union approach is sufficient (the LLM already knows which round it's on from the CLI's `responseSchema` output), or
2. Consider registering separate keys per round (e.g., `"migrate:round1"`, `"migrate:round2"`) — but this doesn't match how the `schema` command works today.

This isn't blocking but the rationale should be spelled out in the plan to prevent implementers from questioning or undoing it.

Resolution: DIRECTLY_ACTIONABLE

Add an inline comment in Phase 2's `stdinSchemaRegistry` task explaining: "The union schema is for completeness/discoverability only — the skill uses the `responseSchema` emitted per-question to construct valid payloads, not the top-level `schema` command output. The union documents all valid round shapes in one place."

---

**[MINOR]** Phase 5 skill step ordering: Step 2 emits `goodplan migrate --json` before checking for `.project/` presence

The skill plan says Step 2 is "Start migration: Call `goodplan migrate --json`." If the CLI errors with `DATA_NO_PROJECT`, the skill stops. This is correct behavior. But Step 3 says "Read `.project/` filesystem to find epics, quests" — which implies the skill reads the old-format `.project/` BEFORE answering questions. The problem: if `.project/` has already been renamed to `.project-old/` from a previous partial attempt (e.g., `commitState` failed mid-run), Step 3's filesystem scan will fail silently because `.project/` no longer exists. The skill needs to check for this scenario explicitly. The plan mentions the error path for `.project-old/` existing but it's only in the error handling section — it should be surfaced in the step-by-step flow as a detection point.

Resolution: DIRECTLY_ACTIONABLE

Add a check at the start of Step 3 (or between Steps 2 and 3): "If `.project/` does not exist but `.project-old/` does, inform the user that a previous migration attempt renamed the directory but may have failed during state construction. Ask them to rename `.project-old/` back to `.project/` manually, then retry."

---

**[MINOR]** Phase 1 — `MigrationState` Zod schema includes `correctionRound` but Phase 3 updates it to track more state — potential schema divergence

Phase 1 defines `migrationStateSchema` with `correctionRound: number`. Phase 3 says "Update `.migration-in-progress.json` schema to track: Current round number and type (inventory, epic-details, confirmation, correction), All accumulated answers keyed by question ID." The `MigrationState` schema in Phase 1 doesn't include `type` (round type enum) or accumulated answers by question ID — it only shows `epicDetails: Record<string, EpicDetailResponse>`. Phase 3 implicitly expands the schema definition from Phase 1 without updating it.

The Phase 1 schema shape (`{ status, round, inventory, epicDetails, correctionRound }`) stores answers by entity type rather than by question ID. Phase 3 wants answers keyed by question ID. These are different storage shapes and will require one to change. An implementer starting with Phase 1's schema as written may produce code that Phase 3 then refactors — creating unnecessary churn.

Resolution: DIRECTLY_ACTIONABLE

Reconcile in Phase 1: either add a `answers: Record<string, unknown>` field to `migrationStateSchema` (question-ID-keyed accumulation, which simplifies the correction round) and drop the typed `inventory`/`epicDetails` fields in favor of the generic bag, or explicitly note that Phase 3 will evolve the schema and warn that the Phase 1 schema is preliminary. Pick one canonical shape and define it fully in Phase 1.

---

**[MINOR]** Phase 5 — Skill references `../_shared/references/cli-interaction.md` but Section 12 ("Migration Example") in that file documents a *different* migration concept (pre-CLI skill → CLI-based state access), which may confuse the skill implementer

The `cli-interaction.md` file has "Section 12: Migration Example" which is about migrating *skills* from direct file access to CLI commands — not about the `goodplan migrate` command for `.project/` format migration. The migrate skill's reference to `cli-interaction.md` "for error handling patterns" is correct (Section 10), but the same file's Section 12 uses the word "migration" in a completely different sense. The SKILL.md should note which sections it references to avoid this ambiguity.

Resolution: DIRECTLY_ACTIONABLE

In the Phase 5 skill reference task, note that `cli-interaction.md` is referenced specifically for Section 10 (Error Handling), not Section 12. Add a comment in SKILL.md like: "See `../_shared/references/cli-interaction.md` §10 for error handling patterns" to scope the reference precisely.

---

**[MINOR]** Phase 6 verification uses `rpcMigrate()` directly but the function signature needs to handle stdin in tests — plan does not specify how

Phase 6 says "Call migrate command (Round 1) — get inventory questions" and "Submit answers — get follow-up questions" via `rpcMigrate()`. But `rpcMigrate()` reads stdin via `readStdin()` internally (per Phase 2). In test context, `process.stdin` is a TTY, so `readStdin()` would return `{}` — meaning answer submission can't be tested via direct `rpcMigrate()` calls without a stdin injection mechanism.

The plan mentions "rpcMigrate() should accept a `projectDir` argument (like rpcInit())" but doesn't address stdin injection. Either `rpcMigrate()` needs to accept an optional stdin override (a `stream` parameter passed to `readStdin()`), or tests need to construct the `MigrationResponse` object and call an internal function that bypasses stdin. `readStdin()` already accepts an optional `stream` parameter — the plan should specify that `rpcMigrate()` also accepts an optional `stream` parameter for testing.

Resolution: DIRECTLY_ACTIONABLE

Add to Phase 2's `rpcMigrate()` signature task: "Accept an optional `stdin?: Readable` parameter, passed through to `readStdin(stdin)` — this enables testing answer-submission rounds without piping actual stdin."

## Score: 8.5/10

The plan is mature and well-specified. Prior rounds addressed the most critical structural issues (trigger phrases, prefix mutual exclusivity, real-repo verification, relative paths). Remaining issues are: two IMPORTANT-level gaps (answer-level validation placement clarity; stdinSchemaRegistry rationale), three MINOR-level (partial-migration detection in skill step flow; MigrationState schema shape divergence between phases 1 and 3; stdin injection for testing). None block implementation — they create implementer ambiguity or maintenance risk. To reach 9+: resolve the MigrationState schema shape inconsistency between Phase 1 and Phase 3 (pick one canonical shape), and add the stdin override parameter to `rpcMigrate()` for test-ability.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
