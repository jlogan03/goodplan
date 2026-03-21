import { z } from "zod";

export const errorSchema = z.object({
	code: z.string(),
	message: z.string(),
	detail: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
});

/**
 * The `detail` field is `string | Record<string, unknown>`, optional (absent from output when
 * not provided). With `exactOptionalPropertyTypes: true`, callers must omit the field rather
 * than passing `detail: undefined`.
 */

export type ErrorOutput = z.infer<typeof errorSchema>;
