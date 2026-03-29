# Decision: Distribute Plugin via Release Branch in Source Repo Using git-subdir

**Status**: active
**Date**: 2026-03-29
**Domain**: infrastructure
**Context**: Plugin distribution epic — choosing how to publish the built plugin for marketplace consumption

## Decision
The goodplan plugin is distributed from the source repo (`ian97531/project-skills`) using a `release` branch and the `git-subdir` marketplace source type. CI builds the plugin on tag push and force-pushes the assembled artifacts to `plugins/gp/` on the `release` branch. The marketplace manifest uses `git-subdir` with `ref: "release"` and `path: "plugins/gp"`.

## Rationale
Alternatives considered:
- **Separate dist repo** — clean separation but adds a second repo to manage, cross-repo token setup, and coordination overhead.
- **Same repo, relative path on main** — simplest but commits the 58 MB binary to main, bloating the source repo.
- **npm package** — good versioning semantics but requires npm account and postinstall scripts for platform-specific binaries.

The release branch approach keeps everything in one repo while avoiding binary bloat on main. Sparse clone ensures users only download the plugin directory, not the full source. The pattern is well-established (similar to GitHub Pages `gh-pages` branches).

## Consequences
- CI pipeline must build the plugin and force-push to the `release` branch on tag push
- The `release` branch has a completely different structure from `main` (built artifacts vs source code)
- Marketplace manifest on `main` points to the `release` branch: `{ "source": "git-subdir", "url": "...", "path": "plugins/gp", "ref": "release" }`
- No separate repository to create or maintain
- Users see the source repo URL in their plugin list, which builds trust
