/**
 * HyprSign PDF Finalization API
 *
 * Processes the filled PDF with:
 * 1. Signature/initials image embedding
 * 2. Form field flattening
 * 3. Optional AES-256 encryption
 * 4. Download response
 *
 * SvelteKit implementation.
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { PDFDocument, type PDFImage, rgb, StandardFonts } from 'pdf-lib';
import type { DetectedField } from '$lib/components/hyprsign/types';
import { encryptPdfWithQpdf } from '$lib/pdf/encrypt-pdf';
import { flattenPdf } from '$lib/pdf/flatten-pdf';

interface FinalizeRequest {
	// Base64-encoded original PDF
	pdfBase64: string;
	// Fields with their values
	fields: DetectedField[];
	// Optional encryption password
	encryptPassword?: string;
	// Signer name for audit trail
	signerName?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as FinalizeRequest;
		const { pdfBase64, fields, encryptPassword, signerName } = body;

		if (!(pdfBase64 && fields)) {
			return json(
				{ error: 'Missing required fields: pdfBase64, fields' },
				{ status: 400 }
			);
		}

		console.log('[HyprSign Finalize] Starting PDF finalization');
		console.log(`[HyprSign Finalize] Fields to process: ${fields.length}`);
		console.log(`[HyprSign Finalize] Encryption requested: ${!!encryptPassword}`);

		// Step 1: Load the PDF
		const pdfBytes = new Uint8Array(Buffer.from(pdfBase64, 'base64'));
		const pdfDoc = await PDFDocument.load(pdfBytes, {
			ignoreEncryption: true
		});
		const pages = pdfDoc.getPages();
		const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

		// Step 2: Embed field values onto the PDF
		for (const field of fields) {
			if (!field.value) { continue; }

			const pageIndex = field.boundingBox.page - 1;
			if (pageIndex < 0 || pageIndex >= pages.length) { continue; }

			const page = pages[pageIndex];
			const { width: pageWidth, height: pageHeight } = page.getSize();

			// Calculate absolute position
			const x = field.boundingBox.x * pageWidth;
			// PDF Y origin is bottom-left, so flip
			const y =
				pageHeight - field.boundingBox.y * pageHeight - field.boundingBox.height * pageHeight;
			const width = field.boundingBox.width * pageWidth;
			const height = field.boundingBox.height * pageHeight;

			switch (field.type) {
				case 'signature':
				case 'initials':
					// Embed signature image
					if (typeof field.value === 'string' && field.value.startsWith('data:image')) {
						try {
							const imageData = field.value.replace(/^data:image\/\w+;base64,/, '');
							const imageBytes = new Uint8Array(Buffer.from(imageData, 'base64'));

							let image: PDFImage;
							if (field.value.includes('image/png')) {
								image = await pdfDoc.embedPng(imageBytes);
							} else {
								image = await pdfDoc.embedJpg(imageBytes);
							}

							// Calculate aspect-ratio-aware dimensions
							const { width: imgWidth, height: imgHeight } = image.size();
							const imgAspectRatio = imgWidth / imgHeight;
							const boxAspectRatio = width / height;

							let drawWidth = width;
							let drawHeight = height;

							if (imgAspectRatio > boxAspectRatio) {
								// Image is wider than box - constrain by width
								drawHeight = width / imgAspectRatio;
							} else {
								// Image is taller than box - constrain by height
								drawWidth = height * imgAspectRatio;
							}

							// Center image within the target field area
							const xOffset = (width - drawWidth) / 2;
							const yOffset = (height - drawHeight) / 2;

							page.drawImage(image, {
								x: x + xOffset,
								y: y + yOffset,
								width: drawWidth,
								height: drawHeight
							});
						} catch (err) {
							console.error("[HyprSign Finalize] Failed to embed signature:", err);
						}
					}
					break;

				case 'checkbox':
				case 'radio':
					// Draw a checkmark or filled circle
					if (field.value === true) {
						page.drawText('✓', {
							x: x + 2,
							y: y + 2,
							size: Math.min(height - 4, 14),
							font,
							color: rgb(0, 0, 0)
						});
					}
					break;

				case 'date':
					// Format and draw date
					if (field.value) {
						const dateStr = new Date(String(field.value)).toLocaleDateString('en-US', {
							year: 'numeric',
							month: '2-digit',
							day: '2-digit'
						});
						page.drawText(dateStr, {
							x: x + 2,
							y: y + height / 2 - 4,
							size: 10,
							font,
							color: rgb(0, 0, 0)
						});
					}
					break;

				default:
					// Draw text value
					if (typeof field.value === 'string' && field.value) {
						page.drawText(String(field.value), {
							x: x + 2,
							y: y + height / 2 - 4,
							size: 10,
							font,
							color: rgb(0, 0, 0)
						});
					}
			}
		}

		// Step 3: Add completion footer
		const timestamp = new Date().toISOString();
		const footerText = `Signed via HyprSign on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}${signerName ? ` by ${signerName}` : ''}`;

		for (const page of pages) {
			page.drawText(footerText, {
				x: 20,
				y: 15,
				size: 8,
				font,
				color: rgb(0.5, 0.5, 0.5)
			});
		}

		// Step 4: Save intermediate PDF
		let finalPdfBytes = await pdfDoc.save();
		console.log(`[HyprSign Finalize] PDF with fields embedded: ${finalPdfBytes.length} bytes`);

		// Step 5: Flatten form fields (make non-editable)
		try {
			finalPdfBytes = await flattenPdf(finalPdfBytes);
			console.log('[HyprSign Finalize] PDF flattened');
		} catch (err) {
			console.warn('[HyprSign Finalize] Flatten failed (continuing):', err);
		}

		// Step 6: Encrypt if password provided
		let encrypted = false;
		if (encryptPassword) {
			try {
				const encryptResult = await encryptPdfWithQpdf(finalPdfBytes, {
					userPassword: encryptPassword,
					strength: 'AES-256'
				});
				finalPdfBytes = encryptResult.pdfBytes;
				encrypted = encryptResult.encrypted;
				console.log(`[HyprSign Finalize] Encryption: ${encryptResult.method}`);

				if (encryptResult.warning) {
					console.warn(`[HyprSign Finalize] ${encryptResult.warning}`);
				}
			} catch (err) {
				console.error('[HyprSign Finalize] Encryption failed:', err);
			}
		}

		// Step 7: Return the finalized PDF
		console.log(`[HyprSign Finalize] Complete. Final size: ${finalPdfBytes.length} bytes`);

		return new Response(finalPdfBytes as any, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="signed-document-${Date.now()}.pdf"`,
				'X-HyprSign-Encrypted': String(encrypted),
				'X-HyprSign-Timestamp': timestamp
			}
		});
	} catch (error) {
		console.error('[HyprSign Finalize] Error:', error);
		return json(
			{ error: 'Failed to finalize PDF', details: String(error) },
			{ status: 500 }
		);
	}
};
