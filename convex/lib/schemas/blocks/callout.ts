import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for CALLOUT blocks.
 * AUTO-GENERATED from callout.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const calloutValidator = v.object({
	id: v.string(),
	type: v.literal('callout'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.null()))
});
