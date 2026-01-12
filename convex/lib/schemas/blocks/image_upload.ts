import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for IMAGE_UPLOAD blocks.
 * AUTO-GENERATED from image-upload.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const imageUploadValidator = v.object({
	id: v.string(),
	type: v.literal('image_upload'),
	...commonBlockFields,
	value: v.optional(
		v.union(
			v.string(),
			v.array(v.string()),
			v.object({
				image: v.string(),
				timestamp: v.string(),
				hash: v.optional(v.string())
			}),
			v.null()
		)
	)
});
