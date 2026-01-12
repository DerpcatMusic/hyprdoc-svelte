/**
 * HyprSign PDF Analysis API
 *
 * Analyzes uploaded PDFs to detect fillable fields using:
 * 1. AcroForm field extraction (native PDF forms)
 * 2. Text pattern matching (underscores, checkboxes, etc.)
 * 3. Gemini Vision fallback (AI-powered detection)
 *
 * SvelteKit implementation with WorkOS auth.
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { analyzeDocumentFields, analyzeWithGeminiVision } from '$lib/hyprsign/field-analyzer';
import type { UserProfile } from '$lib/components/hyprsign/types';

const convex = new ConvexHttpClient(env.CONVEX_URL!);

export const config = {
	maxDuration: 30 // Allow up to 30 seconds for PDF analysis
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const formData = await request.formData();
		const pdfFile = formData.get('pdf') as File;

		if (!pdfFile) {
			return json({ error: 'No PDF provided' }, { status: 400 });
		}

		if (pdfFile.type !== 'application/pdf') {
			return json({ error: 'File must be a PDF' }, { status: 400 });
		}

		// Get user's auto-fill profile if authenticated
		let profile: UserProfile = {};

		const session = locals.session;
		if (session?.user && session.accessToken) {
			try {
				convex.setAuth(session.accessToken);
				const userProfile = await convex.query(api.hyprsign.queries.getAutoFillProfile, {});
				if (userProfile) {
					profile = userProfile;
				}
			} catch (error) {
				console.warn('[HyprSign] Could not fetch user profile:', error);
			}
		}

		// Analyze PDF and extract fields
		let fields = await analyzeDocumentFields(pdfFile, profile);

		console.log(`[HyprSign API] Initial detection: ${fields.length} fields`);
		console.log(
			"[HyprSign API] Field breakdown:",
			fields.map((f) => ({ id: f.id.slice(0, 20), label: f.label, type: f.type }))
		);

		// If no fields found with AcroForm, try Gemini Vision
		if (fields.length === 0 || fields.every((f) => f.id.startsWith('placeholder'))) {
			try {
				const arrayBuffer = await pdfFile.arrayBuffer();
				const geminiFields = await analyzeWithGeminiVision(arrayBuffer, profile);

				if (geminiFields.length > 0) {
					fields = geminiFields;
					console.log(`[HyprSign API] Gemini Vision added ${geminiFields.length} fields`);
				}
			} catch (visionError) {
				console.warn('[HyprSign] Gemini Vision fallback failed:', visionError);
				// Continue with placeholder fields
			}
		}

		console.log(`[HyprSign API] Final field count: ${fields.length}`);

		return json({
			success: true,
			fields,
			fieldCount: fields.length,
			autoFilledCount: fields.filter((f) => f.autoFilled).length
		});
	} catch (error) {
		console.error('[HyprSign] Analysis failed:', error);
		return json(
			{
				error: 'Failed to analyze PDF',
				details: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			},
			{ status: 500 }
		);
	}
};
