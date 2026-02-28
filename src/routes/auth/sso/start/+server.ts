import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const ssoStartSchema = z.object({
	email: z.string().trim().email().optional(),
	connectionId: z.string().trim().min(1).optional(),
	returnTo: z.string().trim().optional()
});

function normalizeReturnTo(value?: string) {
	if (!value) return '/dashboard';
	if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard';
	return value;
}

function extractDomain(email?: string) {
	if (!email) return null;
	const parts = email.toLowerCase().split('@');
	if (parts.length !== 2 || !parts[1]) return null;
	return parts[1];
}

function parseDomainConnectionMap() {
	const raw = env.WORKOS_SSO_DOMAIN_CONNECTION_MAP;
	const map = new Map<string, string>();

	if (!raw) return map;

	for (const entry of raw.split(',')) {
		const [domainRaw, connectionRaw] = entry.split('=');
		const domain = domainRaw?.trim().toLowerCase();
		const connectionId = connectionRaw?.trim();
		if (!domain || !connectionId) continue;
		map.set(domain, connectionId);
	}

	return map;
}

function resolveConnectionId({
	connectionId,
	email
}: {
	connectionId?: string;
	email?: string;
}) {
	if (connectionId) return connectionId;

	const domain = extractDomain(email);
	if (!domain) return env.WORKOS_DEFAULT_SSO_CONNECTION_ID ?? null;

	const domainMap = parseDomainConnectionMap();
	return domainMap.get(domain) ?? env.WORKOS_DEFAULT_SSO_CONNECTION_ID ?? null;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const parsed = ssoStartSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: 'Invalid SSO request payload.' }, { status: 400 });
	}

	const email = parsed.data.email?.toLowerCase();
	const connectionId = resolveConnectionId({
		connectionId: parsed.data.connectionId,
		email
	});

	if (!connectionId) {
		return json(
			{
				error:
					'No SSO connection is configured for this domain. Ask your workspace admin for a WorkOS connection ID.'
			},
			{ status: 400 }
		);
	}

	const params = new URLSearchParams({
		connection_id: connectionId,
		returnTo: normalizeReturnTo(parsed.data.returnTo)
	});

	if (email) {
		params.set('login_hint', email);
		const domain = extractDomain(email);
		if (domain) {
			params.set('domain_hint', domain);
		}
	}

	return json({ redirectTo: `/auth/login?${params.toString()}` });
};
