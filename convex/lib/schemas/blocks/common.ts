import { v } from 'convex/values';

/**
 * Universal fields present on ALL blocks due to frontend architecture.
 * These are accepted as optional on all block types to prevent validation errors.
 */
export const commonBlockFields = {
	// Visual/Style
	variant: v.optional(v.string()),
	iconType: v.optional(v.string()),
	fontSize: v.optional(v.union(v.string(), v.float64())),
	align: v.optional(v.union(v.literal('left'), v.literal('center'), v.literal('right'))),
	placeholder: v.optional(v.string()),
	description: v.optional(v.string()),
	label: v.string(), // Almost all blocks have label, usually required

	// Logic/Linkage
	variableName: v.string(), // Required for all smart blocks
	linkedBlockId: v.optional(v.union(v.string(), v.null())),
	slotId: v.optional(v.union(v.string(), v.null())), // For templates: links block to slot
	required: v.optional(v.boolean()),

	// Layout
	dividerHeight: v.optional(v.float64()),

	// Input Constraints
	min: v.optional(v.float64()),
	max: v.optional(v.float64()),
	step: v.optional(v.float64()),
	showSlider: v.optional(v.boolean()),
	options: v.optional(v.array(v.string())),
	ratingMax: v.optional(v.float64()),

	// Signature
	signatureFont: v.optional(v.string()),

	// Currency / Finance
	sourceCurrency: v.optional(v.string()),
	targetCurrency: v.optional(v.string()),
	conversionMode: v.optional(v.union(v.literal('manual'), v.literal('linked'), v.literal('live'))),
	sourceBlockId: v.optional(v.union(v.string(), v.null())),
	frozenRate: v.optional(v.union(v.float64(), v.null())),
	frozenAt: v.optional(v.union(v.string(), v.null())),
	manualAmount: v.optional(v.union(v.float64(), v.null())),
	enableCurrencyConversion: v.optional(v.boolean()),

	// Phone support
	phoneCountryCode: v.optional(v.string()),

	// Input type variant
	inputType: v.optional(v.string()),
	currencySymbol: v.optional(v.string()),

	// Conditional Logic
	visibilityCondition: v.optional(
		v.union(
			v.null(),
			v.object({
				enabled: v.boolean(),
				sourceBlockId: v.optional(v.string()),
				operator: v.string(),
				compareValue: v.optional(v.string())
			})
		)
	)
};
