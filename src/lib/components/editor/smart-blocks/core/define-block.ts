import type { BlockCategory, BlockConfig, BlockDefinition } from './types';

/**
 * Extract default values from Zod schema
 */
function extractDefaults(schema: any): Record<string, any> {
	const defaults: Record<string, any> = {};

	if (schema._def?.typeName === 'ZodObject') {
		const shape = schema._def.shape();
		for (const [key, fieldSchema] of Object.entries(shape as Record<string, any>)) {
			if (fieldSchema._def?.defaultValue !== undefined) {
				defaults[key] = fieldSchema._def.defaultValue();
			} else if (fieldSchema._def?.innerType?._def?.defaultValue !== undefined) {
				defaults[key] = fieldSchema._def.innerType._def.defaultValue();
			}
		}
	}

	return defaults;
}

/**
 * Define a smart block with automatic defaults extraction
 *
 * @example
 * ```ts
 * export default defineBlock({
 *   type: 'smart-text',
 *   label: 'Smart Text',
 *   category: 'essentials',
 *   icon: 'lucide:text',
 *   schema: SmartTextSchema,
 * });
 * ```
 */
export function defineBlock(config: BlockConfig): BlockDefinition {
	const defaults = config.defaults ?? extractDefaults(config.schema);
	
	// Helper to determine if a block can be assigned to a signer
	const assignable = config.assignable ?? !['layout', 'finance'].includes(config.category as string);

	return {
		...config,
		category: config.category as BlockCategory,
		defaults,
		assignable
	} as BlockDefinition;
}
