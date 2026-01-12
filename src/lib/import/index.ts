/**
 * PDF Import Module
 *
 * Barrel export for the PDF import functionality.
 * Use this as the single import point for consumers.
 */

// Main parser function
export { configurePDFWorker, parsePDFToTiptap } from './pdf-parser';

// Types for external use
export type {
	PDFParseResult,
	TiptapBlockNode,
	TiptapDocument,
	TiptapSmartBlockNode
} from './pdf-types';
