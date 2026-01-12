import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for RATING blocks.
 * AUTO-GENERATED from rating.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const ratingValidator = v.object({
	id: v.string(),
	type: v.literal('rating'),
	...commonBlockFields,
	value: v.optional(v.union(v.float64(), v.null()))
});
