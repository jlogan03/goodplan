# DevOps & Infra Review — Round 5

**Reviewer:** devops-infra
**Score:** 9/10
**Critical:** 0 | **Important:** 1 | **Minor:** 1

---

## Important Issues

### IMP-1: GP_HMAC_KEY secret not referenced in CI workflow definition

The architecture states the HMAC key is "injected from a CI secret (`GP_HMAC_KEY`)" and `build:plugin` uses `${GP_HMAC_KEY:-<dev-key>}`, but the CI/CD Pipeline section never shows the secret being passed to the build step as an environment variable. If the workflow YAML does not explicitly map the repository secret to an env var (e.g., `env: { GP_HMAC_KEY: ${{ secrets.GP_HMAC_KEY }} }`), the build will silently fall back to the dev key in production releases.

**File:** `plugin-api.md` (CI/CD Pipeline section)
**Recommendation:** Add an explicit note that the CI build step must set `GP_HMAC_KEY` from the GitHub Actions secret, and that the build script should fail (not fall back to dev key) when running in CI. A simple guard: `if [ "$CI" = "true" ] && [ -z "$GP_HMAC_KEY" ]; then echo "GP_HMAC_KEY not set" >&2; exit 1; fi`.

---

## Minor Issues

### MIN-1: Smoke test hook invocation details unspecified

Step 4 says "run each hook script with synthetic stdin JSON and verify expected exit codes" but does not specify what the synthetic payloads look like or how many test cases per hook. Without at least the expected test matrix (e.g., protect-state: one blocking path, one allowed path; warn-bash-state: one matching command, one non-matching, one with sentinel), the smoke test step is ambiguous enough that an implementer might write a single happy-path check and miss edge cases.

**File:** `plugin-api.md` (CI/CD Pipeline section)
**Recommendation:** Add a brief enumeration of the minimum smoke test cases per hook, or reference the fitness functions in plugin-api.md (which already describe the expected scenarios) as the source for smoke test cases.

---

## Resolved from Round 4

All six issues from round 4 have been addressed:

- **IMP-1** (`.gitignore`): `dist/` and `.goodplan-dev` additions documented in conventions.md.
- **IMP-2** (Concurrency key): `concurrency: { group: release-pipeline, cancel-in-progress: false }` specified.
- **IMP-3** (Release asset): Upload step added to CI pipeline.
- **MIN-1** (Hook script space safety): Separate `python3` calls per variable.
- **MIN-2** (`claude plugin validate` fallback): Structural fallback checks explicitly defined.
- **MIN-3** (`plugin-hooks/` directory): Established as new top-level directory.

## What's Working Well

- The CI pipeline ordering (build, assemble, post-build assertion, smoke test, validate, upload asset, tag, publish) is thorough and well-sequenced.
- Concurrency serialization with `cancel-in-progress: false` correctly prevents partial-state release branches.
- Release asset upload provides artifact traceability independent of the force-pushed branch.
- Structural fallback validation when `claude` CLI is unavailable ensures the gate is always meaningful.
- Dev key fallback for local builds keeps the development loop simple while separating concerns from production.
- Force-push with pre-push tagging provides clean rollback without history accumulation.
