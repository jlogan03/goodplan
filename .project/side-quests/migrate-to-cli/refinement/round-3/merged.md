# Merged Feedback — Round 3

## Scores
| Reviewer | Score |
|---|---|
| Holistic | 9/10 |
| Software Architecture | 9/10 |
| TypeScript and JavaScript | 9/10 |
| TUI and CLI | 9/10 |
| Agent Skill | 8.5/10 |

## Severity Totals
- Critical: 0
- Important: 5 (after dedup)
- Minor: 10 (after dedup)

---

## IMPORTANT Issues

### I-1. Error codes must be added to specific type unions, not just `errors.ts`
**Sources:** Holistic, Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

`VALIDATION_MIGRATION_INVALID` and `VALIDATION_MIGRATION_CORRECTION_LIMIT` must be added to the `ValidationErrorCode` type union; `DATA_MIGRATION_BACKUP_EXISTS` must be added to the `DataErrorCode` type union. The plan's phrasing "using existing namespaces" is vague — these are static string literal unions that must be explicitly extended. Update Phase 2 task wording to name the exact union each code belongs to.

---

### I-2. `stdinSchemaRegistry` union approach needs clarification
**Sources:** TypeScript and JavaScript, TUI and CLI, Agent Skill
**Resolution:** DIRECTLY_ACTIONABLE

Three reviewers flagged this from different angles. The consensus: registering a discriminated union of all round response types keyed by `round` is architecturally awkward because (a) round count is dynamic, (b) `goodplan schema --command migrate` would expose an opaque union, and (c) the LLM already receives per-question `responseSchema` inline.

**Recommended fix:** Register the base `migrationResponseSchema` (`{ round: z.number(), answers: z.array(migrationAnswerSchema) }`) as a single entry. Add an inline comment: "The union schema is for completeness/discoverability only — the skill uses the `responseSchema` emitted per-question to construct valid payloads."

---

### I-3. `readStdin()` flow needs explicit "no stdin" detection and `rpcMigrate()` signature update
**Sources:** Holistic, Software Architecture, Agent Skill
**Resolution:** DIRECTLY_ACTIONABLE

Multiple reviewers noted overlapping concerns:
1. **No-stdin detection:** Detect "no stdin" by checking `Object.keys(result).length === 0` from `readStdin()`.
2. **Function signature:** `rpcMigrate()` needs a second parameter for the stdin payload (e.g., `rpcMigrate(projectDir: string, stdin: Record<string, unknown> | null)`). The `null` case represents "no stdin."
3. **Stdin injection for tests:** Accept an optional `stdin?: Readable` parameter, passed through to `readStdin(stdin)`, enabling testing answer-submission rounds without piping actual stdin.
4. **Answer-level validation placement:** Validate each answer's `data` against the corresponding round's Zod schema in the round dispatch logic, keyed by `id` matched against the question list for the current round.

---

### I-4. `buildMigrationState()` is non-exported but Phase 6 requires unit testing it
**Sources:** Holistic, Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

Phase 4 says `buildMigrationState()` is "internal (non-exported)." Phase 6 says to unit test it directly. Export it as a named export with `@internal` JSDoc annotation — it remains internal to the `rpc/` module but tests can import it. This matches existing patterns (e.g., `rpcInit` exports from `src/core/rpc/init.ts`).

---

### I-5. Confirmation schema `z.discriminatedUnion` with boolean literals — verify Zod v4 `toJSONSchema()` output
**Sources:** TypeScript and JavaScript, Software Architecture
**Resolution:** RESEARCH_NEEDED

`z.discriminatedUnion("approved", [...])` with `z.literal(true)` / `z.literal(false)` may not produce clean JSON Schema via `z.toJSONSchema()` — JSON Schema would need `oneOf` with `const: true` / `const: false`, which some LLM structured-output parsers handle poorly.

**Research:** Test `z.toJSONSchema()` on this discriminated union with the project's zod@4 dependency. If unreliable, fall back to a single object with `approved: z.boolean()` + `reAnswerIds: z.array(z.string()).optional()` and a `.refine()` for the conditional requirement.

---

## MINOR Issues

### M-1. Schema file location still ambiguous (TBD)
**Sources:** Holistic, Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

Pin to `src/commands/global/migrate/schemas.ts`. Co-locates with the command, avoids polluting shared schema namespace. Matches the plan's own statement "co-located with the migrate command."

---

### M-2. `--force` documentation is misleading
**Source:** Holistic
**Resolution:** DIRECTLY_ACTIONABLE

Replace the current explanation with: "`--force` has no migration-specific behavior — the global flag is handled by `commitState()` as usual. No special handling needed."

---

### M-3. Activity log entry format should reference existing `ActivityLogEntry` schema
**Source:** Holistic
**Resolution:** CODEBASE_EXPLORATION

Phase 4 specifies a migration activity log entry format without referencing how other entries are structured. Add: "follow the existing `ActivityLogEntry` schema shape" and reference its definition location.

---

### M-4. Phase 5 skill reference to `cli-interaction.md` — verify path and scope reference
**Sources:** Holistic, Agent Skill
**Resolution:** CODEBASE_EXPLORATION + DIRECTLY_ACTIONABLE

Two concerns: (a) verify `../_shared/references/cli-interaction.md` path exists (may differ), and (b) scope the reference to Section 10 (Error Handling) specifically, since Section 12 uses "migration" in a different sense.

---

### M-5. `MigrationAnswer<T>` generic — use `z.infer` pattern instead of caller-provided `T`
**Source:** TypeScript and JavaScript
**Resolution:** DIRECTLY_ACTIONABLE

Change to: `function validateAnswer<S extends z.ZodType>(answer: MigrationAnswer, schema: S): MigrationAnswer<z.infer<S>>`. Avoids `as` casts and keeps inference flowing from the schema.

---

### M-6. `MigrationResult` could be a Zod schema for output contract consistency
**Source:** TypeScript and JavaScript
**Resolution:** DIRECTLY_ACTIONABLE

Other outputs are plain objects (consistent), but since `MigrationState` is already a Zod schema, defining `MigrationResult` as one too would enable `goodplan schema --command migrate` to show the output shape. Non-blocking.

---

### M-7. Artifact copy should use allowlist, not blocklist
**Source:** TypeScript and JavaScript
**Resolution:** DIRECTLY_ACTIONABLE

Use an allowlist of known markdown artifact patterns (`*.md` files + specific directories like `architecture/`, `research/`, `brainstorm/`, `prototypes/`, `decisions/`) rather than "copy everything except JSON/JSONL."

---

### M-8. Phase 2 pre-check wording: checks `.project/` vs `project.json`
**Source:** TUI and CLI
**Resolution:** DIRECTLY_ACTIONABLE

The "already migrated" guard should check for `project.json` existence within `.project/`, not `.project/` existence. The expected behavior section is correct but the task wording says "`.project/` must NOT exist" which is wrong. Fix the task wording to match.

---

### M-9. Confirmation round `hint` field — size risk for large projects
**Source:** TUI and CLI
**Resolution:** DIRECTLY_ACTIONABLE

For large projects, the state summary in `hint` could be very large. Note in the `MigrationQuestion` type definition that implementers should consider truncating or paginating for large projects.

---

### M-10. `MigrationState` schema shape diverges between Phase 1 and Phase 3
**Source:** Agent Skill
**Resolution:** DIRECTLY_ACTIONABLE

Phase 1 stores answers by entity type (`inventory`, `epicDetails`). Phase 3 wants answers keyed by question ID. Pick one canonical shape in Phase 1 — either add `answers: Record<string, unknown>` (question-ID-keyed) or explicitly note Phase 3 will evolve the schema.

---

### M-11. Phase 5 skill step flow — partial migration detection
**Source:** Agent Skill
**Resolution:** DIRECTLY_ACTIONABLE

If `.project/` doesn't exist but `.project-old/` does, a previous migration attempt may have failed mid-run. Add a check between Steps 2 and 3: detect this scenario, inform the user, and ask them to rename `.project-old/` back to `.project/` before retrying.

---

### M-12. SKILL.md description should front-load trigger phrases
**Source:** Agent Skill
**Resolution:** DIRECTLY_ACTIONABLE

**Note:** Upgraded from IMPORTANT by the reviewer but reclassified as MINOR here — this is a quality improvement, not a correctness issue.

Lead with natural user phrases and plain-language summary. Move the `DATA_NO_PROJECT` error-condition trigger to the skill body. Keep description under ~200 chars.

---

### M-13. `ZERO_STATE` import path — verify it exists and is exported
**Source:** TUI and CLI
**Resolution:** CODEBASE_EXPLORATION

Phase 4 says "Pass `ZERO_STATE` (from `src/core/tree.ts`) as `oldState`." Verify this constant exists and is exported. If not, Phase 4 needs a task to define and export it.

---

## Contradictions Resolved

1. **`stdinSchemaRegistry` approach** — TypeScript reviewer suggested option (b) (register base schema), TUI reviewer said the approach has "unresolved shape ambiguity," Agent Skill reviewer wanted documented rationale. **Resolution:** All agree the union approach is problematic. Consensus: register the base envelope schema only, document why.

2. **`readStdin()` call site** — Holistic says parse in `rpcMigrate()`, Software Architecture says `readStdin()` is called in the command wrapper and parsed data passed to `rpcMigrate()`. **Resolution:** Software Architecture's analysis matches established patterns — the command reads stdin and passes to the RPC function. Adopt the signature approach (I-3).

3. **Agent Skill rated SKILL.md description as IMPORTANT; other reviewers did not flag it.** **Resolution:** Reclassified as MINOR (M-12) — it affects trigger quality but not correctness.

## Summary Statistics

| Category | Count |
|---|---|
| DIRECTLY_ACTIONABLE | 13 |
| RESEARCH_NEEDED | 1 |
| CODEBASE_EXPLORATION | 3 |
| USER_INPUT needed | 0 |
| Contradictions resolved | 3 |
| Contradictions unresolved | 0 |
