Hand-writing interfaces alongside Zod schemas creates drift risk. Using `z.infer<typeof schema>` as function return types eliminates this class of bug. Caught in Phase 1 review.
