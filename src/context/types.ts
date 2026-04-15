import { z } from "zod";
import type { Phase } from "../schemas/entities/derived-state.js";
import type { ContentRef } from "../schemas/envelope.js";

/**
 * Agent type determines budget multiplier for context bundles.
 */
export const AgentTypeSchema = z.enum(["phase", "editor", "reviewer", "synthesis"]);
export type AgentType = z.infer<typeof AgentTypeSchema>;

/**
 * ContentResolver reads content from a ContentRef.
 * Injected by the caller to keep the bundler pure and testable.
 */
export type ContentResolver = (ref: ContentRef) => string;

/**
 * A section whose full content is inlined in the prompt.
 */
export interface InlineSection {
	key: string;
	content: string;
	estimatedTokens: number;
}

/**
 * A section referenced by path + summary, expandable on demand.
 */
export interface ReferenceSection {
	key: string;
	path: string;
	summary: string;
	estimatedTokens: number;
}

/**
 * Token budget tracking for a context bundle.
 */
export interface TokenBudget {
	total: number;
	inlineUsed: number;
	referenceReserve: number;
	remaining: number;
}

/**
 * Per-phase base budgets and agent-type multipliers.
 */
export interface BudgetConfig {
	phaseBudgets: Record<Phase, number>;
	agentMultipliers: Record<AgentType, number>;
}

/**
 * Assembled context bundle for a specific phase and scope.
 */
export interface ContextBundle {
	phase: Phase;
	scopeRef: string | null;
	inline: InlineSection[];
	references: ReferenceSection[];
	tokenBudget: TokenBudget;
}

/**
 * Specification for a single phase's inline/reference content.
 */
export interface PhaseSpec {
	inlineKeys: string[];
	referenceKeys: string[];
}
