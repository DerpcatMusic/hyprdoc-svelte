import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for SMART_TEXT blocks.
 * AUTO-GENERATED from smart-text.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const smartTextValidator = v.object({
	id: v.string(),
	type: v.literal('smart_text'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.null()))
});
