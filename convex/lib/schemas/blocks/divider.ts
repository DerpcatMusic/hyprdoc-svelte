import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for DIVIDER blocks.
 * AUTO-GENERATED from divider.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const dividerValidator = v.object({
	id: v.string(),
	type: v.literal('divider'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.null()))
});
