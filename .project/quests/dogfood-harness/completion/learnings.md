# Completion Learnings: dogfood-harness

Learnings from this quest were already captured during the skills-cli-integration epic (sourced as `06-dogfooding` in project learnings). Key findings:

- Agent SDK env option replaces rather than merges — always spread process.env
- Skills in automated mode need submit-* calls before summary steps
- Entity creation commands must register each individual entity
- Directory rename conventions are incompatible with CLI path resolution

No additional learnings to add — the harness is working and was used successfully for migration dogfooding.
