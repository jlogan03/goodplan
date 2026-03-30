## Issues

**[CRITICAL]** Workflow is missing a `permissions:` block

The plan defines the workflow job but never specifies a `permissions:` block. GitHub Actions defaults to broad read/write `GITHUB_TOKEN` permissions. This workflow needs `contents: write` (for force-pushing the release branch and creating tags) and likely nothing else. Without an explicit least-privilege `permissions:` block, the workflow runs with excessive permissions — a supply-chain risk for a plugin distribution pipeline.

**Fix:** Add a top-level `permissions: {}` (deny all) and then a job-level `permissions:` block granting only what's needed:
```yaml
permissions:
  contents: write   # create releases, push to release branch, create tags
```

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Third-party actions are not SHA-pinned

The plan references `actions/checkout@v4`, `oven-sh/setup-bun@v2`, and `softprops/action-gh-release@v2` by tag, not by SHA. For a release pipeline that publishes executable binaries to users, tag-based pinning is insufficient — tags can be force-pushed by upstream maintainers. SHA pinning with a comment noting the tag is the standard for supply-chain security in release workflows.

**Fix:** Pin all third-party actions to their current commit SHA. Example:
```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.7
```
Add a Dependabot or Renovate config for GitHub Actions to keep SHA pins updated.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No `permissions:` scoping for `softprops/action-gh-release`

The `softprops/action-gh-release` action requires `contents: write` to create releases and upload assets. This overlaps with the release branch force-push, but needs to be explicitly called out in the permissions block. If the workflow later gets split into multiple jobs, per-job permissions become critical. The plan should document which permissions each step needs.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Release branch force-push uses `GITHUB_TOKEN` without discussing branch protection

Step 10 says "Use `GITHUB_TOKEN` for auth" to force-push to the `release` branch. If branch protection rules are enabled on `release` (or later added), `GITHUB_TOKEN` force-pushes will be blocked. The plan should explicitly note that the `release` branch must NOT have force-push protection enabled, or use a deploy key / PAT if protection is required.

Additionally, the force-push mechanism itself is underspecified. The plan says "Force-push `tmp-release/` contents to the `release` branch" but doesn't describe the git commands. A common pattern is:
```bash
cd tmp-release
git init && git add -A && git commit -m "Release $TAG"
git push --force "https://x-access-token:${GITHUB_TOKEN}@github.com/$REPO.git" HEAD:refs/heads/release
```
This should be spelled out in the tasks to avoid implementation ambiguity.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Marketplace manifest `source` format may be incorrect

The plan's marketplace.json uses:
```json
"source": {
  "source": "git-subdir",
  "url": "https://github.com/ian97531/project-skills.git",
  "path": "plugins/gp",
  "ref": "release"
}
```

Per the research file, `git-subdir` requires a `url` field. The plan has this correct. However, the official marketplace examples all use SHA pinning (`"sha": "..."`) alongside `ref` for reproducibility. For a self-hosted marketplace pointing to its own release branch this is less critical (the branch is force-pushed by CI anyway), but the plan should note that SHA pinning is intentionally omitted and why — otherwise a future reviewer will flag it.

Also: the plan places `marketplace.json` at repo root `.claude-plugin/marketplace.json` and says it will be copied to the release branch. But the marketplace.json on the **main branch** (the source of truth for `git-subdir` resolution) will also be discoverable. Users who add the marketplace via the main branch will get the source field pointing to `ref: "release"` — which is correct. But the copy on the release branch itself is redundant for `git-subdir` resolution since Claude Code reads the marketplace manifest from the ref where the marketplace was added (main). Clarify which branch's manifest is authoritative.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Smoke test details are vague — need concrete stdin JSON and assertion commands

Step 6 says "Run `protect-state.sh` and `warn-bash-state.sh` with synthetic stdin JSON" but doesn't provide the actual JSON payloads or assertion commands. The hook scripts expect specific JSON shapes (with `tool_input.file_path` and `cwd` for protect-state, `tool_input.command` and `cwd` for warn-bash). The plan should include the exact test JSON and expected outputs/exit codes to avoid implementation guesswork.

For example:
```bash
# protect-state: blocked path
echo '{"tool_input":{"file_path":".goodplan/project.json"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/protect-state.sh
# Expected: exit 2

# protect-state: allowed path
echo '{"tool_input":{"file_path":"src/index.ts"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/protect-state.sh
# Expected: exit 0
```

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `.claude-plugin/` gitignore handling is unclear

The plan has a task "Add `.claude-plugin/` to `.gitignore` exclusion if needed (ensure marketplace.json is tracked, not ignored)." The current `.gitignore` does not mention `.claude-plugin/` at all, so the marketplace.json will be tracked by default. This task is unnecessary in its current form — it should either be removed or rephrased to "Verify `.claude-plugin/marketplace.json` is not ignored by existing gitignore rules."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `cancel-in-progress: false` is the default — explicit but unnecessary

The concurrency group specifies `cancel-in-progress: false`, which is already the default behavior. This is fine for documentation purposes but worth noting it's a no-op. Not a real issue — just mentioning for awareness.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 cleanup doesn't handle the rollback tag

Step 9 creates a `release-before-$TAG` tag on the release branch before force-pushing. Phase 2 cleanup deletes the test tag and release but doesn't clean up the `release-before-v1.0.0-test` tag. Add this to the cleanup tasks.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No Dependabot/Renovate config for Actions version management

The plan creates a new workflow with third-party actions but doesn't add a Dependabot or Renovate configuration to keep action versions updated. For a project that's distributing executable plugins, staying current on CI action versions matters for security patches.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan covers the right workflow steps and the overall architecture (tag trigger, build, release, force-push to release branch) is sound and aligns with the research findings and epic architecture. However, it has a critical security gap (missing `permissions:` block), multiple important gaps around action pinning, force-push mechanics, smoke test specifics, and marketplace manifest clarity. These are all straightforward to fix. To reach 9+: add the `permissions:` block, SHA-pin actions, spell out the force-push git commands, provide concrete smoke test payloads, and clarify the marketplace manifest authority model.

## Summary
- Critical: 1
- Important: 4
- Minor: 4
