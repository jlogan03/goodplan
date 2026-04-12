import { defineCommand } from "citty";
import { briefingLatestCommand } from "./briefing/latest.js";
import { briefingWriteCommand } from "./briefing/write.js";
import { decisionCreateCommand } from "./decision/create.js";
import { decisionListCommand } from "./decision/list.js";
import { decisionShowCommand } from "./decision/show.js";
import { decisionUpdateCommand } from "./decision/update.js";
import { epicAbandonCommand } from "./epic/abandon.js";
import { epicActivateCommand } from "./epic/activate.js";
import { epicArchitectureCommitCommand } from "./epic/architecture-commit.js";
import { epicArchitectureDraftCommand } from "./epic/architecture-draft.js";
import { epicArchitectureShapeApproveCommand } from "./epic/architecture-shape-approve.js";
import { epicArchitectureShapeAutoCommand } from "./epic/architecture-shape-auto.js";
import { epicArchitectureShapeStartCommand } from "./epic/architecture-shape-start.js";
import { epicBrainstormCaptureCommand } from "./epic/brainstorm-capture.js";
import { epicCompleteCommand } from "./epic/complete.js";
import { epicCreateCommand } from "./epic/create.js";
import { epicExploreConcludeCommand } from "./epic/explore-conclude.js";
import { epicExploreStartCommand } from "./epic/explore-start.js";
import { epicGoalCommitCommand } from "./epic/goal-commit.js";
import { epicGoalDraftCommand } from "./epic/goal-draft.js";
import { epicListCommand } from "./epic/list.js";
import { epicPauseCommand } from "./epic/pause.js";
import { epicPressureTestCommitCommand } from "./epic/pressure-test-commit.js";
import { epicPressureTestDraftCommand } from "./epic/pressure-test-draft.js";
import { epicPressureTestFindingDispositionCommand } from "./epic/pressure-test-finding-disposition.js";
import { epicResearchCaptureCommand } from "./epic/research-capture.js";
import { epicResumeCommand } from "./epic/resume.js";
import { epicSetSteeringCommand } from "./epic/set-steering.js";
import { epicShowCommand } from "./epic/show.js";
import { epicSliceSetShapeApproveCommand } from "./epic/slice-set-shape-approve.js";
import { epicSliceSetShapeAutoCommand } from "./epic/slice-set-shape-auto.js";
import { epicSliceSetShapeStartCommand } from "./epic/slice-set-shape-start.js";
import { epicSlicesCommitCommand } from "./epic/slices-commit.js";
import { epicSlicesDraftCommand } from "./epic/slices-draft.js";
import { eventsQueryCommand } from "./events/query.js";
import { eventsTailCommand } from "./events/tail.js";
import { findingCaptureCommand } from "./finding/capture.js";
import { findingListCommand } from "./finding/list.js";
import { findingTriageCommand } from "./finding/triage.js";
import { globalArgs } from "./global-args.js";
import { initCommand } from "./global/init.js";
import { migrateCommand } from "./global/migrate.js";
import { schemaCommand } from "./global/schema.js";
import { stateCommand } from "./global/state.js";
import { statusCommand } from "./global/status.js";
import { verifyCommand } from "./global/verify.js";
import { invariantActivateCommand } from "./invariant/activate.js";
import { invariantCheckCommand } from "./invariant/check.js";
import { invariantDeactivateCommand } from "./invariant/deactivate.js";
import { invariantListCommand } from "./invariant/list.js";
import { invariantProposeCommand } from "./invariant/propose.js";
import { learningListCommand } from "./learning/list.js";
import { learningRollupCommand } from "./learning/rollup.js";
import { projectSetSteeringCommand } from "./project/set-steering.js";
import { projectShowCommand } from "./project/show.js";
import { questAbandonCommand } from "./quest/abandon.js";
import { questCompleteCommand } from "./quest/complete.js";
import { questCreateCommand } from "./quest/create.js";
import { questExploreCommand } from "./quest/explore.js";
import { questImplementCommand } from "./quest/implement.js";
import { questListCommand } from "./quest/list.js";
import { questPlanCommand } from "./quest/plan.js";
import { questRefinePlanCommand } from "./quest/refine-plan.js";
import { questShowCommand } from "./quest/show.js";
import { reviewerListCommand } from "./reviewer/list.js";
import { reviewerShowCommand } from "./reviewer/show.js";
import { rubricListCommand } from "./rubric/list.js";
import { rubricShowCommand } from "./rubric/show.js";
import { rubricValidateCommand } from "./rubric/validate.js";
import { sliceAbandonCommand } from "./slice/abandon.js";
import { sliceChunkDecideCommand } from "./slice/chunk-decide.js";
import { sliceChunkGreenCommand } from "./slice/chunk-green.js";
import { sliceChunkRedFailedCommand } from "./slice/chunk-red-failed.js";
import { sliceChunkRedWrittenCommand } from "./slice/chunk-red-written.js";
import { sliceChunkStartCommand } from "./slice/chunk-start.js";
import { sliceChunkUnverifiableCommand } from "./slice/chunk-unverifiable.js";
import { sliceChunkVerifyCommand } from "./slice/chunk-verify.js";
import { sliceCodeRefineCommitCommand } from "./slice/code-refine-commit.js";
import { sliceCodeRefineStartCommand } from "./slice/code-refine-start.js";
import { sliceCreateCommand } from "./slice/create.js";
import { sliceImplementStartCommand } from "./slice/implement-start.js";
import { sliceLandCommand } from "./slice/land.js";
import { sliceListCommand } from "./slice/list.js";
import { slicePlanCommitCommand } from "./slice/plan-commit.js";
import { slicePlanDraftCommand } from "./slice/plan-draft.js";
import { slicePlanShapeApproveCommand } from "./slice/plan-shape-approve.js";
import { slicePlanShapeAutoCommand } from "./slice/plan-shape-auto.js";
import { slicePlanShapeReviseCommand } from "./slice/plan-shape-revise.js";
import { slicePlanShapeStartCommand } from "./slice/plan-shape-start.js";
import { sliceShowCommand } from "./slice/show.js";
import { startImplementationCommand } from "./subagent/start-implementation.js";
import { startPlanCommand } from "./subagent/start-plan.js";
import { startRefinementCommand } from "./subagent/start-refinement.js";
import { submitImplementationCommand } from "./subagent/submit-implementation.js";
import { submitPlanCommand } from "./subagent/submit-plan.js";
import { submitRefinementCommand } from "./subagent/submit-refinement.js";
import { subsystemListCommand } from "./subsystem/list.js";
import { subsystemRegisterCommand } from "./subsystem/register.js";
import { subsystemRetireCommand } from "./subsystem/retire.js";
import { subsystemShowCommand } from "./subsystem/show.js";
import { subsystemUpdateMaturityCommand } from "./subsystem/update-maturity.js";
import { taskConvertCommand } from "./task/convert.js";
import { taskCreateCommand } from "./task/create.js";
import { taskDropCommand } from "./task/drop.js";
import { taskListCommand } from "./task/list.js";
import { taskShowCommand } from "./task/show.js";

/**
 * Main gp command. Subcommands are registered here.
 * Uses flat colon-namespaced keys for entity commands (e.g., "epic:create").
 */
export const mainCommand = defineCommand({
	meta: {
		name: "gp",
		description: "Project workflow CLI for structured development with LLMs",
	},
	args: {
		...globalArgs,
	},
	subCommands: {
		init: initCommand,
		migrate: migrateCommand,
		schema: schemaCommand,
		state: stateCommand,
		status: statusCommand,
		verify: verifyCommand,
		"decision:create": decisionCreateCommand,
		"decision:list": decisionListCommand,
		"decision:show": decisionShowCommand,
		"decision:update": decisionUpdateCommand,
		"events:tail": eventsTailCommand,
		"events:query": eventsQueryCommand,
		"epic:create": epicCreateCommand,
		"epic:list": epicListCommand,
		"epic:show": epicShowCommand,
		"epic:goal-draft": epicGoalDraftCommand,
		"epic:goal-commit": epicGoalCommitCommand,
		"epic:explore-start": epicExploreStartCommand,
		"epic:explore-conclude": epicExploreConcludeCommand,
		"epic:research-capture": epicResearchCaptureCommand,
		"epic:brainstorm-capture": epicBrainstormCaptureCommand,
		"epic:architecture-draft": epicArchitectureDraftCommand,
		"epic:architecture-commit": epicArchitectureCommitCommand,
		"epic:architecture-shape-start": epicArchitectureShapeStartCommand,
		"epic:architecture-shape-approve": epicArchitectureShapeApproveCommand,
		"epic:architecture-shape-auto": epicArchitectureShapeAutoCommand,
		"epic:pressure-test-draft": epicPressureTestDraftCommand,
		"epic:pressure-test-commit": epicPressureTestCommitCommand,
		"epic:pressure-test-finding-disposition": epicPressureTestFindingDispositionCommand,
		"epic:slices-draft": epicSlicesDraftCommand,
		"epic:slices-commit": epicSlicesCommitCommand,
		"epic:slice-set-shape-start": epicSliceSetShapeStartCommand,
		"epic:slice-set-shape-approve": epicSliceSetShapeApproveCommand,
		"epic:slice-set-shape-auto": epicSliceSetShapeAutoCommand,
		"epic:set-steering": epicSetSteeringCommand,
		"epic:pause": epicPauseCommand,
		"epic:resume": epicResumeCommand,
		"epic:activate": epicActivateCommand,
		"epic:complete": epicCompleteCommand,
		"epic:abandon": epicAbandonCommand,
		"learning:list": learningListCommand,
		"learning:rollup": learningRollupCommand,
		"reviewer:list": reviewerListCommand,
		"reviewer:show": reviewerShowCommand,
		"rubric:list": rubricListCommand,
		"rubric:show": rubricShowCommand,
		"rubric:validate": rubricValidateCommand,
		"quest:create": questCreateCommand,
		"quest:list": questListCommand,
		"quest:show": questShowCommand,
		"quest:explore": questExploreCommand,
		"quest:plan": questPlanCommand,
		"quest:refine-plan": questRefinePlanCommand,
		"quest:implement": questImplementCommand,
		"quest:complete": questCompleteCommand,
		"quest:abandon": questAbandonCommand,
		"task:create": taskCreateCommand,
		"task:list": taskListCommand,
		"task:show": taskShowCommand,
		"task:drop": taskDropCommand,
		"task:convert": taskConvertCommand,
		"slice:create": sliceCreateCommand,
		"slice:list": sliceListCommand,
		"slice:show": sliceShowCommand,
		"slice:abandon": sliceAbandonCommand,
		"slice:plan-draft": slicePlanDraftCommand,
		"slice:plan-commit": slicePlanCommitCommand,
		"slice:plan-shape-start": slicePlanShapeStartCommand,
		"slice:plan-shape-revise": slicePlanShapeReviseCommand,
		"slice:plan-shape-approve": slicePlanShapeApproveCommand,
		"slice:plan-shape-auto": slicePlanShapeAutoCommand,
		"slice:implement-start": sliceImplementStartCommand,
		"slice:chunk-start": sliceChunkStartCommand,
		"slice:chunk-red-written": sliceChunkRedWrittenCommand,
		"slice:chunk-red-failed": sliceChunkRedFailedCommand,
		"slice:chunk-green": sliceChunkGreenCommand,
		"slice:chunk-verify": sliceChunkVerifyCommand,
		"slice:chunk-unverifiable": sliceChunkUnverifiableCommand,
		"slice:chunk-decide": sliceChunkDecideCommand,
		"slice:code-refine-start": sliceCodeRefineStartCommand,
		"slice:code-refine-commit": sliceCodeRefineCommitCommand,
		"slice:land": sliceLandCommand,
		"finding:capture": findingCaptureCommand,
		"finding:list": findingListCommand,
		"finding:triage": findingTriageCommand,
		"invariant:list": invariantListCommand,
		"invariant:check": invariantCheckCommand,
		"invariant:propose": invariantProposeCommand,
		"invariant:activate": invariantActivateCommand,
		"invariant:deactivate": invariantDeactivateCommand,
		"briefing:write": briefingWriteCommand,
		"briefing:latest": briefingLatestCommand,
		"project:show": projectShowCommand,
		"project:set-steering": projectSetSteeringCommand,
		"subsystem:register": subsystemRegisterCommand,
		"subsystem:list": subsystemListCommand,
		"subsystem:show": subsystemShowCommand,
		"subsystem:update-maturity": subsystemUpdateMaturityCommand,
		"subsystem:retire": subsystemRetireCommand,
		"start-plan": startPlanCommand,
		"start-refinement": startRefinementCommand,
		"start-implementation": startImplementationCommand,
		"submit-plan": submitPlanCommand,
		"submit-refinement": submitRefinementCommand,
		"submit-implementation": submitImplementationCommand,
	},
});
