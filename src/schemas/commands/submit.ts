import { z } from "zod";

/**
 * Zod schemas for submit-* command inputs.
 * Validated at the CLI boundary before routing to RPC submit().
 *
 * Two categories:
 * 1. No-stdin commands (plan, implementation, explore, architecture, slices):
 *    Accept empty object (TTY fast-path) + target name from flags.
 * 2. Stdin-with-scores commands (refinement, refine-architecture, refine-slices):
 *    Require { scores: Record<string, number> } from stdin + target from flags.
 */

// ── Slice/quest target schemas (submit-plan, submit-refinement, submit-implementation) ──

export const submitPlanInputSchema = z
	.object({
		slice: z.string().min(1).optional(),
		quest: z.string().min(1).optional(),
	})
	.refine((d) => (d.slice !== undefined) !== (d.quest !== undefined), {
		message: "Exactly one of --slice or --quest is required",
	});
export type SubmitPlanInput = z.infer<typeof submitPlanInputSchema>;

export const submitRefinementInputSchema = z
	.object({
		slice: z.string().min(1).optional(),
		quest: z.string().min(1).optional(),
		scores: z.record(z.string(), z.number()),
	})
	.refine((d) => (d.slice !== undefined) !== (d.quest !== undefined), {
		message: "Exactly one of --slice or --quest is required",
	});
export type SubmitRefinementInput = z.infer<typeof submitRefinementInputSchema>;

export const submitImplementationInputSchema = z
	.object({
		slice: z.string().min(1).optional(),
		quest: z.string().min(1).optional(),
		phase: z.coerce.number().int().min(0).optional(),
	})
	.refine((d) => (d.slice !== undefined) !== (d.quest !== undefined), {
		message: "Exactly one of --slice or --quest is required",
	});
export type SubmitImplementationInput = z.infer<typeof submitImplementationInputSchema>;

// ── Epic target schemas (submit-explore, submit-architecture, submit-slices, submit-refine-*) ──

export const submitExploreInputSchema = z
	.object({
		epic: z.string().min(1).optional(),
		quest: z.string().min(1).optional(),
	})
	.refine((d) => (d.epic !== undefined) !== (d.quest !== undefined), {
		message: "Exactly one of --epic or --quest is required",
	});
export type SubmitExploreInput = z.infer<typeof submitExploreInputSchema>;

export const submitArchitectureInputSchema = z.object({
	epic: z.string().min(1, "epic is required"),
});
export type SubmitArchitectureInput = z.infer<typeof submitArchitectureInputSchema>;

export const submitSlicesInputSchema = z.object({
	epic: z.string().min(1, "epic is required"),
});
export type SubmitSlicesInput = z.infer<typeof submitSlicesInputSchema>;

export const submitRefineArchitectureInputSchema = z.object({
	epic: z.string().min(1, "epic is required"),
	scores: z.record(z.string(), z.number()),
});
export type SubmitRefineArchitectureInput = z.infer<typeof submitRefineArchitectureInputSchema>;

export const submitRefineSlicesInputSchema = z.object({
	epic: z.string().min(1, "epic is required"),
	scores: z.record(z.string(), z.number()),
});
export type SubmitRefineSlicesInput = z.infer<typeof submitRefineSlicesInputSchema>;
