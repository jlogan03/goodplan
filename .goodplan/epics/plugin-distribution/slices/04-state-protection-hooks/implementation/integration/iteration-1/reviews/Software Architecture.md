## Issues

**[MINOR] protect-state.sh does not block writes to `.goodplan/goodplan.json` itself when path has no trailing subpath**

The current path check uses `resolved.startswith(prefix)` where `prefix` ends with `os.sep`. This correctly matches `$CWD/.goodplan/foo.json` but also correctly matches `$CWD/.goodplan/epics/x/epic.json`. Testing confirms all expected paths are caught. No issue here on closer inspection -- the `os.sep` suffix prevents matching paths like `$CWD/.goodplan-other/foo.json`. This is well-designed.

*Retracted -- confirmed working correctly via test.*

**[MINOR] `protect-state.sh` does not use `os.path.realpath()` to resolve symlinks
Description: The script uses `os.path.normpath()` which resolves `..` segments but does not follow symlinks. If a symlink exists within the project that points into `.goodplan/`, a write through that symlink would bypass protection. However, this is an extremely unlikely scenario in practice (symlinks into `.goodplan/` would be unusual), and the hook is a best-effort defense layer, not a security boundary. The architecture doc explicitly states HMAC is the integrity mechanism.
File: plugin-hooks/protect-state.sh:25
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `warn-bash-state.sh` substring match is coarse -- triggers on read-only commands
Description: The check `'.goodplan/' in cmd` fires on any Bash command that merely reads `.goodplan/` files (e.g., `cat .goodplan/architecture/_overview.md`). The `additionalContext` message says "direct reads are fine" which partially mitigates this, but it adds noise to every legitimate read. Since this is advisory (exit 0) and the message is well-worded, the impact is low. A more targeted approach (matching write-like patterns: `>`, `>>`, `tee`, `mv`, `cp`, `rm`, `sed -i`) would reduce false positives but add complexity. Current approach is reasonable for v1.
File: plugin-hooks/warn-bash-state.sh:22
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Strong implementation with clean architectural boundaries. The hook scripts are correctly positioned outside the 4-layer stack as packaging/enforcement infrastructure. Key strengths:

- **Module boundaries are clean**: hooks live in `plugin-hooks/` (source) and get copied to `dist/gp-plugin/hooks/` (built), clearly separated from the CLI codebase. They have no dependency on CLI internals.
- **Dependency direction is correct**: hooks depend only on the Claude Code hook contract (stdin JSON, exit codes). The CLI has zero awareness of hooks. This is the right direction -- enforcement at the edge, not in the core.
- **Single-invocation python3 pattern** avoids the subshell variable-evaporation pitfall documented in the research. Good application of a learned lesson.
- **Graceful degradation** (exit 0 on python3 missing, exit 0 on python3 failure via `set -e`) is the correct fail-open posture for a defense-in-depth layer where HMAC is the primary integrity mechanism.
- **`.goodplan-dev` sentinel** cleanly separates dev-repo behavior from user-repo behavior, aligning with the "Three Separate Things" rule in CLAUDE.md.
- **Build integration** is minimal and correct: copy files, validate JSON, check executability. No over-engineering.
- **Architecture docs updated in sync** with implementation -- the `plugin-api.md` logic blocks now match the actual scripts.

The two MINOR items are genuine but do not affect correctness or architectural integrity. The symlink issue is a theoretical edge case in a defense-in-depth layer. The bash warning noise is an acceptable v1 trade-off.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
