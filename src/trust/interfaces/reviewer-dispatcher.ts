import type { ReviewerPayload } from "../../schemas/trust/reviewer-payload.js";

/**
 * Represents a single reviewer that failed during dispatch
 * (LLM timeout, malformed output, etc.).
 */
export interface ReviewerError {
	reviewerId: string;
	error: string;
}

/**
 * Port interface for dispatching reviewers.
 * The trust layer defines this port; skills provide implementations
 * that call LLMs or other review backends.
 */
export interface ReviewerDispatcher {
	/**
	 * Dispatch reviewers to evaluate artifact content.
	 * Returns a mixed array of successful payloads and errors,
	 * so the loop can proceed with partial results when individual reviewers fail.
	 */
	dispatch(
		artifactContent: string,
		reviewerIds: string[],
	): Promise<(ReviewerPayload | ReviewerError)[]>;
}
