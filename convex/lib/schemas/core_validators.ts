import { v } from 'convex/values';

// Inline definition to avoid circular dependency
const defaultSignerFieldValidator = v.object({
	type: v.string(),
	label: v.string(),
	required: v.boolean(),
	placeholder: v.optional(v.string()),
	options: v.optional(v.array(v.string())),
	order: v.optional(v.number())
});

/**
 * Validator for document-wide visual and behavioral settings.
 */
export const documentSettingsValidator = v.object({
	fontBody: v.string(),
	fontHeading: v.string(),
	paperColor: v.string(),
	paperTexture: v.string(),
	paperTextureOpacity: v.number(),
	paperTextureScale: v.number(),
	paperTextureMonochromatic: v.optional(v.boolean()),
	paperTextureColor: v.optional(v.string()),
	marginVertical: v.number(),
	marginHorizontal: v.number(),
	marginLeft: v.optional(v.number()),
	marginRight: v.optional(v.number()),
	pageWidth: v.optional(v.number()),
	pageHeight: v.optional(v.number()),
	showMargins: v.boolean(),
	mirrorMargins: v.boolean(),
	timeFormat: v.union(v.literal('12h'), v.literal('24h')),
	authEmail: v.optional(v.boolean()),
	authPhone: v.optional(v.boolean()),
	isPublic: v.optional(v.boolean()),
	realTimeEnabled: v.optional(v.boolean()),
	description: v.optional(v.string()),
	category: v.optional(v.string()),
	defaultSignerFields: v.optional(v.array(defaultSignerFieldValidator)),
	measurementUnit: v.optional(v.union(v.literal('px'), v.literal('in'), v.literal('mm')))
});

/**
 * Validator for partial document settings updates.
 * All fields are optional to allow patching.
 */
export const partialDocumentSettingsValidator = v.object({
	fontBody: v.optional(v.string()),
	fontHeading: v.optional(v.string()),
	paperColor: v.optional(v.string()),
	paperTexture: v.optional(v.string()),
	paperTextureOpacity: v.optional(v.number()),
	paperTextureScale: v.optional(v.number()),
	paperTextureMonochromatic: v.optional(v.boolean()),
	paperTextureColor: v.optional(v.string()),
	marginVertical: v.optional(v.number()),
	marginHorizontal: v.optional(v.number()),
	marginLeft: v.optional(v.number()),
	marginRight: v.optional(v.number()),
	pageWidth: v.optional(v.number()),
	pageHeight: v.optional(v.number()),
	showMargins: v.optional(v.boolean()),
	mirrorMargins: v.optional(v.boolean()),
	timeFormat: v.optional(v.union(v.literal('12h'), v.literal('24h'))),
	authEmail: v.optional(v.boolean()),
	authPhone: v.optional(v.boolean()),
	isPublic: v.optional(v.boolean()),
	realTimeEnabled: v.optional(v.boolean()),
	description: v.optional(v.string()),
	category: v.optional(v.string()),
	defaultSignerFields: v.optional(v.array(defaultSignerFieldValidator)),
	measurementUnit: v.optional(v.union(v.literal('px'), v.literal('in'), v.literal('mm')))
});

/**
 * Validator for signer-provided field values.
 */
export const fieldValuesValidator = v.record(
	v.string(), // blockId
	v.union(
		v.string(),
		v.number(),
		v.boolean(),
		v.null(),
		v.array(v.string()),
		v.object({
			image: v.string(),
			timestamp: v.string(),
			hash: v.optional(v.string())
		}),
		v.object({
			timestamp: v.string(),
			hash: v.string(),
			slotId: v.string()
		})
	)
);
