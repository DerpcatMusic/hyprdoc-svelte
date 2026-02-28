import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { workos } from '$lib/server/workos';
import type { RequestHandler } from './$types';

const sendSchema = z.object({
	email: z.string().trim().email()
});

const COOLDOWN_MS = 30_000;
const sendCooldownByEmail = new Map<string, number>();

export const POST: RequestHandler = async ({ request }) => {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid request body' }, { status: 400 });
	}

	const parsed = sendSchema.safeParse(payload);
	if (!parsed.success) {
		return json({ success: false, error: 'Please enter a valid email address' }, { status: 400 });
	}

	const email = parsed.data.email.toLowerCase();
	const now = Date.now();
	const lastSentAt = sendCooldownByEmail.get(email);

	if (lastSentAt) {
		const elapsed = now - lastSentAt;
		if (elapsed < COOLDOWN_MS) {
			const retryAfterSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
			return json(
				{
					success: false,
					error: 'Please wait before requesting another code',
					retryAfterSec
				},
				{ status: 429 }
			);
		}
	}

	try {
		const magicAuth = await workos.userManagement.createMagicAuth({ email });
		sendCooldownByEmail.set(email, now);
		return json({ success: true, expiresAt: magicAuth.expiresAt });
	} catch (error) {
		console.error('[Auth Magic Send] Failed to send code:', error);
		return json(
			{ success: false, error: 'Unable to send code right now. Please try again.' },
			{ status: 500 }
		);
	}
};
