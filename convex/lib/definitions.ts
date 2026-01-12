/**
 * Central Definitions for Block Capabilities.
 * 
 * This file acts as the single source of truth for "Logical" block properties,
 * while schema validators (block_registry.ts) handle "Structural" properties.
 */

export const INPUT_BLOCK_TYPES = [
	'address',
	'file_upload',
	'formula',
	'image_upload',
	'rating',
	'signature',
	'date_picker',
	'email',
	'long_text',
	'smart_number',
	'smart_text',
	'checkbox',
	'radio_group',
	'select'
] as const;

export const INPUT_BLOCK_TYPE_SET = new Set<string>(INPUT_BLOCK_TYPES);

export const LAYOUT_BLOCK_TYPES = [
	'callout',
	'divider',
	'section_header',
	'data_grid'
] as const;

export const LAYOUT_BLOCK_TYPE_SET = new Set<string>(LAYOUT_BLOCK_TYPES);
