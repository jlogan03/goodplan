# Confirmed Goal

Fix 4 workflow bugs across goodplan skills (duplicate sections in create-slices, unnecessary confirmation prompts, /complete learnings gate, migration sibling file detection) AND standardize output templates for consistent user-facing presentation by extracting shared templates to `_shared/references/output-templates.md` and integrating them into all skills — so no prose-only structured output descriptions remain.

**Done looks like**: All 4 bugs are fixed with passing tests, a shared output-templates.md exists with rigid fenced-code-block templates, and every skill's structured output point either has an inline rigid template or references the shared templates.
