# Completion Learnings: migrate-to-cli

## Direct state construction is cleaner than backdoor SM events for data imports

Bypassing `reduce()` with a formal INV-001 exception avoids exhaustiveness ripple across handler maps, guard bypass complexity, and fitness function churn — keeping the state machine pure. Activity log entries can be included directly in the constructed state tree. Documented as a formal exception in `invariants.md` alongside the version stamp exception.

## Stateful multi-round Q&A with small focused schemas prevents LLM JSON errors

Breaking migration into inventory/details/confirmation rounds with per-round Zod schemas + `z.toJSONSchema()` responseSchema keeps each response small and schema-validated. One-shot approaches with large payloads risk LLM truncation, missing fields, and malformed arrays. The circuit breaker (max 3 correction rounds) prevents infinite loops without losing progress.

## Rename-then-fresh-construct beats in-place normalization

Moving `.project/` to `.project-old/` and building fresh state avoids all directory normalization logic (no `~~archived~~` stripping, no `__active__` handling, no `side-quests/` → `quests/` rename). The LLM provides clean names in answers; the CLI never needs to know about old naming conventions. The old directory serves as both backup and artifact source.

## CLI should cross-check LLM-provided paths against sibling files for completeness

When the LLM provides sourcePaths to files/directories, the CLI validates they exist — but should also scan for sibling files/directories the LLM didn't mention. If unknown siblings exist, ask the LLM whether they should be included. This guards against incomplete migration of LLM-generated content (e.g., a research file the LLM didn't notice). Currently not implemented — candidate for a future enhancement.

## install-skills.sh should build the binary alongside skill installation

Skills reference the CLI binary (`goodplan --version --json` as Step 1), so installing skills without building the binary leaves a broken setup. Build + install should be atomic in one script. The version define (`__GOODPLAN_VERSION__`) requires careful shell escaping in the build command.

## LLM-provided sourcePaths with immediate CLI validation catches errors early

Having the LLM tell the CLI where old artifacts live (rather than CLI scanning) keeps scanning logic in the skill while the CLI validates paths exist before proceeding. Errors surface during the Q&A round, not during the final state construction step where recovery is harder.
