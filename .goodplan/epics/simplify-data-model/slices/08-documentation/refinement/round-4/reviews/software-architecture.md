# Software Architecture Review — Round 4

## Issues

**[IMPORTANT] Phase 2 Bug A and Bug C: `notes` field is required, not optional**
The plan describes `verificationResultSchema` as `{ index: number, passed: boolean, notes?: string }` in two locations:
- Bug A task: "The full payload schema is: `{ epic: string, verificationResults: Array<{index, passed, notes?}>, ...`"
- Bug C task: "Each verification result must match `verificationResultSchema`: `{ index: number, passed: boolean, notes?: string }`"

However, the actual schema at `src/schemas/entities/epic.ts` line 30-34 defines `notes` as **required**: `notes: z.string().min(1)`. There is no `.optional()` modifier. Payloads constructed with `notes` omitted will fail Zod validation at the CLI boundary (INV-005: schema validation on every write).

Fix: Change both occurrences from `notes?` to `notes` (required). In Bug C, ensure the agent's verification assessment always includes a non-empty `notes` string explaining the assessment rationale. In Bug A, ensure the payload template shows `notes` as required.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-3 issues have been properly addressed. The intermediate status handling in Phase 1 Step 2 now explicitly covers in-progress and terminal statuses with appropriate guidance. The Bug C spawn mechanics clarification correctly identifies that the Step 4 completion-epic agent handles verification assessment without a separate spawn.

The remaining IMPORTANT is a schema accuracy issue -- the plan's description of `verificationResultSchema` contradicts the actual source. This matters because the implementer will follow the plan's schema description and produce payloads that fail validation. The fix is a two-word change (remove both `?` markers and add a note about providing non-empty notes strings).

Everything else is architecturally sound: INV-001 compliance (CLI-mediated mutations), context discipline maintained, module boundaries respected, dependency direction correct (skills depend on CLI, not internals).

## Summary
- Critical: 0
- Important: 1
- Minor: 0
