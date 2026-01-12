import { SmartBlockType } from '$lib/types/enums';
import {
	annotationToFieldItem,
	fieldItemToTiptapNode,
	mergeRadioGroups
} from './annotation-mapper';

import { getAllPages, getPageHeight, loadPDFFromFile } from './pdf-loader';
import type {
	NormalizedFieldItem,
	NormalizedTextItem,
	PDFAnnotation,
	PDFParseResult,
	TiptapBlockNode,
	TiptapBulletList,
	TiptapListItem,
	TiptapOrderedList
} from './pdf-types';
import {
	detectListPattern,
	detectVisualFields,
	extractTextFromPage,
	groupIntoLines,
	isHeadingLine,
	mergeLineToString,
	textToHeadingNode,
	textToParagraphNode
} from './text-extractor';

// ═══════════════════════════════════════════════════════════════════════════
// Main Parser
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a PDF file and convert to Tiptap document
 */
export async function parsePDFToTiptap(file: File): Promise<PDFParseResult> {
	const errors: string[] = [];
	const allFields: NormalizedFieldItem[] = [];
	const allTextItems: NormalizedTextItem[] = [];

	try {
		// 1. Load PDF
		const pdf = await loadPDFFromFile(file);
		const pages = await getAllPages(pdf);

		// 2. Extract content from each page
		for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
			const page = pages[pageIdx];
			const pageNumber = pageIdx + 1;
			const pageHeight = getPageHeight(page);

			// Extract annotations (AcroForm fields)
			try {
				const annotations = await page.getAnnotations();
				for (const annot of annotations as PDFAnnotation[]) {
					const fieldItem = annotationToFieldItem(annot, pageNumber, pageHeight);
					if (fieldItem) {
						allFields.push(fieldItem);
					}
				}
			} catch (_err) {
				errors.push(`Page ${pageNumber}: Failed to extract annotations`);
			}

			// Extract text
			try {
				const textItems = await extractTextFromPage(page, pageNumber);
				allTextItems.push(...textItems);
			} catch (_err) {
				errors.push(`Page ${pageNumber}: Failed to extract text`);
			}
		}

		// 3. Merge radio groups
		const mergedFields = mergeRadioGroups(allFields);

		// 4. Build Tiptap document
		const tiptapContent = buildTiptapContent(allTextItems, mergedFields);

		// 5. Extract blocks metadata for Convex storage
		const blocks = mergedFields.map((field: NormalizedFieldItem) => {
			const base = {
				id: field.id,
				label: field.label,
				variableName: field.variableName,
				required: field.required,
				options: field.options,
				slotName: field.slotName
			};

			// Strict Union Mapping (Diamond Hard Type Safety)
			switch (field.smartBlockType) {
				case SmartBlockType.SMART_TEXT:
				case SmartBlockType.EMAIL:
				case SmartBlockType.DATE_PICKER:
				case SmartBlockType.SELECT:
				case SmartBlockType.LONG_TEXT:
					return {
						...base,
						type: field.smartBlockType,
						value: (field.value as string | null) || null
					};

				case SmartBlockType.CHECKBOX:
					return {
						...base,
						type: field.smartBlockType,
						value: (field.value as boolean | null) ?? false
					} as any;

				default:
					return {
						...base,
						type: field.smartBlockType,
						value: field.value as any
					};
			}
		}) as any;

		// 6. Aggregate unique slots
		const uniqueSlots = Array.from(
			new Set(mergedFields.map((f) => f.slotName).filter(Boolean))
		) as string[];

		return {
			success: true,
			document: {
				type: 'doc',
				content: tiptapContent
			},
			blocks,
			metadata: {
				pageCount: pages.length,
				fieldCount: mergedFields.length,
				textBlockCount: tiptapContent.filter((n) => n.type !== 'smartBlock').length,
				slots: uniqueSlots
			},
			errors
		};
	} catch (err) {
		return {
			success: false,
			document: { type: 'doc', content: [] },
			blocks: [],
			metadata: { pageCount: 0, fieldCount: 0, textBlockCount: 0, slots: [] },
			errors: [`Failed to parse PDF: ${err instanceof Error ? err.message : 'Unknown error'}`]
		};
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Content Building
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build Tiptap content by interleaving text and fields
 */
function buildTiptapContent(
	textItems: NormalizedTextItem[],
	fields: NormalizedFieldItem[]
): TiptapBlockNode[] {
	const content: TiptapBlockNode[] = [];

	// Group text into lines
	const lines = groupIntoLines(textItems);

	// Create a map of field positions (rounded Y) for interleaving
	const fieldsByY = new Map<number, NormalizedFieldItem[]>();
	for (const field of fields) {
		const roundedY = Math.round(field.y / 10) * 10;
		const existing = fieldsByY.get(roundedY) || [];
		fieldsByY.set(roundedY, [...existing, field]);
	}

	// Track processed fields to avoid duplicates
	const processedFieldIds = new Set<string>();

	// List processing state
	let currentList: TiptapBulletList | TiptapOrderedList | null = null;

	for (const line of lines) {
		const lineY = line[0]?.y || 0;
		const roundedLineY = Math.round(lineY / 10) * 10;
		const pageNumber = line[0]?.pageNumber || 1;

		// 1. Insert fields BEFORE this line
		for (const [_fieldY, fieldList] of fieldsByY.entries()) {
			const relevantFields = fieldList.filter(
				(f) =>
					!processedFieldIds.has(f.id) &&
					(f.pageNumber < pageNumber ||
						(f.pageNumber === pageNumber && Math.round(f.y / 10) * 10 < roundedLineY))
			);

			if (relevantFields.length > 0) {
				if (currentList) {
					content.push(currentList);
					currentList = null;
				}

				for (const field of relevantFields) {
					content.push(fieldItemToTiptapNode(field));
					processedFieldIds.add(field.id);
				}
			}
		}

		const sameLineFields = (fieldsByY.get(roundedLineY) || []).filter(
			(f) => !processedFieldIds.has(f.id) && f.pageNumber === pageNumber
		);

		if (sameLineFields.length > 0) {
			if (currentList) {
				content.push(currentList);
				currentList = null;
			}
			for (const field of sameLineFields) {
				content.push(fieldItemToTiptapNode(field));
				processedFieldIds.add(field.id);
			}
		}

		// 2. Process Line Content
		const lineText = mergeLineToString(line);
		const listMatch = detectListPattern(lineText);

		if (listMatch) {
			const isOrdered = listMatch.type === 'ordered';
			const listType = isOrdered ? 'orderedList' : 'bulletList';

			if (currentList && currentList.type !== listType) {
				content.push(currentList);
				currentList = null;
			}

			if (!currentList) {
				currentList = isOrdered
					? { type: 'orderedList', content: [] }
					: { type: 'bulletList', content: [] };
			}

			const listItemContent: TiptapBlockNode[] = [textToParagraphNode(listMatch.content)];

			(currentList.content as TiptapListItem[]).push({
				type: 'listItem',
				content: listItemContent
			});
		} else {
			if (currentList) {
				content.push(currentList);
				currentList = null;
			}

			const parts = detectVisualFields(lineText, lineY, pageNumber);

			for (const part of parts) {
				if (part.type === 'text') {
					if (isHeadingLine(line)) {
						content.push(textToHeadingNode(part.content));
					} else {
						content.push(textToParagraphNode(part.content));
					}
				} else {
					content.push(fieldItemToTiptapNode(part as NormalizedFieldItem));
				}
			}
		}
	}

	if (currentList) {
		content.push(currentList);
	}

	const remainingFields = fields.filter((f) => !processedFieldIds.has(f.id));
	for (const field of remainingFields) {
		content.push(fieldItemToTiptapNode(field));
	}

	if (content.length === 0) {
		content.push(textToParagraphNode(''));
	}

	return content;
}

export { configurePDFWorker } from './pdf-loader';
export type { PDFParseResult, TiptapDocument } from './pdf-types';
