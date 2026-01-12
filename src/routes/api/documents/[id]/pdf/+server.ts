/**
 * PDF Generation API Route
 *
 * Generates a PDF from a Tiptap document using Puppeteer with Chromium.
 *
 * GET /api/documents/[id]/pdf - Generate PDF preview (no signatures)
 * POST /api/documents/[id]/pdf - Generate PDF with optional signature embedding
 *
 * SvelteKit implementation.
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { tiptapToHtml, type BlockData } from '$lib/pdf/tiptap-to-html';
import type { SmartBlockData } from '$lib/types';

export const config = {
	maxDuration: 60 // Allow up to 60 seconds for PDF generation
};

// Initialize clients (these will be validated in the handler)
const getConvex = () => new ConvexHttpClient(env.CONVEX_URL || '');

// Chromium binary for serverless environments
let chromium: any = null;
let puppeteer: any = null;

async function getBrowser() {
	// Dynamic imports for serverless compatibility
	if (!chromium) {
		chromium = (await import('@sparticuz/chromium')).default;
	}
	if (!puppeteer) {
		puppeteer = (await import('puppeteer-core')).default;
	}

	// Configure Chromium for serverless
	if (chromium && puppeteer) {
		await (chromium as any).setGraphicsMode(false);

		const browser = await puppeteer.launch({
			args: (chromium as any).args,
			defaultViewport: (chromium as any).defaultViewport,
			executablePath: await (chromium as any).executablePath(),
			headless: (chromium as any).headless
		});

		return browser;
	}
	return null;
}

export const GET: RequestHandler = async ({ params, url }) => {
	const id = params.id;

	try {
		const convex = getConvex();
		// Fetch document (this is a public preview, so we use the internal query)
		const document = await convex.query(api.documents.queries.get.get, {
			documentId: id
		});

		if (!document) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		// Parse content and blocks
		const content = document.content;
		const blocks = (document.blocks || []) as SmartBlockData[];
		const settings = document.settings || {};

		// Generate HTML from Tiptap content
		const html = tiptapToHtml(content, settings, blocks as unknown as BlockData[]);

		// Launch browser and generate PDF
		const browser = await getBrowser();
		if (!browser) { throw new Error('Could not launch browser'); }
		const page = await browser.newPage();

		// Set content and wait for fonts to load
		await page.setContent(html, {
			waitUntil: ['networkidle0', 'domcontentloaded']
		});

		// Wait for web fonts to load
		await page.evaluateHandle('document.fonts.ready');

		// Generate PDF
		let pdfBuffer = await page.pdf({
			format: 'letter',
			printBackground: true,
			preferCSSPageSize: true,
			margin: {
				top: '0',
				right: '0',
				bottom: '0',
				left: '0'
			}
		});

		await browser.close();

		// Process export options (flat, timestamp)
		const shouldFlatten = url.searchParams.get('flat') === 'true';
		const shouldTimestamp = url.searchParams.get('timestamp') === 'true';

		if (shouldFlatten || shouldTimestamp) {
			const { enhancedPdfExport } = await import('$lib/pdf/sign-pdf');
			const result = await enhancedPdfExport(new Uint8Array(pdfBuffer), {
				flatten: shouldFlatten,
				timestamp: shouldTimestamp
			});
			pdfBuffer = new Uint8Array(result.pdfBytes);
			console.log(`[PDF Export] Flat: ${result.flattened}, Timestamp: ${!!result.timestamp}`);
		}

		// Return PDF
		const filename = `${document.title || 'document'}${shouldFlatten ? '-flat' : ''}.pdf`;
		return new Response(pdfBuffer as any, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
				'Cache-Control': 'no-cache'
			}
		});
	} catch (error) {
		console.error('[PDF Generation Error]', error);
		return json(
			{ error: 'Failed to generate PDF', details: String(error) },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	const id = params.id;

	try {
		const convex = getConvex();
		const body = await request.json().catch(() => ({}));
		const {
			includeSignatures = false,
			document: providedDocument,
			signatures: providedSignatures
		} = body;

		let document = providedDocument;
		let signatures = providedSignatures || [];

		// If document data not provided, fetch from Convex (fallback)
		if (!document) {
			document = await convex.query(api.documents.queries.get.get, {
				documentId: id
			});

			if (!document) {
				return json({ error: 'Document not found' }, { status: 404 });
			}

			// If including signatures and not provided, fetch them
			if (includeSignatures && !providedSignatures) {
				try {
					signatures = await convex.query(api.signatures.queries.getByDocument, {
						documentId: id as Id<'documents'>
					});
				} catch (err) {
					console.warn('[PDF] Could not fetch signatures:', err);
				}
			}
		}

		// Parse content and blocks
		let blocks = document.blocks || [];

		// If including signatures, merge signature data into blocks
		if (includeSignatures && signatures.length > 0) {
			try {
				const signaturesMap = new Map(signatures.map((s: { blockId: string }) => [s.blockId, s]));
				blocks = blocks.map((block: SmartBlockData) => {
					const sig = signaturesMap.get(block.id);
					if (sig && block.type === 'signature') {
						const sigData = (sig as { signatureData: string }).signatureData;
						return {
							...block,
							signatureData: sigData,
							value: sigData
						} as SmartBlockData;
					}
					return block;
				});
			} catch (err) {
				console.warn('[PDF] Error merging signature data:', err);
			}
		}

		const content = document.content;
		const settings = document.settings || {};

		// Generate HTML from Tiptap content
		const html = tiptapToHtml(content, settings, blocks as unknown as BlockData[]);

		// Launch browser and generate PDF
		const browser = await getBrowser();
		if (!browser) { throw new Error('Could not launch browser'); }
		const page = await browser.newPage();

		await page.setContent(html, {
			waitUntil: ['networkidle0', 'domcontentloaded']
		});

		await page.evaluateHandle('document.fonts.ready');

		const pdfBuffer = await page.pdf({
			format: 'letter',
			printBackground: true,
			preferCSSPageSize: true,
			margin: {
				top: '0',
				right: '0',
				bottom: '0',
				left: '0'
			}
		});

		await browser.close();

		return new Response(pdfBuffer as any, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${encodeURIComponent(document.title || 'document')}.pdf"`,
				'Cache-Control': 'no-cache'
			}
		});
	} catch (error) {
		console.error('[PDF Generation Error]', error);
		return json(
			{ error: 'Failed to generate PDF', details: String(error) },
			{ status: 500 }
		);
	}
};
