# Merged Review Feedback: Tracer Bullet Plan (Round 2)

**Reviewers:** Holistic (9/10), Software Architecture (9/10), TypeScript (9/10), TUI and CLI (9/10)
**Consensus score:** 9/10
**All 18 round-1 issues verified as fixed by all reviewers.**

---

### CRITICAL Issues

None.

---

### IMPORTANT Issues

**I1. Phase 3 exit code verification uses `2>&1`, cannot distinguish stdout from stderr**
*(Holistic, Architecture)*

Phase 3 Expected Behavior tests `badcommand --json` with `2>&1`, which merges stderr into stdout. Since the architecture requires JSON errors go to stdout (not stderr), the test passes regardless of which stream receives the output. Fix: change to `bun run src/index.ts badcommand --json; echo $?` (no `2>&1`) and explicitly assert stderr is empty.

**I2. Phase 3 citty error codes not enumerated for custom runner's try/catch**
*(Architecture)*

The custom runner wraps `runCommand` in try/catch and "inspects error type/code," but the plan doesn't enumerate which citty error codes map to which exit codes. Needed: `CLIError` with `E_UNKNOWN_COMMAND` -> exit 2, `EARG` -> exit 2, `GoodplanError` -> exit based on error code. Without this, the implementer must reverse-engineer citty's error taxonomy.

**I3. Phase 4 init command: `resolveProjectDir()` vs direct cwd check**
*(Architecture)*

`resolveProjectDir()` walks up the tree. If init uses it to check for existing `.project/`, it might find a parent's `.project/` and incorrectly report `STATE_ALREADY_INITIALIZED` when the user wants to init a nested project. Init should check only `cwd/.project/` via direct `fs.existsSync`, not `resolveProjectDir()`. Make this explicit.

---

### MINOR Issues

**M1. Phase 3 `--help` should specify using citty's `showUsage`**
*(Holistic, TUI/CLI, TypeScript -- 3 reviewers)*

The plan says "handles `--help` rendering manually" but doesn't specify the API. Use citty's `showUsage` for the main command's `--help`. Note that subcommand `--help` (e.g., `goodplan init --help`) is handled automatically by `runCommand` when the subcommand resolves.

**M2. Phase 5 `--query` error handling unspecified**
*(Holistic, TUI/CLI, TypeScript -- 3 reviewers)*

The plan doesn't specify behavior for: (1) invalid jq expression -> exit 2, `VALIDATION_INVALID_QUERY`; (2) empty result -> exit 0, prints `null`; (3) multiple results -> JSON array. Reference commands-api.md or enumerate these behaviors inline so the implementer handles edge cases in this slice.

**M3. Phase 6 verification count and source mismatch**
*(Architecture, TUI/CLI)*

Plan overview says "8 Phase 6 verification checks" but Phase 6 lists 9 (NO_COLOR was added in round 1). Also, Phase 6 says "Run full verification sequence from goal.md" but the list has diverged from goal.md (added "Init duplicate" and NO_COLOR, replaced `--smoke-jq` with `--query`). Fix: update overview to "9 checks" and change "from goal.md" to "per plan verification list."

**M4. Phase 2 `errors.ts` exists in both `src/schemas/` and `src/util/`**
*(Architecture)*

`src/schemas/errors.ts` (Zod error output shape) and `src/util/errors.ts` (runtime `GoodplanError` class) serve different purposes but identical filenames create ambiguity. Options: rename `src/schemas/errors.ts` to `src/schemas/error-output.ts`, or add clear module-level doc comments distinguishing them.

**M5. Phase 4 does not test `--name` default (basename of cwd)**
*(Holistic)*

Phase 4 only tests `init --name test-project`, never tests omitting `--name` to verify the `path.basename(cwd)` default. Add a verification: `cd /tmp/my-test-dir && bun run src/index.ts init && cat .project/project.json` confirms name is `"my-test-dir"`.

---

### DIRECTLY_ACTIONABLE

All 8 issues are directly actionable -- no external research or user decisions required:

1. **I1** -- Remove `2>&1` from Phase 3 `badcommand --json` verification, assert stderr empty
2. **I2** -- Add citty error code -> exit code mapping table to Phase 3 custom runner task
3. **I3** -- Specify that init checks `cwd/.project/` directly (not `resolveProjectDir()`)
4. **I4 (M1)** -- Specify `showUsage` for main command `--help`; note subcommand help is automatic
5. **I5 (M2)** -- Add `--query` error behaviors (invalid expr, empty result, multiple results)
6. **I6 (M3)** -- Fix overview to say "9 checks" and change "from goal.md" to "per plan verification list"
7. **I7 (M4)** -- Rename `src/schemas/errors.ts` to `src/schemas/error-output.ts` or add doc comments
8. **I8 (M5)** -- Add `--name` default verification to Phase 4 Expected Behavior

---

### RESEARCH_NEEDED

None.

---

### Contradictions Resolved

**Phase 4 `--name` default testing:** Holistic flagged as MINOR that the default is untested. TUI/CLI acknowledged the gap but said "acceptable for a tracer bullet -- the default path is straightforward and risks are low." Resolution: kept as MINOR (M5) since it's a one-line verification addition with no cost, but noted it's lowest priority among minors.

---

### Unresolved (USER_INPUT required)

None.
