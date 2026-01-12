import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for SECTION_HEADER blocks.
 * AUTO-GENERATED from section-header.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const sectionHeaderValidator = v.object({
	id: v.string(),
	type: v.literal('section_header'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.null()))
});
