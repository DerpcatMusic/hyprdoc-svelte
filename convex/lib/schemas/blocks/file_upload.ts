import { v } from 'convex/values';
import { commonBlockFields } from './common';

/**
 * Validator for FILE_UPLOAD blocks.
 * AUTO-GENERATED from file-upload.block.tsx
 * Run: bun tools/generate-blocks.ts
 */
export const fileUploadValidator = v.object({
	id: v.string(),
	type: v.literal('file_upload'),
	...commonBlockFields,
	value: v.optional(v.union(v.string(), v.array(v.string()), v.null()))
});
