import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import type {
	CheckContext,
	InvariantCheckResult,
	InvariantRule,
	InvariantViolation,
} from "./types.js";

/**
 * Run all applicable invariant rules against an event and its context.
 * Collects all violations (does not short-circuit on first failure).
 * Returns a discriminated union: `{ passed: true }` or `{ passed: false, violations }`.
 */
export function checkInvariants(
	event: AnyEventEnvelope,
	ctx: CheckContext,
	rules: InvariantRule[],
): InvariantCheckResult {
	const violations: InvariantViolation[] = [];

	for (const rule of rules) {
		const data = rule.check(event, ctx);
		if (data !== null) {
			violations.push({
				ruleId: rule.id,
				message: data.message,
				...(data.context !== undefined ? { context: data.context } : {}),
			});
		}
	}

	if (violations.length === 0) {
		return { passed: true };
	}
	return { passed: false, violations };
}
