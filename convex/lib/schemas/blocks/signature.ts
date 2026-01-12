import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for SIGNATURE blocks.
 * AUTO-GENERATED from signature.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const signatureValidator = v.object({
	id: v.string(),
	type: v.literal('signature'),
	...commonBlockFields,
	value: v.optional(
		v.union(
			v.string(),
			v.object({
				image: v.string(),
				timestamp: v.string(),
				hash: v.optional(v.string()),
				signedBy: v.optional(v.string()),
				signatureType: v.optional(v.string())
			}),
			v.object({
				timestamp: v.string(),
				hash: v.string(),
				slotId: v.string()
			}),
			v.null()
		)
	)
});
