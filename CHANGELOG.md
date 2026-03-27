# Changelog

## Unreleased

### Breaking Changes

- **`learning:list --json` output format**: Entries now include a `file` field (scope-relative path to the learning's `.md` file, e.g., `learnings/schema-changes-are-load-bearing.md`) instead of an inline `detail` field. This reflects the migration from monolithic `learnings.md` to per-learning files in `learnings/` directories. Human-readable output (`learning:list` without `--json`) is unchanged. Accepted as a pre-1.0 breaking change.
