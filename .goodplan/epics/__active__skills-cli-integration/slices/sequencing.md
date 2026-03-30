# Slice Sequencing

## Rationale

Convention-doc-first with a tracer bullet: slice 01 implements the keystone CLI command, writes the convention doc, and migrates the simplest skill (project-status) to validate the end-to-end integration pattern. Remaining CLI enrichments land in slice 02. Core skills that exercise the broadest interaction range (create-epic, complete) validate in slice 03. Mechanical rollout splits by skill domain: architecture/exploration skills (04), then planning/execution skills (05). Dogfooding (06) uses the complete suite on a real workflow cycle to surface remaining gaps.

## Slices

| NN | Name | Description | Dependencies | Rationale |
|----|------|-------------|--------------|-----------|
| 01 | state-command-convention-doc-tracer | Implement `goodplan state --json --query`, `--version --json`, write convention doc, migrate project-status skill | None | Tracer bullet: proves CLI-to-skill integration end-to-end with the simplest read-only skill |
| 02 | show-status-enrichment | Enrich `show --json` with artifacts, `status --json` with file arrays, implement `paths?` result type fields, semver compatibility checking | 01 | Ergonomic enrichments and spec alignment before core skill migration |
| 03 | core-skill-validation | Migrate create-epic and complete skills to use CLI per convention doc | 02 | Validates creation and completion flows — the broadest interaction range. Surfaces convention doc gaps before mechanical rollout |
| 04 | exploration-architecture-skills | Migrate explore, create-architecture, refine-architecture, audit-architecture, start-epic (5 skills) | 03 | Epic lifecycle phase skills. Patterns established by slice 03 |
| 05 | planning-execution-skills | Migrate create-slices, refine-slices, create-plan, refine-plan, implement-plan, migrate (6 skills) | 04 | Slice/quest lifecycle skills. Sequential after 04 so convention doc updates from 04 inform 05. Parallelization candidate: if slice 03 exit state shows a stable convention doc with minimal updates from 04, slices 04+05 could run in parallel |
| 06 | dogfooding | Run full updated skill suite on a real workflow cycle, surface and fix gaps, update convention doc | 05 | Only real usage reveals ergonomic gaps. Exercises the "CLI conforms to skills" constraint |
