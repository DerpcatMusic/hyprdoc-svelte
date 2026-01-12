/**
 * SmartBlockType Enum
 *
 * Block types for smart document fields
 */
export enum SmartBlockType {
	// Rich/Complex
	ADDRESS = 'address',
	FORMULA = 'formula',
	RATING = 'rating',

	// Input Primitives
	DATE_PICKER = 'date_picker',
	EMAIL = 'email',
	LONG_TEXT = 'long_text',
	SMART_NUMBER = 'smart_number',
	SMART_TEXT = 'smart_text',

	// Selection
	CHECKBOX = 'checkbox',
	RADIO_GROUP = 'radio_group',
	SELECT = 'select',

	// Layout/Structural
	CALLOUT = 'callout',
	DATA_GRID = 'data_grid',
	DIVIDER = 'divider',
	SECTION_HEADER = 'section_header',

	// Assets/Compliance
	SIGNATURE = 'signature',
	FILE_UPLOAD = 'file_upload',
	IMAGE_UPLOAD = 'image_upload'
}

export const INPUT_BLOCK_TYPES = new Set([
	SmartBlockType.ADDRESS,
	SmartBlockType.FORMULA,
	SmartBlockType.RATING,
	SmartBlockType.DATE_PICKER,
	SmartBlockType.EMAIL,
	SmartBlockType.LONG_TEXT,
	SmartBlockType.SMART_NUMBER,
	SmartBlockType.SMART_TEXT,
	SmartBlockType.CHECKBOX,
	SmartBlockType.RADIO_GROUP,
	SmartBlockType.SELECT,
	SmartBlockType.SIGNATURE,
	SmartBlockType.FILE_UPLOAD,
	SmartBlockType.IMAGE_UPLOAD
]);
