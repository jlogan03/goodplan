import type { DerivedStateData, Phase } from "../schemas/entities/derived-state.js";
import type { ContentRef } from "../schemas/envelope.js";
import type { DeepReadonly } from "../util/types.js";
import { phaseSpecs } from "./phase-specs.js";
import { estimateTokens } from "./token-estimate.js";
import type {
	AgentType,
	BudgetConfig,
	ContentResolver,
	ContextBundle,
	InlineSection,
	ReferenceSection,
	TokenBudget,
} from "./types.js";

/**
 * Default budget configuration.
 * Per-phase base budgets (tokens) and agent-type multipliers.
 */
export const defaultBudgetConfig: BudgetConfig = {
	phaseBudgets: {
		P0: 10_000,
		P1: 20_000,
		P2: 20_000,
		P3: 20_000,
		P4: 20_000,
		P5: 20_000,
		P6: 10_000,
		P7: 20_000,
		P8: 20_000,
		P9: 20_000,
		P10: 30_000,
		P11: 20_000,
		P12: 10_000,
		S0: 10_000,
		S1: 20_000,
		S2: 20_000,
		S3: 10_000,
	},
	agentMultipliers: {
		phase: 1.0,
		editor: 0.8,
		reviewer: 0.5,
		synthesis: 0.3,
	},
};

/**
 * Resolve a content key to a ContentRef from derived state.
 *
 * Returns undefined if the key doesn't map to an available ContentRef.
 * This is the accessor layer between string keys in phase specs
 * and the actual state structure.
 */
function resolveContentRef(
	state: DeepReadonly<DerivedStateData>,
	key: string,
	scopeRef: string | null,
): ContentRef | undefined {
	if (scopeRef === null) {
		return undefined;
	}

	// Check if this is a slice-scoped key (scopeRef contains "/")
	const slashIdx = scopeRef.indexOf("/");
	const epicDir = slashIdx !== -1 ? scopeRef.slice(0, slashIdx) : scopeRef;
	const sliceDir = slashIdx !== -1 ? scopeRef.slice(slashIdx + 1) : undefined;

	const epic = state.epics.get(epicDir);

	switch (key) {
		case "epic-goal":
			return epic?.goal ?? undefined;

		case "architecture-target":
			return epic?.architectureTarget ?? undefined;

		case "pressure-test-findings":
			return epic?.pressureTest ?? undefined;

		case "slice-goal": {
			if (sliceDir !== undefined && epic !== undefined) {
				const slice = epic.slices.get(sliceDir);
				return slice?.goal ?? undefined;
			}
			return undefined;
		}

		case "slice-plan":
		case "plan-chunks": {
			if (sliceDir !== undefined && epic !== undefined) {
				const slice = epic.slices.get(sliceDir);
				return slice?.plan ?? undefined;
			}
			return undefined;
		}

		case "epic-summary":
			// Epic summary is synthesized from goal — use goal ContentRef as proxy
			return epic?.goal ?? undefined;

		case "slice-set":
			return epic?.sliceSet ?? undefined;

		default:
			// Keys like "architecture-current", "conventions", "subsystem-registry",
			// "active-decisions", etc. don't have ContentRef in DerivedStateData.
			// They are filesystem-based and the caller's ContentResolver handles them
			// by path convention, not by ContentRef lookup.
			return undefined;
	}
}

/**
 * Get a reference path and summary for a reference key.
 * Returns undefined for unknown keys.
 */
function getReferenceInfo(key: string): { path: string; summary: string } | undefined {
	switch (key) {
		case "architecture-current":
			return {
				path: ".goodplan/architecture-current.md",
				summary: "Current architecture baseline — what the codebase IS today",
			};
		case "architecture-target":
			return {
				path: "architecture-target.md",
				summary: "Target architecture — what the codebase is BECOMING in this epic",
			};
		case "conventions":
			return {
				path: ".goodplan/conventions.md",
				summary: "Project conventions: tech stack, coding style, repo structure",
			};
		case "subsystem-docs":
			return {
				path: ".goodplan/architecture/",
				summary: "Subsystem documentation files with maturity levels and interfaces",
			};
		case "prior-exploration-cycles":
			return {
				path: ".goodplan/exploration/",
				summary: "Prior exploration cycle artifacts and conclusions",
			};
		case "prior-architecture-drafts":
			return {
				path: ".goodplan/architecture/drafts/",
				summary: "Previous architecture draft versions for reference",
			};
		case "other-slice-plans":
			return {
				path: ".goodplan/slices/",
				summary: "Plans from other slices in this epic",
			};
		case "slice-details":
			return {
				path: ".goodplan/slices/",
				summary: "Full slice detail breakdowns including goals and status",
			};
		case "test-output":
			return {
				path: ".goodplan/test-output/",
				summary: "Test execution output from latest runs",
			};
		case "learnings":
			return {
				path: ".goodplan/learnings/",
				summary: "Learning entries for reconciliation and knowledge transfer",
			};
		case "recent-learnings":
			return {
				path: ".goodplan/learnings/",
				summary: "Recent learning entries from completed work",
			};
		case "exploration-artifacts":
			return {
				path: ".goodplan/exploration/",
				summary: "Exploration artifacts: research notes, brainstorm outputs",
			};
		default:
			return undefined;
	}
}

/**
 * Build a context bundle for a given phase and scope.
 *
 * The bundler is a pure computation module. It reads from DerivedStateData
 * and uses the injected ContentResolver for I/O (reading actual content).
 *
 * Budget allocation order:
 * 1. Mandatory inline sections first (first key in inlineKeys)
 * 2. Priority-ordered inlines next
 * 3. Remaining budget allocated to reference reserve
 * 4. If mandatory sections exceed budget, include them anyway (warn but do not truncate)
 *
 * Reference sections are always included regardless of budget.
 */
export function buildContextBundle(
	state: DeepReadonly<DerivedStateData>,
	phase: Phase,
	scopeRef: string | null,
	resolveContent: ContentResolver,
	agentType?: AgentType,
): ContextBundle {
	const spec = phaseSpecs[phase];
	const effectiveAgentType: AgentType = agentType ?? "phase";
	const baseBudget = defaultBudgetConfig.phaseBudgets[phase];
	const multiplier = defaultBudgetConfig.agentMultipliers[effectiveAgentType];
	const totalBudget = Math.floor(baseBudget * multiplier);

	// Build inline sections
	const inlineSections: InlineSection[] = [];
	let inlineUsed = 0;

	for (const key of spec.inlineKeys) {
		const ref = resolveContentRef(state, key, scopeRef);
		let content = "";

		if (ref !== undefined) {
			try {
				content = resolveContent(ref);
			} catch {
				// ContentResolver failed — produce empty section
				content = "";
			}
		}

		// If no ContentRef was found, the key might be a filesystem-based key.
		// The caller can provide a ContentResolver that handles path-based lookups.
		// For now, we include empty sections for missing content.

		const tokens = estimateTokens(content);
		const isMandatory = spec.inlineKeys[0] === key;

		if (content.length > 0) {
			if (isMandatory || inlineUsed + tokens <= totalBudget) {
				inlineSections.push({ key, content, estimatedTokens: tokens });
				inlineUsed += tokens;
			}
			// If not mandatory and exceeds budget, skip this inline section
		} else {
			// Include empty section so callers know the key was attempted
			inlineSections.push({ key, content: "", estimatedTokens: 0 });
		}
	}

	// Build reference sections (always included, never budget-limited)
	const referenceSections: ReferenceSection[] = [];
	let referenceReserve = 0;

	for (const key of spec.referenceKeys) {
		const info = getReferenceInfo(key);
		if (info !== undefined) {
			// Estimate tokens for the reference content (if it were expanded)
			const ref = resolveContentRef(state, key, scopeRef);
			let refTokens = 0;
			if (ref !== undefined) {
				try {
					const refContent = resolveContent(ref);
					refTokens = estimateTokens(refContent);
				} catch {
					refTokens = 0;
				}
			}
			referenceSections.push({
				key,
				path: info.path,
				summary: info.summary,
				estimatedTokens: refTokens,
			});
			referenceReserve += refTokens;
		}
	}

	const tokenBudget: TokenBudget = {
		total: totalBudget,
		inlineUsed,
		referenceReserve,
		remaining: Math.max(0, totalBudget - inlineUsed),
	};

	return {
		phase,
		scopeRef,
		inline: inlineSections,
		references: referenceSections,
		tokenBudget,
	};
}
