import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createReviewerRegistry } from "../../../src/trust/reviewers/loader.js";
import { routeReviewers } from "../../../src/trust/reviewers/routing.js";

const PLUGIN_DIR = resolve(import.meta.dirname, "../../../plugin");

describe("routeReviewers", () => {
	it("for artifact type 'plan' returns always-on trio + plan-specific reviewers", () => {
		const registry = createReviewerRegistry(PLUGIN_DIR);
		const routes = routeReviewers(registry, "plan", [], "experimental");
		const ids = routes.map((r) => r.reviewerId);

		// Always-on reviewers
		expect(ids).toContain("reviewer-holistic");
		expect(ids).toContain("reviewer-agent-skill");
		expect(ids).toContain("reviewer-software-architecture");
	});

	it("for artifact type 'code' returns always-on trio + code-quality reviewers", () => {
		const registry = createReviewerRegistry(PLUGIN_DIR);
		const routes = routeReviewers(registry, "code", [], "experimental");
		const ids = routes.map((r) => r.reviewerId);

		// Always-on
		expect(ids).toContain("reviewer-holistic");
		expect(ids).toContain("reviewer-agent-skill");

		// Code-specific
		expect(ids).toContain("reviewer-typescript");
	});

	it("for artifact type 'code' with subsystem hints includes domain-matched reviewers", () => {
		const registry = createReviewerRegistry(PLUGIN_DIR);
		const routes = routeReviewers(registry, "code", ["database", "schema-design"], "experimental");
		const ids = routes.map((r) => r.reviewerId);

		expect(ids).toContain("reviewer-data-layer");
	});

	it("holistic reviewer always present regardless of artifact type", () => {
		const registry = createReviewerRegistry(PLUGIN_DIR);
		const artifactTypes = [
			"plan",
			"architecture",
			"goal",
			"slice-set",
			"pressure-test",
			"code",
		] as const;
		for (const artifactType of artifactTypes) {
			const routes = routeReviewers(registry, artifactType, [], "experimental");
			const ids = routes.map((r) => r.reviewerId);
			expect(ids).toContain("reviewer-holistic");
		}
	});

	it("relevance weights assigned correctly (always-on = 'high')", () => {
		const registry = createReviewerRegistry(PLUGIN_DIR);
		const routes = routeReviewers(registry, "plan", [], "experimental");

		const holistic = routes.find((r) => r.reviewerId === "reviewer-holistic");
		expect(holistic?.relevance).toBe("high");

		const agentSkill = routes.find((r) => r.reviewerId === "reviewer-agent-skill");
		expect(agentSkill?.relevance).toBe("high");
	});

	it("routes are sorted by relevance (high first)", () => {
		const registry = createReviewerRegistry(PLUGIN_DIR);
		const routes = routeReviewers(registry, "code", ["database"], "experimental");

		const order = { high: 0, medium: 1, low: 2 };
		for (let i = 1; i < routes.length; i++) {
			const prev = routes[i - 1];
			const curr = routes[i];
			if (prev !== undefined && curr !== undefined) {
				expect(order[prev.relevance]).toBeLessThanOrEqual(order[curr.relevance]);
			}
		}
	});

	it("returns deduplicated entries", () => {
		const registry = createReviewerRegistry(PLUGIN_DIR);
		const routes = routeReviewers(registry, "code", ["typescript", "type-safety"], "experimental");
		const ids = routes.map((r) => r.reviewerId);
		const uniqueIds = [...new Set(ids)];
		expect(ids.length).toBe(uniqueIds.length);
	});
});
