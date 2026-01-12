import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for EMAIL blocks.
 * AUTO-GENERATED from email.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const emailValidator = v.object({
	id: v.string(),
	type: v.literal('email'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.null()))
});
