import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for DATE_PICKER blocks.
 * AUTO-GENERATED from date-picker.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const datePickerValidator = v.object({
	id: v.string(),
	type: v.literal('date_picker'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.null()))
});
