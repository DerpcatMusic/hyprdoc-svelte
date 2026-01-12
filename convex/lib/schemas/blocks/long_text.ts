import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for LONG_TEXT blocks.
 * AUTO-GENERATED from long-text.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const longTextValidator = v.object({
	id: v.string(),
	type: v.literal('long_text'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.null()))
});
