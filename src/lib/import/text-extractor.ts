/**
 * Text Extractor Module
 *
 * Extracts and normalizes text content from PDF pages.
 * Handles line merging, paragraph detection, and heading inference.
 */

import type { PDFPageProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { v4 as uuidv4 } from 'uuid';
import { SmartBlockType } from '$lib/types/enums';
import type {
	NormalizedFieldItem,
	NormalizedTextItem,
	TiptapHeadingNode,
	TiptapParagraphNode
} from './pdf-types';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Y-coordinate tolerance for merging text on same line (in PDF points) */
const LINE_Y_TOLERANCE = 3;

/** Minimum font size to consider as heading */
const HEADING_FONT_SIZE_THRESHOLD = 14;

/** Regex to detect visual form fields (underscores) */
const UNDERSCORE_FIELD_REGEX = /_{4,}/g;

// ═══════════════════════════════════════════════════════════════════════════
// Text Extraction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract text items from a PDF page
 */
export async function extractTextFromPage(
	page: PDFPageProxy,
	pageNumber: number
): Promise<NormalizedTextItem[]> {
	const textContent = await page.getTextContent();
	const viewport = page.getViewport({ scale: 1 });
	const pageHeight = viewport.height;

	const items: NormalizedTextItem[] = [];

	for (const item of textContent.items) {
		// Skip non-text items (marked content, etc.)
		if (!(('str' in item) && item.str.trim())) { continue; }

		const textItem = item as TextItem;
		const [, , , , x, y] = textItem.transform;

		// Normalize Y (PDF is bottom-up)
		const normalizedY = pageHeight - y;

		// Estimate font size from transform matrix
		const fontSize = Math.abs(textItem.transform[0]) || 12;

		items.push({
			type: 'text',
			y: normalizedY,
			x,
			pageNumber,
			content: textItem.str,
			fontSize,
			isBold: fontSize > HEADING_FONT_SIZE_THRESHOLD
		});
	}

	return items;
}

// ═══════════════════════════════════════════════════════════════════════════
// Line Merging
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Group text items into lines based on Y-coordinate proximity
 */
export function groupIntoLines(items: NormalizedTextItem[]): NormalizedTextItem[][] {
	if (items.length === 0) { return []; }

	// Sort by Page -> Y (top to bottom) -> X (left to right)
	const sorted = [...items].sort((a, b) => {
		if (a.pageNumber !== b.pageNumber) {
			return a.pageNumber - b.pageNumber;
		}
		if (Math.abs(a.y - b.y) <= LINE_Y_TOLERANCE) {
			return a.x - b.x;
		}
		return a.y - b.y;
	});

	const lines: NormalizedTextItem[][] = [];
	let currentLine: NormalizedTextItem[] = [sorted[0]];
	let currentY = sorted[0].y;

	for (let i = 1; i < sorted.length; i++) {
		const item = sorted[i];

		if (Math.abs(item.y - currentY) <= LINE_Y_TOLERANCE) {
			// Same line
			currentLine.push(item);
		} else {
			// New line
			lines.push(currentLine);
			currentLine = [item];
			currentY = item.y;
		}
	}

	// Don't forget the last line
	if (currentLine.length > 0) {
		lines.push(currentLine);
	}

	return lines;
}

/**
 * Merge line items into a single text string
 */
export function mergeLineToString(line: NormalizedTextItem[]): string {
	// Sort by X position
	const sorted = [...line].sort((a, b) => a.x - b.x);

	// Join with appropriate spacing
	let result = '';
	for (let i = 0; i < sorted.length; i++) {
		const item = sorted[i];
		if (i > 0) {
			// Estimate gap between items
			const prevItem = sorted[i - 1];
			const gap = item.x - (prevItem.x + prevItem.content.length * 5); // Rough char width
			result += gap > 10 ? '  ' : ' ';
		}
		result += item.content;
	}

	return result.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// Visual Field Detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect visual form fields (underscores) in text and return split content
 */
export function detectVisualFields(
	lineText: string,
	lineY: number,
	pageNumber: number
): Array<{ type: 'text'; content: string } | NormalizedFieldItem> {
	const results: Array<{ type: 'text'; content: string } | NormalizedFieldItem> = [];

	let lastIndex = 0;
	const regex = new RegExp(UNDERSCORE_FIELD_REGEX.source, 'g');
	const matches: RegExpExecArray[] = [];

	// Collect all matches
	let tempMatch: RegExpExecArray | null;
	while ((tempMatch = regex.exec(lineText)) !== null) {
		matches.push(tempMatch);
	}

	for (const match of matches) {
		// Add text before the underscores
		if (match.index > lastIndex) {
			const textBefore = lineText.slice(lastIndex, match.index).trim();
			if (textBefore) {
				results.push({ type: 'text', content: textBefore });
			}
		}

		// Infer label from preceding text
		const precedingText = lineText.slice(0, match.index).trim();
		const inferredLabel = precedingText.match(/([A-Za-z\s]+):?\s*$/)?.[1]?.trim() || 'Field';

		// Add the field
		results.push({
			type: 'field',
			y: lineY,
			x: 0,
			pageNumber,
			smartBlockType: SmartBlockType.SMART_TEXT,
			variableName: inferredLabel.toLowerCase().replace(/\s+/g, '_'),
			label: inferredLabel,
			value: null,
			required: false,
			id: uuidv4()
		});

		lastIndex = regex.lastIndex;
	}

	// Add remaining text
	if (lastIndex < lineText.length) {
		const remaining = lineText.slice(lastIndex).trim();
		if (remaining) {
			results.push({ type: 'text', content: remaining });
		}
	}

	// If no fields detected, return original text
	if (results.length === 0 && lineText.trim()) {
		results.push({ type: 'text', content: lineText.trim() });
	}

	return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tiptap Node Generation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert text to Tiptap paragraph node
 */
export function textToParagraphNode(text: string): TiptapParagraphNode {
	if (!text.trim()) {
		return { type: 'paragraph' };
	}

	return {
		type: 'paragraph',
		content: [{ type: 'text', text }]
	};
}

/**
 * Convert text to Tiptap heading node
 */
export function textToHeadingNode(text: string, level: 1 | 2 | 3 = 2): TiptapHeadingNode {
	return {
		type: 'heading',
		attrs: { level },
		content: [{ type: 'text', text }]
	};
}

/**
 * Determine if a line should be a heading based on font size
 */
export function isHeadingLine(line: NormalizedTextItem[]): boolean {
	if (line.length === 0) { return false; }

	// Check if majority of items are large font
	const largeItems = line.filter((item) => item.fontSize > HEADING_FONT_SIZE_THRESHOLD);
	return largeItems.length > line.length / 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// List Detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect list patterns (bullets, numbers)
 */
export function detectListPattern(text: string): {
	type: 'bullet' | 'ordered';
	content: string;
} | null {
	const trimmed = text.trim();

	// Bullet patterns: •, -, *, etc.
	const bulletRegex = /^[\u2022\u2023\u25E6\u2043\u2212\-*]\s+(.*)/;
	const bulletMatch = trimmed.match(bulletRegex);
	if (bulletMatch) {
		return { type: 'bullet', content: bulletMatch[1] };
	}

	// Ordered patterns: 1., 1.1, a., (1)
	const orderedRegex = /^(\d+[.)]|[a-zA-Z][.)])\s+(.*)/;
	const orderedMatch = trimmed.match(orderedRegex);
	if (orderedMatch) {
		return { type: 'ordered', content: orderedMatch[2] };
	}

	return null;
}
