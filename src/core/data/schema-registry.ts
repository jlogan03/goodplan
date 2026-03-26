import type { z } from "zod";
import { epicSchema } from "../../schemas/entities/epic.js";
import { overviewSchema } from "../../schemas/entities/overview.js";
import { projectSchema } from "../../schemas/entities/project.js";
import { questSchema } from "../../schemas/entities/quest.js";
import { sliceSchema } from "../../schemas/entities/slice.js";
import { taskSchema } from "../../schemas/entities/task.js";
import { activityEntrySchema } from "../../schemas/records/activity-log.js";
import { architectureDeltaSchema } from "../../schemas/records/architecture-delta.js";
import { decisionEntrySchema } from "../../schemas/records/decision.js";
import { learningEntrySchema } from "../../schemas/records/learning.js";

export interface SchemaRegistryEntry {
	pattern: RegExp;
	schema: z.ZodType;
}

export const schemaRegistry: SchemaRegistryEntry[] = [
	// Project-level JSON
	{ pattern: /^project\.json$/, schema: projectSchema },

	// Overview JSON (one per collection)
	{ pattern: /^epics\/overview\.json$/, schema: overviewSchema },
	{ pattern: /^slices\/overview\.json$/, schema: overviewSchema },
	{ pattern: /^quests\/overview\.json$/, schema: overviewSchema },
	{ pattern: /^tasks\/overview\.json$/, schema: overviewSchema },

	// Entity JSON (per-instance)
	{ pattern: /^epics\/[^/]+\/epic\.json$/, schema: epicSchema },
	{ pattern: /^slices\/[^/]+\/slice\.json$/, schema: sliceSchema },
	{ pattern: /^quests\/[^/]+\/quest\.json$/, schema: questSchema },
	{ pattern: /^tasks\/[^/]+\/task\.json$/, schema: taskSchema },

	// JSONL records — project-level first (more specific), then per-entity
	{ pattern: /^activity-log\.jsonl$/, schema: activityEntrySchema },
	{ pattern: /^decisions\.jsonl$/, schema: decisionEntrySchema },
	{ pattern: /^learnings\.jsonl$/, schema: learningEntrySchema },
	{ pattern: /.*\/learnings\.jsonl$/, schema: learningEntrySchema },
	{ pattern: /.*\/architecture-deltas\.jsonl$/, schema: architectureDeltaSchema },
];

export function findSchema(path: string): z.ZodType | undefined {
	for (const entry of schemaRegistry) {
		if (entry.pattern.test(path)) {
			return entry.schema;
		}
	}
	return undefined;
}
