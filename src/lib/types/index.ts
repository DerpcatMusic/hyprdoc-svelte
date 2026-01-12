import { z } from 'zod';

// Re-export from enums
export { SmartBlockType } from './enums';

// --- Zod Schemas ---

export const SlotSchema = z.object({
	id: z.string(),
	name: z.string().min(1, 'Name is required'),
	color: z.string().optional(),
	initials: z.string().max(6).optional().default(''),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	phoneCountryCode: z.string().optional(),
	role: z.string().optional(),
	legalName: z.string().optional(),
	// For envelope signers: references the original template slot ID
	sourceSlotId: z.string().optional()
});

export const DocumentSettingsSchema = z.object({
	fontBody: z.string(),
	fontHeading: z.string(),
	paperColor: z.string(),
	paperTexture: z.string(),
	paperTextureOpacity: z.number().min(0).max(1),
	paperTextureScale: z.number().min(0.1).max(5),
	paperTextureMonochromatic: z.boolean().optional(),
	paperTextureColor: z.string().optional(),
	fontSize: z.number().default(16),
	lineHeight: z.number().default(1.6),
	marginVertical: z.number().min(0),
	marginHorizontal: z.number().min(0),
	marginLeft: z.number().min(0).optional(),
	marginRight: z.number().min(0).optional(),
	pageWidth: z.number().default(794),
	pageHeight: z.number().default(1123),
	showMargins: z.boolean(),
	mirrorMargins: z.boolean(),
	timeFormat: z.enum(['12h', '24h']),
	authEmail: z.boolean().optional(),
	authPhone: z.boolean().optional(),
	realTimeEnabled: z.boolean().optional(),
	measurementUnit: z.enum(['px', 'in', 'mm']).default('px')
});

const BlockValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.array(z.string()),
	z.null(),
	z.undefined(),
	z
		.object({
			image: z.string(),
			timestamp: z.string(),
			hash: z.string().optional()
		})
		.passthrough(),
	z
		.object({
			timestamp: z.string(),
			hash: z.string(),
			slotId: z.string()
		})
		.passthrough()
]);

export const SmartBlockSchema = z.object({
	id: z.string().min(1, 'ID is required'),
	type: z.string(), // Will be resolved from SmartBlockType enum
	label: z.string().min(1, 'Label is required'),

	// Common visual props
	variant: z.string().optional(),
	align: z.enum(['left', 'center', 'right']).optional(),
	description: z.string().optional(),

	// Logic
	slotId: z.string().nullable().optional(),
	linkedBlockId: z.string().nullable().optional(),
	required: z.boolean().default(false),
	variableName: z
		.string()
		.min(1, 'Variable name is required')
		.regex(/^\w+$/, 'Variable name must be alphanumeric (underscores allowed)'),
	value: BlockValueSchema.optional(),

	// Type Specific Configs
	placeholder: z.string().optional(),
	helperText: z.string().optional(),
	width: z.enum(['full', 'half', 'third', 'quarter']).optional().default('full'),
	options: z.array(z.string()).optional(),
	inputType: z.string().optional(),
	currencySymbol: z.string().optional(),
	min: z.number().optional(),
	max: z.number().optional(),
	step: z.number().optional(),
	showSlider: z.boolean().optional(),
	dividerHeight: z.number().optional(),
	fontSize: z.union([z.string(), z.number()]).optional(),
	iconType: z.string().optional(),
	ratingMax: z.number().optional(),
	signatureFont: z.string().optional(),

	// Currency Conversion
	sourceCurrency: z.string().optional().default(''),
	targetCurrency: z.string().optional().default(''),
	conversionMode: z.enum(['manual', 'linked', 'live']).optional(),
	sourceBlockId: z.string().nullable().optional(),
	frozenRate: z.number().nullable().optional().default(null),
	frozenAt: z.string().nullable().optional().default(null),
	manualAmount: z.number().nullable().optional(),
	enableCurrencyConversion: z.boolean().optional().default(false),

	// Phone number
	phoneCountryCode: z.string().optional().default(''),

	// Formula Block
	expression: z.string().optional(),
	decimals: z.number().optional(),
	roundingMode: z.string().optional(),
	prefix: z.string().optional(),
	suffix: z.string().optional(),
	fallbackValue: z.number().optional(),
	showErrorState: z.boolean().optional(),
	showFormula: z.boolean().optional(),
	showBreakdown: z.boolean().optional(),

	// Conditional visibility
	visibilityCondition: z
		.object({
			enabled: z.boolean().default(false),
			sourceBlockId: z.string().optional(),
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
			compareValue: z.string().optional()
		})
		.nullable()
		.optional()
});

// --- Type Exports ---

export type Slot = z.infer<typeof SlotSchema>;
export type DocumentSettings = z.infer<typeof DocumentSettingsSchema>;
export type SmartBlockData = z.infer<typeof SmartBlockSchema>;

/**
 * Simulation context determines the behavior of simulation mode.
 * - 'preview': Template preview, changes are NOT persisted
 * - 'signing': Envelope signing, changes ARE persisted
 */
export interface SimulationContext {
	type: 'preview' | 'signing';
	persistChanges: boolean;
}

/**
 * Signer context for variable resolution in preview/signing mode
 */
export interface SignerContext {
	id: string;
	name: string;
	email: string;
	role: string;
	color: string;
}

/**
 * Field value can be various types depending on block type
 */
export type FieldValue =
	| string
	| number
	| boolean
	| Date
	| { image: string; timestamp: string; hash?: string }
	| null
	| undefined;

/**
 * Map of block IDs to their field values
 */
export type FieldValuesMap = Record<string, FieldValue>;

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
	_id?: string;
	_creationTime?: number;
	workosId?: string;
	actorType: 'user' | 'signer' | 'system';
	documentId?: string;
	resourceType: string;
	resourceId: string;
	action: string;
	level: 'info' | 'warn' | 'error' | 'security';
	metadata?: any;
	timestamp?: string; // For local/legacy support
}
