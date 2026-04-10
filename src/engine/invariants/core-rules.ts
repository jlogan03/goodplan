import { InvariantRegistry } from "./registry.js";
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
import { projectExists } from "./rules/project.js";
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

/**
 * Create an InvariantRegistry pre-loaded with the 17 entity-lifecycle
 * invariant rules. Phase 3 will extend this to register all 24 core rules.
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

	return registry;
}
