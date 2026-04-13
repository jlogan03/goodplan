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

export {
	BriefingEventMap,
	briefingWrittenPayloadSchema,
} from "./briefing.js";
export type {
	BriefingEventType,
	BriefingEventPayload,
	BriefingWrittenPayload,
} from "./briefing.js";

export {
	FindingEventMap,
	findingCapturedPayloadSchema,
	findingTriagedPayloadSchema,
} from "./finding.js";
export type {
	FindingEventType,
	FindingEventPayload,
	FindingCapturedPayload,
	FindingTriagedPayload,
} from "./finding.js";

export {
	InvariantEventMap,
	invariantProposedPayloadSchema,
	invariantActivatedPayloadSchema,
	invariantDeactivatedPayloadSchema,
} from "./invariant.js";
export type {
	InvariantEventType,
	InvariantEventPayload,
	InvariantProposedPayload,
	InvariantActivatedPayload,
	InvariantDeactivatedPayload,
} from "./invariant.js";

export {
	RefinementEventMap,
	refinementRoundStartedPayloadSchema,
	reviewerScoredPayloadSchema,
	refinementSynthesizedPayloadSchema,
	artifactRevisedPayloadSchema,
	refinementConvergedPayloadSchema,
	refinementCircuitBreakerTrippedPayloadSchema,
	convergenceOverriddenPayloadSchema,
} from "./refinement.js";
export type {
	RefinementEventType,
	RefinementEventPayload,
	RefinementRoundStartedPayload,
	ReviewerScoredPayload,
	RefinementSynthesizedPayload,
	ArtifactRevisedPayload,
	RefinementConvergedPayload,
	RefinementCircuitBreakerTrippedPayload,
	ConvergenceOverriddenPayload,
} from "./refinement.js";

export {
	DecisionEventMap,
	decisionRecordedPayloadSchema,
	decisionSupersededPayloadSchema,
} from "./decision.js";
export type {
	DecisionEventType,
	DecisionEventPayload,
	DecisionRecordedPayload,
	DecisionSupersededPayload,
} from "./decision.js";

export {
	LearningEventMap,
	learningCapturedPayloadSchema,
	learningPromotedPayloadSchema,
} from "./learning.js";
export type {
	LearningEventType,
	LearningEventPayload,
	LearningCapturedPayload,
	LearningPromotedPayload,
} from "./learning.js";

export {
	SideQuestEventMap,
	sideQuestCreatedPayloadSchema,
	sideQuestGoalCommittedPayloadSchema,
	sideQuestPlanDraftedPayloadSchema,
	sideQuestPlanShapeApprovedPayloadSchema,
	sideQuestPlanCommittedPayloadSchema,
	sideQuestImplementationStartedPayloadSchema,
	sideQuestChunkStartedPayloadSchema,
	sideQuestChunkVerifiedPayloadSchema,
	sideQuestLandedPayloadSchema,
	sideQuestAbandonedPayloadSchema,
} from "./side-quest.js";
export type {
	SideQuestEventType,
	SideQuestEventPayload,
	SideQuestCreatedPayload,
	SideQuestGoalCommittedPayload,
	SideQuestPlanDraftedPayload,
	SideQuestPlanShapeApprovedPayload,
	SideQuestPlanCommittedPayload,
	SideQuestImplementationStartedPayload,
	SideQuestChunkStartedPayload,
	SideQuestChunkVerifiedPayload,
	SideQuestLandedPayload,
	SideQuestAbandonedPayload,
} from "./side-quest.js";
