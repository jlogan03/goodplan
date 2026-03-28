# Completion Learnings: complete-rename

## Re-entry paths must be checked before guardrails that reject the same state

The initial implementation had a guardrail rejecting initiatives with existing `completion/learnings.md` (condition: "not completion-ready"), but re-entry detection (which resumes from that exact state) was ordered after the guardrail. This would have blocked any resumed initiative completion after a graceful stop. When a condition is both "rejection criteria" for first-time runs and "resume indicator" for re-entry, the resume check must run first.

## Archive naming conventions with embedded counters need explicit stripping rules

The `~~archived~~` prefix stripping works simply for slices (`~~archived~~<name>` → `<name>`), but initiative archives use `~~archived~~NN_<name>` where the numeric counter and underscore are also part of the prefix. Signal tracking's scope derivation logic needs to handle both patterns. When adding numbering or other structured metadata to prefix conventions, document the full stripping algorithm alongside the naming convention.
