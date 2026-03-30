# Dependency Research

Research external dependencies referenced in the plan so that reviewers and implementation agents have access to current documentation. If the plan references no external libraries, frameworks, tools, or APIs, skip this step.

## 1. Scan for Research Targets

Scan the plan for library, framework, tool, and API references — including dependencies the plan *introduces* that don't yet exist in the codebase.

- **Library discovery**: For any non-trivial custom logic the plan proposes to build, search for existing well-maintained open-source libraries that solve the same problem. If a suitable library exists, note it in the research output so reviewers can flag the build-vs-reuse decision.
- **GitHub Actions**: If the plan touches `.github/workflows/` files, scan for GitHub Actions referenced in workflow files — both existing actions the plan modifies around and new actions the plan introduces. Each action (e.g., `actions/checkout`, `actions/setup-node`, third-party actions) is a research target just like a library dependency.
- **Docker base images**: If the plan touches Dockerfiles or docker-compose files, scan for base image references (`FROM` directives, `image:` keys, CI `container:` blocks). Each base image tag is a research target.
- **Infrastructure providers**: If the plan touches Terraform/OpenTofu (`.tf` files, `.terraform.lock.hcl`), Helm charts (`Chart.yaml`, `Chart.lock`), or Pulumi configurations, scan for provider and chart dependencies.
- **System-level tools and libraries**: If the plan references CLI tools or native libraries installed via Homebrew, apt, yum, or compiled from source (e.g., in Dockerfiles, CI steps, or setup scripts), and those tools are pinned to a specific version or provide libraries the project links against, treat them as research targets — especially for tools the model is unlikely to have current documentation for.

## 2. Detect Versions

Do NOT rely on training data for version information — it is likely outdated.

- **Existing dependencies**: Check lockfiles/manifests (`package.json`, `poetry.lock`, `Cargo.lock`, `requirements.txt`, `pyproject.toml`, `CMakeLists.txt`). For monorepos, check each workspace for potentially different versions.
- **New dependencies introduced by the plan**: Look up currently available versions using package registry tools, Context7, or web search. If the user specified a version constraint in the plan, use that. Otherwise default to the latest stable release. If it's ambiguous which major version to use (e.g., multiple active major versions), ask the user rather than guessing.
- **GitHub Actions versions**: Check workflow files for action version pins (SHA, tag, or branch). For existing actions, look up whether the pinned version is current or outdated. For new actions the plan introduces, look up the latest stable release tag and its corresponding SHA for pinning. Research output for actions should include: inputs/outputs, required `permissions`, breaking changes between major versions, and recommended pinning approach.
- **Docker base image tags**: Check Dockerfiles for image tags and digests. Look up whether the tag is current, still receiving security patches, and what's included in the image (e.g., musl vs glibc for alpine, included system packages). For new images, look up available variants (slim, alpine, bookworm) and their trade-offs.
- **Infrastructure provider versions**: Check `.terraform.lock.hcl`, `Chart.yaml`, or equivalent lock files. Look up current provider/chart versions and breaking changes between the locked version and latest. Research output should include changed resources, removed attributes, and migration guides.
- **System tool versions**: Check version pins in Dockerfiles (`apt-get install foo=1.2.3`), Brewfiles, CI setup steps, or build scripts. Research only tools where the version matters for compatibility or where the model's knowledge is likely stale — skip well-known stable tools (e.g., `curl`, `git`) unless a specific version is referenced.

## 3. Deduplicate

Check existing `<scope_dir>/research/` and `.goodplan/research/` files before spawning research. Skip if the file exists and its version matches the current lockfile or manifest. Re-fetch only when the version has changed or the file is missing.

## 4. Research Output

Each research pass — whether performed by a sub-agent or inline — should:
- Write a concise summary to `<scope_dir>/research/<dependency-name>-<version>.md`
- Include: version, key APIs referenced in the plan, gotchas, deprecations, relevant examples
- Include a header with version and fetch date for staleness checking
- If docs don't support version pinning, note which version the docs cover and flag discrepancies

## 5. Map Research to Reviewers

Build a lookup of which research files are relevant to which reviewer based on domain overlap. Each reviewer gets an Available Research section in its prompt listing relevant file paths, with workspace/package context when version divergence exists across monorepo packages.

## 6. Re-scan

Re-run this step after later iterations if plan edits introduce new dependencies or materially change dependency choices.
