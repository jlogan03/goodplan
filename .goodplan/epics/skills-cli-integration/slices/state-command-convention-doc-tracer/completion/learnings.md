# Learnings: State Command, Convention Doc & Tracer Bullet

## Pure transformations on state tree types belong in src/core/, not src/core/data/
_Source: 01-state-command-convention-doc-tracer_

`serializeStateTree` is a pure transformation with no I/O but was placed in the Data Layer (`src/core/data/serialize.ts`). Software Architecture reviewer flagged this — the Data Layer should focus on entity CRUD and filesystem I/O. Future pure transformations on state tree types should go in `src/core/` to keep the Data Layer boundary clean.

## Commands bypassing output() need a 3-item checklist: errors, quiet, exit codes
_Source: 01-state-command-convention-doc-tracer_

The always-JSON `state` command bypasses `output()` and initially missed error formatting (non-GoodplanErrors fell through to human-readable stderr), `--quiet` suppression (not inherited), and exit code handling (reimplemented inline instead of importing `exitCodeForError()`). Any future always-JSON command should verify these three concerns explicitly.

## citty string-type flags consume the next token as their value
_Source: 01-state-command-convention-doc-tracer_

`--inline --query X` causes citty to parse `--query` as inline's string value, leaving X as a positional argument. Convention doc examples use correct flag ordering (`--query ... --inline`). Future flag designs should prefer boolean type when the value isn't needed, or document the ordering constraint.

## jqjs negative indexing works — prefer it over flag-based workarounds
_Source: 01-state-command-convention-doc-tracer_

The plan's `--offset`/`--limit` fallback for "last N entries" was unimplementable without a prior count query. Refinement caught this. jqjs `.[-5:]` works reliably. Plans should prefer jq-native solutions over flag-based workarounds for array slicing.

## Convention docs must verify every CLI command exists before inclusion
_Source: 01-state-command-convention-doc-tracer_

The architecture source included `start-complete` (non-existent command) which would have caused skill failures if transcribed into the convention doc uncritically. Both plan refinement and implementation review caught this. Convention docs referencing CLI commands must verify each command against `goodplan schema --json` or `src/commands/main.ts`.
