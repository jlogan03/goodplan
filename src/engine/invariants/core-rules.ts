import { InvariantRegistry } from "./registry.js";
import { briefingWrittenAtPause } from "./rules/briefing.js";
import { chunkEvidenceNonEmpty, chunkRedTestFailedBeforeGreen } from "./rules/chunk.js";
import {
	epicAllSlicesLandedBeforeComplete,
	epicArchitectureShapeApprovalRequired,
	epicArchitectureTargetRequiredBeforeSliceSet,
	epicDirUnique,
	epicGoalCommittedBeforeExplore,
	epicPressureTestRequiredBeforeSliceSet,
	epicSingleActivePerBranch,
	epicSliceShapeApprovalRequired,
} from "./rules/epic.js";
import { pressureTestFindingsAllAcceptedBeforeSliceSet } from "./rules/pressure-test.js";
import { projectExists } from "./rules/project.js";
import { refinementBarMatchesRubric } from "./rules/refinement.js";
import { sideQuestSingleActivePerBranch } from "./rules/side-quest.js";
import {
	sliceChunksAllDecidedBeforeCodeRefine,
	sliceCodeRefinementConvergedBeforeLand,
	sliceDepsLandedBeforeStart,
	slicePlanChunksDecidable,
	slicePlanConvergedBeforeImplement,
	slicePlanShapeApprovalRequired,
	sliceSingleActivePerBranch,
} from "./rules/slice.js";
import { spineWriteOnlyViaMilestone } from "./rules/spine.js";
import { eventPrevIdChain } from "./rules/structural.js";

/**
 * Create an InvariantRegistry pre-loaded with all 24 core invariant rules.
 */
export function createCoreRegistry(): InvariantRegistry {
	const registry = new InvariantRegistry();

	// Project rules (1)
	registry.register(projectExists);

	// Epic rules (8)
	registry.register(epicSingleActivePerBranch);
	registry.register(epicDirUnique);
	registry.register(epicGoalCommittedBeforeExplore);
	registry.register(epicArchitectureTargetRequiredBeforeSliceSet);
	registry.register(epicPressureTestRequiredBeforeSliceSet);
	registry.register(epicArchitectureShapeApprovalRequired);
	registry.register(epicSliceShapeApprovalRequired);
	registry.register(epicAllSlicesLandedBeforeComplete);

	// Slice rules (7)
	registry.register(sliceSingleActivePerBranch);
	registry.register(slicePlanShapeApprovalRequired);
	registry.register(slicePlanConvergedBeforeImplement);
	registry.register(slicePlanChunksDecidable);
	registry.register(sliceChunksAllDecidedBeforeCodeRefine);
	registry.register(sliceCodeRefinementConvergedBeforeLand);
	registry.register(sliceDepsLandedBeforeStart);

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
