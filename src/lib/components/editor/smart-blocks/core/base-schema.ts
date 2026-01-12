/**
 * Base Block Schema
 *
 * Core properties shared by ALL blocks. This is the foundation
 * that block-specific schemas extend.
 */
import { z } from 'zod';

/**
 * Condition schema for block visibility (experimental)
 */
export const BlockConditionSchema = z.object({
	enabled: z.boolean().default(false),
	sourceBlockId: z.string().optional(), // Block to check value from
	operator: z
		.enum([
			'equals',
			'not_equals',
			'greater_than',
			'greater_or_equal',
			'less_than',
			'less_or_equal',
			'contains',
			'not_contains',
			'is_empty',
			'is_not_empty'
		])
		.default('equals'),
	compareValue: z.string().optional() // Value to compare against
});

export type BlockCondition = z.infer<typeof BlockConditionSchema>;

/**
 * Core properties every block must have
 */
export const BaseBlockSchema = z.object({
	// Identity
	id: z.string(),
	type: z.string(),

	// Display
	label: z.string().default('New Field'),
	placeholder: z.string().optional().default(''),
	description: z.string().optional().default(''),

	// Validation
	required: z.boolean().default(false),

	// Variable binding
	variableName: z.string().default('var_name'),

	// Slot assignment
	slotId: z.string().nullable().optional().default(null),

	// Data binding
	linkedBlockId: z.string().nullable().optional().default(null),

	// Current value
	value: z.any().nullable().default(null),

	// Smart block variant support
	inputType: z.string().optional(),
	currencySymbol: z.string().optional(),

	// Phone number support
	phoneCountryCode: z.string().optional().default(''),

	// Currency conversion support
	enableCurrencyConversion: z.boolean().optional().default(false),
	sourceCurrency: z.string().optional().default(''),
	targetCurrency: z.string().optional().default(''),
	frozenRate: z.number().nullable().optional().default(null),
	frozenAt: z.string().nullable().optional().default(null),

	// Conditional visibility (experimental)
	visibilityCondition: BlockConditionSchema.optional()
});

export type BaseBlockData = z.infer<typeof BaseBlockSchema>;

/**
 * Convert Zod schema to Tiptap-compatible attributes
 * Uses the schema's parse with empty object to get all defaults
 */
export function zodToTiptapAttributes<T extends z.ZodRawShape>(
	schema: z.ZodObject<T>
): Record<string, { default: unknown }> {
	// Parse with empty object gets all defaults
	const defaults = schema.parse({}) as Record<string, unknown>;
	const attrs: Record<string, { default: unknown }> = {};

	for (const key of Object.keys(defaults)) {
		attrs[key] = { default: defaults[key] };
	}

	return attrs;
}

/**
 * Extract defaults from a Zod schema by parsing empty object
 */
export function getSchemaDefaults<T extends z.ZodRawShape>(schema: z.ZodObject<T>): z.infer<z.ZodObject<T>> {
	return schema.parse({});
}
