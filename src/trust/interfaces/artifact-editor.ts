import type { SynthesizedFeedback } from "../refinement-loop-types.js";

/**
 * Port interface for editing artifacts based on synthesized feedback.
 * The trust layer defines this port; skills provide implementations
 * that call LLMs or other editing backends.
 */
export interface ArtifactEditor {
	/**
	 * Edit the artifact content based on synthesized feedback.
	 * Returns the updated artifact content.
	 */
	edit(artifactContent: string, feedback: SynthesizedFeedback): Promise<string>;
}
