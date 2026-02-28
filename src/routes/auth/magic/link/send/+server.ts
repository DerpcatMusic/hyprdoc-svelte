import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { z } from 'zod';
import { workos } from '$lib/server/workos';
import type { RequestHandler } from './$types';

const sendMagicLinkSchema = z.object({
	email: z.string().trim().email(),
	returnTo: z.string().trim().optional()
});

const COOLDOWN_MS = 30_000;
const sendCooldownByEmail = new Map<string, number>();

function normalizeReturnTo(returnTo?: string) {
	if (!returnTo) return '/dashboard';
	if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return '/dashboard';
	return returnTo;
}

function buildMagicLink(baseUrl: string, email: string, code: string, returnTo: string) {
	const params = new URLSearchParams({
		email,
		code,
		returnTo
	});
	return `${baseUrl}/auth/magic/link?${params.toString()}`;
}

export const POST: RequestHandler = async ({ request, url }) => {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid request body' }, { status: 400 });
	}

	const parsed = sendMagicLinkSchema.safeParse(payload);
	if (!parsed.success) {
		return json({ success: false, error: 'Please enter a valid email address' }, { status: 400 });
	}

	const email = parsed.data.email.toLowerCase();
	const returnTo = normalizeReturnTo(parsed.data.returnTo);
	const now = Date.now();
	const lastSentAt = sendCooldownByEmail.get(email);

	if (lastSentAt) {
		const elapsed = now - lastSentAt;
		if (elapsed < COOLDOWN_MS) {
			const retryAfterSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
			return json(
				{
					success: false,
					error: 'Please wait before requesting another magic link',
					retryAfterSec
				},
				{ status: 429 }
			);
		}
	}

	const resendApiKey = env.RESEND_API_KEY;
	if (!resendApiKey) {
		const params = new URLSearchParams({
			login_hint: email,
			returnTo
		});
		return json({
			success: true,
			redirectTo: `/auth/login?${params.toString()}`
		});
	}

	try {
		const magicAuth = await workos.userManagement.createMagicAuth({ email });
		const magicLink = buildMagicLink(url.origin, email, magicAuth.code, returnTo);
		const resend = new Resend(resendApiKey);
		const from = env.EMAIL_FROM || 'HyprDoc <noreply@hyprdoc.app>';

		const result = await resend.emails.send({
			from,
			to: email,
			subject: 'Your HyprDoc magic link',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; line-height: 1.5;">
					<h2 style="margin: 0 0 12px;">Sign in to HyprDoc</h2>
					<p style="margin: 0 0 16px;">Click the secure link below to sign in:</p>
					<p style="margin: 0 0 24px;">
						<a href="${magicLink}" style="background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:9999px;display:inline-block;font-weight:700;">
							Sign in with Magic Link
						</a>
					</p>
					<p style="margin: 0 0 8px; color:#6b7280; font-size: 14px;">
						If the button does not work, copy and paste this URL:
					</p>
					<p style="margin: 0; word-break: break-all; color:#374151; font-size: 14px;">${magicLink}</p>
				</div>
			`,
			text: `Sign in to HyprDoc: ${magicLink}`
		});

		if (result.error) {
			throw new Error(result.error.message);
		}

		sendCooldownByEmail.set(email, now);
		return json({
			success: true,
			expiresAt: magicAuth.expiresAt
		});
	} catch (error) {
		console.error('[Auth Magic Link Send] Failed to send magic link:', error);
		return json(
			{
				success: false,
				error: 'Unable to send magic link right now. Please try again.'
			},
			{ status: 500 }
		);
	}
};
