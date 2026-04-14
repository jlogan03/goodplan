import { InvariantRegistry } from "./registry.js";
import { briefingWrittenAtPause } from "./rules/briefing.js";
import { chunkEvidenceNonEmpty, chunkRedTestFailedBeforeGreen } from "./rules/chunk.js";
import {
	epicAllSlicesLandedBeforeComplete,
	epicArchitectureShapeApprovalRequired,
	epicArchitectureTargetRequiredBeforeSliceSet,
	epicDirUnique,
	epicExplorationConcludedBeforeArchitecture,
	epicGoalCommittedBeforeExplore,
	epicGoalDraftedBeforeCommit,
	epicNotAbandoned,
	epicNotAlreadyPaused,
	epicNotAlreadyResumed,
	epicNotCompleted,
	epicPressureTestRequiredBeforeSliceSet,
	epicSingleActivePerBranch,
	epicSliceSetCommittedBeforeActivate,
	epicSliceShapeApprovalRequired,
} from "./rules/epic.js";
import { pressureTestFindingsAllAcceptedBeforeSliceSet } from "./rules/pressure-test.js";
import { projectExists } from "./rules/project.js";
import { refinementBarMatchesRubric } from "./rules/refinement.js";
import { sideQuestSingleActivePerBranch } from "./rules/side-quest.js";
import {
	sliceChunksAllDecidedBeforeCodeRefine,
	sliceCodeRefinementConvergedBeforeLand,
	sliceCodeRefinementStartedBeforeConverged,
	sliceCreatedBeforePlan,
	sliceDepsLandedBeforeStart,
	sliceImplementationStartedBeforeChunk,
	slicePlanChunksDecidable,
	slicePlanConvergedBeforeImplement,
	slicePlanDraftedBeforeCommit,
	slicePlanDraftedBeforeShape,
	slicePlanShapeApprovalRequired,
	slicePlanShapeCheckpointActive,
	sliceSingleActivePerBranch,
} from "./rules/slice.js";
import { spineWriteOnlyViaMilestone } from "./rules/spine.js";
import { eventPrevIdChain } from "./rules/structural.js";

/**
 * Create an InvariantRegistry pre-loaded with all 25 core invariant rules.
 */
export function createCoreRegistry(): InvariantRegistry {
	const registry = new InvariantRegistry();

	// Project rules (1)
	registry.register(projectExists);

	// Epic rules (12)
	registry.register(epicSingleActivePerBranch);
	registry.register(epicDirUnique);
	registry.register(epicGoalDraftedBeforeCommit);
	registry.register(epicGoalCommittedBeforeExplore);
	registry.register(epicExplorationConcludedBeforeArchitecture);
	registry.register(epicArchitectureTargetRequiredBeforeSliceSet);
	registry.register(epicPressureTestRequiredBeforeSliceSet);
	registry.register(epicArchitectureShapeApprovalRequired);
	registry.register(epicSliceShapeApprovalRequired);
	registry.register(epicSliceSetCommittedBeforeActivate);
	registry.register(epicAllSlicesLandedBeforeComplete);
	registry.register(epicNotAlreadyPaused);
	registry.register(epicNotAlreadyResumed);
	registry.register(epicNotAbandoned);
	registry.register(epicNotCompleted);

	// Slice rules (12)
	registry.register(sliceSingleActivePerBranch);
	registry.register(sliceCreatedBeforePlan);
	registry.register(slicePlanDraftedBeforeCommit);
	registry.register(slicePlanDraftedBeforeShape);
	registry.register(slicePlanShapeApprovalRequired);
	registry.register(slicePlanShapeCheckpointActive);
	registry.register(slicePlanConvergedBeforeImplement);
	registry.register(slicePlanChunksDecidable);
	registry.register(sliceChunksAllDecidedBeforeCodeRefine);
	registry.register(sliceCodeRefinementStartedBeforeConverged);
	registry.register(sliceCodeRefinementConvergedBeforeLand);
	registry.register(sliceDepsLandedBeforeStart);
	registry.register(sliceImplementationStartedBeforeChunk);

	// Side-quest rules (1)
	registry.register(sideQuestSingleActivePerBranch);

	// Chunk rules (2)
	registry.register(chunkEvidenceNonEmpty);
	registry.register(chunkRedTestFailedBeforeGreen);

	// Refinement rules (1)
	registry.register(refinementBarMatchesRubric);

	// Spine rules (1)
	registry.register(spineWriteOnlyViaMilestone);

	// Structural rules (1)
	registry.register(eventPrevIdChain);

	// Pressure-test rules (1)
	registry.register(pressureTestFindingsAllAcceptedBeforeSliceSet);

	// Briefing rules (1)
	registry.register(briefingWrittenAtPause);

	return registry;
}
