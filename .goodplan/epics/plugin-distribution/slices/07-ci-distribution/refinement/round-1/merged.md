# Merged Feedback — Slice 07: CI Distribution (Round 1)

## Reviewer Scores

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| holistic | 7/10 | 0 | 4 | 4 |
| software-architecture | 6/10 | 0 | 3 | 4 |
| ci-github-workflows | 6/10 | 1 | 4 | 4 |

## Issues

### CRITICAL

**C1. Workflow missing `permissions:` block (security)**
Sources: ci-github-workflows (CRITICAL), software-architecture (IMPORTANT)

The workflow has no `permissions:` block. GitHub Actions defaults to broad read/write `GITHUB_TOKEN` permissions — a supply-chain risk for a plugin distribution pipeline. Add a top-level `permissions: {}` (deny all) and job-level `permissions: contents: write` (for releases, tags, and force-push to release branch).

Resolution: DIRECTLY_ACTIONABLE

---

### IMPORTANT

**I1. Marketplace manifest already exists — plan should not "create" it**
Sources: holistic, software-architecture

`.claude-plugin/marketplace.json` already exists in the repo (from slice 02). The plan's Phase 1 says "create" it, and the "before" checks assert the file doesn't exist. The plan also proposes fields (`description`, `owner.url`) not present in the current file. Reframe the task as "verify/update existing manifest" and reconcile field differences explicitly.

Resolution: DIRECTLY_ACTIONABLE

---

**I2. Third-party actions must be SHA-pinned**
Source: ci-github-workflows

The plan references `actions/checkout@v4`, `oven-sh/setup-bun@v2`, and `softprops/action-gh-release@v2` by tag. For a release pipeline publishing executable binaries, tag-based pinning is insufficient — tags can be force-pushed by upstream maintainers. Pin to commit SHAs with tag comments. Consider adding Dependabot/Renovate config for Actions.

Resolution: DIRECTLY_ACTIONABLE

---

**I3. Force-push to release branch — mechanism underspecified and branch protection undocumented**
Sources: ci-github-workflows, software-architecture

Step 10 says "Force-push `tmp-release/` contents to the `release` branch" but doesn't specify the git commands. Common pattern:
```bash
cd tmp-release
git init && git add -A && git commit -m "Release $TAG"
git push --force "https://x-access-token:${GITHUB_TOKEN}@github.com/$REPO.git" HEAD:refs/heads/release
```

Also: document that the `release` branch must NOT have force-push protection enabled, or specify alternative auth (deploy key/PAT) if protection is needed.

Resolution: DIRECTLY_ACTIONABLE

---

**I4. Hook smoke test payloads not specified**
Sources: holistic, software-architecture, ci-github-workflows

Step 6 says "Run `protect-state.sh` and `warn-bash-state.sh` with synthetic stdin JSON" but provides no example payloads. The hooks expect specific fields (`tool_input.file_path`, `tool_input.command`, `cwd`). Include concrete test JSON and expected exit codes. Example:
```bash
# protect-state: blocked path — expected exit 2
echo '{"tool_input":{"file_path":".goodplan/project.json"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/protect-state.sh

# protect-state: allowed path — expected exit 0
echo '{"tool_input":{"file_path":"src/index.ts"},"cwd":"'$PWD'"}' | ./dist/gp-plugin/hooks/protect-state.sh
```

Resolution: DIRECTLY_ACTIONABLE

---

**I5. Version contract between `package.json` and git tag is undocumented**
Source: software-architecture

The post-build assertion runs `gp --version --json` and checks against the tag version. If `package.json` says `1.0.1` but the tag is `v1.0.0`, the assertion fails. The plan should document that the user must bump `package.json` version before tagging — this is a workflow contract, not just an assertion detail.

Resolution: DIRECTLY_ACTIONABLE

---

**I6. Tarball creation step is missing**
Source: software-architecture

Step 7 uses `softprops/action-gh-release@v2` to upload a `.tar.gz` asset, but the plan never shows how the tarball is created. The `softprops` action only uploads files. Add a step between build and release: `tar -czf gp-plugin-${{ github.ref_name }}.tar.gz -C dist gp-plugin`.

Resolution: DIRECTLY_ACTIONABLE

---

**I7. Marketplace manifest `source` authority model unclear**
Source: ci-github-workflows

The marketplace.json on the main branch points to `ref: "release"` via `git-subdir`. The same file gets copied to the release branch. Claude Code reads the marketplace manifest from the ref where the marketplace was added (main), so the copy on the release branch is redundant for resolution. The plan should clarify which branch's manifest is authoritative and note that SHA pinning in the `source` block is intentionally omitted (since the branch is force-pushed by CI).

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR

**M1. `.gitignore` exclusion task is a no-op**
Sources: holistic, software-architecture, ci-github-workflows

The current `.gitignore` does not ignore `.claude-plugin/`, so the file is already tracked. Remove the task or replace with a verification step.

Resolution: DIRECTLY_ACTIONABLE

---

**M2. `actions/checkout` version inconsistency with research doc**
Source: holistic

Plan uses `@v4`, research doc examples use `@v6`. Not functional but should be internally consistent. (Moot if SHA-pinned per I2.)

Resolution: DIRECTLY_ACTIONABLE

---

**M3. No documentation task for the release process**
Source: holistic

No task for updating README, CLAUDE.md, or architecture docs to describe the CI pipeline, how to trigger releases, or the release branch workflow.

Resolution: DIRECTLY_ACTIONABLE

---

**M4. Phase 2 "before" check is fragile**
Source: holistic

The check `gh run list --workflow=publish-plugin.yml --limit=1` returning no runs breaks if there are prior failed runs. Check for "no successful runs" instead, or acknowledge prior runs may exist.

Resolution: DIRECTLY_ACTIONABLE

---

**M5. Phase 2 cleanup doesn't handle rollback tag**
Source: ci-github-workflows

Step 9 creates a `release-before-$TAG` tag before force-pushing. Cleanup deletes the test tag and release but not the rollback tag. Add `release-before-v1.0.0-test` to cleanup.

Resolution: DIRECTLY_ACTIONABLE

---

**M6. Phase 2 cleanup leaves release branch with test content**
Source: software-architecture

After Phase 2 test cleanup, the `release` branch still contains the test build. This gets overwritten on real release, but note this explicitly to avoid confusion.

Resolution: DIRECTLY_ACTIONABLE

---

**M7. `cancel-in-progress: false` is a no-op**
Source: ci-github-workflows

This is the default behavior. Fine for documentation but worth noting.

Resolution: DIRECTLY_ACTIONABLE

---

**M8. No Dependabot/Renovate config for Actions version management**
Source: ci-github-workflows

The plan creates a workflow with third-party actions but doesn't add automated version management. (Partially covered by I2.)

Resolution: DIRECTLY_ACTIONABLE

---

## Contradictions Resolved

**Permissions severity**: ci-github-workflows rated the missing `permissions:` block as CRITICAL; software-architecture rated it IMPORTANT. Merged as **CRITICAL** — trusting the CI domain specialist on CI security matters.

**Marketplace `source` SHA pinning**: ci-github-workflows flagged missing SHA pinning in the `source` block. software-architecture did not raise this. Merged as part of I7 (marketplace authority model) since for a self-hosted release branch the omission is intentional but should be documented.

## Totals

| Severity | Count |
|---|---|
| Critical | 1 |
| Important | 7 |
| Minor | 8 |

| Resolution | Count |
|---|---|
| DIRECTLY_ACTIONABLE | 16 |
| USER_INPUT | 0 |
| RESEARCH_NEEDED | 0 |
