import { describe, expect, it } from "vitest";
import type { ReviewerPayload } from "../../src/schemas/trust/reviewer-payload.js";
import { synthesizeFeedback } from "../../src/trust/feedback-synthesizer.js";

function makePayload(
	reviewerId: string,
	findings: ReviewerPayload["findings"],
	dimensions: ReviewerPayload["dimensions"],
): ReviewerPayload {
	return {
		reviewerId,
		findings,
		dimensions,
		rationale: "Test rationale.",
	};
}

describe("synthesizeFeedback", () => {
	it("deduplicates findings with same three-field key across reviewers", () => {
		const payloads: ReviewerPayload[] = [
			makePayload(
				"reviewer-a",
				[
					{
						severity: "CRITICAL",
						dimension: "completeness",
						description: "Missing section on error handling",
					},
				],
				[{ name: "completeness", score: 0.5, threshold: 0.7, passed: false }],
			),
			makePayload(
				"reviewer-b",
				[
					{
						severity: "CRITICAL",
						dimension: "completeness",
						description: "Missing section on error handling",
					},
				],
				[{ name: "completeness", score: 0.6, threshold: 0.7, passed: false }],
			),
		];

		const result = synthesizeFeedback(payloads);

		expect(result.findings).toHaveLength(1);
		const finding = result.findings[0];
		expect(finding).toBeDefined();
		if (finding !== undefined) {
			expect(finding.severity).toBe("CRITICAL");
			expect(finding.mergedCount).toBe(2);
		}
	});

	it("keeps distinct findings with different descriptions", () => {
		const payloads: ReviewerPayload[] = [
			makePayload(
				"reviewer-a",
				[
					{
						severity: "CRITICAL",
						dimension: "completeness",
						description: "Missing section on error handling",
					},
				],
				[],
			),
			makePayload(
				"reviewer-b",
				[
					{
						severity: "CRITICAL",
						dimension: "completeness",
						description: "Missing section on security model",
					},
				],
				[],
			),
		];

		const result = synthesizeFeedback(payloads);
		expect(result.findings).toHaveLength(2);
	});

	it("sorts findings by severity: BLOCKING > CRITICAL > IMPORTANT > MINOR", () => {
		const payloads: ReviewerPayload[] = [
			makePayload(
				"reviewer-a",
				[
					{ severity: "MINOR", dimension: "style", description: "Typo in heading" },
					{ severity: "BLOCKING", dimension: "scope", description: "Out of scope" },
					{ severity: "IMPORTANT", dimension: "clarity", description: "Ambiguous wording" },
					{ severity: "CRITICAL", dimension: "completeness", description: "Missing section" },
				],
				[],
			),
		];

		const result = synthesizeFeedback(payloads);

		expect(result.findings).toHaveLength(4);
		const severities = result.findings.map((f) => f.severity);
		expect(severities).toEqual(["BLOCKING", "CRITICAL", "IMPORTANT", "MINOR"]);
	});

	it("aggregates dimension scores across reviewers", () => {
		const payloads: ReviewerPayload[] = [
			makePayload(
				"reviewer-a",
				[],
				[{ name: "completeness", score: 0.6, threshold: 0.7, passed: false }],
			),
			makePayload(
				"reviewer-b",
				[],
				[{ name: "completeness", score: 0.8, threshold: 0.7, passed: true }],
			),
		];

		const result = synthesizeFeedback(payloads);

		expect(result.dimensions).toHaveLength(1);
		const dim = result.dimensions[0];
		expect(dim).toBeDefined();
		if (dim !== undefined) {
			expect(dim.name).toBe("completeness");
			expect(dim.score).toBe(0.7);
			expect(dim.threshold).toBe(0.7);
			expect(dim.passed).toBe(true);
		}
	});

	it("normalizes whitespace and case in description for dedup", () => {
		const payloads: ReviewerPayload[] = [
			makePayload(
				"reviewer-a",
				[
					{
						severity: "CRITICAL",
						dimension: "completeness",
						description: "Missing  Section   on Error  Handling",
					},
				],
				[],
			),
			makePayload(
				"reviewer-b",
				[
					{
						severity: "CRITICAL",
						dimension: "completeness",
						description: "missing section on error handling",
					},
				],
				[],
			),
		];

		const result = synthesizeFeedback(payloads);

		expect(result.findings).toHaveLength(1);
		const finding = result.findings[0];
		expect(finding).toBeDefined();
		if (finding !== undefined) {
			expect(finding.mergedCount).toBe(2);
		}
	});
});
