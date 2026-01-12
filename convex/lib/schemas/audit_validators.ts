import { v } from 'convex/values';

/**
 * Validator for audit log metadata.
 * Covers all known metadata shapes used in the codebase.
 * Values can be primitives, arrays, or field change objects.
 */
export const auditMetadataValidator = v.optional(v.record(v.string(), v.any()));

/**
 * Validator for field change tracking (previousValue, newValue).
 * Used in audit logs for tracking signer field changes.
 */
export const fieldChangeValueValidator = v.union(
	v.string(),
	v.number(),
	v.boolean(),
	v.null(),
	v.array(v.string()),
	// Signature value shape
	v.object({
		image: v.string(),
		timestamp: v.union(v.string(), v.number()),
		hash: v.optional(v.string())
	}),
	// Clock value shape (for date/time signing blocks)
	v.object({
		timestamp: v.string(),
		hash: v.string(),
		slotId: v.string()
	}),
	// Generic object for complex field types
	v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()))
);

/**
 * Validator for AI template metadata.
 */
export const aiTemplateMetadataValidator = v.optional(
	v.object({
		jurisdiction: v.optional(v.string()),
		industry: v.optional(v.string()),
		language: v.optional(v.string()),
		version: v.optional(v.string()),
		tags: v.optional(v.array(v.string()))
	})
);

/**
 * Validator for default signer fields in document settings.
 */
export const defaultSignerFieldValidator = v.object({
	type: v.string(),
	label: v.string(),
	required: v.boolean(),
	placeholder: v.optional(v.string()),
	options: v.optional(v.array(v.string()))
});

export const defaultSignerFieldsValidator = v.optional(v.array(defaultSignerFieldValidator));
