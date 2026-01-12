import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for FORMULA blocks.
 * AUTO-GENERATED from formula.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const formulaValidator = v.object({
	id: v.string(),
	type: v.literal('formula'),
	...commonBlockFields,
	expression: v.optional(v.string()),
	decimals: v.optional(v.float64()),
	roundingMode: v.string(),
	prefix: v.optional(v.string()),
	suffix: v.optional(v.string()),
	fallbackValue: v.optional(v.float64()),
	showErrorState: v.optional(v.boolean()),
	showFormula: v.optional(v.boolean()),
	showBreakdown: v.optional(v.boolean()),

	value: v.optional(v.union(v.string(), v.float64(), v.boolean(), v.null()))
});
