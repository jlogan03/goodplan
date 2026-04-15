import { describe, expect, it } from "vitest";
import type { ReviewerPayload } from "../../src/schemas/trust/reviewer-payload.js";
import type { ArtifactEditor } from "../../src/trust/interfaces/artifact-editor.js";
import type {
	ReviewerDispatcher,
	ReviewerError,
} from "../../src/trust/interfaces/reviewer-dispatcher.js";
import type {
	RefinementLoopOptions,
	RoundCompleteData,
	SynthesizedFeedback,
} from "../../src/trust/refinement-loop-types.js";
import { runRefinementLoop } from "../../src/trust/refinement-loop.js";

/** Helper: create a passing reviewer payload */
function passingPayload(reviewerId: string): ReviewerPayload {
	return {
		reviewerId,
		dimensions: [
			{ name: "completeness", score: 0.9, threshold: 0.7, passed: true },
			{ name: "clarity", score: 0.85, threshold: 0.7, passed: true },
		],
		findings: [],
		rationale: "All looks good.",
	};
}

/** Helper: create a failing reviewer payload */
function failingPayload(reviewerId: string): ReviewerPayload {
	return {
		reviewerId,
		dimensions: [
			{ name: "completeness", score: 0.4, threshold: 0.7, passed: false },
			{ name: "clarity", score: 0.5, threshold: 0.7, passed: false },
		],
		findings: [
			{
				severity: "CRITICAL",
				dimension: "completeness",
				description: "Missing key sections in the artifact.",
			},
		],
		rationale: "Needs significant improvement.",
	};
}

/** Helper: create base options for the refinement loop */
function baseOptions(overrides: Partial<RefinementLoopOptions>): RefinementLoopOptions {
	const noopEditor: ArtifactEditor = {
		async edit(content: string, _feedback: SynthesizedFeedback): Promise<string> {
			return `${content}\n[edited]`;
		},
	};

	return {
		artifactType: "plan",
		artifactContent: "# Test Artifact\nSome content.",
		reviewerIds: ["reviewer-a", "reviewer-b"],
		convergenceConfig: {
			maxRounds: 3,
			stagnationWindow: 2,
			disagreementThreshold: 0.5,
			reductionThreshold: 0.1,
		},
		rubric: {
			dimensions: [
				{ name: "completeness", threshold: 0.7 },
				{ name: "clarity", threshold: 0.7 },
			],
		},
		relevanceWeights: new Map([
			["reviewer-a", "high"],
			["reviewer-b", "medium"],
		]),
		dispatcher: {
			async dispatch(): Promise<(ReviewerPayload | ReviewerError)[]> {
				return [];
			},
		},
		editor: noopEditor,
		...overrides,
	};
}

describe("runRefinementLoop", () => {
	it("converges after one round with passing scores", async () => {
		const dispatcher: ReviewerDispatcher = {
			async dispatch(): Promise<(ReviewerPayload | ReviewerError)[]> {
				return [passingPayload("reviewer-a"), passingPayload("reviewer-b")];
			},
		};

		const result = await runRefinementLoop(baseOptions({ dispatcher }));

		expect(result.converged).toBe(true);
		expect(result.rounds).toBe(1);
		expect(result.convergenceResult.state).toBe("CONVERGED");
		expect(result.circuitBreakerResult.triggered).toBe(false);
		expect(result.finalContent).toBe("# Test Artifact\nSome content.");
	});

	it("converges after two rounds when editor fixes issues", async () => {
		let dispatchCount = 0;
		const dispatcher: ReviewerDispatcher = {
			async dispatch(): Promise<(ReviewerPayload | ReviewerError)[]> {
				dispatchCount += 1;
				if (dispatchCount === 1) {
					return [failingPayload("reviewer-a"), failingPayload("reviewer-b")];
				}
				return [passingPayload("reviewer-a"), passingPayload("reviewer-b")];
			},
		};

		const editor: ArtifactEditor = {
			async edit(content: string, _feedback: SynthesizedFeedback): Promise<string> {
				return `${content}\n[fixed]`;
			},
		};

		const result = await runRefinementLoop(baseOptions({ dispatcher, editor }));

		expect(result.converged).toBe(true);
		expect(result.rounds).toBe(2);
		expect(result.finalContent).toContain("[fixed]");
	});

	it("circuit-breaks on max rounds when reviewer always fails", async () => {
		const dispatcher: ReviewerDispatcher = {
			async dispatch(): Promise<(ReviewerPayload | ReviewerError)[]> {
				return [failingPayload("reviewer-a"), failingPayload("reviewer-b")];
			},
		};

		const result = await runRefinementLoop(baseOptions({ dispatcher }));

		expect(result.converged).toBe(false);
		expect(result.convergenceResult.state).toBe("CIRCUIT-BROKEN");
		expect(result.circuitBreakerResult.triggered).toBe(true);
		if (result.circuitBreakerResult.triggered) {
			expect(result.circuitBreakerResult.reason.type).toBe("stuck-finding");
		}
	});

	it("circuit-breaks with stuck-finding when same finding persists", async () => {
		const dispatcher: ReviewerDispatcher = {
			async dispatch(): Promise<(ReviewerPayload | ReviewerError)[]> {
				return [
					{
						reviewerId: "reviewer-a",
						dimensions: [{ name: "completeness", score: 0.5, threshold: 0.7, passed: false }],
						findings: [
							{
								severity: "CRITICAL",
								dimension: "completeness",
								description: "Missing section X",
							},
						],
						rationale: "Still missing.",
					},
				];
			},
		};

		const result = await runRefinementLoop(
			baseOptions({
				dispatcher,
				convergenceConfig: {
					maxRounds: 5,
					stagnationWindow: 2,
					disagreementThreshold: 0.5,
					reductionThreshold: 0.1,
				},
			}),
		);

		expect(result.converged).toBe(false);
		expect(result.circuitBreakerResult.triggered).toBe(true);
		if (result.circuitBreakerResult.triggered) {
			expect(result.circuitBreakerResult.reason.type).toBe("stuck-finding");
			if (result.circuitBreakerResult.reason.type === "stuck-finding") {
				expect(result.circuitBreakerResult.reason.persistedRounds).toBe(2);
			}
		}
	});

	it("proceeds with partial results when some reviewers fail", async () => {
		const dispatcher: ReviewerDispatcher = {
			async dispatch(): Promise<(ReviewerPayload | ReviewerError)[]> {
				return [passingPayload("reviewer-a"), { reviewerId: "reviewer-b", error: "LLM timeout" }];
			},
		};

		const roundData: RoundCompleteData[] = [];
		const result = await runRefinementLoop(
			baseOptions({
				dispatcher,
				onRoundComplete: (data) => roundData.push(data),
			}),
		);

		expect(result.converged).toBe(true);
		expect(result.rounds).toBe(1);
		expect(roundData).toHaveLength(1);
		const firstRound = roundData[0];
		expect(firstRound).toBeDefined();
		if (firstRound !== undefined) {
			expect(firstRound.payloadCount).toBe(1);
			expect(firstRound.errorCount).toBe(1);
		}
	});

	it("fires onRoundComplete callback with correct round data", async () => {
		let dispatchCount = 0;
		const dispatcher: ReviewerDispatcher = {
			async dispatch(): Promise<(ReviewerPayload | ReviewerError)[]> {
				dispatchCount += 1;
				if (dispatchCount === 1) {
					return [failingPayload("reviewer-a")];
				}
				return [passingPayload("reviewer-a")];
			},
		};

		const roundData: RoundCompleteData[] = [];
		const result = await runRefinementLoop(
			baseOptions({
				dispatcher,
				onRoundComplete: (data) => roundData.push(data),
			}),
		);

		expect(result.rounds).toBe(2);
		expect(roundData).toHaveLength(2);

		const first = roundData[0];
		expect(first).toBeDefined();
		if (first !== undefined) {
			expect(first.round).toBe(1);
			expect(first.payloadCount).toBe(1);
			expect(first.errorCount).toBe(0);
			expect(first.convergenceResult.state).toBe("CONTINUE");
		}

		const second = roundData[1];
		expect(second).toBeDefined();
		if (second !== undefined) {
			expect(second.round).toBe(2);
			expect(second.convergenceResult.state).toBe("CONVERGED");
		}
	});
});
