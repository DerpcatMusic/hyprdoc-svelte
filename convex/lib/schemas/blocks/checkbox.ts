import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for CHECKBOX blocks.
 * AUTO-GENERATED from checkbox.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const checkboxValidator = v.object({
	id: v.string(),
	type: v.literal('checkbox'),
	...commonBlockFields,
	value: v.optional(v.union(v.boolean(), v.null()))
});
