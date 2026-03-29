# Learnings — 05-define-slices

## End-to-end verification is the defining trait of a vertical slice

The whole point of slicing vertically is that each slice delivers a complete flow you can verify by actually running the code — not just unit tests. The goal.md template must include a Verification section describing live end-to-end testing: what a human would do to convince themselves it works. Slices that can't be verified this way are too thin or abstract.

## Simpler skills need fewer reference files

define-slices needed only 2 reference files (formats.md + guidance.md with templates inlined) vs. define-architecture's 4. Merging templates into guidance.md saved a Read call at runtime with no loss of clarity. Match reference file count to skill complexity.

## Cross-skill CLAUDE.md format references work but are fragile

guidance.md defers the full Project Context format to define-architecture's guidance.md to stay under 3KB. This works but SKILL.md must explicitly instruct reading both files. Future skills should either inline the format or establish a shared reference file.
