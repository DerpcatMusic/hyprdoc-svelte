import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for RADIO_GROUP blocks.
 * AUTO-GENERATED from radio-group.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const radioGroupValidator = v.object({
	id: v.string(),
	type: v.literal('radio_group'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.null()))
});
