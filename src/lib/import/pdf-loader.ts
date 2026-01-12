/**
 * PDF Loader Module
 *
 * Handles loading PDF files with pdfjs-dist.
 * Configures the worker and provides a clean API.
 */

// DOMMatrix polyfill for SSR (required by pdfjs-dist)
if (typeof globalThis.DOMMatrix === 'undefined') {
	class DOMMatrix {
		a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
		m11 = 1; m12 = 0; m13 = 0; m14 = 0;
		m21 = 0; m22 = 1; m23 = 0; m24 = 0;
		m31 = 0; m32 = 0; m33 = 1; m34 = 0;
		m41 = 0; m42 = 0; m43 = 0; m44 = 1;
		
		constructor(init?: string | number[]) {
			if (Array.isArray(init)) {
				// simple implementation for pdfjs requirement
			}
		}
	}
	// @ts-expect-error
	globalThis.DOMMatrix = DOMMatrix;
}

import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import * as pdfjs from 'pdfjs-dist';

// ═══════════════════════════════════════════════════════════════════════════
// Worker Configuration
// ═══════════════════════════════════════════════════════════════════════════

// Use CDN worker to avoid Next.js bundler issues with Web Workers
// In SvelteKit, this is also a reliable way to load the worker
const PDFJS_WORKER_CDN = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

let workerConfigured = false;

/**
 * Configure PDF.js worker (call once before any PDF operations)
 */
export function configurePDFWorker(): void {
	if (workerConfigured) { return; }

	// Only configure in browser environment
	if (typeof window !== 'undefined') {
		pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
		workerConfigured = true;
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF Loading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load a PDF from an ArrayBuffer
 */
export async function loadPDFFromBuffer(buffer: ArrayBuffer): Promise<PDFDocumentProxy> {
	configurePDFWorker();

	const loadingTask = pdfjs.getDocument({
		data: new Uint8Array(buffer),
		// Disable font loading for faster parsing (we only need text/annotations)
		disableFontFace: true,
		// Enable annotation fetching
		isEvalSupported: false
	});

	return loadingTask.promise;
}

/**
 * Load a PDF from a File object
 */
export async function loadPDFFromFile(file: File): Promise<PDFDocumentProxy> {
	const buffer = await file.arrayBuffer();
	return loadPDFFromBuffer(buffer);
}

/**
 * Get all pages from a PDF document
 */
export async function getAllPages(pdf: PDFDocumentProxy): Promise<PDFPageProxy[]> {
	const pages: PDFPageProxy[] = [];

	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		pages.push(page);
	}

	return pages;
}

/**
 * Get page height for Y-coordinate normalization
 */
export function getPageHeight(page: PDFPageProxy): number {
	const viewport = page.getViewport({ scale: 1 });
	return viewport.height;
}
