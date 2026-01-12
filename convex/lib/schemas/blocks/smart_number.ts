import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for SMART_NUMBER blocks.
 * AUTO-GENERATED from smart-number.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const smartNumberValidator = v.object({
	id: v.string(),
	type: v.literal('smart_number'),
	...commonBlockFields,
	phoneCountryCode: v.optional(v.string()),
	enableCurrencyConversion: v.optional(v.boolean()),

	value: v.optional(v.union(v.float64(), v.string(), v.null()))
});
