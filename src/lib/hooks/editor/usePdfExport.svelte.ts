/**
 * usePdfExport
 *
 * Svelte 5 rune-based hook for PDF export functionality.
 * Handles both regular document export and simulation completion.
 *
 * @module lib/hooks/editor/usePdfExport.svelte.ts
 */

import type { Editor, JSONContent } from '@tiptap/core';
import { toast } from 'svelte-sonner';
import { useDocument, useModeState } from '$lib/editor/core/editor-context';
import type { SmartBlockData, Slot, FieldValuesMap } from '$lib/types';

interface PdfExportConfig {
	editor: Editor | null;
	title: string;
}

interface ExportOptions {
	title?: string;
	pageNumbers?: boolean;
	flatten?: boolean;
}

/**
 * Inject field values into smart blocks for PDF generation
 */
function injectSmartBlockValues(content: JSONContent, values: FieldValuesMap): JSONContent {
	if (!content) { return content; }

	const traverse = (node: JSONContent): JSONContent => {
		if (!node) { return node; }

		if (node.type === 'smartBlock' && node.attrs?.id && values[node.attrs.id] !== undefined) {
				return {
					...node,
					attrs: { ...node.attrs, value: values[node.attrs.id] }
				};
			}

		if (node.content && Array.isArray(node.content)) {
			return { ...node, content: node.content.map(traverse) };
		}

		return node;
	};

	return traverse(content);
}

/**
 * Prepare blocks array for PDF export
 */
function prepareBlocksArray(blocks: SmartBlockData[]): SmartBlockData[] {
	return blocks.map((b) => ({
		...b,
		slotId: b.slotId || null,
		label: b.label || '',
		type: b.type || 'text',
		options: b.options || []
	}));
}

/**
 * Prepare slots array for PDF export
 */
function prepareSlotsArray(slots: Slot[]): Slot[] {
	return slots.map((s) => ({
		...s,
		initials: s.initials || s.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'
	}));
}

/**
 * Creates a PDF export controller.
 * Provides methods for exporting documents and simulations.
 */
export function createPdfExport(config: PdfExportConfig) {
	const doc = useDocument();
	const mode = useModeState();

	/**
	 * Export current document as PDF
	 */
	async function exportDocument() {
		const { editor, title } = config;

		if (!editor) {
			toast.error('Editor not ready');
			return;
		}

		try {
			toast.loading('Generating PDF...');

			const content = editor.getJSON();
			const blocksArray = prepareBlocksArray(doc.blocks);
			const slotsArray = prepareSlotsArray(doc.slots);

			// Dynamic import to avoid loading pdf-lib until needed
			const { downloadTiptapAsPdf } = await import('$lib/pdf/export-tiptap');

			await downloadTiptapAsPdf(content, slotsArray, blocksArray, `${title || 'document'}.pdf`, {
				title,
				pageNumbers: true
			});

			toast.dismiss();
			toast.success('PDF exported successfully!');
		} catch (error) {
			console.error('PDF export failed:', error);
			toast.dismiss();
			toast.error('Failed to export PDF');
		}
	}

	/**
	 * Complete simulation with filled values and export as PDF
	 */
	async function exportSimulation(fieldValues: FieldValuesMap) {
		const { title } = config;

		try {
			toast.loading('Generating signed document...');

			// Get base content (snapshot or current)
			const baseContent = mode.contentSnapshot || config.editor?.getJSON();

			if (!baseContent) {
				toast.error('Could not retrieve document content');
				return;
			}

			// Inject values into a deep copy
			const filledContent = injectSmartBlockValues(
				JSON.parse(JSON.stringify(baseContent)),
				fieldValues
			);

			const blocksArray = prepareBlocksArray(doc.blocks);
			const slotsArray = prepareSlotsArray(doc.slots);

			// Dynamic import
			const { downloadTiptapAsPdf } = await import('$lib/pdf/export-tiptap');

			await downloadTiptapAsPdf(
				filledContent as any,
				slotsArray,
				blocksArray,
				`${title || 'signed_simulation'}.pdf`,
				{
					title,
					pageNumbers: true,
					flatten: true // Flatten for signed documents to make them read-only
				}
			);

			toast.dismiss();
			toast.success('Simulation Complete: PDF Downloaded');
		} catch (error) {
			console.error('Simulation PDF failed:', error);
			toast.dismiss();
			toast.error('Failed to generate PDF');
		}
	}

	return {
		exportDocument,
		exportSimulation
	};
}
