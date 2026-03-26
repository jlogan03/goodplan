# Epic Completion Learnings — skills-cli-integration

## Convention-doc-first enables consistent cross-skill migration

Writing `cli-interaction.md` as the shared reference before migrating any skills meant every subsequent slice (03-06) coded against the same contract. Cross-slice inconsistencies (stdin conventions, error handling, path resolution) were caught by comparing against the convention doc. This approach should be used for any epic that changes a cross-cutting concern.

## The 4-layer architecture absorbed all changes without boundary modifications

Across 6 slices adding sub-agent commands, enriched show/status, --force recovery, and context bundling, the Commands → RPC → State Machine → Data Layer stack never needed structural changes. The pure reducer pattern (INV-003) made every new event handler trivially testable. The architecture investment from the first epic paid off as compound interest throughout this one.

## Pre-CLI filesystem conventions create persistent friction when overlaid with CLI

`~~archived~~` directory renaming, `__active__` prefix management, direct `state.md` writes, and `activity-log.jsonl` appends all predated the CLI. Each created friction during dogfooding: path resolution failures, concurrent modification, state divergence. The migration path is to retire pre-CLI conventions entirely, not accommodate them — the `~~archived~~` removal validated this approach.

## Automated end-to-end validation via Agent SDK is the highest-leverage testing investment

The dogfooding harness ($52 per full run with Opus) found 7 bugs that static analysis and unit tests missed: hardcoded paths, missing entity registration, incompatible naming conventions, env inheritance, submit reliability. These are integration-level issues that only surface when skills actually run CLI commands. The harness should be a standard part of the release process.

## Skill prompt changes don't need formal review cycles — grep + smoke test is sufficient

Slices 03-05 migrated 15 skills by replacing direct file access patterns with CLI commands. Every skill passed on first review iteration. Formal sub-agent review cycles add value for code changes but are overhead for prompt-level structural replacements. The cross-skill grep (Phase 5 of dogfooding) catches more issues than per-skill reviews.
