import type { EventDomain } from "../../schemas/envelope.js";
import type { InvariantRule } from "./types.js";

/**
 * Registry for invariant rules.
 * Rules are keyed by unique ID; duplicate registration throws.
 */
export class InvariantRegistry {
	private readonly rules = new Map<string, InvariantRule>();

	/** Register a rule. Throws if a rule with the same ID is already registered. */
	register(rule: InvariantRule): void {
		if (this.rules.has(rule.id)) {
			throw new Error(`Duplicate invariant rule ID: "${rule.id}"`);
		}
		this.rules.set(rule.id, rule);
	}

	/** Return all registered rules. */
	getAll(): InvariantRule[] {
		return [...this.rules.values()];
	}

	/**
	 * Return rules applicable to the given domain.
	 * A rule applies if its `appliesTo` includes the domain,
	 * or if `appliesTo` is empty (applies to all domains).
	 */
	getByDomain(domain: EventDomain): InvariantRule[] {
		return [...this.rules.values()].filter(
			(r) => r.appliesTo.length === 0 || r.appliesTo.includes(domain),
		);
	}

	/** Return a rule by ID, or undefined if not found. */
	getById(id: string): InvariantRule | undefined {
		return this.rules.get(id);
	}
}
