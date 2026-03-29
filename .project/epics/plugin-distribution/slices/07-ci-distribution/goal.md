# CI Distribution

## What We're Building
GitHub Actions workflow that builds the plugin on version tag push, runs smoke tests and validation, uploads the release asset, and publishes to the `release` branch for marketplace distribution. After this slice, pushing a `v*` tag triggers an automated release pipeline that produces an installable plugin.

## Behavior
1. Workflow triggers on push of `v*` tags
2. Runs on pinned `macos-15` runner with Bun
3. `GP_HMAC_KEY` secret mapped explicitly via `env:` in the assemble step — without this, the build silently falls back to the dev key
4. Pipeline steps in order:
   a. Build: `bun run build:plugin`
   b. Post-build assertion: run compiled binary with `--version --json`, verify version matches `plugin.json`
   c. Smoke test: run hook scripts with synthetic stdin, verify exit codes. Check skill YAML frontmatter validity.
   d. Validate: `claude plugin validate dist/gp-plugin/` with structural fallback if `claude` CLI unavailable (assert `plugin.json` exists with required fields, `hooks.json` valid JSON, binary executable, skill dirs contain `SKILL.md`)
   e. Upload release asset: attach `dist/gp-plugin/` to the GitHub Release on the version tag
   f. Tag release branch: tag current commit on `release` branch before force-pushing
   g. Publish: force-push `dist/gp-plugin/` contents to `plugins/gp/` on the `release` branch (via `GITHUB_TOKEN`)
5. Concurrency: `{ group: release-pipeline, cancel-in-progress: false }` — serialize releases, never cancel mid-release
6. Release branch management: version tags provide rollback points, retained indefinitely. Branch is force-pushed — no history accumulation.
7. Rollback: `git push --force origin <previous-tag>:release`
8. Platform constraint: macOS arm64 only for v1

## Verification
- [ ] `.github/workflows/publish-plugin.yml` exists with correct trigger, runner, and step sequence
- [ ] Push a test tag (`v0.0.1-test`) — workflow triggers and completes successfully
- [ ] Post-build assertion step verifies binary version matches plugin manifest
- [ ] Smoke test step runs hook scripts and checks exit codes
- [ ] Validation step passes (or structural fallback passes if `claude` CLI unavailable)
- [ ] GitHub Release for the tag has the plugin artifact attached
- [ ] `release` branch contains `plugins/gp/` with the assembled plugin
- [ ] `plugins/gp/.claude-plugin/plugin.json` on the release branch has correct version
- [ ] `plugins/gp/binaries/macos-arm64/gp --version --json` (from release branch checkout) returns expected version
- [ ] Concurrency: push two tags in quick succession — second job queues, doesn't cancel first
- [ ] `/plugin marketplace add ian97531/project-skills` — plugin installs from the marketplace (end-to-end)

Push a test version tag to trigger the workflow. Monitor the GitHub Actions run through all steps. After success, check the release branch for the published plugin. Check the GitHub Release page for the attached artifact. Attempt to install the plugin via the marketplace command. If the full marketplace test isn't feasible in CI, at least verify the release branch structure matches what `git-subdir` expects.

## Scope Boundaries
**In scope:** GitHub Actions workflow, smoke tests, structural validation fallback, release asset upload, release branch management, concurrency control, rollback documentation
**Out of scope:** Multi-platform binaries (future enhancement), npm distribution, official marketplace submission
