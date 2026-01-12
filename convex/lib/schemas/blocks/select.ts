import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for SELECT blocks.
 * AUTO-GENERATED from select.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const selectValidator = v.object({
	id: v.string(),
	type: v.literal('select'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.array(v.string()), v.null()))
});
