# Show/Status Enrichment & Spec Alignment

## What We're Building

Ergonomic CLI enrichments that make skill migration cleaner, plus result type spec alignment. Enriched `show --json` gives skills a quick way to check workflow phase via an `artifacts` field. Enriched `status --json` adds file listings to artifact counts. Result types are updated to include `paths?` fields per the architecture spec (`context?` already exists on `CompleteResult`). Semver compatibility checking ensures skills and CLI stay version-aligned.

Internal sequencing: enrichments first (`show --json` artifacts, `status --json` file arrays), then result type `paths?` fields, then semver checking. Verification exercises enrichments as a skill would — running the exact command sequences the convention doc prescribes.

## Behavior

1. `epic:show --json`, `slice:show --json`, `quest:show --json` include an `artifacts` object with boolean flags indicating which workflow artifacts exist (plan, planRefined, implementation, etc.)
2. `status --json` upgrades `artifacts` fields from simple counts to `{ count: number, files: string[] }` for architecture, research, brainstorm, and prototypes
3. Semver compatibility checking is a Commands-layer concern in the main dispatch path (e.g., `src/commands/main.ts` or `global-args.ts`). It reads `project.json.version` via `loadState()` — a legitimate Commands-to-Data-Layer read path. Warns on minor mismatch, errors on major mismatch.
4. `BeginResult` and `SubmitResult` gain optional `paths?` fields per the architecture spec. (`context?` already exists on `CompleteResult`; no change needed there.)
   - `BeginResult.paths`: filesystem paths the skill should write to (e.g., `slice:plan` → `{ plan: "<abs-path-to-plan.md>" }`, `epic:explore` → `{ research: "<abs-path-to-research-dir>" }`)
   - `SubmitResult.paths`: paths created or finalized by the submission (e.g., `submit-plan` → `{ plan: "<abs-path-to-plan.md>" }`, `submit-implementation` → `{ implementation: "<abs-path-to-impl-dir>" }`)
   - Exact per-command mappings are defined in `cli-changes.md` § Result Type Fields; this slice implements that spec

## Success Criteria

- [ ] `goodplan slice:show --slice 01-data-layer --json` — response includes `artifacts: { plan: true, planRefined: true, ... }`
- [ ] `goodplan epic:show --epic goodplan-cli --json` — response includes `artifacts: { exploreComplete: true, ... }`
- [ ] `goodplan status --json` — `artifacts.architecture` is `{ count: N, files: [...] }` not just a number
- [ ] `goodplan status --json` — `artifacts.research` includes file listings
- [ ] Version compatibility: with a CLI at 1.0.0 and project.json at 1.0.0, no warnings. With CLI 1.0.0 and project 1.1.0, prints minor version warning to stderr
- [ ] Version compatibility: with CLI 1.0.0 and project 2.0.0, exits with non-zero exit code and `VERSION_MAJOR_MISMATCH` error to stderr
- [ ] `BeginResult` from `slice:plan --json` includes `paths` field with filesystem paths
- [ ] `SubmitResult` from `submit-plan --json` includes `paths` field
- [ ] Existing integration tests continue to pass
- [ ] Enrichments exercised using convention-doc-prescribed command sequences (as a skill would)

## Verification

Run against the goodplan repo:

1. **Show enrichment**: Run `goodplan slice:show --slice 01-data-layer --json | jq '.artifacts'` and verify boolean flags match actual file existence. Check a slice without a plan (if any) shows `plan: false`.

2. **Status enrichment**: Run `goodplan status --json | jq '.artifacts.architecture'` and verify `count` matches the number of files and `files` array lists them.

3. **Version compat**: Use an integration test with a temp directory where `project.json.version` differs from CLI version. Verify warning on minor mismatch, error on major mismatch.

4. **Result fields**: Test `paths` across multiple command types to confirm the mapping is general, not hardcoded for one command:
   - Run `goodplan slice:plan --slice <test-slice> --json` and verify `BeginResult.paths` contains a `plan` key with an absolute path.
   - Run `goodplan epic:explore --epic <test-epic> --json` and verify `BeginResult.paths` contains a `research` key with an absolute path.
   - Run `goodplan slice:implement --slice <test-slice> --json` and verify `BeginResult.paths` contains an `implementation` key with an absolute path.

5. **Regression**: Run `bun test` — all existing tests pass.

## Scope Boundaries

**In scope:**
- `show --json` artifacts enrichment for all entity types
- `status --json` file array enrichment
- Semver compatibility checking as a Commands-layer concern in main dispatch path
- Implement `paths?` field on `BeginResult` and `SubmitResult` (per architecture spec)
- Update convention doc if enrichments change usage patterns

**Out of scope:**
- New CLI commands beyond enrichments
- `goodplan migrate` (deferred to future epic)
- Skill migrations (slices 03-05)
