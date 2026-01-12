/**
 * Annotation Mapper Module
 *
 * Maps PDF AcroForm annotations to SmartBlock nodes.
 * Handles all field types: Text, Checkbox, Radio, Select, Signature.
 */

import { v4 as uuidv4 } from 'uuid';
import { SmartBlockType } from '$lib/types/enums';
import type { NormalizedFieldItem, PDFAnnotation, TiptapSmartBlockNode } from './pdf-types';

// ═══════════════════════════════════════════════════════════════════════════
// Field Type Detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine SmartBlockType from PDF annotation
 */
export function getSmartBlockType(annot: PDFAnnotation): SmartBlockType | null {
	if (annot.subtype !== 'Widget') { return null; }

	switch (annot.fieldType) {
		case 'Tx':
			return annot.multiLine ? SmartBlockType.LONG_TEXT : SmartBlockType.SMART_TEXT;

		case 'Btn':
			if (annot.checkBox) { return SmartBlockType.CHECKBOX; }
			if (annot.radioButton) { return SmartBlockType.RADIO_GROUP; }
			return null; // Push buttons are not supported

		case 'Ch':
			return SmartBlockType.SELECT;

		case 'Sig':
			return SmartBlockType.SIGNATURE;

		default:
			return null;
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Label & Slot Extraction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract slot name from field name prefix (e.g. "Seller.Name" -> "Seller")
 */
export function extractSlotName(fieldName: string | undefined): string | undefined {
	if (!(fieldName?.includes('.'))) { return undefined; }

	const parts = fieldName.split('.');
	// If we have multiple parts, assume first is slot name
	if (parts.length > 1) {
		const slot = parts[0].trim();
		// Filter out common non-slot prefixes if needed
		if (slot && slot.length > 1) {
			return slot.replace(/_/g, ' ');
		}
	}
	return undefined;
}

/**
 * Generate a human-readable label from field name
 */
export function generateLabel(fieldName: string | undefined): string {
	if (!fieldName) { return 'Field'; }

	// Convert snake_case or camelCase to Title Case
	return fieldName
		.replace(/_/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/\b\w/g, (char) => char.toUpperCase())
		.trim();
}

/**
 * Generate variable name from field name (safe identifier)
 */
export function generateVariableName(fieldName: string | undefined): string {
	if (!fieldName) { return `field_${uuidv4().slice(0, 8)}`; }

	// Convert to snake_case and sanitize
	return fieldName
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_]/g, '')
		.slice(0, 50); // Limit length
}

// ═══════════════════════════════════════════════════════════════════════════
// Value Normalization
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize checkbox/radio value to boolean
 */
export function normalizeCheckboxValue(value: unknown): boolean {
	if (typeof value === 'boolean') { return value; }
	if (typeof value === 'string') {
		const lower = value.toLowerCase();
		return lower === 'yes' || lower === 'on' || lower === 'true' || lower === '1';
	}
	return false;
}

/**
 * Extract options from Choice field
 */
export function extractOptions(annot: PDFAnnotation): string[] {
	if (!(annot.options && Array.isArray(annot.options))) { return []; }

	return annot.options
		.map((opt) => {
			if (typeof opt === 'string') { return opt; }
			return opt.displayValue || opt.exportValue || '';
		})
		.filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════
// Annotation to SmartBlock Conversion
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert PDF annotation to normalized field item
 */
export function annotationToFieldItem(
	annot: PDFAnnotation,
	pageNumber: number,
	pageHeight: number
): NormalizedFieldItem | null {
	const blockType = getSmartBlockType(annot);
	if (!blockType) { return null; }

	// Normalize Y coordinate (PDF is bottom-up, we need top-down)
	const [x1, _y1, , y2] = annot.rect;
	const normalizedY = pageHeight - y2; // Invert Y

	const item: NormalizedFieldItem = {
		type: 'field',
		y: normalizedY,
		x: x1,
		pageNumber,
		smartBlockType: blockType,
		variableName: generateVariableName(annot.fieldName),
		label: generateLabel(annot.fieldName),
		slotName: extractSlotName(annot.fieldName),
		required: Boolean(annot.required),
		value: null,
		placeholder: annot.alternativeText || '',
		id: uuidv4()
	};

	// Set type-specific properties
	switch (blockType) {
		case SmartBlockType.SMART_TEXT:
		case SmartBlockType.LONG_TEXT:
			item.value = annot.fieldValue?.toString() || null;
			break;

		case SmartBlockType.CHECKBOX:
			item.value = normalizeCheckboxValue(annot.fieldValue);
			break;

		case SmartBlockType.SELECT:
			item.options = extractOptions(annot);
			item.value = annot.fieldValue?.toString() || null;
			break;

		case SmartBlockType.RADIO_GROUP:
			// Radio buttons will be merged by the orchestrator
			item.options = annot.buttonValue ? [annot.buttonValue] : [];
			item.value = null;
			break;

		case SmartBlockType.SIGNATURE:
			item.required = true; // Signatures are always required
			break;
	}

	return item;
}

/**
 * Convert normalized field item to Tiptap SmartBlock node
 */
export function fieldItemToTiptapNode(field: NormalizedFieldItem): TiptapSmartBlockNode {
	return {
		type: 'smartBlock',
		attrs: {
			id: field.id,
			type: field.smartBlockType,
			label: field.label,
			variableName: field.variableName,
			required: field.required,
			value: field.value,
			options: field.options,
			placeholder: field.placeholder,
			slotId: null
		}
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Radio Group Merging
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Merge multiple radio buttons with same fieldName into one SmartBlock
 */
export function mergeRadioGroups(fields: NormalizedFieldItem[]): NormalizedFieldItem[] {
	const radioGroups = new Map<string, NormalizedFieldItem>();
	const result: NormalizedFieldItem[] = [];

	for (const field of fields) {
		if (field.smartBlockType === SmartBlockType.RADIO_GROUP) {
			const existing = radioGroups.get(field.variableName);
			if (existing) {
				// Merge options
				const existingOptions = existing.options || [];
				const newOptions = field.options || [];
				existing.options = [...new Set([...existingOptions, ...newOptions])];
			} else {
				radioGroups.set(field.variableName, { ...field });
			}
		} else {
			result.push(field);
		}
	}

	// Add merged radio groups
	for (const group of radioGroups.values()) {
		result.push(group);
	}

	return result;
}
