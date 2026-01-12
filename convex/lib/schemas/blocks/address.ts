import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for ADDRESS blocks.
 * AUTO-GENERATED from address.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const addressValidator = v.object({
	id: v.string(),
	type: v.literal('address'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.null()))
});
