# Epic Learnings — plugin-distribution

## Claude Code plugin contracts are discovered empirically, not from docs
_Source: plugin-distribution (cross-slice: 02, 04, 06, 07)_

Four separate plugin behaviors were discovered through live testing rather than documentation: (1) hooks auto-discovery makes manifest declaration cause duplicates, (2) auto-namespacing uses plugin.json name not skill name, (3) `${CLAUDE_PLUGIN_ROOT}` substitution only works in skill/hook contexts not root CLAUDE.md, (4) manifest paths require `./` prefix. Future epics that integrate with Claude Code should budget a dedicated exploration/testing slice early for contract discovery.

## Build-time text manipulation in shell scripts needs portability testing
_Source: plugin-distribution (cross-slice: 01, 04, 06)_

Three slices hit macOS/Linux portability issues: BSD sed vs GNU sed syntax, `realpath` failing on nonexistent paths, and subshell variable evaporation under `set -euo pipefail`. The fix pattern was consistent: use `awk` instead of `sed`, `python3` instead of `realpath`, and single-invocation interpreters instead of multi-command pipelines. Future shell scripts in the build pipeline should be tested on the CI runner (macOS) before merging.

## Plugin naming has three independent dimensions
_Source: plugin-distribution (cross-slice: 06, 07)_

A Claude Code plugin has three names that can differ: (1) marketplace entry name (how users discover it), (2) plugin.json name (the brand shown in `/plugin` UI), (3) skill `name:` field prefix (the invocation shorthand). These are independent — `goodplan` for marketplace/UI, `gp:` for skill invocations. Conflating them caused multiple rework cycles. Future plugin work should explicitly document all three name dimensions upfront.

## HMAC key mismatch between dev and CI creates friction
_Source: plugin-distribution (cross-slice: 03, 07)_

The dev HMAC key (hardcoded fallback) differs from the CI key (secret). This means the plugin binary can't read state written by the local dev binary and vice versa. This is by design (tamper detection), but creates friction when testing the plugin against a dev repo's `.goodplan/` state. The `gp verify --fix` command exists for this, but the mismatch surprised us during epic completion.

## The top-level architecture doc drifted significantly during a 7-slice epic
_Source: plugin-distribution (reconciliation observation)_

The top-level `_overview.md` still references `.project/` (renamed to `.goodplan/` in slice 01), doesn't mention the Plugin subsystem, nextCommands, or HMAC signatures. Per-slice completion updated individual API docs (rpc-layer-api, commands-api) but not the overview. Future epics should include a "sync overview" task in the final slice to prevent this drift.
