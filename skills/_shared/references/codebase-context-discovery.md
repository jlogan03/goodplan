# Codebase Context Discovery

Gather project-level context before the first review or implementation iteration so all agents share a common understanding of the codebase's architecture, conventions, and recent trajectory. This step runs once after dependency research and does not repeat between iterations unless the plan scope changes significantly.

## 1. Find In-Repo Documentation

Search for architecture docs, design docs, ADRs, READMEs, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `docs/` directories, and inline module-level documentation in areas the plan touches.

## 2. Assess Documentation Freshness

For each doc found, compare its last commit date against the last commit date of the code it describes:

```bash
git log -1 --format="%ai" -- <doc-path>
git log -1 --format="%ai" -- <code-path>
```

- If the code has changed significantly since the doc was last updated (e.g., major refactors visible in the log after the doc's last edit), flag the doc as **potentially stale**.
- If the doc references files, functions, or patterns that no longer exist in the codebase, mark it as **outdated** and exclude it from reviewer context.
- If the doc's last edit is recent relative to the code it describes, mark it as **fresh**.

## 3. Review Recent PRs and Git History

Use the GitHub CLI and git log to understand recent development context:

```bash
gh pr list --state merged --limit 20
git log --oneline --since="3 months ago" -- <plan-affected-paths>
```

Focus on:
- **Development velocity** — which directories/files the plan touches are under active development vs settled
- **Architectural intent** — PR descriptions and review comments that explain *why* changes were made, design trade-offs considered, and known gotchas
- **Difficulties encountered** — review threads that highlight problems, rejected approaches, or hard-won solutions in the areas the plan will modify
- **Refactoring patterns** — recent structural changes that the plan should be aware of or continue
- **Relevant PRs** — for the most relevant PRs (those touching the same areas as the plan), read the full PR description and review comments using `gh pr view <number>` to extract detailed context

## 4. Write Codebase Context Summary

Write a concise summary to `<scope_dir>/research/_codebase-context.md` including:

- **Fresh documentation** — file paths with a one-line description of what each covers, marked as reliable references
- **Stale documentation** — file paths flagged as potentially outdated, with a note on what appears to have drifted. Reviewers should not rely on these.
- **Recent development activity** — summary of which plan-affected areas are actively changing vs stable
- **Key decisions and constraints** — architectural intent, trade-offs, and gotchas extracted from PR history
- **Areas of active churn vs stability** — helps reviewers calibrate risk assessment for different parts of the plan

## 5. Epic Architecture Awareness

Check for an active epic:

```bash
ls -d .project/epics/__active__*/ 2>/dev/null
```

If found, read the epic's `architecture/` directory alongside top-level `.project/architecture/`. Start with `_overview.md` in each. The two layers represent:

- **Top-level** (`.project/architecture/`): Current reality — what the repo looks like now
- **Epic** (`epics/__active__<name>/architecture/`): Target state — where the active epic is headed

Include both in the codebase context summary. Flag any conflicts between the two layers — areas where the epic's target architecture diverges from current reality are important context for both reviewers and implementation agents.

## 6. Include in Agent Prompts

Add the codebase context file path (`<scope_dir>/research/_codebase-context.md`) to each reviewer's and implementation agent's Available Research section. Reviewers should:
- Use **fresh** docs as authoritative references for intended architecture, known edge cases, and conventions
- **Disregard** docs flagged as stale rather than relying on potentially misleading information
- Reference PR history context when evaluating whether the plan aligns with the project's recent direction
