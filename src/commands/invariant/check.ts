import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { replayEvents } from "../../engine/events/replay.js";
import {
	buildCheckContext,
	checkInvariants,
	createCoreRegistry,
} from "../../engine/invariants/index.js";
import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * Per-invariant result for structured output.
 */
interface InvariantResultItem {
	invariantId: string;
	passed: boolean;
	message: string;
}

/**
 * Violation subset for structured output.
 */
interface InvariantViolationItem {
	invariantId: string;
	message: string;
	severity: string;
}

/**
 * `gp invariant:check` — run all active invariants against current event log.
 *
 * Replays the event log, checking each event against applicable invariant rules
 * with the context of all preceding events (same approach as the before-append hook).
 * Returns structured results consumable by reviewer-invariant-checker.
 */
export const invariantCheckCommand = defineCommand({
	meta: {
		name: "invariant:check",
		description: "Run all active invariants and return structured results.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const projectEventsPath = `${goodplanDir}/events.jsonl`;
		const { events } = await replayEvents({ eventsPath: projectEventsPath });
		const state = computeDerivedState(events);

		const registry = createCoreRegistry();
		const rules = registry.getAll();

		// Track per-rule violations across the entire event log.
		// For each event, build context from preceding events only (mirrors before-append).
		const ruleViolations = new Map<string, string>();
		const preceding: AnyEventEnvelope[] = [];

		for (const event of events) {
			const ctx = buildCheckContext(preceding, state);
			const applicableRules = rules.filter(
				(r) => r.appliesTo.length === 0 || r.appliesTo.includes(event.domain),
			);
			const result = checkInvariants(event, ctx, applicableRules);
			if (!result.passed) {
				for (const v of result.violations) {
					ruleViolations.set(v.ruleId, v.message);
				}
			}
			preceding.push(event);
		}

		const results: InvariantResultItem[] = [];
		const violations: InvariantViolationItem[] = [];

		for (const rule of rules) {
			const violationMsg = ruleViolations.get(rule.id);
			if (violationMsg !== undefined) {
				results.push({
					invariantId: rule.id,
					passed: false,
					message: violationMsg,
				});
				violations.push({
					invariantId: rule.id,
					message: violationMsg,
					severity: "error",
				});
			} else {
				results.push({
					invariantId: rule.id,
					passed: true,
					message: "OK",
				});
			}
		}

		const allPassed = violations.length === 0;

		if (args.json || args.query) {
			output(
				{
					ok: true,
					passed: allPassed,
					results,
					violations,
				},
				args,
			);
		} else if (!args.quiet) {
			if (allPassed) {
				output(`${pc.green("All invariants passed")} (${results.length} checked)`, args);
			} else {
				const lines: string[] = [];
				lines.push(
					`${pc.red("Invariant violations found")}: ${violations.length} of ${results.length} rules failed`,
				);
				for (const v of violations) {
					lines.push(`  ${pc.red("FAIL")} ${pc.bold(v.invariantId)}: ${v.message}`);
				}
				output(lines.join("\n"), args);
			}
		}
	},
});
