// Barrel for v2 event payload schemas.
// One file per entity (project.ts, epic.ts, slice.ts, etc.).
// Coexists with v1 src/schemas/state-events.ts until full migration.

export { projectInitializedPayloadSchema } from "./project.js";
export type { ProjectInitializedPayload } from "./project.js";
