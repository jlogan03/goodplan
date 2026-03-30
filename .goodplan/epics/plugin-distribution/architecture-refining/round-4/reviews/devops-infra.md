# DevOps & Infra Review — Round 4

**Reviewer:** devops-infra
**Score:** 8/10
**Critical:** 0 | **Important:** 3 | **Minor:** 3

---

## Important Issues

### IMP-1: No `dist/` in `.gitignore`

The build pipeline produces `dist/gp-plugin/`. The current `.gitignore` has no `dist/` entry. Without it, developers will accidentally commit build artifacts to the main branch. The `goodplan` binary is ignored but `dist/` is not.

**File:** `.gitignore`
**Recommendation:** Add `dist/` to `.gitignore`. Also add `.goodplan-dev` since that sentinel is described as "must be gitignored" in conventions.md.

---

### IMP-2: CI workflow concurrency key needs scope

The architecture mentions using GitHub Actions `concurrency` key to prevent parallel release jobs from racing, but does not specify the concurrency group or cancel-in-progress behavior. If two tags are pushed in quick succession, the desired behavior (queue vs cancel the older one) is unspecified.

**File:** `plugin-api.md` (CI/CD Pipeline section)
**Recommendation:** Specify the concurrency group (e.g., `release-pipeline`) and state `cancel-in-progress: false` so that releases are serialized, not cancelled. A cancelled mid-release could leave the `release` branch in a partial state.

---

### IMP-3: No artifact retention or release asset strategy

The CI pipeline builds, validates, and force-pushes to the release branch, but there is no mention of:
- Uploading the built plugin as a GitHub Release asset (attached to the tag)
- Any artifact retention for debugging failed releases

If a release breaks and you need to inspect the built artifact, there is no stored copy beyond the force-pushed release branch content. Tags on the release branch help with rollback, but having the actual build artifact attached to the GitHub Release provides an independent audit trail.

**File:** `plugin-api.md` (CI/CD Pipeline section)
**Recommendation:** Add a step to upload `dist/gp-plugin/` as a GitHub Release asset on the version tag. This is lightweight and provides artifact traceability without changing the distribution model.

---

## Minor Issues

### MIN-1: Hook script `read` with multiple variables is fragile

The hook scripts use `read -r FILE_PATH CWD` (or `read -r CWD COMMAND`) to split python3 output by whitespace. If any path contains spaces, the split breaks. The `tool_input.command` field will almost always contain spaces.

**File:** `plugin-api.md` (Hook Scripts section)
**Recommendation:** Use newline-delimited output from python3 and `read` each variable on a separate line, or use separate python3 calls. Example:
```bash
FILE_PATH=$(python3 -c "..." <<< "$INPUT")
CWD=$(python3 -c "..." <<< "$INPUT")
```
Or use a single python3 call that outputs newline-separated values and read them with `IFS=$'\n' read -r -d '' VAR1 VAR2`.

---

### MIN-2: `claude plugin validate` availability is uncertain in CI

Step 5 says to install `claude` CLI in CI or "skip gracefully with structural fallback checks if unavailable." The fallback checks are not specified. Without a concrete fallback, skipping validation silently defeats the purpose of the step.

**File:** `plugin-api.md` (CI/CD Pipeline section)
**Recommendation:** Define the structural fallback checks explicitly (e.g., assert `plugin.json` exists and has required fields, assert `hooks.json` is valid JSON, assert binary is executable). This way the step is always meaningful even without the `claude` CLI.

---

### MIN-3: `plugin-hooks/` source directory not established

The build pipeline step 4 says "Copy hook scripts from `plugin-hooks/` -> `dist/gp-plugin/hooks/`" but this `plugin-hooks/` directory does not exist in the current repo and is not mentioned in the repo structure conventions or the overview. It is unclear whether this is a new top-level directory or lives elsewhere.

**File:** `plugin-api.md` (Build Pipeline section) and `conventions.md`
**Recommendation:** Explicitly state that `plugin-hooks/` is a new top-level directory in the repo (sibling to `skills/`, `scripts/`, `src/`). Add it to any repo structure documentation.

---

## What's Working Well

- The CI pipeline is well-sequenced: build, assemble, post-build assertion, smoke test, validate, tag, publish. The post-build binary version check is a good catch for broken builds.
- Release branch force-push with pre-push tagging provides clean rollback points without accumulating history.
- The separation between dev key (local) and CI secret (production) for HMAC is clean.
- `set -e` and delegation to shell scripts follows the existing `install-skills.sh` pattern consistently.
- The `concurrency` mention shows awareness of race conditions in CI, even if the details need specification.
