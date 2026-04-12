// Barrel for v2 event payload schemas.
// One file per entity (project.ts, epic.ts, slice.ts, etc.).
// Coexists with v1 src/schemas/state-events.ts until full migration.

export {
	ProjectEventMap,
	projectInitializedPayloadSchema,
	steeringPreferenceSetPayloadSchema,
} from "./project.js";
export type {
	ProjectEventType,
	ProjectEventPayload,
	ProjectInitializedPayload,
	SteeringPreferenceSetPayload,
} from "./project.js";

export {
	EpicEventMap,
	epicCreatedPayloadSchema,
	epicAbandonedPayloadSchema,
	epicGoalDraftedPayloadSchema,
	epicGoalCommittedPayloadSchema,
	epicActivatedPayloadSchema,
	epicCompletedPayloadSchema,
	epicPausedPayloadSchema,
	epicResumedPayloadSchema,
} from "./epic.js";
export type {
	EpicEventType,
	EpicEventPayload,
	EpicCreatedPayload,
	EpicAbandonedPayload,
	EpicGoalDraftedPayload,
	EpicGoalCommittedPayload,
	EpicActivatedPayload,
	EpicCompletedPayload,
	EpicPausedPayload,
	EpicResumedPayload,
} from "./epic.js";

export {
	SliceEventMap,
	sliceCreatedPayloadSchema,
	sliceAbandonedPayloadSchema,
	slicePlanDraftedPayloadSchema,
	slicePlanCommittedPayloadSchema,
	planShapeCheckpointReachedPayloadSchema,
	planShapeRevisionProposedPayloadSchema,
	planShapeApprovedPayloadSchema,
	planShapeCheckpointAutoShapedPayloadSchema,
} from "./slice.js";
export type {
	SliceEventType,
	SliceEventPayload,
	SliceCreatedPayload,
	SliceAbandonedPayload,
	SlicePlanDraftedPayload,
	SlicePlanCommittedPayload,
	PlanShapeCheckpointReachedPayload,
	PlanShapeRevisionProposedPayload,
	PlanShapeApprovedPayload,
	PlanShapeCheckpointAutoShapedPayload,
} from "./slice.js";

export {
	SubsystemEventMap,
	SubsystemMaturitySchema,
	subsystemRegisteredPayloadSchema,
	subsystemMaturityUpdatedPayloadSchema,
	subsystemRetiredPayloadSchema,
} from "./subsystem.js";
export type {
	SubsystemMaturity,
	SubsystemEventType,
	SubsystemEventPayload,
	SubsystemRegisteredPayload,
	SubsystemMaturityUpdatedPayload,
	SubsystemRetiredPayload,
} from "./subsystem.js";
