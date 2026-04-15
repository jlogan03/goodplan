/**
 * Deep recursive Readonly utility type.
 * Handles Map, Set, Array, and plain objects.
 * Primitives pass through unchanged.
 */
export type DeepReadonly<T> = T extends Map<infer K, infer V>
	? ReadonlyMap<K, DeepReadonly<V>>
	: T extends Set<infer U>
		? ReadonlySet<DeepReadonly<U>>
		: T extends ReadonlyArray<infer U>
			? ReadonlyArray<DeepReadonly<U>>
			: T extends object
				? { readonly [K in keyof T]: DeepReadonly<T[K]> }
				: T;
