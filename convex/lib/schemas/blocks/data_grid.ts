import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for DATA_GRID blocks.
 * AUTO-GENERATED from data-grid.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const dataGridValidator = v.object({
	id: v.string(),
	type: v.literal('data_grid'),
	...commonBlockFields,
	value: v.optional(
		v.union(
			v.array(v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()))),
			v.null()
		)
	)
});
