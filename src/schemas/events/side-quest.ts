import { z } from "zod";
import { ContentRefSchema } from "../envelope.js";

// ── Side-quest event payload schemas ───────────────────────

export const sideQuestCreatedPayloadSchema = z.object({
	dir: z.string().min(1),
	goal: z.string().min(1),
});
export type SideQuestCreatedPayload = z.infer<typeof sideQuestCreatedPayloadSchema>;

export const sideQuestGoalCommittedPayloadSchema = z.object({
	goal: ContentRefSchema,
});
export type SideQuestGoalCommittedPayload = z.infer<typeof sideQuestGoalCommittedPayloadSchema>;

export const sideQuestPlanDraftedPayloadSchema = z.object({
	plan: ContentRefSchema,
});
export type SideQuestPlanDraftedPayload = z.infer<typeof sideQuestPlanDraftedPayloadSchema>;

export const sideQuestPlanShapeApprovedPayloadSchema = z.object({});
export type SideQuestPlanShapeApprovedPayload = z.infer<
	typeof sideQuestPlanShapeApprovedPayloadSchema
>;

export const sideQuestPlanCommittedPayloadSchema = z.object({
	plan: ContentRefSchema,
});
export type SideQuestPlanCommittedPayload = z.infer<typeof sideQuestPlanCommittedPayloadSchema>;

export const sideQuestImplementationStartedPayloadSchema = z.object({});
export type SideQuestImplementationStartedPayload = z.infer<
	typeof sideQuestImplementationStartedPayloadSchema
>;

export const sideQuestChunkStartedPayloadSchema = z.object({
	chunkId: z.string().min(1),
	description: z.string().min(1),
});
export type SideQuestChunkStartedPayload = z.infer<typeof sideQuestChunkStartedPayloadSchema>;

export const sideQuestChunkVerifiedPayloadSchema = z.object({
	chunkId: z.string().min(1),
	evidence: z.string().min(1),
});
export type SideQuestChunkVerifiedPayload = z.infer<typeof sideQuestChunkVerifiedPayloadSchema>;

export const sideQuestLandedPayloadSchema = z.object({});
export type SideQuestLandedPayload = z.infer<typeof sideQuestLandedPayloadSchema>;

export const sideQuestAbandonedPayloadSchema = z.object({
	reason: z.string().min(1),
});
export type SideQuestAbandonedPayload = z.infer<typeof sideQuestAbandonedPayloadSchema>;

// ── Event map ──────────────────────────────────────────────

export const SideQuestEventMap = {
	"side-quest-created": sideQuestCreatedPayloadSchema,
	"side-quest-goal-committed": sideQuestGoalCommittedPayloadSchema,
	"side-quest-plan-drafted": sideQuestPlanDraftedPayloadSchema,
	"side-quest-plan-shape-approved": sideQuestPlanShapeApprovedPayloadSchema,
	"side-quest-plan-committed": sideQuestPlanCommittedPayloadSchema,
	"side-quest-implementation-started": sideQuestImplementationStartedPayloadSchema,
	"side-quest-chunk-started": sideQuestChunkStartedPayloadSchema,
	"side-quest-chunk-verified": sideQuestChunkVerifiedPayloadSchema,
	"side-quest-landed": sideQuestLandedPayloadSchema,
	"side-quest-abandoned": sideQuestAbandonedPayloadSchema,
} as const;

export type SideQuestEventType = keyof typeof SideQuestEventMap;
export type SideQuestEventPayload =
	| SideQuestCreatedPayload
	| SideQuestGoalCommittedPayload
	| SideQuestPlanDraftedPayload
	| SideQuestPlanShapeApprovedPayload
	| SideQuestPlanCommittedPayload
	| SideQuestImplementationStartedPayload
	| SideQuestChunkStartedPayload
	| SideQuestChunkVerifiedPayload
	| SideQuestLandedPayload
	| SideQuestAbandonedPayload;
